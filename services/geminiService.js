/**
 * خدمة محسنة للتفاعل مع Google Gemini API
 * مع معالجة لمشكلات معدلات الطلبات
 */
const config = require('../config/config');
const logger = require('../utils/logger');
const axios = require('axios');

class GeminiService {
    constructor() {
        // استخدام مفتاح API Gemini
        this.apiKey = config.gemini.apiKey;
        this.model = config.gemini.model;
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

        // إعدادات إدارة معدل الطلبات
        this.rateLimiter = {
            requestsInWindow: 0,
            windowStart: Date.now(),
            windowSize: 60000, // 1 دقيقة
            maxRequestsPerWindow: 10, // 10 طلبات في الدقيقة
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
        // فحص قائمة الانتظار كل 3 ثوانٍ
        setInterval(() => {
            this.processRetryQueue();
        }, 3000);
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
                    logger.info(`معالجة طلب مؤجل Gemini: ${request.type}`);
                    const result = await request.execute();
                    request.resolve(result);
                } catch (error) {
                    logger.error(`فشل تنفيذ طلب مؤجل Gemini: ${error.message}`);
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

            logger.info(`تمت إضافة طلب من نوع ${type} إلى قائمة انتظار Gemini. طول القائمة: ${this.rateLimiter.retryQueue.length}`);
        });
    }

    /**
     * تحليل الكود باستخدام Gemini API
     * مع معالجة محسنة لمعدلات الطلبات
     * @param {string} code - الكود المراد تحليله
     * @param {string} language - لغة الكود
     * @param {string} analysisType - نوع التحليل (security, performance, memory, battery)
     * @param {string} mobileAppType - نوع تطبيق الموبايل
     * @returns {Promise<Object>} نتائج التحليل
     */
    async analyzeCode(code, language, analysisType, mobileAppType) {
        try {
            // التحقق من طول الكود
            if (code.length > 30000) {
                logger.warn(`تم اقتصاص الكود: ${code.length} حرف إلى 30000 حرف`);
                code = code.substring(0, 30000);
            }

            // التحقق مما إذا كان يمكن إجراء طلب مباشرة أو إضافته إلى قائمة الانتظار
            if (!this.canMakeRequest()) {
                logger.info(`تجاوز معدل طلبات Gemini، إضافة الطلب إلى قائمة الانتظار...`);

                // إضافة الطلب إلى قائمة الانتظار
                return this.addToRetryQueue(
                    () => this._executeAnalysis(code, language, analysisType, mobileAppType),
                    `${analysisType}-analysis-${language}`
                );
            }

            // تنفيذ التحليل مباشرة
            return this._executeAnalysis(code, language, analysisType, mobileAppType);
        } catch (error) {
            logger.error(`خطأ في تحليل الكود باستخدام Gemini: ${error.message}`);

            // في حالة فشل استدعاء Gemini API، نعيد كائنًا فارغًا للسماح بمواصلة العملية
            return {
                findings: [{
                    title: "خطأ في تحليل الكود",
                    description: `حدث خطأ أثناء تحليل الكود: ${error.message}`,
                    severity: "info",
                    recommendation: "حاول مرة أخرى لاحقًا أو استخدم خدمة تحليل مختلفة."
                }],
                summary: "حدث خطأ أثناء تحليل الكود باستخدام Gemini"
            };
        }
    }

    /**
     * تنفيذ تحليل الكود باستخدام Gemini API
     * @param {string} code - الكود المراد تحليله
     * @param {string} language - لغة الكود
     * @param {string} analysisType - نوع التحليل
     * @param {string} mobileAppType - نوع تطبيق الموبايل
     * @returns {Promise<Object>} نتائج التحليل
     * @private
     */
    async _executeAnalysis(code, language, analysisType, mobileAppType) {
        try {
            // تسجيل الطلب في نظام معدل الطلبات
            this.registerRequest();

            // إنشاء سياق التحليل بناءً على نوع التحليل
            const analysisContext = this.getAnalysisContext(analysisType, mobileAppType);

            logger.info(`إرسال طلب تحليل الكود إلى Gemini: ${analysisType}, ${language}`);

            // إعداد طلب Gemini API
            const endpoint = `${this.baseUrl}/${this.model}:generateContent`;
            const requestBody = {
                contents: [
                    {
                        parts: [
                            { text: analysisContext },
                            { text: `قم بتحليل الكود التالي المكتوب بلغة ${language}:\n\n\`\`\`${language}\n${code}\n\`\`\`` }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: config.gemini.temperature,
                    maxOutputTokens: config.gemini.maxTokens,
                    topP: 0.8,
                    topK: 40
                }
            };

            // استدعاء Gemini API
            const response = await axios.post(endpoint, requestBody, {
                params: {
                    key: this.apiKey
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            logger.info(`تم تلقي استجابة Gemini لتحليل الكود`);

            // استخراج الاستجابة وتحويلها إلى JSON
            const analysisResultText = response.data.candidates[0].content.parts[0].text;

            try {
                // محاولة تحليل الاستجابة كـ JSON
                // في بعض الأحيان تكون الاستجابة محاطة بعلامات التنسيق markdown، نحتاج إلى استخراج JSON فقط
                const jsonMatch = analysisResultText.match(/```json\s*([\s\S]*?)\s*```/) ||
                    analysisResultText.match(/\{[\s\S]*\}/);

                if (jsonMatch) {
                    return JSON.parse(jsonMatch[1] || jsonMatch[0]);
                } else {
                    throw new Error("لا يوجد تنسيق JSON في الاستجابة");
                }
            } catch (parseError) {
                // إذا لم تكن الاستجابة بتنسيق JSON صالح، قم بتحويلها إلى هيكل JSON
                logger.warn(`تعذر تحليل استجابة Gemini كـ JSON: ${parseError.message}`);
                return this.extractFindingsFromText(analysisResultText, language, analysisType);
            }
        } catch (error) {
            logger.error(`خطأ في تنفيذ تحليل الكود باستخدام Gemini: ${error.message}`);

            // معالجة الأخطاء المتعلقة بمعدل الطلبات
            if (error.response && error.response.status === 429) {
                // انتظر قبل إعادة المحاولة
                await new Promise(resolve => setTimeout(resolve, 30000)); // انتظر 30 ثانية

                // إعادة المحاولة مرة واحدة
                return this.analyzeCode(code, language, analysisType, mobileAppType);
            }

            throw error;
        }
    }

    /**
     * استخراج المشكلات من نص غير منسق
     * @param {string} text - النص الناتج عن التحليل
     * @param {string} language - لغة الكود
     * @param {string} analysisType - نوع التحليل
     * @returns {Object} كائن يمثل نتائج التحليل
     */
    extractFindingsFromText(text, language, analysisType) {
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
                    category: this.getCategoryFromAnalysisType(analysisType),
                    description: '',
                    recommendation: ''
                };
                currentKey = 'description'; // نبدأ بالوصف افتراضيًا
                continue;
            }

            // البحث عن مفاتيح معروفة
            const keyMatch = trimmedLine.match(/^(Severity|Recommendation|Description|Category|Impact|Code Snippet|خطورة|توصية|وصف|فئة|تأثير|شدة|رمز)[\s:]*(.*)$/i);

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
                } else if (key.includes('impact') || key.includes('تأثير')) {
                    currentFinding.impact = value;
                    currentKey = 'impact';
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
                title: `تعذر استخراج مشكلات ${this.getAnalysisTypeName(analysisType)} محددة`,
                severity: 'info',
                category: this.getCategoryFromAnalysisType(analysisType),
                description: `تعذر استخراج مشكلات ${this.getAnalysisTypeName(analysisType)} محددة من استجابة التحليل.`,
                recommendation: 'يرجى مراجعة الكود يدويًا أو إعادة المحاولة.'
            });
        }

        return {
            findings: findings,
            summary: `تم العثور على ${findings.length} مشكلة متعلقة بـ${this.getAnalysisTypeName(analysisType)} في الكود المكتوب بلغة ${language}.`
        };
    }

    /**
     * الحصول على اسم نوع التحليل بالعربية
     * @param {string} analysisType - نوع التحليل
     * @returns {string} اسم نوع التحليل بالعربية
     */
    getAnalysisTypeName(analysisType) {
        switch (analysisType) {
            case 'security':
                return 'الأمان';
            case 'performance':
                return 'الأداء';
            case 'memory':
                return 'الذاكرة';
            case 'battery':
                return 'البطارية';
            default:
                return analysisType;
        }
    }

    /**
     * الحصول على فئة المشكلة بناءً على نوع التحليل
     * @param {string} analysisType - نوع التحليل
     * @returns {string} فئة المشكلة
     */
    getCategoryFromAnalysisType(analysisType) {
        switch (analysisType) {
            case 'security':
                return 'Security Issue';
            case 'performance':
                return 'Performance Issue';
            case 'memory':
                return 'Memory Issue';
            case 'battery':
                return 'Battery Issue';
            default:
                return 'General Issue';
        }
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
        {
          "findings": [
            {
              "title": "عنوان المشكلة",
              "description": "وصف تفصيلي للمشكلة",
              "severity": "مستوى الخطورة (critical, high, medium, low, info)",
              "codeSnippet": "جزء الكود الذي يحتوي على المشكلة",
              "recommendation": "توصية محددة لإصلاح المشكلة",
              "category": "فئة المشكلة الأمنية"
            }
          ],
          "summary": "ملخص للمشكلات المكتشفة وتقييم عام لأمان الكود"
        }
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
        {
          "findings": [
            {
              "title": "عنوان المشكلة",
              "description": "وصف تفصيلي للمشكلة",
              "impact": "تأثير المشكلة على الأداء",
              "codeSnippet": "جزء الكود الذي يحتوي على المشكلة",
              "recommendation": "توصية محددة لتحسين الأداء",
              "category": "فئة مشكلة الأداء"
            }
          ],
          "summary": "ملخص للمشكلات المكتشفة وتقييم عام لأداء الكود"
        }
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
        {
          "findings": [
            {
              "title": "عنوان المشكلة",
              "description": "وصف تفصيلي للمشكلة",
              "impact": "تأثير المشكلة على استخدام الذاكرة",
              "codeSnippet": "جزء الكود الذي يحتوي على المشكلة",
              "recommendation": "توصية محددة لتحسين إدارة الذاكرة",
              "category": "فئة مشكلة الذاكرة"
            }
          ],
          "summary": "ملخص للمشكلات المكتشفة وتقييم عام لاستخدام الذاكرة في الكود"
        }
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
        {
          "findings": [
            {
              "title": "عنوان المشكلة",
              "description": "وصف تفصيلي للمشكلة",
              "impact": "تأثير المشكلة على استهلاك البطارية",
              "codeSnippet": "جزء الكود الذي يحتوي على المشكلة",
              "recommendation": "توصية محددة لتحسين استخدام البطارية",
              "category": "فئة مشكلة البطارية"
            }
          ],
          "summary": "ملخص للمشكلات المكتشفة وتقييم عام لاستهلاك البطارية في الكود"
        }
        `;
                break;

            default:
                specificContext = `
        مهمتك هي تحليل الكود للعثور على مشاكل وتقديم توصيات محددة لتحسينه.
        
        قدم الاستجابة بتنسيق JSON مع الحقول التالية:
        {
          "findings": [
            {
              "title": "عنوان المشكلة",
              "description": "وصف تفصيلي للمشكلة",
              "impact": "تأثير المشكلة",
              "codeSnippet": "جزء الكود الذي يحتوي على المشكلة",
              "recommendation": "توصية محددة للتحسين"
            }
          ],
          "summary": "ملخص للمشكلات المكتشفة وتقييم عام للكود"
        }
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
            // التحقق مما إذا كان يمكن إجراء طلب مباشرة أو إضافته إلى قائمة الانتظار
            if (!this.canMakeRequest()) {
                logger.info(`تجاوز معدل طلبات Gemini، إضافة طلب توليد التقرير إلى قائمة الانتظار...`);

                // إضافة الطلب إلى قائمة الانتظار
                return this.addToRetryQueue(
                    () => this._executeGenerateSummary(reportData),
                    `generate-summary-report`
                );
            }

            // تنفيذ التحليل مباشرة
            return this._executeGenerateSummary(reportData);
        } catch (error) {
            logger.error(`خطأ في توليد تقرير ملخص: ${error.message}`);
            return `حدث خطأ أثناء توليد التقرير الملخص: ${error.message}`;
        }
    }

    /**
     * تنفيذ توليد التقرير الملخص
     * @param {Object} reportData - بيانات التقرير
     * @returns {Promise<string>} التقرير الملخص
     * @private
     */
    async _executeGenerateSummary(reportData) {
        try {
            // تسجيل الطلب في نظام معدل الطلبات
            this.registerRequest();

            // إعداد طلب Gemini API
            const endpoint = `${this.baseUrl}/${this.model}:generateContent`;
            const reportDataStr = JSON.stringify(reportData, null, 2);

            const requestBody = {
                contents: [
                    {
                        parts: [
                            {
                                text: `أنت محلل أمان وأداء لتطبيقات الموبايل. مهمتك هي إنشاء تقرير ملخص استنادًا إلى نتائج التحليل المقدمة. قم بتنظيم التقرير بطريقة موجزة ومفيدة، مع تسليط الضوء على المشكلات الأكثر أهمية والتوصيات الرئيسية. استخدم تنسيق Markdown لجعل التقرير سهل القراءة. قدم خطوات محددة للإصلاح.`
                            },
                            {
                                text: `قم بإنشاء تقرير ملخص استنادًا إلى بيانات التحليل التالية:\n\n${reportDataStr}`
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 2000,
                    topP: 0.8,
                    topK: 40
                }
            };

            // استدعاء Gemini API
            const response = await axios.post(endpoint, requestBody, {
                params: {
                    key: this.apiKey
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            return response.data.candidates[0].content.parts[0].text;
        } catch (error) {
            logger.error(`خطأ في تنفيذ توليد تقرير ملخص: ${error.message}`);

            // معالجة الأخطاء المتعلقة بمعدل الطلبات
            if (error.response && error.response.status === 429) {
                // انتظر قبل إعادة المحاولة
                await new Promise(resolve => setTimeout(resolve, 30000)); // انتظر 30 ثانية

                // إعادة المحاولة مرة واحدة
                return this.generateSummaryReport(reportData);
            }

            throw error;
        }
    }
}
module.exports = new GeminiService();