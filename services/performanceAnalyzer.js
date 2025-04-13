const logger = require('../utils/logger');
const { PERFORMANCE_CATEGORIES, SEVERITY_LEVELS } = require('../utils/constants');

/**
 * خدمة تحليل أداء الكود
 */
class PerformanceAnalyzer {
    /**
     * تحليل الكود للكشف عن مشاكل الأداء
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {string} appType - نوع تطبيق الموبايل
     * @returns {Array} قائمة بمشاكل الأداء المكتشفة
     */
    analyzePerformancePatterns(code, filePath, language, appType) {
        const issues = [];

        logger.debug(`تحليل أنماط الأداء للملف: ${filePath}`);

        try {
            // فحص الحلقات غير الفعالة
            this.checkInefficientLoops(code, filePath, language, issues);

            // فحص عمليات الرسم غير الفعالة
            this.checkInefficientDrawing(code, filePath, language, appType, issues);

            // فحص عمليات الشبكة غير الفعالة
            this.checkInefficientNetworkOperations(code, filePath, language, appType, issues);

            // فحص استخدام السلسلة المتسلسلة في Java
            this.checkStringConcatenation(code, filePath, language, issues);

            // فحص استخدام المعالجة الثقيلة في الخيط الرئيسي
            this.checkMainThreadProcessing(code, filePath, language, appType, issues);

            logger.debug(`تم اكتشاف ${issues.length} مشكلة أداء في الملف: ${filePath}`);

            return issues;
        } catch (error) {
            logger.error(`خطأ في تحليل أنماط الأداء: ${error.message}`);
            return issues;
        }
    }

    /**
     * فحص الحلقات غير الفعالة
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {Array} issues - قائمة بمشاكل الأداء المكتشفة
     */
    checkInefficientLoops(code, filePath, language, issues) {
        const inefficientLoopPatterns = [];

        if (language === 'Java' || language === 'Kotlin') {
            inefficientLoopPatterns.push({
                pattern: /for\s*\(\s*int\s+[a-zA-Z0-9_]+\s*=\s*0\s*;\s*[a-zA-Z0-9_]+\s*<\s*[a-zA-Z0-9_]+\.size\(\)\s*;/g,
                category: PERFORMANCE_CATEGORIES.COMPUTATION_EFFICIENCY,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استدعاء متكرر لـ size() داخل حلقة for، مما يؤدي إلى انخفاض الأداء.',
                recommendation: 'قم بتخزين قيمة size() في متغير خارج الحلقة.'
            });
        } else if (language === 'JavaScript' || language === 'TypeScript') {
            inefficientLoopPatterns.push({
                pattern: /for\s*\(\s*var\s+[a-zA-Z0-9_]+\s*=\s*0\s*;\s*[a-zA-Z0-9_]+\s*<\s*[a-zA-Z0-9_]+\.length\s*;/g,
                category: PERFORMANCE_CATEGORIES.COMPUTATION_EFFICIENCY,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استدعاء متكرر لـ length داخل حلقة for، مما يؤدي إلى انخفاض الأداء.',
                recommendation: 'قم بتخزين قيمة length في متغير خارج الحلقة.'
            });
        }

        for (const { pattern, category, severity, description, recommendation } of inefficientLoopPatterns) {
            pattern.lastIndex = 0;

            let match;
            while ((match = pattern.exec(code)) !== null) {
                const lineNumber = this.getLineNumber(code, match.index);
                const codeSnippet = this.extractCodeSnippet(code, match.index, match[0].length);

                issues.push({
                    title: 'حلقة غير فعالة',
                    category,
                    severity,
                    description,
                    recommendation,
                    filePath,
                    lineNumber,
                    codeSnippet,
                    type: 'issue',
                    impact: 'يمكن أن تؤدي إلى انخفاض الأداء في الحلقات الكبيرة.'
                });
            }
        }
    }

    /**
     * فحص عمليات الرسم غير الفعالة
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {string} appType - نوع تطبيق الموبايل
     * @param {Array} issues - قائمة بمشاكل الأداء المكتشفة
     */
    checkInefficientDrawing(code, filePath, language, appType, issues) {
        const inefficientDrawingPatterns = [];

        if (language === 'Java' || language === 'Kotlin') {
            inefficientDrawingPatterns.push({
                pattern: /onDraw\([^)]*\)[^{]*{[^}]*invalidate\(\)/gs,
                category: PERFORMANCE_CATEGORIES.UI_RESPONSIVENESS,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'استدعاء invalidate() داخل onDraw() يمكن أن يؤدي إلى حلقة لا نهائية من إعادة الرسم.',
                recommendation: 'تجنب استدعاء invalidate() داخل onDraw() مباشرة.'
            });
        } else if (language === 'JavaScript' || language === 'TypeScript' && appType === 'reactNative') {
            inefficientDrawingPatterns.push({
                pattern: /setState\([^)]*\)[^;]*\}\s*\)(?:\s*;)?\s*\/\/(?:\s*|.*?)(?:in\s+render|inside\s+render|during\s+render)/g,
                category: PERFORMANCE_CATEGORIES.UI_RESPONSIVENESS,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'استدعاء setState داخل دالة render يمكن أن يؤدي إلى حلقة لا نهائية من عمليات إعادة التقديم.',
                recommendation: 'تجنب استدعاء setState داخل render. استخدم componentDidMount أو useEffect بدلاً من ذلك.'
            });
        }

