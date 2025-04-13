/**
 * خدمة محسنة للتفاعل مع Deep Seek API عبر GitHub Token
 * مع معالجة لمشكلات معدلات الطلبات
 */
const config = require('../config/config');
const logger = require('../utils/logger');

class DeepSeekService {
    constructor() {
        // استخدام GitHub token بدلاً من Deep Seek API Key
        this.token = config.github.token;
        this.endpoint = "https://models.inference.ai.azure.com";
        this.modelName = "DeepSeek-R1";

        // إعدادات إدارة معدل الطلبات
        this.rateLimiter = {
            requestsInWindow: 0,
            windowStart: Date.now(),
            windowSize: 60000, // 1 دقيقة
            maxRequestsPerWindow: 1, // طلب واحد في الدقيقة
            retryQueue: [], // قائمة انتظار الطلبات المؤجلة
            isProcessingQueue: false
        };

        // بدء معالج قائمة الانتظار
        this.startQueueProcessor();
    }

    /**
     * بدء معالج قائمة انتظار الطلبات المؤجلة
     */
    startQueueProcessor() {
        // فحص قائمة الانتظار كل 5 ثوانٍ
        setInterval(() => {
            this.processRetryQueue();
        }, 5000);
    }

    /**
     * معالجة قائمة انتظار الطلبات المؤجلة
     */
    async processRetryQueue() {
        // إذا كانت المعالجة قيد التنفيذ، أو لا توجد طلبات في قائمة الانتظار، لا تفعل شيئًا
        if (this.rateLimiter.isProcessingQueue || this.rateLimiter.retryQueue.length === 0) {
            return;
        }

        // تحديث حالة المعالج
        this.rateLimiter.isProcessingQueue = true;

        try {
            // التحقق من معدل الطلبات
            if (this.canMakeRequest()) {
                // أخذ الطلب الأول من قائمة الانتظار
                const request = this.rateLimiter.retryQueue.shift();

                // تنفيذ الطلب
                try {
                    logger.info(`معالجة طلب مؤجل: ${request.type}`);
                    const result = await request.execute();
                    request.resolve(result);
                } catch (error) {
                    logger.error(`فشل تنفيذ طلب مؤجل: ${error.message}`);
                    request.reject(error);
                }
            }
        } finally {
            // إعادة تعيين حالة المعالج
            this.rateLimiter.isProcessingQueue = false;
        }
    }

    /**
     * التحقق مما إذا كان يمكن إجراء طلب جديد
     * @returns {boolean} صحيح إذا كان يمكن إجراء طلب جديد
     */
    canMakeRequest() {
        // إذا مر أكثر من نافذة زمنية منذ آخر إعادة تعيين، أعد تعيين العداد
        if (Date.now() - this.rateLimiter.windowStart > this.rateLimiter.windowSize) {
            this.rateLimiter.windowStart = Date.now();
            this.rateLimiter.requestsInWindow = 0;
            return true;
        }

        // التحقق مما إذا كان عدد الطلبات أقل من الحد الأقصى
        return this.rateLimiter.requestsInWindow < this.rateLimiter.maxRequestsPerWindow;
    }

    /**
     * تسجيل طلب جديد في نظام معدل الطلبات
     */
    registerRequest() {
        // إذا مر أكثر من نافذة زمنية منذ آخر إعادة تعيين، أعد تعيين العداد
        if (Date.now() - this.rateLimiter.windowStart > this.rateLimiter.windowSize) {
            this.rateLimiter.windowStart = Date.now();
            this.rateLimiter.requestsInWindow = 0;
        }

        // زيادة عداد الطلبات
        this.rateLimiter.requestsInWindow++;
    }

    /**
     * إضافة طلب إلى قائمة الانتظار
     * @param {Function} executeFunction - الدالة التي ستنفذ الطلب
     * @param {string} type - نوع الطلب (للتسجيل)
     * @returns {Promise} وعد يتم حله عند تنفيذ الطلب
     */
    addToRetryQueue(executeFunction, type) {
        return new Promise((resolve, reject) => {
            this.rateLimiter.retryQueue.push({
                execute: executeFunction,
                resolve,
                reject,
                type,
                timestamp: Date.now()
            });

            logger.info(`تمت إضافة طلب من نوع ${type} إلى قائمة الانتظار. طول القائمة: ${this.rateLimiter.retryQueue.length}`);
        });
    }

