const logger = require('../utils/logger');
const { MEMORY_CATEGORIES, SEVERITY_LEVELS } = require('../utils/constants');

/**
 * خدمة تحليل استخدام الذاكرة في الكود
 */
class MemoryAnalyzer {
    /**
     * تحليل الكود للكشف عن مشاكل الذاكرة
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {string} appType - نوع تطبيق الموبايل
     * @returns {Array} قائمة بمشاكل الذاكرة المكتشفة
     */
    analyzeMemoryPatterns(code, filePath, language, appType) {
        const issues = [];

        logger.debug(`تحليل أنماط استخدام الذاكرة للملف: ${filePath}`);

        try {
            // فحص تسريبات الذاكرة المحتملة
            this.checkMemoryLeaks(code, filePath, language, appType, issues);

            // فحص الاستخدام المفرط للذاكرة
            this.checkExcessiveMemoryUsage(code, filePath, language, appType, issues);

            // فحص إدارة الموارد غير الفعالة
            this.checkInefficientResourceManagement(code, filePath, language, appType, issues);

            // فحص المحلات الثابتة (Stateful Singletons) المحتملة
            this.checkStatefulSingletons(code, filePath, language, appType, issues);

            logger.debug(`تم اكتشاف ${issues.length} مشكلة ذاكرة في الملف: ${filePath}`);

            return issues;
        } catch (error) {
            logger.error(`خطأ في تحليل أنماط استخدام الذاكرة: ${error.message}`);
            return issues;
        }
    }

