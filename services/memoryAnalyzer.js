const path = require('path');
const { MEMORY_CATEGORIES, SEVERITY_LEVELS, MOBILE_APP_TYPES } = require('../utils/constants');
const logger = require('../utils/logger');

/**
 * محلل استخدام الذاكرة في تطبيقات الموبايل
 * يكتشف الأنماط المرتبطة بالاستخدام الغير فعال للذاكرة والتسريبات
 */
class MemoryAnalyzer {
    constructor() {
        logger.info('تهيئة محلل الذاكرة');

        // تعريف الأنماط والاستعلامات للبحث عن مشاكل استخدام الذاكرة
        this.memoryPatterns = this.initMemoryPatterns();

        // إحصائيات للاستخدام
        this.analyzedFilesCount = 0;
        this.issuesFoundCount = 0;
    }

    /**
     * تهيئة قائمة أنماط مشاكل الذاكرة حسب لغة البرمجة
     * @returns {Object} أنماط الذاكرة المصنفة حسب اللغة
     */
    initMemoryPatterns() {
        return {
            Java: [
                // أنماط تسريبات الذاكرة
                {
                    name: 'static_context_reference',
                    category: MEMORY_CATEGORIES.MEMORY_LEAKS,
                    pattern: /static\s+(?:Context|Activity|Fragment|View|WeakReference<(?:Context|Activity|Fragment|View)>)/g,
                    description: 'استخدام المتغيرات الثابتة (static) للإشارة إلى السياقات أو العناصر المرئية يمكن أن يسبب تسربات ذاكرة كبيرة.',
                    severity: SEVERITY_LEVELS.CRITICAL,
                    recommendation: 'تجنب استخدام متغيرات static للسياقات أو استخدم WeakReference.'
                },
                {
                    name: 'inner_class_leak',
                    category: MEMORY_CATEGORIES.MEMORY_LEAKS,
                    pattern: /class\s+\w+\s+\{\s*(?:[^{}]*?\s+class\s+\w+\s*\{[^{}]*?\})/g,
                    negative: true,
                    negativePattern: /static\s+class|WeakReference/g,
                    description: 'الفئات الداخلية غير الثابتة تحتفظ بمرجع للفئة الخارجية مما قد يسبب تسربات ذاكرة.',
                    severity: SEVERITY_LEVELS.HIGH,
                    recommendation: 'استخدم كلمة static مع الفئات الداخلية أو استخدم WeakReference للإشارة إلى الفئة الخارجية.'
                },
                {
                    name: 'unclosed_resources',
                    category: MEMORY_CATEGORIES.UNRELEASED_MEMORY_RESOURCES,
                    pattern: /(?:new FileInputStream|new FileOutputStream|new BufferedReader|new BufferedWriter|new Scanner|Cursor\s+\w+\s*=)/g,
                    negative: true,
                    negativePattern: /\.close\(\)|try\s*\([^)]*\)/g,
                    description: 'عدم إغلاق الموارد مثل الملفات وقراء الملفات والمؤشرات يمكن أن يسبب تسربات ذاكرة.',
                    severity: SEVERITY_LEVELS.HIGH,
                    recommendation: 'استخدم try-with-resources أو تأكد من إغلاق الموارد في كتلة finally.'
                },
                {
                    name: 'unregistered_broadcast_receivers',
                    category: MEMORY_CATEGORIES.MEMORY_LEAKS,
                    pattern: /registerReceiver\(/g,
                    negative: true,
                    negativePattern: /unregisterReceiver\(/g,
                    description: 'عدم إلغاء تسجيل أجهزة استقبال البث يمكن أن يتسبب في تسرب الذاكرة.',
                    severity: SEVERITY_LEVELS.HIGH,
                    recommendation: 'تأكد من إلغاء تسجيل أجهزة استقبال البث في أساليب دورة الحياة المناسبة مثل onPause() أو onDestroy().'
                },
                {
                    name: 'listeners_not_removed',
                    category: MEMORY_CATEGORIES.MEMORY_LEAKS,
                    pattern: /(?:addTextChangedListener|addOnScrollListener|setOnItemClickListener|addOnItemTouchListener|addOnLayoutChangeListener|setOnClickListener)/g,
                    negative: true,
                    negativePattern: /(?:removeTextChangedListener|removeOnScrollListener|clearOnItemClickListener|removeOnItemTouchListener|removeOnLayoutChangeListener|setOnClickListener\s*\(\s*null\s*\))/g,
                    description: 'إضافة مستمعين دون إزالتهم يمكن أن يسبب تسربات ذاكرة.',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'تأكد من إزالة جميع المستمعين في أساليب دورة الحياة المناسبة.'
                },
                // أنماط الاستخدام المفرط للذاكرة
                {
                    name: 'bitmap_not_recycled',
                    category: MEMORY_CATEGORIES.EXCESSIVE_MEMORY_USAGE,
                    pattern: /Bitmap\s+\w+\s*=\s*(?:BitmapFactory\.decodeResource|BitmapFactory\.decodeFile|BitmapFactory\.decodeStream)/g,
                    negative: true,
                    negativePattern: /\.recycle\(\)/g,
                    description: 'عدم إعادة تدوير الخرائط النقطية (Bitmaps) يمكن أن يؤدي إلى استهلاك الذاكرة بشكل مفرط.',
                    severity: SEVERITY_LEVELS.HIGH,
                    recommendation: 'قم باستدعاء recycle() على الخرائط النقطية عندما لا تكون هناك حاجة إليها بعد الآن.'
                },
                {
                    name: 'large_view_hierarchies',
                    category: MEMORY_CATEGORIES.EXCESSIVE_MEMORY_USAGE,
                    pattern: /<(?:LinearLayout|RelativeLayout|FrameLayout|ConstraintLayout)[^>]*>\s*(?:<[^>]+>\s*){10,}/g,
                    description: 'تسلسلات هرمية معقدة للعرض يمكن أن تؤدي إلى استهلاك ذاكرة كبير.',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'تبسيط تسلسل العرض الهرمي، والنظر في استخدام <merge> أو <ViewStub> أو <include>.'
                },
                {
                    name: 'large_arrays',
                    category: MEMORY_CATEGORIES.EXCESSIVE_MEMORY_USAGE,
                    pattern: /new\s+(?:int|float|double|byte|boolean|char|long|short|String)\s*\[\s*(\d{6,})\s*\]/g,
                    description: 'إنشاء مصفوفات كبيرة جدًا يمكن أن يؤدي إلى استهلاك الذاكرة بشكل مفرط.',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'النظر في استخدام هياكل البيانات الأكثر كفاءة، أو تقسيم البيانات، أو استخدام الذاكرة المحمية (مثل MappedByteBuffer).'
                },
                // أنماط التخصيص غير الفعال للذاكرة
                {
                    name: 'collections_without_initial_capacity',
                    category: MEMORY_CATEGORIES.INEFFICIENT_MEMORY_ALLOCATION,
                    pattern: /new\s+(?:ArrayList|HashMap|HashSet)\s*\(\s*\)/g,
                    description: 'إنشاء المجموعات دون سعة أولية يؤدي إلى عمليات إعادة تخصيص غير ضرورية.',
                    severity: SEVERITY_LEVELS.LOW,
                    recommendation: 'قم بتعيين حجم أولي مناسب للمجموعات لتجنب عمليات إعادة التخصيص المتكررة.'
                },
                {
                    name: 'autoboxing_in_loops',
                    category: MEMORY_CATEGORIES.INEFFICIENT_MEMORY_ALLOCATION,
                    pattern: /for\s*\([^)]+\)\s*\{[^{}]*(?:Integer|Boolean|Double|Float|Long|Short|Byte|Character)/g,
                    description: 'التغليف التلقائي (autoboxing) داخل الحلقات يمكن أن يؤدي إلى إنشاء كائنات غير ضرورية.',
                    severity: SEVERITY_LEVELS.LOW,
                    recommendation: 'استخدم الأنواع البدائية بدلاً من الأنواع المغلفة في الحلقات والعمليات الكثيفة.'
                },
                {
                    name: 'database_cursor_not_closed',
                    category: MEMORY_CATEGORIES.UNRELEASED_MEMORY_RESOURCES,
                    pattern: /Cursor\s+\w+\s*=\s*(?:db|database|getContentResolver)\.query/g,
                    negative: true,
                    negativePattern: /\.close\(\)/g,
                    description: 'عدم إغلاق مؤشر قاعدة البيانات يمكن أن يؤدي إلى تسرب ذاكرة.',
                    severity: SEVERITY_LEVELS.HIGH,
                    recommendation: 'تأكد من استدعاء close() على الـ Cursor عند الانتهاء من استخدامه.'
                },
                {
                    name: 'excessive_string_concatenation',
                    category: MEMORY_CATEGORIES.INEFFICIENT_MEMORY_ALLOCATION,
                    pattern: /String\s+\w+\s*=[^;]*\+[^;]*\+[^;]*\+[^;]*\+[^;]*\+/g,
                    description: 'الإفراط في استخدام عملية الجمع (+) للسلاسل النصية غير فعال من حيث استخدام الذاكرة.',
                    severity: SEVERITY_LEVELS.LOW,
                    recommendation: 'استخدم StringBuilder بدلاً من عملية الجمع (+) المتكررة للسلاسل النصية.'
                },
                {
                    name: 'memory_cache_without_limit',
                    category: MEMORY_CATEGORIES.EXCESSIVE_MEMORY_USAGE,
                    pattern: /(?:Map|HashMap|LruCache|SparseArray)<[^>]*>[^;=]*=[^;=]*new\s+(?:HashMap|LruCache|SparseArray)/g,
                    negative: true,
                    negativePattern: /new\s+LruCache\s*<[^>]*>\s*\(\s*\d+\s*\)/g,
                    description: 'استخدام ذاكرة تخزين مؤقت دون حد يمكن أن يؤدي إلى استهلاك الذاكرة بشكل مفرط.',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'استخدم LruCache مع حد واضح أو قم بتنفيذ آلية تخزين مؤقت تحد من استخدام الذاكرة.'
                }
            ],
            Kotlin: [
                // أنماط تسريبات الذاكرة
                {
                    name: 'global_variables_with_context',
                    category: MEMORY_CATEGORIES.MEMORY_LEAKS,
                    pattern: /companion\s+object\s*\{[^}]*(?:context|activity|fragment|view)/gi,
                    description: 'تخزين مراجع السياق أو النشاط أو الشظية أو العرض في متغيرات مشتركة يمكن أن يسبب تسربات ذاكرة.',
                    severity: SEVERITY_LEVELS.HIGH,
                    recommendation: 'تجنب تخزين مراجع السياق في متغيرات عالمية أو مشتركة، أو استخدم WeakReference.'
                },
                {
                    name: 'coroutine_scope_leak',
                    category: MEMORY_CATEGORIES.MEMORY_LEAKS,
                    pattern: /val\s+(?:scope|coroutineScope)\s*=\s*(?:CoroutineScope|MainScope)/g,
                    negative: true,
                    negativePattern: /\.cancel\(\)/g,
                    description: 'عدم إلغاء نطاق الـ coroutine يمكن أن يسبب تسربات ذاكرة.',
                    severity: SEVERITY_LEVELS.HIGH,
                    recommendation: 'تأكد من استدعاء cancel() على نطاق الـ coroutine في أساليب دورة الحياة المناسبة.'
                },
                {
                    name: 'job_not_cancelled',
                    category: MEMORY_CATEGORIES.MEMORY_LEAKS,
                    pattern: /val\s+\w+\s*:\s*Job\s*=/g,
                    negative: true,
                    negativePattern: /\.cancel\(\)/g,
                    description: 'عدم إلغاء مهام الـ coroutine يمكن أن يسبب تسربات ذاكرة.',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'تأكد من استدعاء cancel() على مهام الـ coroutine عند الانتهاء منها.'
                },
                {
                    name: 'flow_collection_leak',
                    category: MEMORY_CATEGORIES.MEMORY_LEAKS,
                    pattern: /\.collect\s*\{/g,
                    negative: true,
                    negativePattern: /(?:lifecycleScope|viewModelScope|lifecycle\.repeatOnLifecycle)/g,
                    description: 'جمع تدفقات coroutine دون ربطها بدورة الحياة يمكن أن يسبب تسربات ذاكرة.',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'استخدم repeatOnLifecycle أو lifecycleScope.launch لربط عمليات جمع التدفق بدورة الحياة.'
                },
                // أنماط الاستخدام المفرط للذاكرة
                {
                    name: 'large_objects_in_viewmodel',
                    category: MEMORY_CATEGORIES.EXCESSIVE_MEMORY_USAGE,
                    pattern: /class\s+\w+\s*:\s*ViewModel\s*\([^)]*\)\s*\{[^{}]*(?:List|Map|Set)<[^>]*>/g,
                    description: 'تخزين قوائم أو خرائط كبيرة في ViewModel يمكن أن يؤدي إلى استهلاك مفرط للذاكرة.',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'استخدم آليات التحميل المتأخر (lazy loading) أو استراتيجيات التخزين المؤقت المناسبة.'
                },
                {
                    name: 'inefficient_list_creation',
                    category: MEMORY_CATEGORIES.INEFFICIENT_MEMORY_ALLOCATION,
                    pattern: /(?:List|ArrayList|Array)<[^>]*>\s*\(\s*\d+\s*\)\s*\{\s*[^{}]+\}/g,
                    description: 'إنشاء قوائم كبيرة باستخدام المعالجات المقابِلة غير فعال من حيث استخدام الذاكرة.',
                    severity: SEVERITY_LEVELS.LOW,
                    recommendation: 'استخدم List.map() أو sequence() للقوائم الكبيرة لتقليل استخدام الذاكرة.'
                },
                {
                    name: 'object_property_delegates',
                    category: MEMORY_CATEGORIES.EXCESSIVE_MEMORY_USAGE,
                    pattern: /object\s+\w+\s*\{[^{}]*(?:var|val)\s+\w+\s*:\s*\w+\s+by\s+(?:lazy|Delegates\.|viewModels|activityViewModels)/g,
                    description: 'استخدام مفوضي خصائص ثقيلة في كائنات singleton يمكن أن يؤدي إلى استهلاك مفرط للذاكرة.',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'تجنب استخدام مفوضي خصائص ثقيلة في كائنات singleton، والنظر في تأخير إنشاء الموارد.'
                }
            ],
            Dart: [
                // أنماط تسريبات الذاكرة
                {
                    name: 'stream_subscription_leak',
                    category: MEMORY_CATEGORIES.MEMORY_LEAKS,
                    pattern: /\.listen\(/g,
                    negative: true,
                    negativePattern: /\.cancel\(\)/g,
                    description: 'عدم إلغاء اشتراكات التدفق (Stream subscriptions) يمكن أن يسبب تسربات ذاكرة.',
                    severity: SEVERITY_LEVELS.HIGH,
                    recommendation: 'تأكد من استدعاء cancel() على اشتراكات التدفق في dispose().'
                },
                {
                    name: 'animation_controller_leak',
                    category: MEMORY_CATEGORIES.MEMORY_LEAKS,
                    pattern: /AnimationController\(/g,
                    negative: true,
                    negativePattern: /\.dispose\(\)/g,
                    description: 'عدم التخلص من وحدات تحكم الرسوم المتحركة يمكن أن يسبب تسربات ذاكرة.',
                    severity: SEVERITY_LEVELS.HIGH,
                    recommendation: 'تأكد من استدعاء dispose() على جميع وحدات تحكم الرسوم المتحركة في طريقة dispose().'
                },
                {
                    name: 'focus_node_leak',
                    category: MEMORY_CATEGORIES.MEMORY_LEAKS,
                    pattern: /FocusNode\(/g,
                    negative: true,
                    negativePattern: /\.dispose\(\)/g,
                    description: 'عدم التخلص من عقد التركيز يمكن أن يسبب تسربات ذاكرة.',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'تأكد من استدعاء dispose() على جميع عقد التركيز في طريقة dispose().'
                },
                {
                    name: 'page_controller_leak',
                    category: MEMORY_CATEGORIES.MEMORY_LEAKS,
                    pattern: /PageController\(/g,
                    negative: true,
                    negativePattern: /\.dispose\(\)/g,
                    description: 'عدم التخلص من وحدات تحكم الصفحة يمكن أن يسبب تسربات ذاكرة.',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'تأكد من استدعاء dispose() على جميع وحدات تحكم الصفحة في طريقة dispose().'
                },
                // أنماط الاستخدام المفرط للذاكرة
                {
                    name: 'inefficient_list_view',
                    category: MEMORY_CATEGORIES.EXCESSIVE_MEMORY_USAGE,
                    pattern: /ListView\(/g,
                    negative: true,
                    negativePattern: /ListView\.builder|ListView\.separated/g,
                    description: 'استخدام ListView بدون بناء (builder) سيؤدي إلى إنشاء جميع العناصر مرة واحدة، مما يستهلك الذاكرة بشكل مفرط.',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'استخدم ListView.builder() أو ListView.separated() لإنشاء العناصر حسب الحاجة.'
                },
                {
                    name: 'large_image_assets',
                    category: MEMORY_CATEGORIES.EXCESSIVE_MEMORY_USAGE,
                    pattern: /Image\.asset\(|AssetImage\(/g,
                    negative: true,
                    negativePattern: /cacheWidth|cacheHeight/g,
                    description: 'تحميل صور كبيرة دون تحديد أبعاد التخزين المؤقت يمكن أن يؤدي إلى استهلاك الذاكرة بشكل مفرط.',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'استخدم خيارات cacheWidth وcacheHeight لتحميل الصور بحجم مناسب.'
                },
                {
                    name: 'stateful_singleton',
                    category: MEMORY_CATEGORIES.MEMORY_LEAKS,
                    pattern: /(?:class|mixin)\s+\w+\s+(?:with\s+\w+\s+)*\{\s*(?:static\s+final\s+\w+\s*=\s*\w+\(\);?|static\s+\w+\s+_instance;?)/g,
                    description: 'استخدام نمط singleton مع حالة قابلة للتغيير يمكن أن يسبب تسربات ذاكرة.',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'تجنب تخزين البيانات القابلة للتغيير في كائنات singleton، أو استخدم نمط الوسيط (mediator) بدلًا من ذلك.'
                },
                {
                    name: 'inefficient_string_concatenation',
                    category: MEMORY_CATEGORIES.INEFFICIENT_MEMORY_ALLOCATION,
                    pattern: /(?:for|while)\s*\([^)]+\)\s*\{[^{}]*\+=/g,
                    description: 'تراكم السلاسل النصية في حلقات التكرار غير فعال من حيث استخدام الذاكرة.',
                    severity: SEVERITY_LEVELS.LOW,
                    recommendation: 'استخدم StringBuffer للبناء الفعال للسلاسل النصية داخل الحلقات.'
                }
            ],
            JavaScript: [
                // أنماط تسريبات الذاكرة
                {
                    name: 'event_listener_leak',
                    category: MEMORY_CATEGORIES.MEMORY_LEAKS,
                    pattern: /addEventListener\s*\(|on\s*\(\s*['"]/g,
                    negative: true,
                    negativePattern: /removeEventListener\s*\(|off\s*\(\s*['"]/g,
                    description: 'عدم إزالة مستمعي الأحداث يمكن أن يسبب تسربات ذاكرة.',
                    severity: SEVERITY_LEVELS.HIGH,
                    recommendation: 'تأكد من إزالة جميع مستمعي الأحداث في componentWillUnmount أو عند الإزالة.'
                },
                {
                    name: 'setInterval_leak',
                    category: MEMORY_CATEGORIES.MEMORY_LEAKS,
                    pattern: /setInterval\s*\(/g,
                    negative: true,
                    negativePattern: /clearInterval\s*\(/g,
                    description: 'عدم مسح فواصل الزمن يمكن أن يسبب تسربات ذاكرة.',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'تأكد من استدعاء clearInterval في componentWillUnmount أو عند الإزالة.'
                },
                {
                    name: 'setTimeout_leak',
                    category: MEMORY_CATEGORIES.MEMORY_LEAKS,
                    pattern: /setTimeout\s*\([^,]+,\s*(?:3\d{4,}|[4-9]\d{3,}|\d{5,})/g,
                    negative: true,
                    negativePattern: /clearTimeout\s*\(/g,
                    description: 'عدم مسح المؤقتات الطويلة (أكثر من 30 ثانية) يمكن أن يسبب تسربات ذاكرة.',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'تأكد من استدعاء clearTimeout للمؤقتات الطويلة في componentWillUnmount أو عند الإزالة.'
                },
                {
                    name: 'closure_leak',
                    category: MEMORY_CATEGORIES.MEMORY_LEAKS,
                    pattern: /this\.\w+\s*=\s*function\s*\([^)]*\)\s*\{/g,
                    description: 'تعيين دوال إلى خصائص this يمكن أن يخلق إغلاقات تحتفظ بمراجع إلى this.',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'استخدم وظائف السهم () => {} أو .bind(this) لتجنب خلق إغلاقات غير مرغوب فيها.'
                },
                // أنماط الاستخدام المفرط للذاكرة
                {
                    name: 'large_objects_in_state',
                    category: MEMORY_CATEGORIES.EXCESSIVE_MEMORY_USAGE,
                    pattern: /this\.setState\s*\(\s*\{\s*\w+\s*:\s*(?:\[\s*(?:[^,\]])+(?:,\s*(?:[^,\]])+){50,})/g,
                    description: 'تخزين كائنات كبيرة في حالة المكون يمكن أن يؤدي إلى استهلاك مفرط للذاكرة.',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'تجنب تخزين بيانات كبيرة في حالة المكون، واستخدم مكتبات إدارة الحالة مثل Redux لتخزين البيانات المشتركة.'
                },
                {
                    name: 'inefficient_filter_map',
                    category: MEMORY_CATEGORIES.INEFFICIENT_MEMORY_ALLOCATION,
                    pattern: /\.filter\([^)]+\)\.map\(/g,
                    description: 'استخدام filter() متبوعًا بـ map() ينشئ مصفوفتين وسيطتين.',
                    severity: SEVERITY_LEVELS.LOW,
                    recommendation: 'استخدم reduce() لتنفيذ عمليات الترشيح والتعيين في مرور واحد.'
                },
                {
                    name: 'inline_object_creation',
                    category: MEMORY_CATEGORIES.EXCESSIVE_OBJECT_CREATION,
                    pattern: /\{\s*(?:[a-zA-Z0-9_$]+\s*:\s*[^,}]+,\s*){10,}\}/g,
                    description: 'إنشاء كائنات كبيرة مضمنة في كل تقديم يمكن أن يؤدي إلى استهلاك مفرط للذاكرة.',
                    severity: SEVERITY_LEVELS.LOW,
                    recommendation: 'انقل تعريفات الكائنات الكبيرة إلى خارج دالة التقديم أو استخدم useMemo().'
                },
                {
                    name: 'unnecessarily_recreated_functions',
                    category: MEMORY_CATEGORIES.EXCESSIVE_OBJECT_CREATION,
                    pattern: /(?:function|const\s+\w+\s*=\s*\([^)]*\)\s*=>|this\.\w+\s*=\s*\([^)]*\)\s*=>)/g,
                    description: 'إعادة إنشاء الدوال في كل تقديم يمكن أن يؤدي إلى إنشاء كائنات وظيفية جديدة في كل مرة.',
                    severity: SEVERITY_LEVELS.LOW,
                    recommendation: 'استخدم useCallback() لتخزين الدوال بين عمليات التقديم أو قم بتعريفها خارج المكون.'
                },
                {
                    name: 'memory_intensive_operations_in_loops',
                    category: MEMORY_CATEGORIES.INEFFICIENT_MEMORY_ALLOCATION,
                    pattern: /(?:for|while)\s*\([^)]+\)\s*\{[^{}]*new\s+/g,
                    description: 'إنشاء كائنات جديدة داخل حلقات يمكن أن يؤدي إلى استهلاك مفرط للذاكرة.',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'تجنب إنشاء كائنات جديدة داخل الحلقات، وقم بإعادة استخدام الكائنات الموجودة عندما يكون ذلك ممكنًا.'
                }
            ],
            TypeScript: [
                // أنماط تسريبات الذاكرة
                {
                    name: 'subscription_leak',
                    category: MEMORY_CATEGORIES.MEMORY_LEAKS,
                    pattern: /(?:subscribe\(|subscription\s*=|subscription:|this\.\w+\s*=\s*[^;]+\.subscribe)/g,
                    negative: true,
                    negativePattern: /\.unsubscribe\(\)/g,
                    description: 'عدم إلغاء الاشتراكات يمكن أن يسبب تسربات ذاكرة.',
                    severity: SEVERITY_LEVELS.HIGH,
                    recommendation: 'تأكد من استدعاء unsubscribe() على جميع الاشتراكات في ngOnDestroy أو componentWillUnmount.'
                },
                {
                    name: 'event_emitter_leak',
                    category: MEMORY_CATEGORIES.MEMORY_LEAKS,
                    pattern: /new\s+EventEmitter\s*<[^>]*>\s*\(\)/g,
                    negative: true,
                    negativePattern: /\.complete\(\)/g,
                    description: 'عدم إكمال EventEmitter يمكن أن يسبب تسربات ذاكرة.',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'تأكد من استدعاء complete() على جميع EventEmitters في ngOnDestroy.'
                },
                // أنماط الاستخدام المفرط للذاكرة
                {
                    name: 'excessive_dependency_injection',
                    category: MEMORY_CATEGORIES.EXCESSIVE_MEMORY_USAGE,
                    pattern: /constructor\s*\([^)]*(?:,\s*[^,)]){10,}/g,
                    description: 'حقن عدد كبير من التبعيات يمكن أن يؤدي إلى استهلاك مفرط للذاكرة.',
                    severity: SEVERITY_LEVELS.LOW,
                    recommendation: 'قم بتقسيم المكونات الكبيرة إلى مكونات أصغر أو استخدم نمط الواجهة (facade) لتجميع الخدمات ذات الصلة.'
                },
                {
                    name: 'large_component_templates',
                    category: MEMORY_CATEGORIES.EXCESSIVE_MEMORY_USAGE,
                    pattern: /@Component\s*\(\s*\{[^{}]*template\s*:\s*`[\s\S]{1000,}`/g,
                    description: 'قوالب المكونات الكبيرة يمكن أن تؤدي إلى استهلاك مفرط للذاكرة.',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'قم بتقسيم المكونات الكبيرة إلى مكونات أصغر أو استخدم templateUrl بدلاً من template المضمنة.'
                },
                // أنماط التخصيص غير الفعال للذاكرة
                {
                    name: 'unnecessary_object_destructuring',
                    category: MEMORY_CATEGORIES.INEFFICIENT_MEMORY_ALLOCATION,
                    pattern: /const\s*\{(?:\s*\w+\s*,\s*){5,}\}\s*=\s*[^;]+;/g,
                    description: 'تفكيك الكائنات الكبيرة يمكن أن ينشئ متغيرات محلية غير ضرورية.',
                    severity: SEVERITY_LEVELS.LOW,
                    recommendation: 'قم بتفكيك فقط الخصائص التي تحتاج إليها بالفعل.'
                }
            ],
            Swift: [
                // أنماط تسريبات الذاكرة
                {
                    name: 'reference_cycle',
                    category: MEMORY_CATEGORIES.MEMORY_LEAKS,
                    pattern: /\{[^}]*self\.[^}]*\}/g,
                    negative: true,
                    negativePattern: /\[\s*weak\s+self\s*\]|\[\s*unowned\s+self\s*\]|\[\s*capture\s+/g,
                    description: 'استخدام self في إغلاقات دون [weak self] يمكن أن يسبب دورات مرجعية.',
                    severity: SEVERITY_LEVELS.HIGH,
                    recommendation: 'استخدم [weak self] أو [unowned self] في الإغلاقات لتجنب دورات مرجعية.'
                },
                {
                    name: 'delegate_strong_reference',
                    category: MEMORY_CATEGORIES.MEMORY_LEAKS,
                    pattern: /var\s+\w+\s*:\s*\w+Delegate(?!\s*\?)/g,
                    description: 'استخدام مرجع قوي للمندوب يمكن أن يسبب دورات مرجعية.',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'استخدم weak لخصائص المندوب لتجنب دورات مرجعية، مثل: weak var delegate: MyDelegate?'
                },
                {
                    name: 'notification_observer_not_removed',
                    category: MEMORY_CATEGORIES.MEMORY_LEAKS,
                    pattern: /NotificationCenter\.default\.addObserver/g,
                    negative: true,
                    negativePattern: /NotificationCenter\.default\.removeObserver/g,
                    description: 'عدم إزالة مراقبي الإخطارات يمكن أن يسبب تسربات ذاكرة.',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'تأكد من استدعاء removeObserver في deinit.'
                },
                // أنماط الاستخدام المفرط للذاكرة
                {
                    name: 'large_image_loading',
                    category: MEMORY_CATEGORIES.EXCESSIVE_MEMORY_USAGE,
                    pattern: /UIImage\(named:/g,
                    negative: true,
                    negativePattern: /UIImage\(named:.*\)\.withRenderingMode|UIGraphicsBeginImageContextWithOptions.*scale:/g,
                    description: 'تحميل صور كبيرة دون تغيير الحجم يمكن أن يؤدي إلى استهلاك مفرط للذاكرة.',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'قم بتغيير حجم الصور الكبيرة قبل العرض باستخدام UIGraphicsBeginImageContextWithOptions مع مقياس مناسب.'
                },
                {
                    name: 'reusable_cell_allocation',
                    category: MEMORY_CATEGORIES.INEFFICIENT_MEMORY_ALLOCATION,
                    pattern: /func\s+(?:tableView|collectionView)\s*\([^)]+\)\s*(?:cellForRowAt|cellForItemAt)[^{]*\{[^}]*?(?:alloc|init)/g,
                    negative: true,
                    negativePattern: /dequeueReusableCell|dequeueReusableCellWithIdentifier/g,
                    description: 'إنشاء خلايا جديدة بدلاً من إعادة استخدام الخلايا يمكن أن يؤدي إلى استهلاك مفرط للذاكرة.',
                    severity: SEVERITY_LEVELS.HIGH,
                    recommendation: 'استخدم dequeueReusableCell لإعادة استخدام الخلايا بدلاً من إنشاء خلايا جديدة في كل مرة.'
                },
                {
                    name: 'autorelease_pool_missing',
                    category: MEMORY_CATEGORIES.INEFFICIENT_MEMORY_ALLOCATION,
                    pattern: /for\s+[^{]*\{[^}]*?(?:alloc|init|autoreleasepool)/g,
                    negative: true,
                    negativePattern: /@autoreleasepool/g,
                    description: 'إنشاء كائنات كثيرة داخل حلقة دون مجمع autorelease يمكن أن يؤدي إلى تراكم الذاكرة.',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'استخدم @autoreleasepool داخل الحلقات التي تنشئ العديد من الكائنات المؤقتة.'
                }
            ],
            'Objective-C': [
                // أنماط تسريبات الذاكرة
                {
                    name: 'missing_dealloc',
                    category: MEMORY_CATEGORIES.MEMORY_LEAKS,
                    pattern: /@implementation\s+\w+(?:[^@]+?@property\s*\([^)]*retain[^)]*\)[^;]*;[^@]*|[^@]*?retain[^@]*|[^@]*?strong[^@]*|[^@]*?copy[^@]*)/g,
                    negative: true,
                    negativePattern: /- \s*\(void\)\s*dealloc\s*\{/g,
                    description: 'عدم تنفيذ dealloc في الفئات التي تحتوي على خصائص retain/strong/copy يمكن أن يسبب تسربات ذاكرة.',
                    severity: SEVERITY_LEVELS.HIGH,
                    recommendation: 'قم بتنفيذ dealloc لتحرير جميع الموارد التي تم الاحتفاظ بها.'
                },
                {
                    name: 'circular_reference',
                    category: MEMORY_CATEGORIES.MEMORY_LEAKS,
                    pattern: /@property\s*\([^)]*strong[^)]*\)\s*\w+\s*\*\s*\w+/g,
                    description: 'استخدام مراجع قوية في كلا الاتجاهين يمكن أن يسبب دورات مرجعية.',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'استخدم weak في أحد جانبي العلاقة ثنائية الاتجاه لتجنب دورات مرجعية.'
                },
                {
                    name: 'block_retain_cycle',
                    category: MEMORY_CATEGORIES.MEMORY_LEAKS,
                    pattern: /\[\s*self\s+/g,
                    negative: true,
                    negativePattern: /__weak\s+[^;]*self|typeof\(self\)\s*__weak\s*selfWeak\s*=\s*self|__block\s+[^;]*self|typeof\(self\)\s*__block\s*blockSelf\s*=\s*self/g,
                    description: 'استخدام self داخل كتلة دون __weak يمكن أن يسبب دورات مرجعية.',
                    severity: SEVERITY_LEVELS.HIGH,
                    recommendation: 'استخدم __weak typeof(self) weakSelf = self قبل الكتلة واستخدم weakSelf داخل الكتلة.'
                },
                // أنماط الاستخدام المفرط للذاكرة
                {
                    name: 'autoreleased_in_loop',
                    category: MEMORY_CATEGORIES.EXCESSIVE_MEMORY_USAGE,
                    pattern: /for\s*\([^)]+\)\s*\{[^}]*?\[\s*\w+\s+alloc\s*\]/g,
                    negative: true,
                    negativePattern: /@autoreleasepool/g,
                    description: 'إنشاء كائنات داخل حلقة دون مجمع autorelease يمكن أن يؤدي إلى استهلاك مفرط للذاكرة.',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'استخدم @autoreleasepool داخل الحلقات التي تنشئ العديد من الكائنات.'
                },
                {
                    name: 'inefficient_string_concatenation',
                    category: MEMORY_CATEGORIES.INEFFICIENT_MEMORY_ALLOCATION,
                    pattern: /\[\s*\w+\s+stringByAppendingString:/g,
                    description: 'استخدام stringByAppendingString داخل حلقة يمكن أن يؤدي إلى استهلاك مفرط للذاكرة.',
                    severity: SEVERITY_LEVELS.LOW,
                    recommendation: 'استخدم NSMutableString للبناء الفعال للسلاسل النصية.'
                }
            ],
            XML: [
                // أنماط استخدام الذاكرة غير الفعال في ملفات XML
                {
                    name: 'large_layout_hierarchy',
                    category: MEMORY_CATEGORIES.EXCESSIVE_MEMORY_USAGE,
                    pattern: /<(?:LinearLayout|RelativeLayout|FrameLayout|ConstraintLayout)[^>]*>(?:[^<]|<(?!\/(?:LinearLayout|RelativeLayout|FrameLayout|ConstraintLayout)>))*<(?:LinearLayout|RelativeLayout|FrameLayout|ConstraintLayout)[^>]*>(?:[^<]|<(?!\/(?:LinearLayout|RelativeLayout|FrameLayout|ConstraintLayout)>))*<(?:LinearLayout|RelativeLayout|FrameLayout|ConstraintLayout)/g,
                    description: 'تسلسلات هرمية عميقة للتخطيط يمكن أن تؤدي إلى استهلاك مفرط للذاكرة وأداء ضعيف.',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'قم بتبسيط تسلسل التخطيط الهرمي باستخدام <merge> أو <include> أو استخدم ConstraintLayout لتسطيح التسلسل الهرمي.'
                },
                {
                    name: 'heavy_bitmap_drawable',
                    category: MEMORY_CATEGORIES.EXCESSIVE_MEMORY_USAGE,
                    pattern: /<bitmap\s+android:src="@drawable\/\w+".*?\/>/g,
                    negative: true,
                    negativePattern: /android:tileMode|android:gravity|android:scaleType="fitCenter"|android:scaleType="centerInside"/g,
                    description: 'استخدام صور نقطية كبيرة دون خيارات التحجيم يمكن أن يؤدي إلى استهلاك مفرط للذاكرة.',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'استخدم خيارات التحجيم أو التجانب للصور النقطية الكبيرة، أو قم بتحجيمها مسبقًا.'
                },
                {
                    name: 'hardware_acceleration_large_views',
                    category: MEMORY_CATEGORIES.EXCESSIVE_MEMORY_USAGE,
                    pattern: /<(?:WebView|VideoView|SurfaceView|GLSurfaceView)[^>]*android:hardwareAccelerated="true"[^>]*>/g,
                    description: 'استخدام تسريع الأجهزة مع العناصر الكبيرة يمكن أن يؤدي إلى استهلاك مفرط للذاكرة.',
                    severity: SEVERITY_LEVELS.LOW,
                    recommendation: 'توخ الحذر عند استخدام تسريع الأجهزة مع العناصر الكبيرة واختبر على أجهزة منخفضة الذاكرة.'
                }
            ]
        };
    }

    /**
     * تحليل الكود للكشف عن مشاكل الذاكرة
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {string} appType - نوع تطبيق الموبايل
     * @returns {Array} قائمة بمشاكل الذاكرة المكتشفة
     */
    analyzeMemoryPatterns(code, filePath, language, appType) {
        this.analyzedFilesCount++;

        const findings = [];

        logger.debug(`تحليل أنماط استخدام الذاكرة للملف: ${filePath}, اللغة: ${language || 'غير معروفة'}`);

        try {
            // تخطي الملفات الفارغة
            if (!code || code.trim() === '') {
                logger.debug(`تخطي تحليل الذاكرة للملف الفارغ: ${filePath}`);
                return findings;
            }

            // تحديد لغة البرمجة إذا لم يتم توفيرها
            if (!language) {
                const fileExtension = path.extname(filePath).toLowerCase();
                language = this.getLanguageByExtension(fileExtension);
                if (!language) {
                    logger.debug(`لا يمكن تحديد لغة البرمجة للملف ${filePath}, تخطي تحليل الذاكرة`);
                    return findings;
                }
            }

            // الحصول على أنماط الذاكرة المناسبة للغة البرمجة
            const patterns = this.memoryPatterns[language] || [];

            if (patterns.length === 0) {
                logger.debug(`لا توجد أنماط ذاكرة متاحة للغة ${language}, تخطي التحليل`);
                return findings;
            }

            // فحص تسريبات الذاكرة المحتملة
            this.checkMemoryIssues(code, filePath, language, patterns, findings);

            // فحص مشاكل ذاكرة محددة حسب نوع التطبيق
            this.checkAppTypeSpecificIssues(code, filePath, language, appType, findings);

            logger.debug(`تم اكتشاف ${findings.length} مشكلة ذاكرة في الملف: ${filePath}`);

            return findings;
        } catch (error) {
            logger.error(`خطأ في تحليل أنماط استخدام الذاكرة: ${error.message}`);
            return findings;
        }
    }

    /**
     * فحص مشاكل الذاكرة باستخدام الأنماط المحددة
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {Array} patterns - أنماط الذاكرة
     * @param {Array} findings - قائمة النتائج
     */
    checkMemoryIssues(code, filePath, language, patterns, findings) {
        for (const pattern of patterns) {
            try {
                const matches = this.findPatternMatches(code, pattern);

                if (matches && matches.length > 0) {
                    // للأنماط السلبية، نتحقق ما إذا كان النمط السلبي موجودًا
                    if (pattern.negative) {
                        let shouldAdd = true;

                        for (const match of matches) {
                            // استخراج السياق المحيط (500 حرف)
                            const contextStart = Math.max(0, match.index - 250);
                            const contextEnd = Math.min(code.length, match.index + match.text.length + 250);
                            const context = code.substring(contextStart, contextEnd);

                            // إذا كان النمط السلبي موجودًا في السياق، نتخطى هذه المطابقة
                            if (pattern.negativePattern && pattern.negativePattern.test(context)) {
                                shouldAdd = false;
                                break;
                            }
                        }

                        if (!shouldAdd) {
                            continue;
                        }
                    }

                    // تحديد رقم السطر للمطابقة الأولى
                    const firstMatchLineNumber = this.getLineNumber(code, matches[0].index);

                    // إنشاء كائن النتيجة
                    const finding = {
                        title: `مشكلة ذاكرة: ${pattern.name}`,
                        category: pattern.category,
                        severity: pattern.severity,
                        description: pattern.description,
                        recommendation: pattern.recommendation,
                        filePath,
                        lineNumber: firstMatchLineNumber,
                        matchCount: matches.length,
                        matches: matches.slice(0, 5).map(m => m.text), // الاحتفاظ بأول 5 مطابقات فقط
                        type: 'issue'
                    };

                    findings.push(finding);
                    this.issuesFoundCount++;

                    logger.debug(`تم العثور على مشكلة ذاكرة: ${pattern.name} في الملف ${filePath}, السطر ${firstMatchLineNumber}, عدد المطابقات: ${matches.length}`);
                }
            } catch (error) {
                logger.error(`خطأ أثناء تحليل نمط الذاكرة ${pattern.name} في الملف ${filePath}: ${error.message}`);
            }
        }
    }

    /**
     * العثور على مطابقات النمط في الكود
     * @param {string} code - الكود المراد تحليله
     * @param {Object} pattern - نمط البحث
     * @returns {Array} قائمة بالمطابقات
     */
    findPatternMatches(code, pattern) {
        const matches = [];
        pattern.pattern.lastIndex = 0; // إعادة تعيين مؤشر البحث

        let match;
        while ((match = pattern.pattern.exec(code)) !== null) {
            matches.push({
                index: match.index,
                text: match[0]
            });

            // تجنب الحلقات اللانهائية للتعبيرات العادية دون العلم العالمي
            if (match.index === pattern.pattern.lastIndex) {
                pattern.pattern.lastIndex++;
            }
        }

        return matches;
    }

    /**
     * فحص مشاكل ذاكرة محددة حسب نوع التطبيق
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {string} appType - نوع تطبيق الموبايل
     * @param {Array} findings - قائمة النتائج
     */
    checkAppTypeSpecificIssues(code, filePath, language, appType, findings) {
        // مشاكل محددة لتطبيقات Android
        if (appType === MOBILE_APP_TYPES.NATIVE_ANDROID && (language === 'Java' || language === 'Kotlin')) {
            // فحص استخدام الذاكرة في تطبيقات Android
            this.checkAndroidMemoryIssues(code, filePath, language, findings);
        }

        // مشاكل محددة لتطبيقات iOS
        else if (appType === MOBILE_APP_TYPES.NATIVE_IOS && (language === 'Swift' || language === 'Objective-C')) {
            // فحص استخدام الذاكرة في تطبيقات iOS
            this.checkIOSMemoryIssues(code, filePath, language, findings);
        }

        // مشاكل محددة لتطبيقات Flutter
        else if (appType === MOBILE_APP_TYPES.FLUTTER && language === 'Dart') {
            // فحص استخدام الذاكرة في تطبيقات Flutter
            this.checkFlutterMemoryIssues(code, filePath, findings);
        }

        // مشاكل محددة لتطبيقات React Native
        else if (appType === MOBILE_APP_TYPES.REACT_NATIVE && (language === 'JavaScript' || language === 'TypeScript')) {
            // فحص استخدام الذاكرة في تطبيقات React Native
            this.checkReactNativeMemoryIssues(code, filePath, language, findings);
        }
    }

    /**
     * فحص مشاكل ذاكرة محددة لتطبيقات Android
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {Array} findings - قائمة النتائج
     */
    checkAndroidMemoryIssues(code, filePath, language, findings) {
        // فحص استخدام Singleton لمشاركة سياق التطبيق
        const singletonContextPattern = /(?:private|protected)\s+static\s+\w+\s+\w+Instance\s*=\s*null|public\s+static\s+\w+\s+getInstance\s*\([^)]*Context[^)]*\)|companion\s+object\s*\{[^}]*Application\s*\.|static\s+Context\s+\w+Context|static\s+Application\s+\w+Application/g;

        let match;
        while ((match = singletonContextPattern.exec(code)) !== null) {
            findings.push({
                title: 'مشكلة ذاكرة في Android: استخدام سياق التطبيق في Singleton',
                category: MEMORY_CATEGORIES.MEMORY_LEAKS,
                severity: SEVERITY_LEVELS.CRITICAL,
                description: 'تخزين سياق التطبيق أو النشاط في Singleton يمكن أن يسبب تسربات ذاكرة كبيرة.',
                recommendation: 'استخدم سياق التطبيق (ApplicationContext) بدلًا من Activity أو Context أو استخدم WeakReference.',
                filePath,
                lineNumber: this.getLineNumber(code, match.index),
                type: 'issue'
            });
        }

        // فحص استخدام LruCache بدون حجم محدد
        const lruCachePattern = /new\s+LruCache\s*<[^>]*>\s*\(\s*\)/g;

        while ((match = lruCachePattern.exec(code)) !== null) {
            findings.push({
                title: 'مشكلة ذاكرة في Android: استخدام LruCache بدون حجم محدد',
                category: MEMORY_CATEGORIES.EXCESSIVE_MEMORY_USAGE,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'استخدام LruCache بدون حجم محدد قد يؤدي إلى استهلاك مفرط للذاكرة.',
                recommendation: 'حدد حجمًا مناسبًا للـ LruCache بناءً على متطلبات التطبيق ومقدار الذاكرة المتاحة.',
                filePath,
                lineNumber: this.getLineNumber(code, match.index),
                type: 'issue'
            });
        }

        // فحص استخدام AsyncTask بدون تنفيذ Cancel
        const asyncTaskPattern = /class\s+\w+\s+extends\s+AsyncTask\s*<|new\s+AsyncTask\s*<[^>]*>\s*\(/g;
        const cancelPattern = /\.cancel\s*\(|onCancelled|cancel\s*\(|isCancelled\s*\(/g;

        if (asyncTaskPattern.test(code) && !cancelPattern.test(code)) {
            findings.push({
                title: 'مشكلة ذاكرة في Android: استخدام AsyncTask بدون تنفيذ Cancel',
                category: MEMORY_CATEGORIES.MEMORY_LEAKS,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام AsyncTask دون تنفيذ منطق الإلغاء يمكن أن يسبب تسربات ذاكرة إذا تمت إزالة النشاط أو الشظية.',
                recommendation: 'قم بتنفيذ منطق الإلغاء والتحقق من isCancelled() بانتظام في doInBackground().',
                filePath,
                lineNumber: 0, // لا يمكن تحديد رقم سطر محدد هنا
                type: 'issue'
            });
        }

        // فحص استخدام بيانات مخزنة مؤقتًا دون التحقق من حالة الذاكرة
        const cacheCheckPattern = /(?:onCreate|onResume)\s*\([^)]*\)\s*\{[^{}]*?\}/g;
        const memoryCachePattern = /ActivityManager\.(?:getMemoryClass|getLargeMemoryClass)|Runtime\.getRuntime\(\)\.(?:maxMemory|totalMemory|freeMemory)/g;

        if (!memoryCachePattern.test(code) && code.includes("Cache") || code.includes("cache")) {
            findings.push({
                title: 'مشكلة ذاكرة في Android: عدم التحقق من حالة الذاكرة عند استخدام التخزين المؤقت',
                category: MEMORY_CATEGORIES.EXCESSIVE_MEMORY_USAGE,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام آليات التخزين المؤقت دون التحقق من حالة الذاكرة المتاحة يمكن أن يؤدي إلى مشاكل في الأجهزة ذات الذاكرة المحدودة.',
                recommendation: 'استخدم ActivityManager.getMemoryClass() أو Runtime.getRuntime().maxMemory() للتحقق من الذاكرة المتاحة وضبط استراتيجية التخزين المؤقت وفقًا لذلك.',
                filePath,
                lineNumber: 0,
                type: 'issue'
            });
        }
    }

    /**
     * فحص مشاكل ذاكرة محددة لتطبيقات iOS
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {Array} findings - قائمة النتائج
     */
    checkIOSMemoryIssues(code, filePath, language, findings) {
        // فحص عدم تحرير موارد النظام
        if (language === 'Swift') {
            // فحص استخدام كائن الصورة الكبيرة دون تغيير الحجم
            const imagePattern = /UIImage\(named:\s*"[^"]+"\)/g;
            const resizedPattern = /UIGraphicsBeginImageContextWithOptions|\.withRenderingMode|CGFloat|scale:|resizableImage/g;

            if (imagePattern.test(code) && !resizedPattern.test(code)) {
                findings.push({
                    title: 'مشكلة ذاكرة في iOS: استخدام صور دون تغيير الحجم',
                    category: MEMORY_CATEGORIES.EXCESSIVE_MEMORY_USAGE,
                    severity: SEVERITY_LEVELS.MEDIUM,
                    description: 'تحميل صور كاملة الحجم في الذاكرة دون تغيير حجمها يمكن أن يستهلك ذاكرة كبيرة.',
                    recommendation: 'استخدم UIGraphicsBeginImageContextWithOptions لتغيير حجم الصور قبل عرضها، أو حدد حجمًا مناسبًا للصور في مجموعات الأصول.',
                    filePath,
                    lineNumber: 0,
                    type: 'issue'
                });
            }

            // فحص عدم استخدام [weak self] في الإغلاقات
            const closurePattern = /\{\s*\([^)]*\)\s*(?:->|in)[^}]*self\.[^}]*\}/g;
            const weakSelfPattern = /\[\s*weak\s+self\s*\]|\[\s*unowned\s+self\s*\]/g;

            let match;
            while ((match = closurePattern.exec(code)) !== null) {
                if (!weakSelfPattern.test(match[0])) {
                    findings.push({
                        title: 'مشكلة ذاكرة في iOS: إغلاق يستخدم self دون استخدام [weak self]',
                        category: MEMORY_CATEGORIES.MEMORY_LEAKS,
                        severity: SEVERITY_LEVELS.HIGH,
                        description: 'استخدام self في إغلاق دون استخدام [weak self] يمكن أن يسبب دورة مرجعية ويؤدي إلى تسرب ذاكرة.',
                        recommendation: 'استخدم [weak self] في الإغلاقات التي تستخدم self، ثم تحقق من self != nil داخل الإغلاق.',
                        filePath,
                        lineNumber: this.getLineNumber(code, match.index),
                        type: 'issue'
                    });
                }
            }
        } else if (language === 'Objective-C') {
            // فحص استخدام الكتل بدون __weak
            const blockPattern = /\^\s*\([^)]*\)\s*\{[^{}]*self[^{}]*\}/g;
            const weakSelfPattern = /__weak\s+\w+\s*\*\s*\w+Self\s*=\s*self|__weak\s+typeof\(self\)|__unsafe_unretained/g;

            let match;
            while ((match = blockPattern.exec(code)) !== null) {
                if (!weakSelfPattern.test(code.substring(Math.max(0, match.index - 200), match.index))) {
                    findings.push({
                        title: 'مشكلة ذاكرة في iOS: كتلة تستخدم self دون استخدام __weak',
                        category: MEMORY_CATEGORIES.MEMORY_LEAKS,
                        severity: SEVERITY_LEVELS.HIGH,
                        description: 'استخدام self في كتلة دون استخدام __weak يمكن أن يسبب دورة مرجعية ويؤدي إلى تسرب ذاكرة.',
                        recommendation: 'استخدم __weak typeof(self) weakSelf = self قبل الكتلة واستخدم weakSelf داخل الكتلة.',
                        filePath,
                        lineNumber: this.getLineNumber(code, match.index),
                        type: 'issue'
                    });
                }
            }

            // فحص عدم تحرير موارد Core Graphics
            const cgPattern = /CG\w+Create|UIGraphicsBeginImageContext/g;
            const cgReleasePattern = /CG\w+Release|UIGraphicsEndImageContext/g;

            if (cgPattern.test(code) && !cgReleasePattern.test(code)) {
                findings.push({
                    title: 'مشكلة ذاكرة في iOS: عدم تحرير موارد Core Graphics',
                    category: MEMORY_CATEGORIES.MEMORY_LEAKS,
                    severity: SEVERITY_LEVELS.HIGH,
                    description: 'إنشاء موارد Core Graphics دون تحريرها يمكن أن يسبب تسربات ذاكرة.',
                    recommendation: 'تأكد من استدعاء CGContextRelease أو UIGraphicsEndImageContext لتحرير موارد الرسومات.',
                    filePath,
                    lineNumber: 0,
                    type: 'issue'
                });
            }
        }
    }

    /**
     * فحص مشاكل ذاكرة محددة لتطبيقات Flutter
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {Array} findings - قائمة النتائج
     */
    checkFlutterMemoryIssues(code, filePath, findings) {
        // فحص عدم استخدام ListView.builder
        const listViewPattern = /ListView\s*\([^)]*children\s*:\s*(?:\[|\<)/g;
        const listViewBuilderPattern = /ListView\.builder|ListView\.separated/g;

        if (listViewPattern.test(code) && !listViewBuilderPattern.test(code)) {
            findings.push({
                title: 'مشكلة ذاكرة في Flutter: استخدام ListView بدلاً من ListView.builder',
                category: MEMORY_CATEGORIES.EXCESSIVE_MEMORY_USAGE,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام ListView مع قائمة أطفال محددة مسبقًا ينشئ جميع العناصر دفعة واحدة، مما يستهلك ذاكرة أكثر.',
                recommendation: 'استخدم ListView.builder لإنشاء العناصر حسب الحاجة فقط عندما يتم عرضها على الشاشة.',
                filePath,
                lineNumber: 0,
                type: 'issue'
            });
        }

        // فحص عدم استخدام تحكم الاشتراكات في تدفقات البيانات
        const streamPattern = /Stream\s*<|StreamController\s*<|\.stream|\.listen\s*\(/g;
        const disposePattern = /\.cancel\s*\(|@override\s+void\s+dispose|super\.dispose|\.close\s*\(\s*\)/g;

        if (streamPattern.test(code) && !disposePattern.test(code)) {
            findings.push({
                title: 'مشكلة ذاكرة في Flutter: عدم إلغاء اشتراكات التدفق',
                category: MEMORY_CATEGORIES.MEMORY_LEAKS,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'عدم إلغاء اشتراكات التدفق يمكن أن يسبب تسربات ذاكرة وتنفيذ منطق العمل بعد إزالة الواجهة.',
                recommendation: 'قم بتخزين الاشتراكات وإلغائها في طريقة dispose() باستخدام subscription.cancel().',
                filePath,
                lineNumber: 0,
                type: 'issue'
            });
        }

        // فحص عدم استخدام مراجع ضعيفة لوحدات التحكم
        const controllerPattern = /\w+Controller|PageController|TabController|AnimationController|ScrollController|TextEditingController/g;
        const weakReferencePattern = /WeakReference\s*<|weak\s+final/g;

        if (controllerPattern.test(code) && !disposePattern.test(code) && !weakReferencePattern.test(code)) {
            findings.push({
                title: 'مشكلة ذاكرة في Flutter: عدم التخلص من وحدات التحكم',
                category: MEMORY_CATEGORIES.MEMORY_LEAKS,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'عدم التخلص من وحدات التحكم في طريقة dispose() يمكن أن يسبب تسربات ذاكرة.',
                recommendation: 'تأكد من استدعاء controller.dispose() في طريقة dispose() للمكون.',
                filePath,
                lineNumber: 0,
                type: 'issue'
            });
        }
    }

    /**
     * فحص مشاكل ذاكرة محددة لتطبيقات React Native
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {Array} findings - قائمة النتائج
     */
    checkReactNativeMemoryIssues(code, filePath, language, findings) {
        // فحص عدم إزالة المستمعين
        const addListenerPattern = /(?:Dimensions|Keyboard|AppState|NetInfo)\.addEventListener\s*\(/g;
        const removeListenerPattern = /(?:Dimensions|Keyboard|AppState|NetInfo)\.removeEventListener\s*\(/g;

        if (addListenerPattern.test(code) && !removeListenerPattern.test(code)) {
            findings.push({
                title: 'مشكلة ذاكرة في React Native: عدم إزالة مستمعي الأحداث',
                category: MEMORY_CATEGORIES.MEMORY_LEAKS,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'إضافة مستمعين للأحداث من وحدات React Native دون إزالتها يمكن أن يسبب تسربات ذاكرة.',
                recommendation: 'تأكد من استدعاء removeEventListener في componentWillUnmount أو عند رجوع useEffect.',
                filePath,
                lineNumber: 0,
                type: 'issue'
            });
        }

        // فحص استخدام الإغلاقات داخل طرق التقديم
        const renderMethodPattern = /render\s*\(\s*\)\s*\{[^{}]*=>\s*\{/g;
        const memoFuncPattern = /useCallback\s*\(|useMemo\s*\(|React\.memo\s*\(/g;

        if (renderMethodPattern.test(code) && !memoFuncPattern.test(code)) {
            findings.push({
                title: 'مشكلة ذاكرة في React Native: إنشاء دوال جديدة في كل تقديم',
                category: MEMORY_CATEGORIES.INEFFICIENT_MEMORY_ALLOCATION,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'إنشاء دوال مجهولة في طريقة التقديم ينشئ دوال جديدة في كل مرة، مما يؤدي إلى عمليات إعادة تقديم غير ضرورية.',
                recommendation: 'استخدم useCallback لتخزين الدوال بين عمليات التقديم أو قم بتعريفها خارج المكون.',
                filePath,
                lineNumber: 0,
                type: 'issue'
            });
        }

        // فحص استخدام FlatList بشكل غير فعال
        const flatListPattern = /<FlatList\s+[^>]*>/g;
        const flatListOptPattern = /(?:removeClippedSubviews|maxToRenderPerBatch|updateCellsBatchingPeriod|windowSize|initialNumToRender|keyExtractor)/g;

        let match;
        while ((match = flatListPattern.exec(code)) !== null) {
            const openTag = match[0];
            if (!flatListOptPattern.test(openTag)) {
                findings.push({
                    title: 'مشكلة ذاكرة في React Native: استخدام FlatList دون التحسينات المطلوبة',
                    category: MEMORY_CATEGORIES.EXCESSIVE_MEMORY_USAGE,
                    severity: SEVERITY_LEVELS.MEDIUM,
                    description: 'استخدام FlatList دون خيارات التحسين يمكن أن يؤدي إلى استهلاك مفرط للذاكرة وأداء ضعيف.',
                    recommendation: 'استخدم خيارات مثل removeClippedSubviews={true} وmaxToRenderPerBatch وwindowSize لتحسين استخدام الذاكرة.',
                    filePath,
                    lineNumber: this.getLineNumber(code, match.index),
                    type: 'issue'
                });
            }
        }

        // فحص تسرب الاشتراكات من المكتبات الخارجية
        const librarySubscribePattern = /\w+\.subscribe\s*\(|\w+\.addListener\s*\(/g;
        const unsubscribePattern = /\w+\.unsubscribe\s*\(|\w+\.removeListener\s*\(/g;

        if (librarySubscribePattern.test(code) && !unsubscribePattern.test(code)) {
            findings.push({
                title: 'مشكلة ذاكرة في React Native: عدم إلغاء اشتراكات المكتبات الخارجية',
                category: MEMORY_CATEGORIES.MEMORY_LEAKS,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'عدم إلغاء اشتراكات المكتبات الخارجية يمكن أن يسبب تسربات ذاكرة.',
                recommendation: 'تأكد من تخزين كائن الاشتراك من المكتبات الخارجية وإلغاء الاشتراك في componentWillUnmount أو عند رجوع useEffect.',
                filePath,
                lineNumber: 0,
                type: 'issue'
            });
        }
    }

    /**
     * تحديد لغة البرمجة استنادًا إلى امتداد الملف
     * @param {string} extension - امتداد الملف
     * @returns {string|null} لغة البرمجة أو null إذا لم يتم التعرف عليها
     */
    getLanguageByExtension(extension) {
        const extensionMap = {
            '.java': 'Java',
            '.kt': 'Kotlin',
            '.swift': 'Swift',
            '.m': 'Objective-C',
            '.h': 'Objective-C',
            '.dart': 'Dart',
            '.js': 'JavaScript',
            '.jsx': 'JavaScript',
            '.ts': 'TypeScript',
            '.tsx': 'TypeScript',
            '.xml': 'XML',
            '.gradle': 'Groovy'
        };

        return extensionMap[extension] || null;
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
     * فحص تسريبات الذاكرة المحتملة (تنفيذ جديد يحل محل القديم)
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

module.exports = new MemoryAnalyzer();