    /**
     * تحليل الكود باستخدام Deep Seek API للتركيز على جوانب الأمان
     * مع معالجة محسنة لمعدلات الطلبات
     * @param {string} code - الكود المراد تحليله
     * @param {string} language - لغة الكود
     * @param {string} mobileAppType - نوع تطبيق الموبايل
     * @returns {Promise<Object>} نتائج التحليل
     */
    async analyzeCodeSecurity(code, language, mobileAppType) {
        try {
            // التحقق من طول الكود
            if (code.length > 20000) {
                logger.warn(`تم اقتصاص الكود: ${code.length} حرف إلى 20000 حرف`);
                code = code.substring(0, 20000);
            }

            // التحقق مما إذا كان يمكن إجراء طلب مباشرة أو إضافته إلى قائمة الانتظار
            if (!this.canMakeRequest()) {
                logger.info(`تجاوز معدل طلبات Deep Seek، إضافة الطلب إلى قائمة الانتظار...`);

                // إضافة الطلب إلى قائمة الانتظار
                return this.addToRetryQueue(
                    () => this._executeSecurityAnalysis(code, language, mobileAppType),
                    `security-analysis-${language}`
                );
            }

            // تنفيذ التحليل مباشرة
            return this._executeSecurityAnalysis(code, language, mobileAppType);
        } catch (error) {
            logger.error(`خطأ في تحليل أمان الكود باستخدام Deep Seek: ${error.message}`);

            // في حالة فشل استدعاء Deep Seek API، نعيد كائنًا فارغًا للسماح بمواصلة العملية
            return {
                findings: [],
                summary: 'حدث خطأ أثناء تحليل أمان الكود باستخدام Deep Seek'
            };
        }
    }

    /**
     * تنفيذ تحليل الأمان باستخدام Deep Seek API
     * @param {string} code - الكود المراد تحليله
     * @param {string} language - لغة الكود
     * @param {string} mobileAppType - نوع تطبيق الموبايل
     * @returns {Promise<Object>} نتائج التحليل
     * @private
     */
    async _executeSecurityAnalysis(code, language, mobileAppType) {
        try {
            // تسجيل الطلب في نظام معدل الطلبات
            this.registerRequest();

            logger.info(`إرسال طلب تحليل أمان الكود إلى Deep Seek: ${language}`);

            // إنشاء سياق التحليل الأمني
            const securityContext = this.getSecurityAnalysisContext(mobileAppType);

            // استيراد المكتبات اللازمة
            const { default: ModelClient, isUnexpected } = await import("@azure-rest/ai-inference");
            const { AzureKeyCredential } = await import("@azure/core-auth");

            // إنشاء عميل للاتصال بالنموذج
            const client = ModelClient(
                this.endpoint,
                new AzureKeyCredential(this.token)
            );

            // استدعاء Deep Seek API
            const response = await client.path("/chat/completions").post({
                body: {
                    messages: [
                        { role: 'system', content: securityContext },
                        { role: 'user', content: `قم بتحليل الكود التالي المكتوب بلغة ${language} للكشف عن مشاكل الأمان:\n\n\`\`\`${language}\n${code}\n\`\`\`` }
                    ],
                    max_tokens: config.deepSeek.maxTokens,
                    temperature: config.deepSeek.temperature,
                    model: this.modelName
                }
            });

            if (isUnexpected(response)) {
                throw response.body.error;
            }

            logger.info(`تم تلقي استجابة Deep Seek لتحليل أمان الكود`);

            // استخراج الاستجابة وتحويلها إلى JSON
            const analysisResultText = response.body.choices[0].message.content;
            let analysisResult;

            try {
                // محاولة تحليل الاستجابة كـ JSON
                // في بعض الأحيان تكون الاستجابة محاطة بعلامات التنسيق markdown، نحتاج إلى استخراج JSON فقط
                const jsonMatch = analysisResultText.match(/```json\s*([\s\S]*?)\s*```/) ||
                    analysisResultText.match(/\{[\s\S]*\}/);

                if (jsonMatch) {
                    analysisResult = JSON.parse(jsonMatch[1] || jsonMatch[0]);
                } else {
                    throw new Error("لا يوجد تنسيق JSON في الاستجابة");
                }
            } catch (parseError) {
                // إذا لم تكن الاستجابة بتنسيق JSON صالح، قم بتحويلها إلى هيكل JSON
                logger.warn(`تعذر تحليل استجابة DeepSeek كـ JSON: ${parseError.message}`);
                analysisResult = this.extractFindingsFromText(analysisResultText, language);
            }

            return analysisResult;
        } catch (error) {
            logger.error(`خطأ في تنفيذ تحليل أمان الكود باستخدام Deep Seek: ${error.message}`);

            // معالجة الأخطاء المتعلقة بمعدل الطلبات
            if (error.message && (
                error.message.includes('rate limit') ||
                error.message.includes('Rate limit') ||
                error.message.includes('too many requests')
            )) {
                // انتظر قبل إعادة المحاولة
                await new Promise(resolve => setTimeout(resolve, 60000)); // انتظر دقيقة واحدة

                // إعادة المحاولة مرة واحدة
                return this.analyzeCodeSecurity(code, language, mobileAppType);
            }

            throw error;
        }
    }

