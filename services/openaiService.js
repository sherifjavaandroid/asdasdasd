/**
 * خدمة للتفاعل مع OpenAI API عبر GitHub Token
 */
const config = require('../config/config');
const logger = require('../utils/logger');

class OpenAIService {
    constructor() {
        // استخدام GitHub token بدلاً من OpenAI API Key
        this.token = config.github.token;
        this.endpoint = "https://models.inference.ai.azure.com";
        this.modelName = "gpt-4o";
    }

    /**
     * تحليل الكود باستخدام OpenAI API
     * @param {string} code - الكود المراد تحليله
     * @param {string} language - لغة الكود
     * @param {string} analysisType - نوع التحليل (security, performance, memory, battery)
     * @param {string} mobileAppType - نوع تطبيق الموبايل
     * @returns {Promise<Object>} نتائج التحليل
     */
    async analyzeCode(code, language, analysisType, mobileAppType) {
        try {
            // التحقق من طول الكود
            if (code.length > 20000) {
                logger.warn(`تم اقتصاص الكود: ${code.length} حرف إلى 20000 حرف`);
                code = code.substring(0, 20000);
            }

            // إنشاء سياق التحليل بناءً على نوع التحليل
            const analysisContext = this.getAnalysisContext(analysisType, mobileAppType);

            // إنشاء محتوى الرسالة
            const messages = [
                { role: 'system', content: analysisContext },
                { role: 'user', content: `قم بتحليل الكود التالي المكتوب بلغة ${language}:\n\n\`\`\`${language}\n${code}\n\`\`\`` }
            ];

            logger.info(`إرسال طلب تحليل الكود إلى OpenAI: ${analysisType}, ${language}`);

            // استيراد المكتبات اللازمة
            const { default: ModelClient, isUnexpected } = await import("@azure-rest/ai-inference");
            const { AzureKeyCredential } = await import("@azure/core-auth");

            // إنشاء عميل للاتصال بالنموذج
            const client = ModelClient(
                this.endpoint,
                new AzureKeyCredential(this.token)
            );

            // استدعاء OpenAI API
            const response = await client.path("/chat/completions").post({
                body: {
                    messages: messages,
                    max_tokens: config.openai.maxTokens,
                    temperature: config.openai.temperature,
                    model: this.modelName
                }
            });

            if (isUnexpected(response)) {
                throw response.body.error;
            }

            logger.info(`تم تلقي استجابة OpenAI لتحليل الكود`);

            // استخراج الاستجابة وتحويلها إلى JSON
            const analysisResultText = response.body.choices[0].message.content;
            let analysisResult;

            try {
                // محاولة تحليل الاستجابة كـ JSON
                analysisResult = JSON.parse(analysisResultText);
            } catch (parseError) {
                // إذا لم تكن الاستجابة بتنسيق JSON صالح، قم بتحويلها إلى هيكل JSON
                logger.warn(`تعذر تحليل استجابة OpenAI كـ JSON: ${parseError.message}`);

                // إنشاء هيكل JSON بديل من النص
                const findings = [];
                const lines = analysisResultText.split('\n');

                // التقاط أي هياكل تشبه المشكلات من النص
                let currentIssue = null;
                for (const line of lines) {
                    if (line.includes(':') && !line.trim().startsWith('-')) {
                        const [key, value] = line.split(':', 2);
                        if (key.trim().toLowerCase().includes('issue') ||
                            key.trim().toLowerCase().includes('problem') ||
                            key.trim().toLowerCase().includes('finding')) {

                            if (currentIssue) {
                                findings.push(currentIssue);
                            }

                            currentIssue = {
                                title: value.trim(),
                                description: '',
                                severity: 'medium',
                                recommendation: ''
                            };
                        } else if (currentIssue) {
                            if (key.trim().toLowerCase().includes('description')) {
                                currentIssue.description = value.trim();
                            } else if (key.trim().toLowerCase().includes('recommendation') ||
                                key.trim().toLowerCase().includes('solution')) {
                                currentIssue.recommendation = value.trim();
                            } else if (key.trim().toLowerCase().includes('severity')) {
                                currentIssue.severity = value.trim().toLowerCase();
                            }
                        }
                    } else if (currentIssue && line.trim()) {
                        // Append to the last property
                        if (currentIssue.recommendation) {
                            currentIssue.recommendation += ' ' + line.trim();
                        } else if (currentIssue.description) {
                            currentIssue.description += ' ' + line.trim();
                        }
                    }
                }

                if (currentIssue) {
                    findings.push(currentIssue);
                }

                if (findings.length === 0) {
                    findings.push({
                        title: "نتيجة تحليل غير مهيكلة",
                        description: "تم الحصول على نتيجة تحليل لكنها لم تكن بالتنسيق المتوقع.",
                        severity: "info",
                        recommendation: "مراجعة النص الأصلي للتحليل."
                    });
                }

                analysisResult = {
                    findings: findings,
                    summary: "تم تحليل الكود وتم العثور على " + findings.length + " مشكلة محتملة."
                };
            }

            return analysisResult;
        } catch (error) {
            logger.error(`خطأ في تحليل الكود باستخدام OpenAI: ${error.message}`);
            throw new Error(`فشل تحليل الكود باستخدام OpenAI: ${error.message}`);
        }
    }