    /**
     * فحص تسريبات الذاكرة المحتملة
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {string} appType - نوع تطبيق الموبايل
     * @param {Array} issues - قائمة بمشاكل الذاكرة المكتشفة
     */
    checkMemoryLeaks(code, filePath, language, appType, issues) {
        const memoryLeakPatterns = [];

        if (language === 'Java' || language === 'Kotlin') {
            // البحث عن الخيوط التي لم يتم إيقافها في Android
            memoryLeakPatterns.push({
                pattern: /(?:new Thread|new AsyncTask|new Handler|new TimerTask|Executors\.)/g,
                negative: true,
                negativePattern: /\.shutdown\(\)|\.shutdownNow\(\)|\.stop\(\)|\.cancel\(\)|\.close\(\)|WeakReference/g,
                category: MEMORY_CATEGORIES.MEMORY_LEAKS,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'إنشاء خيوط أو مهام غير متابعة قد تؤدي إلى تسرب ذاكرة.',
                recommendation: 'تأكد من إيقاف أو إلغاء جميع الخيوط والمهام، خاصة في طرق دورة الحياة مثل onDestroy().'
            });

            // البحث عن استخدام Listeners غير مزالة
            memoryLeakPatterns.push({
                pattern: /(?:addEventListener|addObserver|addListener|addCallback|register\w+Listener)/g,
                negative: true,
                negativePattern: /(?:removeEventListener|removeObserver|removeListener|removeCallback|unregister\w+Listener)/g,
                category: MEMORY_CATEGORIES.MEMORY_LEAKS,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'إضافة مستمعين أو مراقبين دون إزالتهم يمكن أن يسبب تسربات ذاكرة.',
                recommendation: 'تأكد من إزالة جميع المستمعين والمراقبين في طرق دورة الحياة المناسبة مثل onDestroy() أو onDetachedFromWindow().'
            });

            // البحث عن استخدام الإشارات الثابتة static للسياقات
            memoryLeakPatterns.push({
                pattern: /static\s+(?:Context|Activity|Fragment|View|WeakReference<(?:Context|Activity|Fragment|View)>)/g,
                category: MEMORY_CATEGORIES.MEMORY_LEAKS,
                severity: SEVERITY_LEVELS.CRITICAL,
                description: 'استخدام المتغيرات الثابتة (static) للإشارة إلى السياقات أو العناصر المرئية يمكن أن يسبب تسربات ذاكرة كبيرة.',
                recommendation: 'تجنب استخدام متغيرات static للسياقات أو استخدم WeakReference.'
            });
        } else if (language === 'JavaScript' || language === 'TypeScript') {
            // البحث عن المستمعين غير المزالة في React أو React Native
            memoryLeakPatterns.push({
                pattern: /addEventListener\s*\(|on\s*\(\s*['"]/g,
                negative: true,
                negativePattern: /removeEventListener\s*\(|off\s*\(\s*['"]/g,
                category: MEMORY_CATEGORIES.MEMORY_LEAKS,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'إضافة مستمعي الأحداث دون إزالتهم في componentWillUnmount أو عند عودة useEffect.',
                recommendation: 'تأكد من إزالة جميع مستمعي الأحداث في componentWillUnmount أو عند عودة useEffect.'
            });

            // البحث عن setInterval الذي لم يتم مسحه
            memoryLeakPatterns.push({
                pattern: /setInterval\s*\(/g,
                negative: true,
                negativePattern: /clearInterval\s*\(/g,
                category: MEMORY_CATEGORIES.MEMORY_LEAKS,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام setInterval دون clearInterval يمكن أن يسبب تسربات ذاكرة.',
                recommendation: 'تأكد من مسح جميع الفواصل الزمنية باستخدام clearInterval في componentWillUnmount أو عند عودة useEffect.'
            });
        } else if (language === 'Swift') {
            // البحث عن الإشارات الدائرية المحتملة
            memoryLeakPatterns.push({
                pattern: /\{[^}]*\[weak\s+self\][^}]*\}/g,
                negative: true, // نبحث عن غياب [weak self]
                inverse: true,   // عكس النتيجة: مشكلة عند عدم وجود النمط
                category: MEMORY_CATEGORIES.MEMORY_LEAKS,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'استخدام self في إغلاقات دون [weak self] يمكن أن يسبب إشارات دائرية وتسربات ذاكرة.',
                recommendation: 'استخدم [weak self] في الإغلاقات لتفادي الإشارات الدائرية.'
            });
        }

        for (const { pattern, negative, negativePattern, inverse, category, severity, description, recommendation } of memoryLeakPatterns) {
            pattern.lastIndex = 0;

            let match;
            while ((match = pattern.exec(code)) !== null) {
                // إذا كان نمطًا سلبيًا، نتحقق من وجود النمط السلبي في السياق
                if (negative) {
                    // استخراج السياق المحيط (1000 حرف)
                    const contextStart = Math.max(0, match.index - 500);
                    const contextEnd = Math.min(code.length, match.index + match[0].length + 500);
                    const context = code.substring(contextStart, contextEnd);

                    // إذا كان النمط السلبي موجودًا في السياق وليس معكوسًا، أو غير موجود ومعكوسًا، تجاهل هذه المباراة
                    const hasNegativePattern = negativePattern && negativePattern.test(context);
                    if ((hasNegativePattern && !inverse) || (!hasNegativePattern && inverse)) {
                        continue;
                    }
                }

                const lineNumber = this.getLineNumber(code, match.index);
                const codeSnippet = this.extractCodeSnippet(code, match.index, match[0].length);

                issues.push({
                    title: 'تسرب ذاكرة محتمل',
                    category,
                    severity,
                    description,
                    recommendation,
                    filePath,
                    lineNumber,
                    codeSnippet,
                    type: 'issue',
                    impact: 'يمكن أن يؤدي إلى زيادة استهلاك الذاكرة وتدهور أداء التطبيق وحتى انهياره بسبب OutOfMemoryError.'
                });
            }
        }
    }

    /**
     * فحص الاستخدام المفرط للذاكرة
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {string} appType - نوع تطبيق الموبايل
     * @param {Array} issues - قائمة بمشاكل الذاكرة المكتشفة
     */
    checkExcessiveMemoryUsage(code, filePath, language, appType, issues) {
        const excessiveMemoryPatterns = [];

        // أنماط عامة للاستخدام المفرط للذاكرة
        excessiveMemoryPatterns.push({
            pattern: /new\s+byte\s*\[\s*(\d{7,}|[0-9]+\s*\*\s*[0-9]+\s*\*\s*[0-9]+)\s*\]/g,
            category: MEMORY_CATEGORIES.EXCESSIVE_MEMORY_USAGE,
            severity: SEVERITY_LEVELS.HIGH,
            description: 'تخصيص مصفوفات ضخمة من البايتات.',
            recommendation: 'استخدم تقنيات المتابعة (streaming) أو تقسيم البيانات إلى أجزاء أصغر بدلاً من تحميل كميات كبيرة من البيانات في الذاكرة دفعة واحدة.'
        });

        if (language === 'Java' || language === 'Kotlin') {
            // البحث عن استخدام Bitmaps الكبيرة
            excessiveMemoryPatterns.push({
                pattern: /BitmapFactory\.decodeResource|BitmapFactory\.decodeFile|BitmapFactory\.decodeStream/g,
                negative: true,
                negativePattern: /BitmapFactory\.Options|inSampleSize|inJustDecodeBounds/g,
                category: MEMORY_CATEGORIES.EXCESSIVE_MEMORY_USAGE,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'تحميل صور كبيرة دون تقليص الحجم أو تدرج الحجم.',
                recommendation: 'استخدم BitmapFactory.Options لضبط inSampleSize أو استخدم مكتبات تحميل الصور مثل Glide أو Picasso أو Coil.'
            });

            // البحث عن استخدام خيارات التكبير الكبيرة
            excessiveMemoryPatterns.push({
                pattern: /\.setMaximumSize\(\s*(\d{4,})\s*,\s*(\d{4,})\s*\)|\.resize\(\s*(\d{4,})\s*,\s*(\d{4,})\s*\)/g,
                category: MEMORY_CATEGORIES.EXCESSIVE_MEMORY_USAGE,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'تعيين أحجام كبيرة جدًا للصور.',
                recommendation: 'استخدم أحجام أصغر وأكثر كفاءة للصور بناءً على حجم العرض الفعلي.'
            });
        } else if (language === 'JavaScript' || language === 'TypeScript') {
            // البحث عن مصفوفات أو كائنات كبيرة
            excessiveMemoryPatterns.push({
                pattern: /new\s+Array\s*\(\s*(\d{6,})\s*\)/g,
                category: MEMORY_CATEGORIES.EXCESSIVE_MEMORY_USAGE,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'إنشاء مصفوفات كبيرة جدًا قد تستهلك الكثير من الذاكرة.',
                recommendation: 'فكر في استخدام نُهج المتابعة (streaming) أو معالجة البيانات على دفعات بدلاً من تخزينها كلها في الذاكرة.'
            });
        }

        for (const { pattern, negative, negativePattern, category, severity, description, recommendation } of excessiveMemoryPatterns) {
            pattern.lastIndex = 0;

            let match;
            while ((match = pattern.exec(code)) !== null) {
                // تخطي النمط إذا كان سلبيًا ووجدنا النمط السلبي
                if (negative) {
                    const contextStart = Math.max(0, match.index - 200);
                    const contextEnd = Math.min(code.length, match.index + match[0].length + 200);
                    const context = code.substring(contextStart, contextEnd);

                    if (negativePattern && negativePattern.test(context)) {
                        continue;
                    }
                }

                const lineNumber = this.getLineNumber(code, match.index);
                const codeSnippet = this.extractCodeSnippet(code, match.index, match[0].length);

                issues.push({
                    title: 'استخدام مفرط للذاكرة',
                    category,
                    severity,
                    description,
                    recommendation,
                    filePath,
                    lineNumber,
                    codeSnippet,
                    type: 'issue',
                    impact: 'يمكن أن يؤدي إلى نفاد الذاكرة وبطء التطبيق وحتى انهياره.'
                });
            }
        }
    }

    /**
     * فحص إدارة الموارد غير الفعالة
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {string} appType - نوع تطبيق الموبايل
     * @param {Array} issues - قائمة بمشاكل الذاكرة المكتشفة
     */
    checkInefficientResourceManagement(code, filePath, language, appType, issues) {
        const resourcePatterns = [];

        if (language === 'Java' || language === 'Kotlin') {
            // البحث عن موارد لم يتم إغلاقها
            resourcePatterns.push({
                pattern: /new\s+(?:FileInputStream|FileOutputStream|BufferedReader|BufferedWriter|Scanner)/g,
                negative: true,
                negativePattern: /\.close\(\)|try\s*\([^)]*\)|use\s*\{/g,
                category: MEMORY_CATEGORIES.INEFFICIENT_MEMORY_ALLOCATION,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'إنشاء موارد IO دون إغلاقها بشكل صحيح.',
                recommendation: 'استخدم try-with-resources أو use {} في Kotlin للتأكد من إغلاق الموارد بشكل صحيح.'
            });

            // البحث عن عمليات تجميع النفايات اليدوية
            resourcePatterns.push({
                pattern: /System\.gc\(\)/g,
                category: MEMORY_CATEGORIES.INEFFICIENT_MEMORY_ALLOCATION,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استدعاء جامع النفايات يدويًا (System.gc()) ليس ممارسة جيدة.',
                recommendation: 'اترك إدارة الذاكرة للـ JVM بدلاً من استدعاء System.gc() يدويًا.'
            });
        } else if (language === 'Swift' || language === 'Objective-C') {
            // البحث عن موارد Core Graphics غير محررة
            resourcePatterns.push({
                pattern: /CGBitmapContextCreate|CGContextCreate/g,
                negative: true,
                negativePattern: /CGContext[Rr]elease|CFRelease/g,
                category: MEMORY_CATEGORIES.INEFFICIENT_MEMORY_ALLOCATION,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'إنشاء موارد Core Graphics دون تحريرها بشكل صحيح.',
                recommendation: 'تأكد من استدعاء CGContextRelease/CFRelease على موارد Core Graphics عند الانتهاء منها أو استخدم النطاق التلقائي.'
            });
        }

        for (const { pattern, negative, negativePattern, category, severity, description, recommendation } of resourcePatterns) {
            pattern.lastIndex = 0;

            let match;
            while ((match = pattern.exec(code)) !== null) {
                if (negative) {
                    const contextStart = Math.max(0, match.index - 300);
                    const contextEnd = Math.min(code.length, match.index + match[0].length + 300);
                    const context = code.substring(contextStart, contextEnd);

                    if (negativePattern && negativePattern.test(context)) {
                        continue;
                    }
                }

                const lineNumber = this.getLineNumber(code, match.index);
                const codeSnippet = this.extractCodeSnippet(code, match.index, match[0].length);

                issues.push({
                    title: 'إدارة موارد غير فعالة',
                    category,
                    severity,
                    description,
                    recommendation,
                    filePath,
                    lineNumber,
                    codeSnippet,
                    type: 'issue',
                    impact: 'يمكن أن يؤدي إلى تسرب الموارد واستهلاك زائد للذاكرة وتدهور الأداء مع مرور الوقت.'
                });
            }
        }
    }

    /**
     * فحص المحلات الثابتة (Stateful Singletons) المحتملة
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {string} appType - نوع تطبيق الموبايل
     * @param {Array} issues - قائمة بمشاكل الذاكرة المكتشفة
     */
    checkStatefulSingletons(code, filePath, language, appType, issues) {
        // البحث عن أنماط Singleton مع حالة
        const singletonPatterns = [];

        if (language === 'Java' || language === 'Kotlin') {
            singletonPatterns.push({
                pattern: /(?:private|protected)\s+static\s+\w+\s+instance|companion\s+object|object\s+\w+/g,
                context: /(?:ArrayList|HashMap|List|Map|Set|Collection)<|mutable|var\s+(?!final)/g,
                category: MEMORY_CATEGORIES.MEMORY_LEAKS,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام Singleton مع حالة قابلة للتغيير يمكن أن يسبب مشاكل في الذاكرة وتسربات.',
                recommendation: 'تجنب استخدام مجموعات قابلة للتعديل أو متغيرات حالة في كائنات Singleton، أو تأكد من عدم الاحتفاظ بالبيانات لفترة طويلة.'
            });
        } else if (language === 'JavaScript' || language === 'TypeScript') {
            singletonPatterns.push({
                pattern: /(?:const|let|var)\s+\w+\s*=\s*\(\s*(?:function|)\s*\(\s*\)\s*\{[^}]*return\s+\w+/g,
                context: /(?:Array|Map|Set|Object)\s*\(|{|}|\[|\]/g,
                category: MEMORY_CATEGORIES.MEMORY_LEAKS,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام Singleton مع حالة قابلة للتغيير في JavaScript يمكن أن يسبب تسربات ذاكرة.',
                recommendation: 'تجنب تخزين بيانات كبيرة أو مراجع DOM في وحدات Singleton، أو اجعل البيانات قابلة للتنظيف.'
            });
        }

        for (const { pattern, context, category, severity, description, recommendation } of singletonPatterns) {
            pattern.lastIndex = 0;

            let match;
            while ((match = pattern.exec(code)) !== null) {
                // التحقق من وجود حالة في سياق النمط
                const contextStart = Math.max(0, match.index - 100);
                const contextEnd = Math.min(code.length, match.index + match[0].length + 500);
                const surroundingCode = code.substring(contextStart, contextEnd);

                if (context && context.test(surroundingCode)) {
                    const lineNumber = this.getLineNumber(code, match.index);
                    const codeSnippet = this.extractCodeSnippet(code, match.index, match[0].length, 200);

                    issues.push({
                        title: 'Singleton مع حالة قابلة للتغيير',
                        category,
                        severity,
                        description,
                        recommendation,
                        filePath,
                        lineNumber,
                        codeSnippet,
                        type: 'issue',
                        impact: 'يمكن أن يؤدي إلى مشاكل في الذاكرة وتسربات إذا تم الاحتفاظ بمراجع أو بيانات كبيرة.'
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

module.exports = new MemoryAnalyzer();