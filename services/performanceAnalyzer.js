const logger = require('../utils/logger');
const { PERFORMANCE_CATEGORIES, SEVERITY_LEVELS, MOBILE_APP_TYPES } = require('../utils/constants');

/**
 * خدمة تحليل أداء الكود
 */
class PerformanceAnalyzer {
    constructor() {
        logger.info('تهيئة محلل الأداء');

        // إحصائيات للاستخدام
        this.analyzedFilesCount = 0;
        this.issuesFoundCount = 0;
    }

    /**
     * تحليل الكود للكشف عن مشاكل الأداء
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {string} appType - نوع تطبيق الموبايل
     * @returns {Array} قائمة بمشاكل الأداء المكتشفة
     */
    analyzePerformancePatterns(code, filePath, language, appType) {
        this.analyzedFilesCount++;
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

            // فحص استخدام قواعد البيانات غير الفعال
            this.checkInefficientDatabaseOperations(code, filePath, language, appType, issues);

            // فحص استخدام التخزين المؤقت غير الفعال
            this.checkInefficientCaching(code, filePath, language, appType, issues);

            // فحص استخدام العمليات غير المتزامنة
            this.checkAsynchronousOperations(code, filePath, language, appType, issues);

            // فحص الإعادة غير الضرورية لإنشاء الكائنات
            this.checkUnnecessaryObjectCreation(code, filePath, language, issues);

            // فحص معالجة JSON غير الفعالة
            this.checkInefficientJsonProcessing(code, filePath, language, issues);

            logger.debug(`تم اكتشاف ${issues.length} مشكلة أداء في الملف: ${filePath}`);
            this.issuesFoundCount += issues.length;

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
            // حلقات مع استدعاء متكرر لـ size()
            inefficientLoopPatterns.push({
                pattern: /for\s*\(\s*(?:int|Integer)\s+[a-zA-Z0-9_]+\s*=\s*0\s*;\s*[a-zA-Z0-9_]+\s*<\s*[a-zA-Z0-9_]+\.size\(\)\s*;/g,
                category: PERFORMANCE_CATEGORIES.COMPUTATION_EFFICIENCY,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استدعاء متكرر لـ size() داخل حلقة for، مما يؤدي إلى انخفاض الأداء.',
                recommendation: 'قم بتخزين قيمة size() في متغير خارج الحلقة.'
            });

            // حلقات داخل حلقات دون تحسين
            inefficientLoopPatterns.push({
                pattern: /for\s*\([^{]*\)\s*\{[^}]*for\s*\([^{]*\)\s*\{[^}]*for\s*\([^{]*\)/g,
                category: PERFORMANCE_CATEGORIES.COMPUTATION_EFFICIENCY,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'استخدام حلقات متداخلة ثلاثية يمكن أن يؤدي إلى أداء ضعيف (تعقيد O(n³)).',
                recommendation: 'إعادة تصميم الخوارزمية لاستخدام هياكل بيانات أكثر كفاءة أو خوارزميات بتعقيد أقل.'
            });
        } else if (language === 'JavaScript' || language === 'TypeScript') {
            // حلقات مع استدعاء متكرر لـ length
            inefficientLoopPatterns.push({
                pattern: /for\s*\(\s*(?:var|let|const)\s+[a-zA-Z0-9_]+\s*=\s*0\s*;\s*[a-zA-Z0-9_]+\s*<\s*[a-zA-Z0-9_]+\.length\s*;/g,
                category: PERFORMANCE_CATEGORIES.COMPUTATION_EFFICIENCY,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استدعاء متكرر لـ length داخل حلقة for، مما يؤدي إلى انخفاض الأداء.',
                recommendation: 'قم بتخزين قيمة length في متغير خارج الحلقة.'
            });

            // استخدام طرق دالية معًا بشكل متسلسل
            inefficientLoopPatterns.push({
                pattern: /\.map\([^)]+\)\.filter\([^)]+\)\.map\(/g,
                category: PERFORMANCE_CATEGORIES.COMPUTATION_EFFICIENCY,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام متسلسل للدوال الدالية (filter, map) يسبب مرورًا متعددًا عبر المصفوفة.',
                recommendation: 'استخدم reduce() للمرور مرة واحدة عبر المصفوفة، أو قم بسلسلة العمليات بشكل أكثر كفاءة.'
            });
        } else if (language === 'Swift') {
            // تكرار عمليات داخل عبارات التكرار
            inefficientLoopPatterns.push({
                pattern: /for\s+[a-zA-Z0-9_]+\s+in\s+[a-zA-Z0-9_]+\.(?:count|length|characters)/g,
                category: PERFORMANCE_CATEGORIES.COMPUTATION_EFFICIENCY,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استدعاء مكلف داخل نطاق الحلقة في Swift.',
                recommendation: 'قم بتخزين القيمة المحسوبة خارج الحلقة.'
            });
        } else if (language === 'Dart') {
            // حلقات تستخدم عمليات مكلفة داخل تعبير الشرط
            inefficientLoopPatterns.push({
                pattern: /for\s*\([^;]*;\s*[a-zA-Z0-9_]+\s*<\s*[a-zA-Z0-9_]+\.(?:length|size|count)\s*;/g,
                category: PERFORMANCE_CATEGORIES.COMPUTATION_EFFICIENCY,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استدعاء متكرر لخاصية مثل length داخل نطاق الحلقة.',
                recommendation: 'قم بتخزين القيمة في متغير خارج الحلقة.'
            });
        }

        this.checkPatternsAndAddIssues(code, filePath, inefficientLoopPatterns, issues);
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
            // استدعاء invalidate() داخل onDraw()
            inefficientDrawingPatterns.push({
                pattern: /onDraw\([^)]*\)[^{]*{[^}]*invalidate\(\)/gs,
                category: PERFORMANCE_CATEGORIES.UI_RESPONSIVENESS,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'استدعاء invalidate() داخل onDraw() يمكن أن يؤدي إلى حلقة لا نهائية من إعادة الرسم.',
                recommendation: 'تجنب استدعاء invalidate() داخل onDraw() مباشرة.'
            });

            // إنشاء كائنات Paint داخل onDraw()
            inefficientDrawingPatterns.push({
                pattern: /onDraw\([^)]*\)[^{]*{[^}]*new\s+Paint\(/gs,
                category: PERFORMANCE_CATEGORIES.UI_RESPONSIVENESS,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'إنشاء كائنات Paint جديدة داخل onDraw() يؤدي إلى تخصيص ذاكرة غير ضروري في كل إطار.',
                recommendation: 'قم بإنشاء كائنات Paint كمتغيرات عضو وإعادة استخدامها.'
            });

            // استخدام التحويلات المعقدة في عمليات الرسم
            inefficientDrawingPatterns.push({
                pattern: /onDraw\([^)]*\)[^{]*{[^}]*(?:rotate|scale|translate|transform|concat)/gs,
                category: PERFORMANCE_CATEGORIES.UI_RESPONSIVENESS,
                severity: SEVERITY_LEVELS.LOW,
                description: 'استخدام تحويلات Matrix معقدة داخل onDraw() يمكن أن يؤثر على أداء الرسم.',
                recommendation: 'حاول تبسيط التحويلات أو حساب القيم المحولة مسبقًا.'
            });
        } else if (language === 'JavaScript' || language === 'TypeScript') {
            if (appType === 'reactNative') {
                // استخدام setState داخل دالة render
                inefficientDrawingPatterns.push({
                    pattern: /setState\([^)]*\)[^;]*\}\s*\)(?:\s*;)?\s*\/\/(?:\s*|.*?)(?:in\s+render|inside\s+render|during\s+render)/g,
                    category: PERFORMANCE_CATEGORIES.UI_RESPONSIVENESS,
                    severity: SEVERITY_LEVELS.HIGH,
                    description: 'استدعاء setState داخل دالة render يمكن أن يؤدي إلى حلقة لا نهائية من عمليات إعادة التقديم.',
                    recommendation: 'تجنب استدعاء setState داخل render. استخدم componentDidMount أو useEffect بدلاً من ذلك.'
                });

                // عدم استخدام مذكرة للمكونات الثقيلة
                inefficientDrawingPatterns.push({
                    pattern: /(?:export\s+(?:default\s+)?class\s+\w+\s+extends\s+(?:React\.)?Component|function\s+\w+\s*\([^)]*\)\s*{[^}]*return\s*\()/g,
                    negative: true,
                    negativePattern: /React\.memo\(|memo\(|PureComponent|shouldComponentUpdate/g,
                    category: PERFORMANCE_CATEGORIES.UI_RESPONSIVENESS,
                    severity: SEVERITY_LEVELS.MEDIUM,
                    description: 'عدم استخدام React.memo أو PureComponent للمكونات التي تتلقى نفس البيانات.',
                    recommendation: 'استخدم React.memo للمكونات الوظيفية أو PureComponent للمكونات الفئوية لتجنب عمليات إعادة التقديم غير الضرورية.'
                });

                // تغيير حجم الصور في وقت التشغيل
                inefficientDrawingPatterns.push({
                    pattern: /<Image\s+[^>]*style\s*=\s*\{[^}]*(?:width|height):.+?\}/g,
                    negative: true,
                    negativePattern: /resizeMode\s*:/g,
                    category: PERFORMANCE_CATEGORIES.UI_RESPONSIVENESS,
                    severity: SEVERITY_LEVELS.MEDIUM,
                    description: 'تحجيم الصور في وقت التشغيل دون تحديد resizeMode يمكن أن يؤثر على الأداء.',
                    recommendation: 'حدد resizeMode المناسب للصور لتحسين أداء التقديم.'
                });
            }
        } else if (language === 'Dart' && appType === 'flutter') {
            // عدم استخدام const للويدجت الثابتة
            inefficientDrawingPatterns.push({
                pattern: /(?:Text|Container|Icon|Padding|Center)\(/g,
                negative: true,
                negativePattern: /const\s+(?:Text|Container|Icon|Padding|Center)\(/g,
                category: PERFORMANCE_CATEGORIES.UI_RESPONSIVENESS,
                severity: SEVERITY_LEVELS.LOW,
                description: 'عدم استخدام const للويدجت الثابتة يمنع Flutter من تخزين مؤقت للعناصر.',
                recommendation: 'استخدم const constructor للويدجت الثابتة التي لا تتغير قيمها.'
            });
        }

        this.checkPatternsAndAddIssues(code, filePath, inefficientDrawingPatterns, issues);
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
            // استخدام Volley أو Retrofit بدون آليات التخزين المؤقت
            inefficientNetworkPatterns.push({
                pattern: /Volley|Retrofit/g,
                negative: true,
                negativePattern: /Cache|CacheControl|cacheControl|\.cache\(|cacheTime|cacheStrategy|cacheResponse/g,
                category: PERFORMANCE_CATEGORIES.NETWORK_EFFICIENCY,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام مكتبات الشبكة دون آليات التخزين المؤقت.',
                recommendation: 'قم بتنفيذ استراتيجية تخزين مؤقت للطلبات المتكررة.'
            });

            // عدم استخدام محولات Gzip للضغط
            inefficientNetworkPatterns.push({
                pattern: /OkHttpClient|HttpURLConnection/g,
                negative: true,
                negativePattern: /GzipInterceptor|Gzip|gzip|compress|decompress|Content-Encoding|setRequestProperty\([^)]*"Accept-Encoding"|addHeader\([^)]*"Accept-Encoding"/g,
                category: PERFORMANCE_CATEGORIES.NETWORK_EFFICIENCY,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'عدم استخدام ضغط Gzip للطلبات والاستجابات الشبكية.',
                recommendation: 'قم بتنفيذ Gzip Interceptor أو أضف رؤوس Accept-Encoding لتقليل حجم البيانات المنقولة.'
            });
        } else if (language === 'JavaScript' || language === 'TypeScript') {
            // استخدام fetch أو axios بدون تخزين مؤقت
            inefficientNetworkPatterns.push({
                pattern: /fetch\s*\(|axios\./g,
                negative: true,
                negativePattern: /cache|Cache|CACHE|caching|etag|ETag|If-None-Match|axios\.create\([^)]*cache/g,
                category: PERFORMANCE_CATEGORIES.NETWORK_EFFICIENCY,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'عمليات الشبكة بدون آليات التخزين المؤقت.',
                recommendation: 'قم بتنفيذ استراتيجية تخزين مؤقت للطلبات المتكررة.'
            });

            // العديد من استدعاءات الشبكة المتتالية
            inefficientNetworkPatterns.push({
                pattern: /(?:fetch|axios\.get|axios\.post).*?\n.*?(?:fetch|axios\.get|axios\.post).*?\n.*?(?:fetch|axios\.get|axios\.post)/g,
                negative: true,
                negativePattern: /Promise\.all\(|await\s+Promise\.all\(/g,
                category: PERFORMANCE_CATEGORIES.NETWORK_EFFICIENCY,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'العديد من استدعاءات الشبكة المتتالية بدلاً من الطلبات المتوازية.',
                recommendation: 'استخدم Promise.all() لتنفيذ طلبات الشبكة المستقلة بالتوازي.'
            });
        } else if (language === 'Swift') {
            // استخدام URLSession بدون تكوين التخزين المؤقت
            inefficientNetworkPatterns.push({
                pattern: /URLSession|dataTask|uploadTask|downloadTask/g,
                negative: true,
                negativePattern: /URLCache|cache|requestCachePolicy|\.storedResponse|NSURLRequestCachePolicy|URLRequest\([^)]*cachePolicy/g,
                category: PERFORMANCE_CATEGORIES.NETWORK_EFFICIENCY,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام URLSession بدون سياسة تخزين مؤقت محددة.',
                recommendation: 'حدد requestCachePolicy مناسبة أو قم بتكوين URLCache لتحسين أداء الشبكة.'
            });
        } else if (language === 'Dart' && appType === 'flutter') {
            // استخدام http أو dio بدون تخزين مؤقت
            inefficientNetworkPatterns.push({
                pattern: /http\.(?:get|post|put|delete)|dio\.|Dio\(|HttpClient/g,
                negative: true,
                negativePattern: /Cache|cache|CacheManager|cacheManager|cacheOptions|ETag|etag|If-None-Match/g,
                category: PERFORMANCE_CATEGORIES.NETWORK_EFFICIENCY,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام طلبات HTTP دون آليات التخزين المؤقت.',
                recommendation: 'قم بتنفيذ استراتيجية تخزين مؤقت مثل flutter_cache_manager أو تكوين خيارات التخزين المؤقت في حزمة dio.'
            });
        }

        this.checkPatternsAndAddIssues(code, filePath, inefficientNetworkPatterns, issues);
    }

    /**
     * فحص استخدام السلسلة المتسلسلة في Java
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {Array} issues - قائمة بمشاكل الأداء المكتشفة
     */
    checkStringConcatenation(code, filePath, language, issues) {
        if (language !== 'Java' && language !== 'Kotlin') {
            return;
        }

        // البحث عن استخدام "+" لربط السلاسل النصية في حلقات
        const stringConcatPatterns = [
            {
                pattern: /for\s*\([^{]*\{[^}]*\+\s*=|\+\s*=.*?\+|String.*?\+\s*=|\+\s*=[^=]*String/gs,
                category: PERFORMANCE_CATEGORIES.COMPUTATION_EFFICIENCY,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام غير فعال لربط السلاسل النصية باستخدام العامل "+" أو "+=".',
                recommendation: 'استخدم StringBuilder أو StringBuffer بدلاً من العامل "+" لربط السلاسل النصية في العمليات المتكررة.'
            },
            {
                pattern: /for\s*\([^{]*\{[^}]*String\s+\w+\s*=\s*""/gs,
                category: PERFORMANCE_CATEGORIES.COMPUTATION_EFFICIENCY,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'تهيئة String فارغة داخل حلقة لغرض البناء التراكمي.',
                recommendation: 'استخدم StringBuilder للأداء الأفضل عند بناء السلاسل النصية تراكميًا.'
            }
        ];

        this.checkPatternsAndAddIssues(code, filePath, stringConcatPatterns, issues);
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

            // البحث عن عمليات قواعد البيانات في الخيط الرئيسي
            mainThreadPatterns.push({
                pattern: /onCreate|onStart|onResume|onClick|onItemClick/g,
                context: /SQLiteDatabase|ContentResolver|Realm\.|Room\.|insert\(|update\(|delete\(|query\(|rawQuery\(/g,
                category: PERFORMANCE_CATEGORIES.UI_RESPONSIVENESS,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'تنفيذ عمليات قواعد البيانات في الخيط الرئيسي.',
                recommendation: 'نقل عمليات قواعد البيانات إلى خيوط الخلفية باستخدام AsyncTask أو Room مع LiveData/Flow أو Kotlin Coroutines.'
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

            // البحث عن عمليات التحويل الكثيفة في المكونات
            mainThreadPatterns.push({
                pattern: /render\s*\(\s*\)[^{]*{|useEffect\s*\(\s*\(\s*\)|componentDidMount\s*\(\s*\)/g,
                context: /Array\.from|Object\.keys|\.reduce\s*\(|\.sort\s*\(|\.map\s*\(|new Array\(|new Map\(|new Set\(/g,
                category: PERFORMANCE_CATEGORIES.UI_RESPONSIVENESS,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'تنفيذ عمليات تحويل البيانات الكثيفة عند كل تقديم.',
                recommendation: 'استخدم useMemo أو useCallback لتخزين نتائج التحويلات الكثيفة ومنع إعادة الحساب غير الضروري.'
            });
        } else if (language === 'Swift') {
            // البحث عن عمليات كثيفة في ViewController lifecycle methods
            mainThreadPatterns.push({
                pattern: /viewDidLoad\s*\(\s*\)|viewWillAppear|viewDidAppear/g,
                context: /for\s+[^{]*\{[^}]*for\s+|while\s+[^{]*\{[^}]*while|JSONSerialization|Data\(|FileManager|URLSession|sqlite|CoreData|NSFetchRequest/g,
                category: PERFORMANCE_CATEGORIES.UI_RESPONSIVENESS,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'تنفيذ عمليات ثقيلة في خيط الواجهة الرئيسي.',
                recommendation: 'نقل العمليات الكثيفة إلى خيوط الخلفية باستخدام DispatchQueue.global أو Operation.'
            });
        } else if (language === 'Dart' && appType === 'flutter') {
            // البحث عن عمليات كثيفة في بناء الويدجت
            mainThreadPatterns.push({
                pattern: /build\s*\(\s*[^)]*\)\s*(?:async\s*)?{/g,
                context: /for\s*\([^)]*\)\s*{[^}]*for|while\s*\([^)]*\)\s*{|jsonDecode|jsonEncode|File\.|http\.|compute\(/g,
                category: PERFORMANCE_CATEGORIES.UI_RESPONSIVENESS,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'تنفيذ عمليات ثقيلة في طريقة build، مما قد يؤثر على سلاسة واجهة المستخدم.',
                recommendation: 'استخدم compute() لنقل المعالجة المكثفة إلى خيط منفصل، أو انقل المعالجة إلى initState واستخدم FutureBuilder.'
            });
        }

        this.checkPatternsAndAddIssues(code, filePath, mainThreadPatterns, issues);
    }

    /**
     * فحص استخدام قواعد البيانات غير الفعال
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {string} appType - نوع تطبيق الموبايل
     * @param {Array} issues - قائمة بمشاكل الأداء المكتشفة
     */
    checkInefficientDatabaseOperations(code, filePath, language, appType, issues) {
        const databasePatterns = [];

        if (language === 'Java' || language === 'Kotlin') {
            // عدم استخدام الإعدادات المجمعة في عمليات قاعدة البيانات
            databasePatterns.push({
                pattern: /SQLiteDatabase|ContentResolver/g,
                negative: true,
                negativePattern: /beginTransaction|setTransactionSuccessful|endTransaction/g,
                category: PERFORMANCE_CATEGORIES.DATABASE_PERFORMANCE,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'عدم استخدام المعاملات لتجميع عمليات قاعدة البيانات المتعددة.',
                recommendation: 'استخدم beginTransaction و endTransaction لتجميع العمليات المتعددة وتحسين الأداء.'
            });

            // عدم استخدام استعلامات معدة مسبقًا
            databasePatterns.push({
                pattern: /(?:rawQuery|execSQL)\s*\(\s*"[^"]+\s+(?:=|LIKE|IN|>|<)\s+[^"]*\?\s*"/g,
                negative: true,
                negativePattern: /SQLiteStatement|compileStatement/g,
                category: PERFORMANCE_CATEGORIES.DATABASE_PERFORMANCE,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'عدم استخدام الاستعلامات المعدة مسبقًا لاستعلامات قاعدة البيانات المتكررة.',
                recommendation: 'استخدم SQLiteStatement أو compileStatement للاستعلامات المتكررة لتحسين الأداء.'
            });

            // استعلامات دون تحديد الأعمدة المطلوبة
            databasePatterns.push({
                pattern: /query\s*\([^)]*null\s*\)|query\s*\([^)]*\*[^)]*\)/g,
                category: PERFORMANCE_CATEGORIES.DATABASE_PERFORMANCE,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استرجاع جميع الأعمدة (استخدام * أو projection=null) في استعلامات قاعدة البيانات.',
                recommendation: 'حدد بوضوح الأعمدة المطلوبة فقط لتقليل استخدام الذاكرة وتحسين أداء الاستعلام.'
            });
        } else if (language === 'JavaScript' || language === 'TypeScript') {
            // عدم استخدام الفهارس في استعلامات IndexedDB
            databasePatterns.push({
                pattern: /indexedDB|createObjectStore/g,
                negative: true,
                negativePattern: /createIndex|index\(/g,
                category: PERFORMANCE_CATEGORIES.DATABASE_PERFORMANCE,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'عدم استخدام الفهارس في IndexedDB يمكن أن يؤدي إلى أداء ضعيف في عمليات البحث.',
                recommendation: 'قم بإنشاء فهارس على الحقول التي ستبحث عنها بشكل متكرر باستخدام createIndex.'
            });

            // استخدام الاستعلامات المتسلسلة على قواعد البيانات
            databasePatterns.push({
                pattern: /db\.(?:collection|get|query|find)\([^)]*\)\s*\.\s*then[^.]*\.[^.]*db\.(?:collection|get|query|find)/g,
                category: PERFORMANCE_CATEGORIES.DATABASE_PERFORMANCE,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استعلامات متسلسلة على قاعدة البيانات يمكن أن تؤدي إلى تأخير كبير.',
                recommendation: 'استخدم الاستعلامات المتزامنة أو استعلامات الدفعة حيثما أمكن ذلك.'
            });
        } else if (language === 'Swift') {
            // استعلامات Core Data بدون fetchLimit أو fetchBatchSize
            databasePatterns.push({
                pattern: /NSFetchRequest|fetch\(/g,
                negative: true,
                negativePattern: /fetchLimit|fetchBatchSize|fetchOffset/g,
                category: PERFORMANCE_CATEGORIES.DATABASE_PERFORMANCE,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام NSFetchRequest دون تحديد fetchLimit أو fetchBatchSize قد يؤدي إلى استهلاك ذاكرة مفرط.',
                recommendation: 'حدد fetchLimit و/أو fetchBatchSize عند استرجاع مجموعات كبيرة من البيانات.'
            });
        } else if (language === 'Dart') {
            // استعلامات قاعدة البيانات بدون تحديد الحد
            databasePatterns.push({
                pattern: /\.(query|rawQuery|find)\(/g,
                negative: true,
                negativePattern: /\.(?:query|rawQuery)\([^)]*limit|\.find\([^)]*limit/g,
                category: PERFORMANCE_CATEGORIES.DATABASE_PERFORMANCE,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام استعلامات قاعدة البيانات بدون تحديد limit قد يؤدي إلى استرجاع بيانات زائدة.',
                recommendation: 'قم دائمًا بتحديد limit في استعلامات قاعدة البيانات، خاصة عند التعامل مع مجموعات بيانات كبيرة.'
            });
        }

        this.checkPatternsAndAddIssues(code, filePath, databasePatterns, issues);
    }

    /**
     * فحص استخدام التخزين المؤقت غير الفعال
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {string} appType - نوع تطبيق الموبايل
     * @param {Array} issues - قائمة بمشاكل الأداء المكتشفة
     */
    checkInefficientCaching(code, filePath, language, appType, issues) {
        const cachingPatterns = [];

        if (language === 'Java' || language === 'Kotlin') {
            // عدم استخدام LruCache لتخزين الصور مؤقتًا
            cachingPatterns.push({
                pattern: /Bitmap|BitmapFactory|getDrawable|decodeResource|decodeFile|decodeStream/g,
                negative: true,
                negativePattern: /LruCache|Cache|cache|Glide|Picasso|Coil/g,
                category: PERFORMANCE_CATEGORIES.CACHE_HIT_RATE,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'تحميل الصور دون آلية تخزين مؤقت مناسبة.',
                recommendation: 'استخدم LruCache لتخزين الصور أو استخدم مكتبات مثل Glide أو Picasso أو Coil التي تدير التخزين المؤقت بشكل فعال.'
            });

            // عدم استخدام التخزين المؤقت للبيانات المتكررة
            cachingPatterns.push({
                pattern: /SharedPreferences|getSharedPreferences|getPreferences/g,
                negative: true,
                negativePattern: /apply\(\)|commit\(\)/g,
                category: PERFORMANCE_CATEGORIES.CACHE_HIT_RATE,
                severity: SEVERITY_LEVELS.LOW,
                description: 'قراءة من SharedPreferences دون تخزين القيم المستخدمة بشكل متكرر في الذاكرة.',
                recommendation: 'قم بتخزين القيم المستخدمة بشكل متكرر في متغيرات عضو بدلاً من قراءتها في كل مرة من SharedPreferences.'
            });
        } else if (language === 'JavaScript' || language === 'TypeScript') {
            // عدم استخدام memorization لنتائج الدوال المتكررة
            cachingPatterns.push({
                pattern: /function\s+(?:get|calculate|compute|find|search|filter|sort)/g,
                negative: true,
                negativePattern: /useCallback|useMemo|memoize|React\.memo|memo\(/g,
                category: PERFORMANCE_CATEGORIES.CACHE_HIT_RATE,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'دوال حسابية دون تخزين النتائج السابقة.',
                recommendation: 'استخدم useMemo أو useCallback في React، أو memoize-one أو تقنيات التخزين المؤقت الأخرى للعمليات المتكررة.'
            });

            // عدم استخدام service workers للتخزين المؤقت
            if (appType === 'web') {
                cachingPatterns.push({
                    pattern: /fetch\s*\(/g,
                    negative: true,
                    negativePattern: /navigator\.serviceWorker|workbox|registerServiceWorker/g,
                    category: PERFORMANCE_CATEGORIES.CACHE_HIT_RATE,
                    severity: SEVERITY_LEVELS.MEDIUM,
                    description: 'استخدام عمليات الشبكة دون service worker للتخزين المؤقت.',
                    recommendation: 'قم بتنفيذ service worker باستخدام إطار عمل مثل Workbox لتخزين الأصول والطلبات بشكل مؤقت.'
                });
            }
        } else if (language === 'Swift') {
            // عدم استخدام NSCache لتخزين الكائنات مؤقتًا
            cachingPatterns.push({
                pattern: /UIImage\(|dataTask|downloadTask|URLSession/g,
                negative: true,
                negativePattern: /NSCache|cache|Cache|SDWebImage|Kingfisher/g,
                category: PERFORMANCE_CATEGORIES.CACHE_HIT_RATE,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'تحميل الصور أو البيانات دون آلية تخزين مؤقت.',
                recommendation: 'استخدم NSCache لتخزين البيانات المستخدمة بشكل متكرر أو استخدم مكتبات مثل SDWebImage أو Kingfisher لتخزين الصور.'
            });
        } else if (language === 'Dart' && appType === 'flutter') {
            // عدم استخدام التخزين المؤقت للصور
            cachingPatterns.push({
                pattern: /Image\.network\(/g,
                negative: true,
                negativePattern: /cached_network_image|CachedNetworkImage|cacheHeight|cacheWidth/g,
                category: PERFORMANCE_CATEGORIES.CACHE_HIT_RATE,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام Image.network دون التخزين المؤقت للصور.',
                recommendation: 'استخدم مكتبة cached_network_image أو حدد cacheHeight و cacheWidth لتحسين أداء تحميل الصور.'
            });
        }

        this.checkPatternsAndAddIssues(code, filePath, cachingPatterns, issues);
    }

    /**
     * فحص استخدام العمليات غير المتزامنة
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {string} appType - نوع تطبيق الموبايل
     * @param {Array} issues - قائمة بمشاكل الأداء المكتشفة
     */
    checkAsynchronousOperations(code, filePath, language, appType, issues) {
        const asyncPatterns = [];

        if (language === 'Java') {
            // استخدام خيوط بدلاً من Executor أو AsyncTask
            asyncPatterns.push({
                pattern: /new Thread\([^)]*\)\.start\(\)/g,
                category: PERFORMANCE_CATEGORIES.THREAD_MANAGEMENT,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام Thread بدلاً من Executor أو ThreadPool.',
                recommendation: 'استخدم ExecutorService أو ThreadPoolExecutor للحصول على إدارة أفضل للخيوط.'
            });
        } else if (language === 'Kotlin') {
            // عدم استخدام Coroutines لعمليات الخلفية
            asyncPatterns.push({
                pattern: /Thread\(|Runnable|Handler|AsyncTask/g,
                category: PERFORMANCE_CATEGORIES.THREAD_MANAGEMENT,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام آليات الخيوط القديمة بدلاً من Kotlin Coroutines.',
                recommendation: 'استخدم Kotlin Coroutines للعمليات غير المتزامنة لتبسيط الكود وتحسين الأداء.'
            });
        } else if (language === 'JavaScript' || language === 'TypeScript') {
            // استخدام الوعود بشكل متسلسل عندما يمكن توازيها
            asyncPatterns.push({
                pattern: /\.then\([^)]*\)\.then\([^)]*\)\.then\(/g,
                negative: true,
                negativePattern: /Promise\.all\(|await Promise\.all\(/g,
                category: PERFORMANCE_CATEGORIES.ASYNC_TASK_EXECUTION,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'سلسلة طويلة من وعود متتالية.',
                recommendation: 'استخدم Promise.all() للوعود المستقلة لتنفيذها بالتوازي.'
            });

            // عدم استخدام async/await بدلاً من callbacks أو وعود
            asyncPatterns.push({
                pattern: /\.then\([^)]*\)\.catch\(/g,
                category: PERFORMANCE_CATEGORIES.ASYNC_TASK_EXECUTION,
                severity: SEVERITY_LEVELS.LOW,
                description: 'استخدام then/catch بدلاً من async/await.',
                recommendation: 'فكر في استخدام async/await لتحسين قراءة الكود وصيانته.'
            });
        } else if (language === 'Swift') {
            // استخدام GCD مع بعض الأصول
            asyncPatterns.push({
                pattern: /DispatchQueue\.main\.async\s*\{[^}]*DispatchQueue\.main\.async/g,
                category: PERFORMANCE_CATEGORIES.THREAD_MANAGEMENT,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام متداخل للـ DispatchQueue.main.async الذي قد يؤدي إلى تأخير غير ضروري.',
                recommendation: 'تجنب تداخل استدعاءات DispatchQueue.main.async وجمع العمليات في كتلة واحدة إذا أمكن.'
            });
        } else if (language === 'Dart') {
            // عدم استخدام async/await مع Future
            asyncPatterns.push({
                pattern: /Future<[^>]*>\s+\w+\([^)]*\)\s*{[^}]*return\s+[^;]*\.then\(/g,
                category: PERFORMANCE_CATEGORIES.ASYNC_TASK_EXECUTION,
                severity: SEVERITY_LEVELS.LOW,
                description: 'استخدام then() في دالة تعيد Future بدلاً من async/await.',
                recommendation: 'استخدم async/await لتبسيط كود العمليات غير المتزامنة.'
            });
        }

        this.checkPatternsAndAddIssues(code, filePath, asyncPatterns, issues);
    }

    /**
     * فحص الإعادة غير الضرورية لإنشاء الكائنات
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {Array} issues - قائمة بمشاكل الأداء المكتشفة
     */
    checkUnnecessaryObjectCreation(code, filePath, language, issues) {
        const objectCreationPatterns = [];

        if (language === 'Java' || language === 'Kotlin') {
            // إنشاء متكرر لكائنات SimpleDateFormat
            objectCreationPatterns.push({
                pattern: /new\s+SimpleDateFormat\(/g,
                category: PERFORMANCE_CATEGORIES.OBJECT_POOLING,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'إنشاء متكرر لكائنات SimpleDateFormat.',
                recommendation: 'استخدم ThreadLocal<SimpleDateFormat> أو كائنًا ثابتًا أو استخدم DateTimeFormatter في Java 8+.'
            });

            // إنشاء كائنات المقارنة داخل طرق المقارنة
            objectCreationPatterns.push({
                pattern: /(?:compare|compareTo|sort)[^{]*\{[^}]*new\s+(?:Comparator|Collator)/g,
                category: PERFORMANCE_CATEGORIES.EXCESSIVE_OBJECT_CREATION,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'إنشاء كائنات مقارنة جديدة داخل طرق المقارنة.',
                recommendation: 'قم بتخزين كائنات المقارنة المستخدمة بشكل متكرر كمتغيرات ثابتة.'
            });
        } else if (language === 'JavaScript' || language === 'TypeScript') {
            // إنشاء دوال مجهولة داخل JSX
            objectCreationPatterns.push({
                pattern: /<[A-Z][^>]*\s+on(?:Click|Change|Submit)\s*=\s*\{(?:\([^)]*\)|function)/g,
                category: PERFORMANCE_CATEGORIES.EXCESSIVE_OBJECT_CREATION,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'إنشاء دوال معالج أحداث جديدة مع كل عملية تقديم.',
                recommendation: 'استخدم useCallback لتخزين دوال معالجات الأحداث بين التقديمات.'
            });

            // إنشاء كائنات أنماط داخل JSX
            objectCreationPatterns.push({
                pattern: /<[^>]*\s+style\s*=\s*\{\s*\{/g,
                category: PERFORMANCE_CATEGORIES.EXCESSIVE_OBJECT_CREATION,
                severity: SEVERITY_LEVELS.LOW,
                description: 'إنشاء كائنات أنماط جديدة مع كل عملية تقديم.',
                recommendation: 'قم بتخزين كائنات الأنماط خارج المكون أو استخدم useMemo.'
            });
        } else if (language === 'Swift') {
            // إنشاء formatters متكرر
            objectCreationPatterns.push({
                pattern: /DateFormatter\(\)|NumberFormatter\(\)|MeasurementFormatter\(\)/g,
                category: PERFORMANCE_CATEGORIES.EXCESSIVE_OBJECT_CREATION,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'إنشاء formatters جديدة بشكل متكرر.',
                recommendation: 'قم بتخزين formatters كخصائص أو استخدم خصائص ثابتة لإعادة استخدامها.'
            });
        } else if (language === 'Dart') {
            // إنشاء TextStyle في كل إعادة بناء
            objectCreationPatterns.push({
                pattern: /TextStyle\(/g,
                category: PERFORMANCE_CATEGORIES.EXCESSIVE_OBJECT_CREATION,
                severity: SEVERITY_LEVELS.LOW,
                description: 'إنشاء كائنات TextStyle جديدة في كل إعادة بناء.',
                recommendation: 'استخدم const TextStyle() للأنماط الثابتة أو قم بتعريف TextStyle كثابت على مستوى الفئة.'
            });
        }

        this.checkPatternsAndAddIssues(code, filePath, objectCreationPatterns, issues);
    }

    /**
     * فحص معالجة JSON غير الفعالة
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {Array} issues - قائمة بمشاكل الأداء المكتشفة
     */
    checkInefficientJsonProcessing(code, filePath, language, issues) {
        const jsonPatterns = [];

        if (language === 'Java' || language === 'Kotlin') {
            // استخدام JSONObject بدلاً من مكتبات أكثر كفاءة
            jsonPatterns.push({
                pattern: /new\s+JSONObject\(|new\s+JSONArray\(/g,
                negative: true,
                negativePattern: /Gson|Moshi|Jackson|kotlinx\.serialization/g,
                category: PERFORMANCE_CATEGORIES.COMPUTATION_EFFICIENCY,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام JSONObject/JSONArray بدلاً من مكتبات تحليل JSON أكثر كفاءة.',
                recommendation: 'فكر في استخدام Gson أو Moshi أو Jackson أو kotlinx.serialization لتحليل JSON بشكل أكثر كفاءة.'
            });
        } else if (language === 'JavaScript' || language === 'TypeScript') {
            // تحليل وتنسيق الـ JSON بشكل متكرر
            jsonPatterns.push({
                pattern: /JSON\.parse\([^)]*JSON\.stringify\([^)]*\)\)/g,
                category: PERFORMANCE_CATEGORIES.COMPUTATION_EFFICIENCY,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام JSON.parse(JSON.stringify()) لنسخ كائنات عميقة.',
                recommendation: 'استخدم مكتبات أكثر كفاءة مثل lodash/cloneDeep أو structuredClone() الجديدة إذا كانت متاحة.'
            });
        } else if (language === 'Swift') {
            // استخدام JSONSerialization بدلاً من Codable
            jsonPatterns.push({
                pattern: /JSONSerialization/g,
                negative: true,
                negativePattern: /Codable|Decodable|Encodable|JSONDecoder|JSONEncoder/g,
                category: PERFORMANCE_CATEGORIES.COMPUTATION_EFFICIENCY,
                severity: SEVERITY_LEVELS.LOW,
                description: 'استخدام JSONSerialization بدلاً من Codable.',
                recommendation: 'استخدم Codable مع JSONEncoder/JSONDecoder للحصول على ترميز/فك ترميز JSON أكثر أمانًا وكفاءة.'
            });
        } else if (language === 'Dart') {
            // استخدام convert مباشرة بدلاً من fromJson
            jsonPatterns.push({
                pattern: /jsonDecode\(|json\.decode\(|jsonEncode\(|json\.encode\(/g,
                negative: true,
                negativePattern: /fromJson|toJson/g,
                category: PERFORMANCE_CATEGORIES.COMPUTATION_EFFICIENCY,
                severity: SEVERITY_LEVELS.LOW,
                description: 'استخدام jsonDecode/jsonEncode مباشرة بدلاً من طرق fromJson/toJson.',
                recommendation: 'قم بإنشاء طرق fromJson/toJson في فئات النموذج الخاصة بك لتبسيط تحليل/تنسيق JSON.'
            });
        }

        this.checkPatternsAndAddIssues(code, filePath, jsonPatterns, issues);
    }

    /**
     * فحص الأنماط وإضافة المشكلات
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {Array} patterns - أنماط البحث
     * @param {Array} issues - قائمة بمشاكل الأداء المكتشفة
     */
    checkPatternsAndAddIssues(code, filePath, patterns, issues) {
        for (const patternInfo of patterns) {
            patternInfo.pattern.lastIndex = 0; // إعادة تعيين lastIndex للتعبير العادي

            let match;
            while ((match = patternInfo.pattern.exec(code)) !== null) {
                // إذا كان نمطًا سلبيًا، نتحقق من وجود النمط السلبي في محيط المباراة
                if (patternInfo.negative) {
                    // استخراج السياق المحيط (500 حرف)
                    const contextStart = Math.max(0, match.index - 250);
                    const contextEnd = Math.min(code.length, match.index + match[0].length + 250);
                    const context = code.substring(contextStart, contextEnd);

                    // إذا كان النمط السلبي موجودًا في السياق، تجاهل هذه المباراة
                    if (patternInfo.negativePattern && patternInfo.negativePattern.test(context)) {
                        continue;
                    }
                }

                // للأنماط التي تتطلب سياقًا محددًا
                if (patternInfo.context) {
                    // استخراج السياق المحيط (1000 حرف)
                    const contextStart = Math.max(0, match.index - 500);
                    const contextEnd = Math.min(code.length, match.index + match[0].length + 500);
                    const surroundingCode = code.substring(contextStart, contextEnd);

                    // إذا كان السياق غير موجود، تجاهل هذه المباراة
                    if (!patternInfo.context.test(surroundingCode)) {
                        continue;
                    }
                }

                const lineNumber = this.getLineNumber(code, match.index);
                const codeSnippet = this.extractCodeSnippet(code, match.index, match[0].length);

                issues.push({
                    title: patternInfo.title || 'مشكلة أداء',
                    category: patternInfo.category,
                    severity: patternInfo.severity,
                    description: patternInfo.description,
                    recommendation: patternInfo.recommendation,
                    filePath,
                    lineNumber,
                    codeSnippet,
                    type: 'issue',
                    impact: patternInfo.impact || 'يمكن أن تؤثر على أداء التطبيق وتجربة المستخدم.'
                });
            }
        }
    }

    /**
     * فحص تحسينات الأداء المحددة لتطبيقات الموبايل
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {string} appType - نوع تطبيق الموبايل
     * @returns {Array} قائمة بالتحسينات الموصى بها
     */
    checkMobileSpecificOptimizations(code, filePath, language, appType) {
        const optimizations = [];

        if (appType === MOBILE_APP_TYPES.NATIVE_ANDROID) {
            if (language === 'Java' || language === 'Kotlin') {
                // تحقق من استخدام ConstraintLayout
                if (!/ConstraintLayout/.test(code) && (/LinearLayout/.test(code) || /RelativeLayout/.test(code))) {
                    optimizations.push({
                        title: 'استخدام تخطيطات متداخلة',
                        category: PERFORMANCE_CATEGORIES.UI_RESPONSIVENESS,
                        severity: SEVERITY_LEVELS.LOW,
                        description: 'استخدام LinearLayout أو RelativeLayout بشكل متداخل يمكن أن يؤثر على أداء العرض.',
                        recommendation: 'استخدم ConstraintLayout لتقليل تعقيد تسلسل العرض الهرمي وتحسين أداء التخطيط.',
                        filePath,
                        lineNumber: 0,
                        type: 'optimization'
                    });
                }

                // تحقق من استخدام ViewHolder في RecyclerView
                if (/RecyclerView/.test(code) && !/ViewHolder/.test(code)) {
                    optimizations.push({
                        title: 'استخدام RecyclerView بدون ViewHolder',
                        category: PERFORMANCE_CATEGORIES.MEMORY_USAGE,
                        severity: SEVERITY_LEVELS.MEDIUM,
                        description: 'استخدام RecyclerView بدون نمط ViewHolder يمكن أن يؤدي إلى عمليات إنشاء كائنات العرض المتكررة وضعف الأداء.',
                        recommendation: 'استخدم نمط ViewHolder مع RecyclerView لإعادة استخدام العناصر وتحسين أداء التمرير.',
                        filePath,
                        lineNumber: 0,
                        type: 'optimization'
                    });
                }
            }
        } else if (appType === MOBILE_APP_TYPES.NATIVE_IOS) {
            if (language === 'Swift' || language === 'Objective-C') {
                // تحقق من استخدام تعطيل المحتوى خارج الشاشة في UITableView
                if (/UITableView/.test(code) && !/estimatedRowHeight|estimatedSectionHeaderHeight|estimatedSectionFooterHeight/.test(code)) {
                    optimizations.push({
                        title: 'تكوين UITableView غير محسن',
                        category: PERFORMANCE_CATEGORIES.UI_RESPONSIVENESS,
                        severity: SEVERITY_LEVELS.LOW,
                        description: 'استخدام UITableView بدون تحديد الارتفاعات المقدرة يمكن أن يؤثر على أداء جدول البيانات.',
                        recommendation: 'حدد estimatedRowHeight وestimatedSectionHeaderHeight وestimatedSectionFooterHeight لتمكين UITableView من إدارة الذاكرة بشكل أفضل.',
                        filePath,
                        lineNumber: 0,
                        type: 'optimization'
                    });
                }

                // تحقق من استخدام المؤجل التحميل للصور
                if (/UIImageView|UIImage\.init\(named:|UIImage\(named:/.test(code) && !/SDWebImage|Kingfisher|AlamofireImage|lazy|\.sd_|\.kf_/.test(code)) {
                    optimizations.push({
                        title: 'تحميل الصور دون تأجيل',
                        category: PERFORMANCE_CATEGORIES.MEMORY_USAGE,
                        severity: SEVERITY_LEVELS.MEDIUM,
                        description: 'تحميل الصور مباشرة بدون آليات التحميل المؤجل يمكن أن يؤثر على استجابة واجهة المستخدم.',
                        recommendation: 'استخدم مكتبات مثل SDWebImage أو Kingfisher للتحميل المؤجل للصور وإدارة ذاكرة التخزين المؤقت.',
                        filePath,
                        lineNumber: 0,
                        type: 'optimization'
                    });
                }
            }
        } else if (appType === MOBILE_APP_TYPES.REACT_NATIVE) {
            // تحقق من استخدام FlatList بدلاً من ScrollView للقوائم
            if (/ScrollView/.test(code) && /\{\s*\w+\.map\(/.test(code) && !/FlatList|SectionList/.test(code)) {
                optimizations.push({
                    title: 'استخدام ScrollView للقوائم',
                    category: PERFORMANCE_CATEGORIES.MEMORY_USAGE,
                    severity: SEVERITY_LEVELS.MEDIUM,
                    description: 'استخدام ScrollView مع map() للقوائم الطويلة يمكن أن يؤدي إلى مشاكل أداء.',
                    recommendation: 'استخدم FlatList أو SectionList للقوائم الطويلة لإنشاء عناصر العرض عند الطلب فقط.',
                    filePath,
                    lineNumber: 0,
                    type: 'optimization'
                });
            }

            // تحقق من استخدام PureComponent أو memo
            if (/class\s+\w+\s+extends\s+Component/.test(code) && !/(PureComponent|React\.memo|memo\()/.test(code)) {
                optimizations.push({
                    title: 'عدم استخدام PureComponent أو memo',
                    category: PERFORMANCE_CATEGORIES.COMPUTATION_EFFICIENCY,
                    severity: SEVERITY_LEVELS.LOW,
                    description: 'استخدام Component العادي بدلاً من PureComponent أو memo يمكن أن يؤدي إلى عمليات إعادة تقديم غير ضرورية.',
                    recommendation: 'استخدم PureComponent للمكونات الفئوية أو React.memo للمكونات الوظيفية لتجنب عمليات إعادة التقديم عندما لا تتغير البيانات.',
                    filePath,
                    lineNumber: 0,
                    type: 'optimization'
                });
            }
        } else if (appType === MOBILE_APP_TYPES.FLUTTER) {
            if (language === 'Dart') {
                // تحقق من استخدام const للويدجت الثابتة
                if (/(?:Text|Container|Icon|Padding|Center)\(/.test(code) && !/const\s+(?:Text|Container|Icon|Padding|Center)\(/.test(code)) {
                    optimizations.push({
                        title: 'عدم استخدام const لويدجت ثابتة',
                        category: PERFORMANCE_CATEGORIES.MEMORY_USAGE,
                        severity: SEVERITY_LEVELS.LOW,
                        description: 'عدم استخدام const constructor للويدجت الثابتة يمنع Flutter من تخزين مؤقت للعناصر.',
                        recommendation: 'استخدم const constructor للويدجت الثابتة التي لا تتغير قيمها لتمكين Flutter من تخزينها مؤقتًا وإعادة استخدامها.',
                        filePath,
                        lineNumber: 0,
                        type: 'optimization'
                    });
                }

                // تحقق من استخدام ListView بدلاً من ListView.builder
                if (/ListView\(\s*children/.test(code) && !/ListView\.builder|ListView\.separated/.test(code)) {
                    optimizations.push({
                        title: 'استخدام ListView بدلاً من ListView.builder',
                        category: PERFORMANCE_CATEGORIES.MEMORY_USAGE,
                        severity: SEVERITY_LEVELS.MEDIUM,
                        description: 'استخدام ListView مع قائمة children ينشئ جميع العناصر مرة واحدة، مما يستهلك ذاكرة أكثر.',
                        recommendation: 'استخدم ListView.builder لإنشاء العناصر حسب الحاجة فقط عندما يتم عرضها على الشاشة.',
                        filePath,
                        lineNumber: 0,
                        type: 'optimization'
                    });
                }
            }
        }

        return optimizations;
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

    /**
     * الحصول على تقرير بإحصائيات التحليل
     * @returns {Object} إحصائيات التحليل
     */
    getAnalysisStats() {
        return {
            analyzedFilesCount: this.analyzedFilesCount,
            issuesFoundCount: this.issuesFoundCount
        };
    }
}

module.exports = new PerformanceAnalyzer();