    /**
     * الحصول على سياق التحليل بناء على نوع التحليل ونوع تطبيق الموبايل
     * @param {string} analysisType - نوع التحليل
     * @param {string} mobileAppType - نوع تطبيق الموبايل
     * @returns {string} سياق التحليل
     */
    getAnalysisContext(analysisType, mobileAppType) {
        const baseContext = `أنت خبير في تحليل كود تطبيقات الموبايل وتحديداً تطبيقات ${mobileAppType}. `;

        let specificContext = '';

        switch (analysisType) {
            case 'security':
                specificContext = `
        مهمتك هي تحليل الكود للعثور على مشاكل الأمان المحتملة وتقديم توصيات محددة لإصلاحها.
        
        ابحث عن المشكلات التالية:
        - تخزين البيانات الحساسة بشكل غير آمن
        - استخدام غير آمن للمصادقة والتفويض
        - ثغرات إدخال/إخراج البيانات
        - اتصالات غير آمنة
        - مشاكل التشفير غير الكافي
        - أسرار مضمنة بشكل ثابت في الكود
        - نقاط نهاية غير محمية
        - مشاكل تكوين الأمان
        
        قدم الاستجابة بتنسيق JSON مع الحقول التالية:
        - findings: مصفوفة من المشكلات المكتشفة، حيث تحتوي كل مشكلة على:
          - title: عنوان المشكلة
          - description: وصف تفصيلي للمشكلة
          - severity: مستوى الخطورة (critical, high, medium, low, info)
          - codeSnippet: جزء الكود الذي يحتوي على المشكلة
          - recommendation: توصية محددة لإصلاح المشكلة
          - category: فئة المشكلة الأمنية
        - summary: ملخص للمشكلات المكتشفة وتقييم عام لأمان الكود
        `;
                break;

            case 'performance':
                specificContext = `
        مهمتك هي تحليل الكود للعثور على مشاكل الأداء وتقديم توصيات محددة لتحسينه.
        
        ابحث عن المشكلات التالية:
        - حلقات أو خوارزميات غير فعالة
        - عمليات شبكية غير محسنة
        - استخدام الذاكرة المؤقتة بشكل غير فعال
        - تشغيل عمليات ثقيلة في الخلفية أو في الخيط الرئيسي
        - رسومات أو رسوم متحركة غير محسنة
        - مشاكل في واجهة المستخدم تؤثر على الاستجابة
        
        قدم الاستجابة بتنسيق JSON مع الحقول التالية:
        - findings: مصفوفة من المشكلات المكتشفة، حيث تحتوي كل مشكلة على:
          - title: عنوان المشكلة
          - description: وصف تفصيلي للمشكلة
          - impact: تأثير المشكلة على الأداء
          - codeSnippet: جزء الكود الذي يحتوي على المشكلة
          - recommendation: توصية محددة لتحسين الأداء
          - category: فئة مشكلة الأداء
        - summary: ملخص للمشكلات المكتشفة وتقييم عام لأداء الكود
        `;
                break;

            case 'memory':
                specificContext = `
        مهمتك هي تحليل الكود للعثور على مشاكل إدارة الذاكرة وتقديم توصيات محددة لتحسينها.
        
        ابحث عن المشكلات التالية:
        - تسريبات الذاكرة
        - عدم تحرير الموارد بشكل صحيح
        - استخدام الذاكرة بشكل مفرط
        - تخصيص الذاكرة غير الفعال
        - تجزئة الذاكرة
        - مراجع دائرية
        
        قدم الاستجابة بتنسيق JSON مع الحقول التالية:
        - findings: مصفوفة من المشكلات المكتشفة، حيث تحتوي كل مشكلة على:
          - title: عنوان المشكلة
          - description: وصف تفصيلي للمشكلة
          - impact: تأثير المشكلة على استخدام الذاكرة
          - codeSnippet: جزء الكود الذي يحتوي على المشكلة
          - recommendation: توصية محددة لتحسين إدارة الذاكرة
          - category: فئة مشكلة الذاكرة
        - summary: ملخص للمشكلات المكتشفة وتقييم عام لاستخدام الذاكرة في الكود
        `;
                break;

            case 'battery':
                specificContext = `
        مهمتك هي تحليل الكود للعثور على مشاكل استهلاك البطارية وتقديم توصيات محددة لتحسين استخدام البطارية.
        
        ابحث عن المشكلات التالية:
        - استخدام خدمات الموقع بشكل غير فعال
        - عمليات شبكية متكررة أو غير ضرورية
        - إيقاظ الجهاز بشكل متكرر
        - عمليات خلفية مستمرة
        - استخدام أجهزة الاستشعار بشكل مفرط
        - رسومات أو رسوم متحركة مكثفة
        
        قدم الاستجابة بتنسيق JSON مع الحقول التالية:
        - findings: مصفوفة من المشكلات المكتشفة، حيث تحتوي كل مشكلة على:
          - title: عنوان المشكلة
          - description: وصف تفصيلي للمشكلة
          - impact: تأثير المشكلة على استهلاك البطارية
          - codeSnippet: جزء الكود الذي يحتوي على المشكلة
          - recommendation: توصية محددة لتحسين استخدام البطارية
          - category: فئة مشكلة البطارية
        - summary: ملخص للمشكلات المكتشفة وتقييم عام لاستهلاك البطارية في الكود
        `;
                break;

            default:
                specificContext = `
        مهمتك هي تحليل الكود للعثور على مشاكل وتقديم توصيات محددة لتحسينه.
        
        قدم الاستجابة بتنسيق JSON مع الحقول التالية:
        - findings: مصفوفة من المشكلات المكتشفة، حيث تحتوي كل مشكلة على:
          - title: عنوان المشكلة
          - description: وصف تفصيلي للمشكلة
          - impact: تأثير المشكلة
          - codeSnippet: جزء الكود الذي يحتوي على المشكلة
          - recommendation: توصية محددة للتحسين
        - summary: ملخص للمشكلات المكتشفة وتقييم عام للكود
        `;
        }

        return baseContext + specificContext;
    }