    /**
     * استخراج المشكلات من نص غير منسق
     * @param {string} text - النص الناتج عن التحليل
     * @param {string} language - لغة الكود
     * @returns {Object} كائن يمثل نتائج التحليل
     */
    extractFindingsFromText(text, language) {
        const findings = [];
        let inFinding = false;
        let currentFinding = {};
        let currentKey = '';

        // تحليل النص سطرًا بسطر
        const lines = text.split('\n');
        for (const line of lines) {
            const trimmedLine = line.trim();

            // تجاهل الأسطر الفارغة وأسطر markdown
            if (!trimmedLine || trimmedLine.startsWith('#') || trimmedLine.match(/^```/)) {
                continue;
            }

            // البحث عن بداية مشكلة جديدة
            if (trimmedLine.match(/^(Issue|Finding|Problem|مشكلة|نتيجة)\s*\d*\s*:/) ||
                trimmedLine.match(/^-\s*(Issue|Finding|Problem|مشكلة|نتيجة)\s*:/)) {

                // إذا كنا بالفعل في مشكلة، أضفها إلى القائمة قبل البدء بمشكلة جديدة
                if (inFinding && Object.keys(currentFinding).length > 0) {
                    findings.push(currentFinding);
                }

                // بدء مشكلة جديدة
                inFinding = true;
                currentFinding = {
                    title: trimmedLine.replace(/^(Issue|Finding|Problem|مشكلة|نتيجة)\s*\d*\s*:\s*/, '')
                        .replace(/^-\s*(Issue|Finding|Problem|مشكلة|نتيجة)\s*:\s*/, ''),
                    severity: 'medium', // قيمة افتراضية
                    category: 'Security Issue',
                    description: '',
                    recommendation: ''
                };
                currentKey = 'description'; // نبدأ بالوصف افتراضيًا
                continue;
            }

            // البحث عن مفاتيح معروفة في المشكلات الأمنية
            const keyMatch = trimmedLine.match(/^(Severity|Recommendation|Description|Category|Code Snippet|خطورة|توصية|وصف|فئة|شدة|رمز)[\s:]*(.*)$/i);

            if (keyMatch && inFinding) {
                const key = keyMatch[1].toLowerCase();
                const value = keyMatch[2].trim();

                if (key.includes('severity') || key.includes('خطورة') || key.includes('شدة')) {
                    currentFinding.severity = this.normalizeSeverity(value);
                    currentKey = 'severity';
                } else if (key.includes('category') || key.includes('فئة')) {
                    currentFinding.category = value;
                    currentKey = 'category';
                } else if (key.includes('recommendation') || key.includes('توصية')) {
                    currentFinding.recommendation = value;
                    currentKey = 'recommendation';
                } else if (key.includes('description') || key.includes('وصف')) {
                    currentFinding.description = value;
                    currentKey = 'description';
                } else if (key.includes('code') || key.includes('رمز')) {
                    currentFinding.codeSnippet = value;
                    currentKey = 'codeSnippet';
                }
                continue;
            }

            // إذا لم يكن هناك مفتاح جديد، أضف السطر إلى القيمة الحالية
            if (inFinding && currentKey) {
                currentFinding[currentKey] += ' ' + trimmedLine;
            }
        }

        // تأكد من إضافة المشكلة الأخيرة إذا كانت موجودة
        if (inFinding && Object.keys(currentFinding).length > 0) {
            findings.push(currentFinding);
        }

        // إذا لم يتم العثور على أي مشكلات، أضف مشكلة افتراضية
        if (findings.length === 0) {
            findings.push({
                title: 'تعذر استخراج مشكلات أمان محددة',
                severity: 'info',
                category: 'Parser Issue',
                description: 'تعذر استخراج مشكلات أمان محددة من استجابة التحليل.',
                recommendation: 'يرجى مراجعة الكود يدويًا أو إعادة المحاولة.'
            });
        }

        return {
            findings: findings,
            summary: `تم العثور على ${findings.length} مشكلة أمان محتملة في الكود المكتوب بلغة ${language}.`
        };
    }

    /**
     * توحيد قيم مستوى الخطورة
     * @param {string} severity - نص يمثل مستوى الخطورة
     * @returns {string} مستوى الخطورة الموحد
     */
    normalizeSeverity(severity) {
        severity = severity.toLowerCase();

        if (severity.includes('critical') || severity.includes('حرج') || severity.includes('عالي جدا')) {
            return 'critical';
        } else if (severity.includes('high') || severity.includes('عالي')) {
            return 'high';
        } else if (severity.includes('medium') || severity.includes('متوسط')) {
            return 'medium';
        } else if (severity.includes('low') || severity.includes('منخفض')) {
            return 'low';
        } else if (severity.includes('info') || severity.includes('معلومات')) {
            return 'info';
        }

        return 'medium'; // القيمة الافتراضية
    }

    /**
     * الحصول على سياق التحليل الأمني بناء على نوع تطبيق الموبايل
     * @param {string} mobileAppType - نوع تطبيق الموبايل
     * @returns {string} سياق التحليل الأمني
     */
    getSecurityAnalysisContext(mobileAppType) {
        return `
    أنت خبير أمان في تطبيقات الموبايل وتحديداً تطبيقات ${mobileAppType}. مهمتك هي تحليل الكود بعمق للكشف عن مشاكل الأمان وتحديد الثغرات الأمنية.
    
    ركز على المشكلات الأمنية التالية:
    - استخدام أوراق اعتماد بشكل غير صحيح (Improper Credential Usage)
    - أمان سلسلة التوريد غير الكافي (Inadequate Supply Chain Security)
    - مصادقة وتفويض غير آمنة (Insecure Authentication/Authorization)
    - تحقق غير كاف من الإدخال/الإخراج (Insufficient Input/Output Validation)
    - اتصالات غير آمنة (Insecure Communication)
    - ضوابط خصوصية غير كافية (Inadequate Privacy Controls)
    - حماية ثنائية غير كافية (Insufficient Binary Protections)
    - تكوين أمان خاطئ (Security Misconfiguration)
    - تخزين بيانات غير آمن (Insecure Data Storage)
    - تشفير غير كاف (Insufficient Cryptography)
    - تسريب البيانات (Data Leakage)
    - أسرار مضمنة بشكل ثابت (Hardcoded Secrets)
    - تحكم بالوصول غير آمن (Insecure Access Control)
    - تجاوز المسار وعبور المسار (Path Overwrite and Path Traversal)
    - نقاط نهاية غير محمية (Unprotected Endpoints)
    - مشاركة غير آمنة (Unsafe Sharing)
    
    قدم الاستجابة بتنسيق JSON دقيق مع الحقول التالية:
    {
      "findings": [
        {
          "id": "معرف فريد للمشكلة",
          "title": "عنوان المشكلة",
          "description": "وصف تفصيلي للمشكلة",
          "severity": "مستوى الخطورة (critical, high, medium, low, info)",
          "category": "فئة المشكلة الأمنية",
          "codeSnippet": "جزء الكود الذي يحتوي على المشكلة",
          "lineNumber": "رقم السطر (إذا كان قابلاً للتحديد)",
          "recommendation": "توصية محددة ومفصلة لإصلاح المشكلة"
        }
      ],
      "summary": "تقييم موجز لأمان الكود، يحدد المخاطر الرئيسية ونقاط الضعف"
    }
    `;
    }
}

module.exports = new DeepSeekService();