        for (const { pattern, category, severity, description, recommendation } of inefficientDrawingPatterns) {
            pattern.lastIndex = 0;

            let match;
            while ((match = pattern.exec(code)) !== null) {
                const lineNumber = this.getLineNumber(code, match.index);
                const codeSnippet = this.extractCodeSnippet(code, match.index, match[0].length);

                issues.push({
                    title: 'عملية رسم غير فعالة',
                    category,
                    severity,
                    description,
                    recommendation,
                    filePath,
                    lineNumber,
                    codeSnippet,
                    type: 'issue',
                    impact: 'يمكن أن تؤدي إلى تجميد واجهة المستخدم واستهلاك مفرط للبطارية.'
                });
            }
        }
    }

    /**
     * فحص عمليات الشبكة غير الفعالة
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {string} appType - نوع تطبيق الموبايل
     * @param {Array} issues - قائمة بمشاكل الأداء المكتشفة
     */
    checkInefficientNetworkOperations(code, filePath, language, appType, issues) {
        const inefficientNetworkPatterns = [];

        if (language === 'Java' || language === 'Kotlin') {
            // فحص استخدام Volley أو Retrofit بدون آليات التخزين المؤقت
            inefficientNetworkPatterns.push({
                pattern: /Volley|Retrofit/g,
                negative: true, // نبحث عن غياب تقنيات التخزين المؤقت، ليس وجود Volley أو Retrofit نفسه
                negativePattern: /Cache|CacheControl|cacheControl|\.cache\(|cacheTime|cacheStrategy|cacheResponse/g,
                category: PERFORMANCE_CATEGORIES.NETWORK_EFFICIENCY,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام مكتبات الشبكة دون آليات التخزين المؤقت.',
                recommendation: 'قم بتنفيذ استراتيجية تخزين مؤقت للطلبات المتكررة.'
            });
        } else if (language === 'JavaScript' || language === 'TypeScript') {
            // فحص استخدام fetch أو axios بدون تخزين مؤقت
            inefficientNetworkPatterns.push({
                pattern: /fetch\s*\(|axios\./g,
                negative: true,
                negativePattern: /cache|Cache|CACHE|caching|etag|ETag|If-None-Match|axios\.create\([^)]*cache/g,
                category: PERFORMANCE_CATEGORIES.NETWORK_EFFICIENCY,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'عمليات الشبكة بدون آليات التخزين المؤقت.',
                recommendation: 'قم بتنفيذ استراتيجية تخزين مؤقت للطلبات المتكررة.'
            });
        }

        for (const { pattern, negative, negativePattern, category, severity, description, recommendation } of inefficientNetworkPatterns) {
            pattern.lastIndex = 0;

            let match;
            while ((match = pattern.exec(code)) !== null) {
                // إذا كان نمطًا سلبيًا، نتحقق من وجود النمط السلبي في محيط المباراة
                if (negative) {
                    // استخراج السياق المحيط (500 حرف)
                    const contextStart = Math.max(0, match.index - 250);
                    const contextEnd = Math.min(code.length, match.index + match[0].length + 250);
                    const context = code.substring(contextStart, contextEnd);

                    // إذا كان النمط السلبي موجودًا في السياق، تجاهل هذه المباراة
                    if (negativePattern && negativePattern.test(context)) {
                        continue;
                    }
                }

                const lineNumber = this.getLineNumber(code, match.index);
                const codeSnippet = this.extractCodeSnippet(code, match.index, match[0].length);

                issues.push({
                    title: 'عملية شبكة غير فعالة',
                    category,
                    severity,
                    description,
                    recommendation,
                    filePath,
                    lineNumber,
                    codeSnippet,
                    type: 'issue',
                    impact: 'يمكن أن تؤدي إلى استهلاك زائد للبيانات والبطارية وتأخير استجابة التطبيق.'
                });
            }
        }
    }

    /**
     * فحص استخدام السلسلة المتسلسلة في Java
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {Array} issues - قائمة بمشاكل الأداء المكتشفة
     */
    checkStringConcatenation(code, filePath, language, issues) {
        if (language !== 'Java') {
            return;
        }

        // البحث عن استخدام "+" لربط السلاسل النصية في حلقات
        const stringConcatPattern = /for\s*\([^{]*\{[^}]*\+\s*=|\+\s*=.*?\+|String.*?\+\s*=|\+\s*=[^=]*String/gs;

        stringConcatPattern.lastIndex = 0;

        let match;
        while ((match = stringConcatPattern.exec(code)) !== null) {
            const lineNumber = this.getLineNumber(code, match.index);
            const codeSnippet = this.extractCodeSnippet(code, match.index, match[0].length);

            issues.push({
                title: 'استخدام غير فعال لربط السلاسل النصية',
                category: PERFORMANCE_CATEGORIES.COMPUTATION_EFFICIENCY,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام العامل "+" أو "+=" لربط السلاسل النصية في حلقات يمكن أن يؤدي إلى مشاكل أداء خطيرة في Java.',
                recommendation: 'استخدم StringBuilder أو StringBuffer بدلاً من العامل "+" لربط السلاسل النصية في العمليات المتكررة.',
                filePath,
                lineNumber,
                codeSnippet,
                type: 'issue',
                impact: 'ينشئ كائنات String جديدة في كل عملية، مما يؤدي إلى استخدام أكبر للذاكرة وعمليات جمع قمامة أكثر.'
            });
        }
    }

    /**
     * فحص استخدام المعالجة الثقيلة في الخيط الرئيسي
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {string} appType - نوع تطبيق الموبايل
     * @param {Array} issues - قائمة بمشاكل الأداء المكتشفة
     */
    checkMainThreadProcessing(code, filePath, language, appType, issues) {
        const mainThreadPatterns = [];

        if (language === 'Java' || language === 'Kotlin') {
            // البحث عن عمليات ثقيلة في الخيط الرئيسي (UI Thread)
            mainThreadPatterns.push({
                pattern: /onCreate|onStart|onResume|onClick|onItemClick/g,
                context: /Thread\.sleep|for\s*\([^{]*\{[^}]*for\s*\([^{]*\{|while\s*\([^{]*\{[^}]*while|JSONObject|JSONArray|Gson|readLine|FileInputStream|FileOutputStream|HttpURLConnection|Socket/g,
                category: PERFORMANCE_CATEGORIES.UI_RESPONSIVENESS,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'تنفيذ عمليات ثقيلة في الخيط الرئيسي (UI Thread).',
                recommendation: 'نقل العمليات الثقيلة إلى خيوط منفصلة باستخدام AsyncTask أو Executor أو RxJava أو Kotlin Coroutines.'
            });
        } else if (language === 'JavaScript' || language === 'TypeScript' && appType === 'reactNative') {
            // البحث عن عمليات ثقيلة في دالة render أو في معالجي الأحداث
            mainThreadPatterns.push({
                pattern: /render\s*\(\s*\)[^{]*{|onPress\s*=\s*{[^=>]*=>|onPress\s*=\s*{[^}]*function/g,
                context: /for\s*\([^{]*\{[^}]*for\s*\([^{]*\{|while\s*\([^{]*\{[^}]*while|JSON\.parse|JSON\.stringify|\.map\s*\([^)]*\)\s*\.filter|\.filter\s*\([^)]*\)\s*\.map/g,
                category: PERFORMANCE_CATEGORIES.UI_RESPONSIVENESS,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'تنفيذ عمليات ثقيلة في خيط JavaScript الرئيسي.',
                recommendation: 'استخدم InteractionManager أو requestAnimationFrame أو setTimeout لتجدولة العمل كثيف الحساب، أو استخدم Web Workers للعمليات الطويلة.'
            });
        }

        for (const { pattern, context, category, severity, description, recommendation } of mainThreadPatterns) {
            pattern.lastIndex = 0;

            let match;
            while ((match = pattern.exec(code)) !== null) {
                // استخراج السياق المحيط (1000 حرف)
                const contextStart = Math.max(0, match.index - 100);
                const contextEnd = Math.min(code.length, match.index + match[0].length + 900);
                const surroundingCode = code.substring(contextStart, contextEnd);

                // البحث عن أنماط العمليات الثقيلة في السياق
                if (context.test(surroundingCode)) {
                    const lineNumber = this.getLineNumber(code, match.index);
                    const codeSnippet = this.extractCodeSnippet(code, match.index, match[0].length, 200);

                    issues.push({
                        title: 'معالجة ثقيلة في الخيط الرئيسي',
                        category,
                        severity,
                        description,
                        recommendation,
                        filePath,
                        lineNumber,
                        codeSnippet,
                        type: 'issue',
                        impact: 'يمكن أن يؤدي إلى تجميد واجهة المستخدم وتأخير استجابة التطبيق وتجربة مستخدم سيئة وانخفاض تقييمات المستخدم.'
                    });
                }
            }
        }
    }

    /**
     * الحصول على رقم السطر لموقع معين في الكود
     * @param {string} code - الكود المصدر
     * @param {number} position - الموقع في الكود
     * @returns {number} رقم السطر
     */
    getLineNumber(code, position) {
        // حساب عدد أحرف السطر الجديد قبل الموقع المحدد
        const lines = code.substring(0, position).split('\n');
        return lines.length;
    }

    /**
     * استخراج مقتطف من الكود حول موقع معين
     * @param {string} code - الكود المصدر
     * @param {number} position - الموقع في الكود
     * @param {number} matchLength - طول النص المطابق
     * @param {number} contextSize - حجم السياق بالحروف (اختياري)
     * @returns {string} مقتطف من الكود
     */
    extractCodeSnippet(code, position, matchLength, contextSize = 50) {
        // الحصول على النص قبل وبعد الموقع المطابق لإنشاء سياق
        const startPos = Math.max(0, position - contextSize);
        const endPos = Math.min(code.length, position + matchLength + contextSize);

        let snippet = code.substring(startPos, endPos);

        // إذا تم اقتصاص النص من البداية، أضف "..."
        if (startPos > 0) {
            snippet = '...' + snippet;
        }

        // إذا تم اقتصاص النص من النهاية، أضف "..."
        if (endPos < code.length) {
            snippet = snippet + '...';
        }

        return snippet;
    }
}

module.exports = new PerformanceAnalyzer();