    /**
     * توليد تقرير ملخص
     * @param {Object} reportData - بيانات التقرير
     * @returns {Promise<string>} التقرير الملخص
     */
    async generateSummaryReport(reportData) {
        try {
            // استيراد المكتبات اللازمة
            const { default: ModelClient, isUnexpected } = await import("@azure-rest/ai-inference");
            const { AzureKeyCredential } = await import("@azure/core-auth");

            // إنشاء عميل للاتصال بالنموذج
            const client = ModelClient(
                this.endpoint,
                new AzureKeyCredential(this.token)
            );

            const messages = [
                {
                    role: 'system',
                    content: `أنت محلل أمان وأداء لتطبيقات الموبايل. مهمتك هي إنشاء تقرير ملخص استنادًا إلى نتائج التحليل المقدمة. قم بتنظيم التقرير بطريقة موجزة ومفيدة، مع تسليط الضوء على المشكلات الأكثر أهمية والتوصيات الرئيسية.`
                },
                {
                    role: 'user',
                    content: `قم بإنشاء تقرير ملخص استنادًا إلى بيانات التحليل التالية: ${JSON.stringify(reportData)}`
                }
            ];

            const response = await client.path("/chat/completions").post({
                body: {
                    messages: messages,
                    max_tokens: 2000,
                    temperature: 0.3,
                    model: this.modelName
                }
            });

            if (isUnexpected(response)) {
                throw response.body.error;
            }

            return response.body.choices[0].message.content;
        } catch (error) {
            logger.error(`خطأ في توليد تقرير ملخص: ${error.message}`);
            throw new Error(`فشل توليد تقرير ملخص: ${error.message}`);
        }
    }
}

module.exports = new OpenAIService();