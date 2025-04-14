

const path = require('path');
const { BATTERY_CATEGORIES, SEVERITY_LEVELS, MOBILE_APP_TYPES } = require('../utils/constants');
const logger = require('../utils/logger');

/**
 * محلل استهلاك البطارية في تطبيقات الموبايل
 * يكتشف الأنماط المرتبطة باستهلاك عالي للبطارية في الكود المصدري
 */
class BatteryAnalyzer {
    constructor() {
        logger.info('تهيئة محلل البطارية');

        // تعريف الأنماط والاستعلامات للبحث عن مشاكل استهلاك البطارية
        this.batteryPatterns = this.initBatteryPatterns();

        // إحصائيات للاستخدام
        this.analyzedFilesCount = 0;
        this.issuesFoundCount = 0;
    }

    /**
     * تهيئة قائمة أنماط مشاكل البطارية حسب لغة البرمجة
     * @returns {Object} أنماط البطارية المصنفة حسب اللغة
     */
    initBatteryPatterns() {
        return {
            Java: [
                // أنماط عامة للبطارية في Java
                {
                    name: 'continuous_location_updates',
                    category: BATTERY_CATEGORIES.LOCATION_SERVICES,
                    pattern: /requestLocationUpdates\([^)]*\)/gi,
                    patternWithoutInterval: /requestLocationUpdates\([^,]+,[^,]+,[^,]+\)/gi,
                    description: 'استخدام تحديثات الموقع بشكل مستمر دون تحديد فاصل زمني مناسب',
                    severity: SEVERITY_LEVELS.HIGH,
                    recommendation: 'قم بزيادة الفاصل الزمني بين تحديثات الموقع باستخدام قيم أكبر للفاصل الزمني والمسافة، واستخدم LocationRequest.setPriority(LocationRequest.PRIORITY_BALANCED_POWER_ACCURACY) للتوازن بين الدقة واستهلاك البطارية'
                },
                {
                    name: 'high_gps_accuracy',
                    category: BATTERY_CATEGORIES.LOCATION_ACCURACY,
                    pattern: /PRIORITY_HIGH_ACCURACY|setPriority\(\s*LocationRequest\.PRIORITY_HIGH_ACCURACY\s*\)/g,
                    description: 'استخدام دقة عالية لتحديد الموقع، مما يستهلك البطارية بشكل كبير',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'استخدم PRIORITY_BALANCED_POWER_ACCURACY بدلاً من PRIORITY_HIGH_ACCURACY عندما لا تكون الدقة العالية ضرورية'
                },
                {
                    name: 'wake_lock_without_release',
                    category: BATTERY_CATEGORIES.WAKE_LOCKS,
                    acquirePattern: /\.acquire\(\)/g,
                    releasePattern: /\.release\(\)/g,
                    description: 'استخدام WakeLock دون تحرير مناسب، مما قد يمنع الجهاز من الدخول في وضع السكون',
                    severity: SEVERITY_LEVELS.HIGH,
                    recommendation: 'تأكد من استدعاء release() لكل acquire() في كتلة finally لضمان التحرير حتى في حالة الاستثناءات'
                },
                {
                    name: 'excessive_network_calls',
                    category: BATTERY_CATEGORIES.NETWORK_OPERATIONS,
                    pattern: /\.execute\(\)|\.request\(\)|\.enqueue\(|fetch\(|\.get\(\)|\.post\(\)|Retrofit\.|Volley\.|OkHttp|client\.send|client\.execute\(/g,
                    description: 'إجراء عمليات شبكة متكررة، مما يستهلك البطارية بسرعة',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'استخدم آلية التخزين المؤقت، وتجميع طلبات الشبكة، وتنفيذ تقنيات التزامن الذكي لتقليل عدد الاتصالات الشبكية'
                },
                {
                    name: 'background_service_without_constraints',
                    category: BATTERY_CATEGORIES.BACKGROUND_APP_ACTIVITY,
                    pattern: /new Thread|extends Service|extends IntentService|JobScheduler|WorkManager|AlarmManager/g,
                    constraintPattern: /setRequiresBatteryNotLow|setRequiresDeviceIdle|setRequiresCharging|setPeriodic|setRequiredNetworkType/g,
                    description: 'تشغيل خدمات في الخلفية دون قيود على استخدام البطارية',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'استخدم WorkManager مع القيود المناسبة مثل setRequiresBatteryNotLow() و setRequiresCharging() لجدولة المهام بطريقة تراعي استهلاك البطارية'
                },
                {
                    name: 'frequent_animations',
                    category: BATTERY_CATEGORIES.ANIMATIONS_AND_GRAPHICS,
                    pattern: /Animation|animator|ObjectAnimator|ValueAnimator|setAnimation|startAnimation|animate|Transition|TransitionManager/g,
                    description: 'استخدام رسومات أو تحريكات معقدة بشكل متكرر',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'حد من استخدام الرسوم المتحركة، واجعلها قصيرة، واستخدم التحريكات البسيطة، وأوقف الرسوم المتحركة عندما لا تكون مرئية للمستخدم'
                },
                {
                    name: 'inefficient_sensor_usage',
                    category: BATTERY_CATEGORIES.SENSOR_USAGE,
                    registerPattern: /registerListener|SensorManager|getSensorList|getDefaultSensor/g,
                    unregisterPattern: /unregisterListener/g,
                    description: 'استخدام أجهزة الاستشعار بشكل متكرر أو دون إلغاء التسجيل المناسب',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'قم بتسجيل خروج المستمعين عندما لا تكون هناك حاجة إليهم، واستخدم معدلات أخذ العينات المنخفضة، واختر SENSOR_DELAY المناسب'
                },
                {
                    name: 'blocking_main_thread',
                    category: BATTERY_CATEGORIES.CPU_PROCESSING,
                    pattern: /Thread\.sleep|SystemClock\.sleep|while\s*\(\s*true\s*\)|for\s*\(\s*;[^;]*;\s*\)/g,
                    description: 'عمليات طويلة أو حلقات غير منتهية في الخيط الرئيسي',
                    severity: SEVERITY_LEVELS.HIGH,
                    recommendation: 'انقل الحسابات الطويلة إلى خلفية باستخدام Coroutines أو RxJava أو AsyncTask أو WorkManager'
                },
                {
                    name: 'high_refresh_rate',
                    category: BATTERY_CATEGORIES.APP_REFRESH_INTERVALS,
                    pattern: /invalidate\(\)|postInvalidate\(\)|setInterval|requestAnimationFrame|scheduleAtFixedRate|Timer|TimerTask|ScheduledExecutorService|scheduleWithFixedDelay/g,
                    description: 'إعادة رسم متكررة للواجهة أو تحديثات بمعدلات عالية',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'قلل من معدل تحديث العناصر المرئية واستخدم القيم المناسبة لتواتر التحديثات'
                },
                {
                    name: 'unclosed_resources',
                    category: BATTERY_CATEGORIES.APP_CLEANUP_ON_EXIT,
                    openPattern: /new FileInputStream|new FileOutputStream|openFileInput|openFileOutput|getWritableDatabase|getReadableDatabase|beginTransaction|SQLiteDatabase\.query/g,
                    closePattern: /\.close\(\)|endTransaction|recycle\(\)/g,
                    description: 'عدم إغلاق الموارد مثل قواعد البيانات والملفات والإتصالات',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'تأكد من إغلاق جميع الموارد في كتلة finally أو استخدم try-with-resources'
                },
                {
                    name: 'excessive_background_threads',
                    category: BATTERY_CATEGORIES.MULTITASKING,
                    pattern: /new Thread|Executors|ThreadPoolExecutor|newFixedThreadPool|newCachedThreadPool|newSingleThreadExecutor/g,
                    description: 'إنشاء عدد كبير من الخيوط دون إدارة مناسبة',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'استخدم مجمعات الخيوط بحكمة، وتجنب إنشاء خيوط جديدة لكل مهمة، واعتبر استخدام WorkManager أو Coroutines'
                },
                {
                    name: 'bluetooth_scanning',
                    category: BATTERY_CATEGORIES.BLUETOOTH_USAGE,
                    pattern: /startScan|startLeScan|startDiscovery|BluetoothLeScanner/g,
                    description: 'مسح بلوتوث متكرر أو مستمر',
                    severity: SEVERITY_LEVELS.HIGH,
                    recommendation: 'استخدم startScan مع وقت توقف، واستخدم طرق المسح منخفضة الطاقة، وأوقف المسح عندما لا يكون نشطًا'
                },
                {
                    name: 'wifi_scanning',
                    category: BATTERY_CATEGORIES.WIFI_SCANNING,
                    pattern: /startScan|getScanResults|SCAN_RESULTS_AVAILABLE_ACTION|WifiManager/g,
                    description: 'إجراء عمليات مسح WiFi متكررة',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'قلل من تكرار عمليات مسح WiFi واستخدم الفاصل الزمني المناسب بين المسحات'
                },
                {
                    name: 'continuous_sync_adapter',
                    category: BATTERY_CATEGORIES.APP_SYNCING,
                    pattern: /extends SyncAdapter|ContentResolver\.requestSync|ContentResolver\.addPeriodicSync|setSyncAutomatically/g,
                    description: 'مزامنة متكررة جداً لمحتوى التطبيق',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'زيادة الفاصل الزمني بين عمليات المزامنة واستخدام شروط المزامنة مثل SYNC_EXTRAS_REQUIRE_CHARGING'
                }
            ],
            Kotlin: [
                // أنماط عامة للبطارية في Kotlin
                {
                    name: 'continuous_location_updates',
                    category: BATTERY_CATEGORIES.LOCATION_SERVICES,
                    pattern: /requestLocationUpdates\([^)]*\)/gi,
                    patternWithoutInterval: /requestLocationUpdates\([^,]+,[^,]+,[^,]+\)/gi,
                    description: 'استخدام تحديثات الموقع بشكل مستمر دون تحديد فاصل زمني مناسب',
                    severity: SEVERITY_LEVELS.HIGH,
                    recommendation: 'قم بزيادة الفاصل الزمني بين تحديثات الموقع واستخدم LocationRequest.PRIORITY_BALANCED_POWER_ACCURACY'
                },
                {
                    name: 'high_gps_accuracy',
                    category: BATTERY_CATEGORIES.LOCATION_ACCURACY,
                    pattern: /PRIORITY_HIGH_ACCURACY|priority\s*=\s*Priority\.PRIORITY_HIGH_ACCURACY|setPriority\(\s*LocationRequest\.PRIORITY_HIGH_ACCURACY\s*\)/g,
                    description: 'استخدام دقة عالية لتحديد الموقع، مما يستهلك البطارية بشكل كبير',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'استخدم PRIORITY_BALANCED_POWER_ACCURACY بدلاً من PRIORITY_HIGH_ACCURACY عندما لا تكون الدقة العالية ضرورية'
                },
                {
                    name: 'wake_lock_without_release',
                    category: BATTERY_CATEGORIES.WAKE_LOCKS,
                    acquirePattern: /\.acquire\(\)/g,
                    releasePattern: /\.release\(\)/g,
                    description: 'استخدام WakeLock دون تحرير مناسب، مما قد يمنع الجهاز من الدخول في وضع السكون',
                    severity: SEVERITY_LEVELS.HIGH,
                    recommendation: 'استخدم use {} أو try-finally لضمان تحرير WakeLock حتى في حالة الاستثناءات'
                },
                {
                    name: 'coroutines_without_dispatchers',
                    category: BATTERY_CATEGORIES.CPU_PROCESSING,
                    pattern: /launch\s*\{|async\s*\{/g,
                    dispatcherPattern: /Dispatchers\.(Default|IO|Main)/g,
                    description: 'استخدام Coroutines دون تحديد المرسل المناسب، مما قد يؤدي إلى تنفيذ عمليات ثقيلة على الخيط الرئيسي',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'استخدم Dispatchers.IO للعمليات المتعلقة بالإدخال/الإخراج و Dispatchers.Default للعمليات الثقيلة الحسابية'
                },
                {
                    name: 'inefficient_sensor_usage',
                    category: BATTERY_CATEGORIES.SENSOR_USAGE,
                    registerPattern: /registerListener|SensorManager|getSensorList|getDefaultSensor/g,
                    unregisterPattern: /unregisterListener/g,
                    description: 'استخدام أجهزة الاستشعار بشكل متكرر أو دون إلغاء التسجيل المناسب',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'قم بتسجيل خروج المستمعين في onPause() واستخدم معدلات أخذ العينات المنخفضة'
                },
                {
                    name: 'background_service_without_constraints',
                    category: BATTERY_CATEGORIES.BACKGROUND_APP_ACTIVITY,
                    pattern: /class\s+\w+\s*:\s*Service|class\s+\w+\s*:\s*JobService|WorkManager|AlarmManager/g,
                    constraintPattern: /setRequiresBatteryNotLow|setRequiresDeviceIdle|setRequiresCharging|setPeriodic|setRequiredNetworkType/g,
                    description: 'تشغيل خدمات في الخلفية دون قيود على استخدام البطارية',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'استخدم WorkManager مع القيود المناسبة مثل setRequiresBatteryNotLow() و setRequiresCharging()'
                },
                {
                    name: 'frequent_animations',
                    category: BATTERY_CATEGORIES.ANIMATIONS_AND_GRAPHICS,
                    pattern: /Animation|animator|ObjectAnimator|ValueAnimator|setAnimation|startAnimation|animate|Transition|TransitionManager/g,
                    description: 'استخدام رسومات أو تحريكات معقدة بشكل متكرر',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'حد من استخدام الرسوم المتحركة، واجعلها قصيرة، واستخدم التحريكات البسيطة'
                }
            ],
            Swift: [
                // أنماط البطارية في Swift
                {
                    name: 'continuous_location_updates',
                    category: BATTERY_CATEGORIES.LOCATION_SERVICES,
                    pattern: /startUpdatingLocation|requestLocation/g,
                    accuracyPattern: /kCLLocationAccuracyBest|desiredAccuracy\s*=\s*kCLLocationAccuracyBest/g,
                    description: 'استخدام تحديثات الموقع بشكل مستمر بدقة عالية',
                    severity: SEVERITY_LEVELS.HIGH,
                    recommendation: 'استخدم startMonitoringSignificantLocationChanges بدلاً من startUpdatingLocation، أو استخدم kCLLocationAccuracyHundredMeters لدقة أقل'
                },
                {
                    name: 'background_refresh',
                    category: BATTERY_CATEGORIES.BACKGROUND_APP_ACTIVITY,
                    pattern: /UIApplication\.shared\.setMinimumBackgroundFetchInterval|UIBackgroundModes|beginBackgroundTask/g,
                    description: 'استخدام تحديث خلفي متكرر يستهلك البطارية',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'زيادة الفاصل الزمني للتحديثات الخلفية واستخدام UIApplicationBackgroundFetchIntervalMinimum عند الإمكان'
                },
                {
                    name: 'core_motion_updates',
                    category: BATTERY_CATEGORIES.SENSOR_USAGE,
                    pattern: /startAccelerometerUpdates|startGyroUpdates|startDeviceMotionUpdates|startMagnetometerUpdates/g,
                    description: 'استخدام تحديثات مستمرة لأجهزة استشعار الحركة',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'أوقف تحديثات الحركة عندما لا تكون هناك حاجة إليها واستخدم معدلات تحديث أقل'
                },
                {
                    name: 'timer_without_tolerance',
                    category: BATTERY_CATEGORIES.APP_REFRESH_INTERVALS,
                    pattern: /Timer\.scheduledTimer|Timer\(timeInterval/g,
                    tolerancePattern: /tolerance/g,
                    description: 'استخدام المؤقتات بدون تسامح زمني، مما يتطلب استيقاظ دقيق للمعالج',
                    severity: SEVERITY_LEVELS.LOW,
                    recommendation: 'أضف قيمة تسامح زمني للمؤقتات باستخدام timer.tolerance = timeInterval * 0.1'
                },
                {
                    name: 'continuous_animation',
                    category: BATTERY_CATEGORIES.ANIMATIONS_AND_GRAPHICS,
                    pattern: /CADisplayLink|displayLink|animateWithDuration|UIView\.animate/g,
                    description: 'استخدام رسوم متحركة مستمرة أو طويلة المدة',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'استخدم preferredFramesPerSecond لتقليل معدل الإطارات في CADisplayLink واستخدم رسوم متحركة قصيرة'
                },
                {
                    name: 'excessive_networking',
                    category: BATTERY_CATEGORIES.NETWORK_OPERATIONS,
                    pattern: /URLSession|dataTask|downloadTask|uploadTask|Alamofire|AFNetworking/g,
                    backgroundPattern: /URLSessionConfiguration\.background|discretionary\s*=\s*true/g,
                    description: 'إجراء عمليات شبكة متكررة دون تكوين للخلفية',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'استخدم URLSessionConfiguration.background واضبط خاصية discretionary على true للسماح للنظام بجدولة العمليات بكفاءة'
                }
            ],
            'Objective-C': [
                // أنماط البطارية في Objective-C
                {
                    name: 'continuous_location_updates',
                    category: BATTERY_CATEGORIES.LOCATION_SERVICES,
                    pattern: /startUpdatingLocation|requestLocation/g,
                    accuracyPattern: /kCLLocationAccuracyBest|setDesiredAccuracy:\s*kCLLocationAccuracyBest/g,
                    description: 'استخدام تحديثات الموقع بشكل مستمر بدقة عالية',
                    severity: SEVERITY_LEVELS.HIGH,
                    recommendation: 'استخدم startMonitoringSignificantLocationChanges بدلاً من startUpdatingLocation، أو استخدم kCLLocationAccuracyHundredMeters لدقة أقل'
                },
                {
                    name: 'background_refresh',
                    category: BATTERY_CATEGORIES.BACKGROUND_APP_ACTIVITY,
                    pattern: /setMinimumBackgroundFetchInterval|UIBackgroundModes|beginBackgroundTaskWithExpirationHandler/g,
                    description: 'استخدام تحديث خلفي متكرر يستهلك البطارية',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'زيادة الفاصل الزمني للتحديثات الخلفية واستخدام UIApplicationBackgroundFetchIntervalMinimum عند الإمكان'
                },
                {
                    name: 'core_motion_updates',
                    category: BATTERY_CATEGORIES.SENSOR_USAGE,
                    pattern: /startAccelerometerUpdates|startGyroUpdates|startDeviceMotionUpdates|startMagnetometerUpdates/g,
                    description: 'استخدام تحديثات مستمرة لأجهزة استشعار الحركة',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'أوقف تحديثات الحركة عندما لا تكون هناك حاجة إليها واستخدم معدلات تحديث أقل'
                }
            ],
            Dart: [
                // أنماط البطارية في Flutter/Dart
                {
                    name: 'excessive_rebuilds',
                    category: BATTERY_CATEGORIES.UI_OPTIMIZATION,
                    pattern: /setState\(|notifyListeners\(|BehaviorSubject|StreamController/g,
                    description: 'إعادة بناء متكررة للواجهة يمكن أن تستهلك البطارية',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'استخدم const widgets حيثما أمكن، وقلل من استدعاءات setState() واستخدم Provider أو Bloc للتحكم في إعادة البناء'
                },
                {
                    name: 'location_updates',
                    category: BATTERY_CATEGORIES.LOCATION_SERVICES,
                    pattern: /location\.onLocationChanged|geolocator|getPositionStream|watchPosition|requestLocationUpdates/g,
                    description: 'مراقبة تغييرات الموقع بشكل مستمر',
                    severity: SEVERITY_LEVELS.HIGH,
                    recommendation: 'قلل من تواتر تحديثات الموقع واستخدم distanceFilter للتحديث فقط عند تغير الموقع بمسافة معينة'
                },
                {
                    name: 'sensor_streams',
                    category: BATTERY_CATEGORIES.SENSOR_USAGE,
                    pattern: /accelerometerEvents|gyroscopeEvents|userAccelerometerEvents|magnetometerEvents|sensors_plus/g,
                    description: 'الاشتراك في تحديثات أجهزة الاستشعار بشكل مستمر',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'إلغاء الاشتراك من تدفقات أجهزة الاستشعار عند عدم الاستخدام واستخدام معدلات أخذ عينات أقل'
                },
                {
                    name: 'excessive_network_calls',
                    category: BATTERY_CATEGORIES.NETWORK_OPERATIONS,
                    pattern: /http\.|HttpClient|dio\.|Dio\(|fetch|networkRequests|RestClient/g,
                    description: 'إجراء عمليات شبكة متكررة، مما يستهلك البطارية بسرعة',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'استخدم التخزين المؤقت، وتجميع طلبات الشبكة، والتزامن الدوري بدلاً من المتكرر'
                },
                {
                    name: 'continuous_animation',
                    category: BATTERY_CATEGORIES.ANIMATIONS_AND_GRAPHICS,
                    pattern: /AnimationController|Timer\.periodic|AnimatedBuilder|TweenAnimationBuilder|TickerProvider/g,
                    description: 'استخدام رسومات متحركة مستمرة',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'تأكد من التخلص من AnimationController باستخدام dispose() وإيقافها عندما لا تكون مرئية'
                },
                {
                    name: 'timer_misuse',
                    category: BATTERY_CATEGORIES.APP_REFRESH_INTERVALS,
                    pattern: /Timer\.periodic|Timer\(/g,
                    cancelPattern: /cancel\(\)/g,
                    description: 'استخدام مؤقتات متكررة دون إلغائها بشكل صحيح',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'قم دائمًا بإلغاء المؤقتات في dispose() وتجنب المؤقتات ذات الفواصل الزمنية القصيرة جدًا'
                },
                {
                    name: 'background_processes',
                    category: BATTERY_CATEGORIES.BACKGROUND_PROCESSES,
                    pattern: /isolate|compute|Isolate\.spawn|FlutterBackgroundService|workmanager|background_fetch/g,
                    description: 'استخدام عمليات خلفية مستمرة',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'استخدم عمليات خلفية دورية بدلاً من المستمرة، واحرص على إنهاء Isolates عند الانتهاء من المهام'
                }
            ],
            JavaScript: [
                // أنماط البطارية في React Native / JavaScript
                {
                    name: 'location_tracking',
                    category: BATTERY_CATEGORIES.LOCATION_SERVICES,
                    pattern: /watchPosition|getCurrentPosition|startLocationUpdates|requestLocationUpdates|LocationServices/g,
                    description: 'مراقبة الموقع بشكل مستمر',
                    severity: SEVERITY_LEVELS.HIGH,
                    recommendation: 'استخدم enableHighAccuracy: false واضبط maximumAge وtimeout بشكل مناسب لتقليل استهلاك البطارية'
                },
                {
                    name: 'background_geolocation',
                    category: BATTERY_CATEGORIES.LOCATION_SERVICES,
                    pattern: /BackgroundGeolocation|startBackgroundTask|startMonitoring|backgroundTask/g,
                    description: 'تعقب الموقع في الخلفية',
                    severity: SEVERITY_LEVELS.HIGH,
                    recommendation: 'استخدم desiredAccuracy: 10 للدقة المتوسطة، وstationaryRadius أكبر، وdistanceFilter أكبر'
                },
                {
                    name: 'excessive_intervals',
                    category: BATTERY_CATEGORIES.APP_REFRESH_INTERVALS,
                    pattern: /setInterval|setTimeout|InteractionManager|requestAnimationFrame/g,
                    intervalPattern: /setInterval\(\s*[^,]+,\s*\d+\s*\)/g,
                    description: 'استخدام مؤقتات أو فواصل متكررة',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'استخدم فواصل زمنية أطول، وأوقف المؤقتات عند عدم الحاجة إليها، واستخدم InteractionManager.runAfterInteractions لتأجيل المهام غير الحرجة'
                },
                {
                    name: 'sensor_overuse',
                    category: BATTERY_CATEGORIES.SENSOR_USAGE,
                    pattern: /Accelerometer|Gyroscope|Magnetometer|DeviceMotion|Proximity|addListener\(\s*['"]accelerometer|addListener\(\s*['"]gyroscope/g,
                    description: 'استخدام أجهزة الاستشعار بشكل مفرط',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'قلل من معدل أخذ العينات واستخدم removeListeners عند عدم الاستخدام'
                },
                {
                    name: 'continuous_network_polling',
                    category: BATTERY_CATEGORIES.NETWORK_OPERATIONS,
                    pattern: /fetch\(|XMLHttpRequest|axios\.|\.get\(|\.post\(|\.request\(/g,
                    description: 'استطلاع مستمر للشبكة',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'استخدم WebSockets أو Firebase Cloud Messaging بدلاً من الاستطلاع، وقم بتنفيذ استراتيجيات التخزين المؤقت'
                },
                {
                    name: 'animation_overuse',
                    category: BATTERY_CATEGORIES.ANIMATIONS_AND_GRAPHICS,
                    pattern: /Animated\.|Animation\.|useNativeDriver:\s*false|LayoutAnimation|animationType|createAnimatedComponent/g,
                    description: 'استخدام مفرط للرسوم المتحركة',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'استخدم دائمًا useNativeDriver: true عندما يكون ذلك ممكنًا، وحد من كمية الرسوم المتحركة المتزامنة'
                }
            ],
            TypeScript: [
                // أنماط البطارية في TypeScript (نفس الأنماط تقريبًا كما في JavaScript)
                {
                    name: 'location_tracking',
                    category: BATTERY_CATEGORIES.LOCATION_SERVICES,
                    pattern: /watchPosition|getCurrentPosition|startLocationUpdates|requestLocationUpdates|LocationServices/g,
                    description: 'مراقبة الموقع بشكل مستمر',
                    severity: SEVERITY_LEVELS.HIGH,
                    recommendation: 'استخدم enableHighAccuracy: false واضبط maximumAge وtimeout بشكل مناسب لتقليل استهلاك البطارية'
                },
                {
                    name: 'sensor_overuse',
                    category: BATTERY_CATEGORIES.SENSOR_USAGE,
                    pattern: /Accelerometer|Gyroscope|Magnetometer|DeviceMotion|Proximity|addListener\(\s*['"]accelerometer|addListener\(\s*['"]gyroscope/g,
                    description: 'استخدام أجهزة الاستشعار بشكل مفرط',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'قلل من معدل أخذ العينات واستخدم removeListeners عند عدم الاستخدام'
                }
            ],
            'C#': [
                // أنماط البطارية في Xamarin / C#
                {
                    name: 'continuous_location_updates',
                    category: BATTERY_CATEGORIES.LOCATION_SERVICES,
                    pattern: /StartListening|GetLocationAsync|RequestLocationUpdates|RequestSingleUpdate/g,
                    description: 'تحديثات موقع متكررة',
                    severity: SEVERITY_LEVELS.HIGH,
                    recommendation: 'زيادة الفاصل الزمني والمسافة، استخدام Accuracy.Medium بدلاً من Accuracy.Best'
                },
                {
                    name: 'background_services',
                    category: BATTERY_CATEGORIES.BACKGROUND_APP_ACTIVITY,
                    pattern: /StartService|StartCommand|StartForeground|JobScheduler|Service|MessagingCenter|DependencyService/g,
                    description: 'استخدام خدمات في الخلفية دون ترشيد',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'استخدم التنبيهات المحلية أو خدمات الدفع بدلاً من الخدمات المستمرة، وتأكد من إيقاف الخدمات عند عدم الحاجة إليها'
                },
                {
                    name: 'sensor_usage',
                    category: BATTERY_CATEGORIES.SENSOR_USAGE,
                    pattern: /SensorSpeed|Accelerometer|Gyroscope|Compass|Barometer|StartListening/g,
                    description: 'استخدام أجهزة الاستشعار بشكل متكرر',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'استخدم SensorSpeed.UI أو SensorSpeed.Game بدلاً من SensorSpeed.Fastest، وتأكد من إيقاف أجهزة الاستشعار عند عدم الاستخدام'
                },
                {
                    name: 'device_wake_lock',
                    category: BATTERY_CATEGORIES.WAKE_LOCKS,
                    pattern: /WakeLock|PowerManager|KeepScreenOn|WindowManagerFlags|SetFlags/g,
                    description: 'استخدام آليات الإبقاء على وضع اليقظة',
                    severity: SEVERITY_LEVELS.HIGH,
                    recommendation: 'تجنب استخدام WakeLock إلا عند الضرورة القصوى، وتأكد من تحريرها في أقرب وقت ممكن'
                },
                {
                    name: 'timer_overuse',
                    category: BATTERY_CATEGORIES.APP_REFRESH_INTERVALS,
                    pattern: /Timer|Device\.StartTimer|Timeout|SetTimeout|SetInterval|Task\.Delay\(/g,
                    description: 'استخدام مفرط للمؤقتات',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'زيادة الفاصل الزمني بين التنفيذات وإلغاء المؤقتات عند عدم الحاجة'
                }
            ],
            XML: [
                // أنماط البطارية في ملفات Android XML
                {
                    name: 'high_screen_brightness',
                    category: BATTERY_CATEGORIES.DISPLAY_BRIGHTNESS,
                    pattern: /android:screenOrientation="landscape"|android:keepScreenOn="true"/g,
                    description: 'ضبط الشاشة لتظل مضاءة أو في وضع أفقي',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'تجنب استخدام android:keepScreenOn="true" في التخطيطات حيث يمكن'
                },
                {
                    name: 'background_mode_enabled',
                    category: BATTERY_CATEGORIES.BACKGROUND_APP_ACTIVITY,
                    pattern: /<service|<receiver|android:process=|android:exported="true"|android.intent.action.BOOT_COMPLETED/g,
                    description: 'استخدام خدمات وأجهزة استقبال البث في الخلفية',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'استخدم WorkManager بدلاً من الخدمات أو أجهزة استقبال البث التقليدية'
                },
                {
                    name: 'location_permissions',
                    category: BATTERY_CATEGORIES.LOCATION_SERVICES,
                    pattern: /ACCESS_FINE_LOCATION|ACCESS_BACKGROUND_LOCATION|ACCESS_COARSE_LOCATION/g,
                    description: 'استخدام أذونات الموقع التي تستهلك البطارية',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'استخدم ACCESS_COARSE_LOCATION بدلاً من ACCESS_FINE_LOCATION عندما تكون الدقة العالية غير ضرورية'
                },
                {
                    name: 'wake_lock_permission',
                    category: BATTERY_CATEGORIES.WAKE_LOCKS,
                    pattern: /WAKE_LOCK/g,
                    description: 'استخدام إذن WAKE_LOCK الذي يمنع الجهاز من الدخول في وضع السكون',
                    severity: SEVERITY_LEVELS.HIGH,
                    recommendation: 'تجنب استخدام WAKE_LOCK إلا عند الضرورة القصوى وتأكد من تحريره في أقرب وقت ممكن'
                },
                {
                    name: 'foreground_service',
                    category: BATTERY_CATEGORIES.BACKGROUND_PROCESSES,
                    pattern: /FOREGROUND_SERVICE|startForeground/g,
                    description: 'استخدام خدمات في المقدمة، والتي تستهلك البطارية في الخلفية',
                    severity: SEVERITY_LEVELS.MEDIUM,
                    recommendation: 'استبدل الخدمات في المقدمة بـ WorkManager عندما يكون ذلك ممكنًا'
                }
            ]
        };
    }

    /**
     * تحليل الملف بحثاً عن أنماط استهلاك البطارية
     * @param {string} fileContent - محتوى الملف
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {string} appType - نوع تطبيق الموبايل
     * @returns {Array} قائمة بالمشاكل المكتشفة
     */
    analyzeBatteryPatterns(fileContent, filePath, language, appType) {
        this.analyzedFilesCount++;

        // تخطي الملفات التي لا تحتوي على كود أو محتوى الملف فارغ
        if (!fileContent || fileContent.trim() === '') {
            logger.debug(`تخطي تحليل البطارية للملف الفارغ: ${filePath}`);
            return [];
        }

        logger.debug(`تحليل البطارية للملف: ${filePath}, اللغة: ${language || 'غير معروفة'}, حجم الملف: ${fileContent.length} حرف`);

        const fileExtension = path.extname(filePath).toLowerCase();
        const findings = [];

        // تحديد لغة البرمجة إذا لم يتم توفيرها
        if (!language) {
            language = this.getLanguageByExtension(fileExtension);
            if (!language) {
                logger.debug(`لا يمكن تحديد لغة البرمجة للملف ${filePath}, تخطي تحليل البطارية`);
                return [];
            }
        }

        // الحصول على أنماط البطارية المناسبة للغة البرمجة
        const patterns = this.batteryPatterns[language] || [];

        if (patterns.length === 0) {
            logger.debug(`لا توجد أنماط بطارية متاحة للغة ${language}, تخطي التحليل`);
            return [];
        }

        // تحليل كل نمط للبطارية
        for (const pattern of patterns) {
            try {
                const matches = this.findPatternMatches(fileContent, pattern);

                if (matches && matches.length > 0) {
                    // تحديد رقم السطر للمطابقة الأولى
                    const firstMatchLineNumber = this.getLineNumber(fileContent, matches[0].index);

                    // إنشاء كائن النتيجة
                    const finding = {
                        title: `مشكلة بطارية: ${pattern.name}`,
                        category: pattern.category,
                        severity: pattern.severity,
                        description: pattern.description,
                        recommendation: pattern.recommendation,
                        lineNumber: firstMatchLineNumber,
                        matchCount: matches.length,
                        matches: matches.slice(0, 5).map(m => m.text) // الاحتفاظ بأول 5 مطابقات فقط
                    };

                    findings.push(finding);
                    this.issuesFoundCount++;

                    logger.debug(`تم العثور على مشكلة بطارية: ${pattern.name} في الملف ${filePath}, السطر ${firstMatchLineNumber}, عدد المطابقات: ${matches.length}`);
                }
            } catch (error) {
                logger.error(`خطأ أثناء تحليل نمط البطارية ${pattern.name} في الملف ${filePath}: ${error.message}`);
            }
        }

        // التحقق من الأنماط المركبة التي تتطلب مقارنات خاصة
        this.analyzeCompoundBatteryPatterns(fileContent, filePath, language, findings);

        if (findings.length > 0) {
            logger.info(`تم العثور على ${findings.length} مشاكل بطارية في الملف: ${filePath}`);
        } else {
            logger.debug(`لم يتم العثور على مشاكل بطارية في الملف: ${filePath}`);
        }

        return findings;
    }

    /**
     * العثور على جميع المطابقات لنمط معين
     * @param {string} content - محتوى الملف
     * @param {object} pattern - كائن النمط
     * @returns {Array} قائمة بالمطابقات
     */
    findPatternMatches(content, pattern) {
        const matches = [];
        let match;

        if (!pattern.pattern) {
            return matches;
        }

        // إعادة تعيين lastIndex للتعبير العادي للتأكد من أنه سيبدأ من البداية
        pattern.pattern.lastIndex = 0;

        while ((match = pattern.pattern.exec(content)) !== null) {
            matches.push({
                text: match[0],
                index: match.index
            });

            // لتجنب الحلقات اللانهائية مع regexp العالمي
            if (pattern.pattern.lastIndex === match.index) {
                pattern.pattern.lastIndex++;
            }
        }

        return matches;
    }

    /**
     * تحليل الأنماط المركبة للبطارية التي تتطلب فحوصات متعددة
     * @param {string} content - محتوى الملف
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {Array} findings - قائمة النتائج
     */
    analyzeCompoundBatteryPatterns(content, filePath, language, findings) {
        if (!this.batteryPatterns[language]) {
            return;
        }

        // حالات خاصة تعتمد على اللغة
        switch (language) {
            case 'Java':
            case 'Kotlin':
                this.analyzeAndroidCompoundPatterns(content, filePath, language, findings);
                break;
            case 'Swift':
            case 'Objective-C':
                this.analyzeIOSCompoundPatterns(content, filePath, language, findings);
                break;
            case 'Dart':
                this.analyzeFlutterCompoundPatterns(content, filePath, findings);
                break;
            case 'JavaScript':
            case 'TypeScript':
                this.analyzeReactNativeCompoundPatterns(content, filePath, findings);
                break;
        }
    }

    /**
     * تحليل أنماط مركبة خاصة بمنصة Android
     * @param {string} content - محتوى الملف
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {Array} findings - قائمة النتائج
     */
    analyzeAndroidCompoundPatterns(content, filePath, language, findings) {
        // فحص عدم توازن WakeLock
        const wakeLockPattern = this.batteryPatterns[language].find(p => p.name === 'wake_lock_without_release');
        if (wakeLockPattern) {
            const acquireMatches = this.findPatternMatches(content, { pattern: wakeLockPattern.acquirePattern });
            const releaseMatches = this.findPatternMatches(content, { pattern: wakeLockPattern.releasePattern });

            if (acquireMatches.length > releaseMatches.length) {
                const firstMatchLineNumber = this.getLineNumber(content, acquireMatches[0].index);

                findings.push({
                    title: 'مشكلة بطارية: استخدام WakeLock غير متوازن',
                    category: BATTERY_CATEGORIES.WAKE_LOCKS,
                    severity: SEVERITY_LEVELS.HIGH,
                    description: `تم اكتشاف ${acquireMatches.length} استدعاءات acquire() ولكن فقط ${releaseMatches.length} استدعاءات release()`,
                    recommendation: 'تأكد من أن كل استدعاء acquire() يقابله استدعاء release() بشكل مناسب، ويفضل استخدام try-finally أو use {}',
                    lineNumber: firstMatchLineNumber,
                    matchCount: acquireMatches.length
                });

                logger.debug(`تم اكتشاف عدم توازن WakeLock في الملف ${filePath}: ${acquireMatches.length} acquire مقابل ${releaseMatches.length} release`);
            }
        }

        // فحص خدمات خلفية دون قيود
        const bgServicePattern = this.batteryPatterns[language].find(p => p.name === 'background_service_without_constraints');
        if (bgServicePattern) {
            const serviceMatches = this.findPatternMatches(content, { pattern: bgServicePattern.pattern });
            const constraintMatches = this.findPatternMatches(content, { pattern: bgServicePattern.constraintPattern });

            if (serviceMatches.length > 0 && constraintMatches.length === 0) {
                const firstMatchLineNumber = this.getLineNumber(content, serviceMatches[0].index);

                findings.push({
                    title: 'مشكلة بطارية: خدمة خلفية دون قيود',
                    category: BATTERY_CATEGORIES.BACKGROUND_APP_ACTIVITY,
                    severity: SEVERITY_LEVELS.MEDIUM,
                    description: 'استخدام خدمات خلفية دون تعيين قيود للحفاظ على البطارية',
                    recommendation: 'استخدم WorkManager مع setRequiresBatteryNotLow() وsetRequiresCharging() والقيود المناسبة الأخرى',
                    lineNumber: firstMatchLineNumber,
                    matchCount: serviceMatches.length
                });

                logger.debug(`تم اكتشاف خدمة خلفية دون قيود في الملف ${filePath}`);
            }
        }
    }

    /**
     * تحليل أنماط مركبة خاصة بمنصة iOS
     * @param {string} content - محتوى الملف
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {Array} findings - قائمة النتائج
     */
    analyzeIOSCompoundPatterns(content, filePath, language, findings) {
        // فحص دقة عالية للموقع دون مبرر
        const locationPattern = this.batteryPatterns[language].find(p => p.name === 'continuous_location_updates');
        if (locationPattern) {
            const locationMatches = this.findPatternMatches(content, { pattern: locationPattern.pattern });
            const accuracyMatches = this.findPatternMatches(content, { pattern: locationPattern.accuracyPattern });

            if (locationMatches.length > 0 && accuracyMatches.length > 0) {
                const firstMatchLineNumber = this.getLineNumber(content, locationMatches[0].index);

                findings.push({
                    title: 'مشكلة بطارية: تحديثات موقع دقيقة مستمرة',
                    category: BATTERY_CATEGORIES.LOCATION_SERVICES,
                    severity: SEVERITY_LEVELS.HIGH,
                    description: 'استخدام تحديثات موقع مستمرة مع دقة عالية مما يستهلك البطارية بشكل كبير',
                    recommendation: 'استخدم startMonitoringSignificantLocationChanges بدلاً من startUpdatingLocation، أو استخدم kCLLocationAccuracyHundredMeters لدقة أقل',
                    lineNumber: firstMatchLineNumber,
                    matchCount: locationMatches.length
                });

                logger.debug(`تم اكتشاف تحديثات موقع دقيقة مستمرة في الملف ${filePath}`);
            }
        }

        // فحص مؤقتات دون تسامح زمني
        const timerPattern = this.batteryPatterns[language].find(p => p.name === 'timer_without_tolerance');
        if (timerPattern) {
            const timerMatches = this.findPatternMatches(content, { pattern: timerPattern.pattern });
            const toleranceMatches = this.findPatternMatches(content, { pattern: timerPattern.tolerancePattern });

            if (timerMatches.length > 0 && toleranceMatches.length === 0) {
                const firstMatchLineNumber = this.getLineNumber(content, timerMatches[0].index);

                findings.push({
                    title: 'مشكلة بطارية: مؤقتات دون تسامح زمني',
                    category: BATTERY_CATEGORIES.APP_REFRESH_INTERVALS,
                    severity: SEVERITY_LEVELS.LOW,
                    description: 'استخدام المؤقتات دون تعيين تسامح زمني، مما يتطلب استيقاظ دقيق للمعالج',
                    recommendation: 'أضف قيمة تسامح زمني للمؤقتات باستخدام timer.tolerance = timeInterval * 0.1',
                    lineNumber: firstMatchLineNumber,
                    matchCount: timerMatches.length
                });

                logger.debug(`تم اكتشاف مؤقتات دون تسامح زمني في الملف ${filePath}`);
            }
        }
    }

    /**
     * تحليل أنماط مركبة خاصة بـ Flutter
     * @param {string} content - محتوى الملف
     * @param {string} filePath - مسار الملف
     * @param {Array} findings - قائمة النتائج
     */
    analyzeFlutterCompoundPatterns(content, filePath, findings) {
        // فحص مؤقتات دون إلغاء
        const timerPattern = this.batteryPatterns['Dart'].find(p => p.name === 'timer_misuse');
        if (timerPattern) {
            const timerMatches = this.findPatternMatches(content, { pattern: timerPattern.pattern });
            const cancelMatches = this.findPatternMatches(content, { pattern: timerPattern.cancelPattern });

            if (timerMatches.length > cancelMatches.length) {
                const firstMatchLineNumber = this.getLineNumber(content, timerMatches[0].index);

                findings.push({
                    title: 'مشكلة بطارية: مؤقتات دون إلغاء',
                    category: BATTERY_CATEGORIES.APP_REFRESH_INTERVALS,
                    severity: SEVERITY_LEVELS.MEDIUM,
                    description: `تم اكتشاف ${timerMatches.length} مؤقتات ولكن فقط ${cancelMatches.length} استدعاءات للإلغاء`,
                    recommendation: 'قم دائمًا بإلغاء المؤقتات في dispose() وتجنب المؤقتات ذات الفواصل الزمنية القصيرة جدًا',
                    lineNumber: firstMatchLineNumber,
                    matchCount: timerMatches.length
                });

                logger.debug(`تم اكتشاف مؤقتات دون إلغاء في الملف ${filePath}: ${timerMatches.length} مؤقتات مقابل ${cancelMatches.length} إلغاءات`);
            }
        }
    }

    /**
     * تحليل أنماط مركبة خاصة بـ React Native
     * @param {string} content - محتوى الملف
     * @param {string} filePath - مسار الملف
     * @param {Array} findings - قائمة النتائج
     */
    analyzeReactNativeCompoundPatterns(content, filePath, findings) {
        // فحص الفواصل الزمنية القصيرة جداً
        const intervalPattern = this.batteryPatterns['JavaScript'].find(p => p.name === 'excessive_intervals');
        if (intervalPattern) {
            // البحث عن فواصل زمنية قصيرة جداً (أقل من 1000 مللي ثانية)
            const shortIntervalRegex = /setInterval\(\s*[^,]+,\s*(\d+)\s*\)/g;
            const content_copy = content.slice(); // نسخة من المحتوى لاستخدامها مع التعبير العادي

            let match;
            let shortIntervalFound = false;
            let shortestInterval = Number.MAX_SAFE_INTEGER;
            let firstMatchIndex = -1;

            while ((match = shortIntervalRegex.exec(content_copy)) !== null) {
                const interval = parseInt(match[1], 10);
                if (interval < 1000) {
                    if (firstMatchIndex === -1) {
                        firstMatchIndex = match.index;
                    }
                    shortIntervalFound = true;
                    shortestInterval = Math.min(shortestInterval, interval);
                }
            }

            if (shortIntervalFound) {
                const firstMatchLineNumber = this.getLineNumber(content, firstMatchIndex);

                findings.push({
                    title: 'مشكلة بطارية: فواصل زمنية قصيرة جداً',
                    category: BATTERY_CATEGORIES.APP_REFRESH_INTERVALS,
                    severity: SEVERITY_LEVELS.MEDIUM,
                    description: `استخدام فواصل زمنية قصيرة جداً (${shortestInterval} مللي ثانية)، مما يستهلك البطارية بشكل كبير`,
                    recommendation: 'استخدم فواصل زمنية أطول (على الأقل 1000 مللي ثانية) وقم بتجميع العمليات المتكررة',
                    lineNumber: firstMatchLineNumber,
                    matchCount: 1
                });

                logger.debug(`تم اكتشاف فواصل زمنية قصيرة جداً في الملف ${filePath}: ${shortestInterval} مللي ثانية`);
            }
        }
    }

    /**
     * الحصول على رقم السطر لموقع معين في النص
     * @param {string} content - محتوى الملف
     * @param {number} index - موقع البداية
     * @returns {number} رقم السطر
     */
    getLineNumber(content, index) {
        if (index < 0 || index >= content.length) {
            return 1; // قيمة افتراضية إذا كان المؤشر غير صالح
        }

        const lines = content.substring(0, index).split('\n');
        return lines.length;
    }

    /**
     * الحصول على لغة البرمجة بناءً على امتداد الملف
     * @param {string} extension - امتداد الملف
     * @returns {string|null} اسم لغة البرمجة أو null
     */
    getLanguageByExtension(extension) {
        const extensionMap = {
            '.java': 'Java',
            '.kt': 'Kotlin',
            '.swift': 'Swift',
            '.m': 'Objective-C',
            '.h': 'Objective-C',
            '.cs': 'C#',
            '.dart': 'Dart',
            '.js': 'JavaScript',
            '.jsx': 'JavaScript',
            '.ts': 'TypeScript',
            '.tsx': 'TypeScript',
            '.xml': 'XML',
            '.plist': 'XML',
            '.gradle': 'Groovy',
        };

        return extensionMap[extension] || null;
    }

    /**
     * الحصول على إحصائيات التحليل
     * @returns {Object} إحصائيات محلل البطارية
     */
    getStatistics() {
        return {
            analyzedFilesCount: this.analyzedFilesCount,
            issuesFoundCount: this.issuesFoundCount,
            issuesPerFile: this.analyzedFilesCount > 0 ? (this.issuesFoundCount / this.analyzedFilesCount).toFixed(2) : 0
        };
    }

    /**
     * تحليل مشاكل البطارية المحتملة في مشروع كامل
     * @param {Array} files - قائمة الملفات في المشروع
     * @param {string} appType - نوع تطبيق الموبايل
     * @returns {Array} قائمة بالمشاكل المكتشفة
     */
    analyzeProjectBatteryIssues(files, appType) {
        logger.info(`بدء تحليل مشاكل البطارية للمشروع، عدد الملفات: ${files.length}`);

        const allIssues = [];

        for (const file of files) {
            const fileExtension = path.extname(file.path).toLowerCase();
            const language = this.getLanguageByExtension(fileExtension);

            if (!language) {
                logger.debug(`تخطي تحليل البطارية للملف: ${file.path} (لغة غير مدعومة)`);
                continue;
            }

            try {
                const issues = this.analyzeBatteryPatterns(file.content, file.path, language, appType);
                if (issues.length > 0) {
                    allIssues.push(...issues);
                }
            } catch (error) {
                logger.error(`خطأ في تحليل البطارية للملف ${file.path}: ${error.message}`);
            }
        }

        // تجميع المشاكل حسب الفئة
        const issuesByCategory = {};

        for (const issue of allIssues) {
            if (!issuesByCategory[issue.category]) {
                issuesByCategory[issue.category] = [];
            }
            issuesByCategory[issue.category].push(issue);
        }

        // تلخيص النتائج
        logger.info(`اكتمل تحليل مشاكل البطارية للمشروع. تم اكتشاف ${allIssues.length} مشكلة في ${Object.keys(issuesByCategory).length} فئة`);

        for (const category in issuesByCategory) {
            logger.info(`- ${category}: ${issuesByCategory[category].length} مشكلة`);
        }

        return allIssues;
    }

    /**
     * تحليل مشاكل البطارية المحددة حسب الفئة
     * @param {string} fileContent - محتوى الملف
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {string} categoryName - اسم فئة البطارية
     * @returns {Array} مشاكل البطارية المكتشفة في الفئة المحددة
     */
    analyzeBatteryPatternsByCategory(fileContent, filePath, language, categoryName) {
        if (!fileContent || fileContent.trim() === '') {
            return [];
        }

        const fileExtension = path.extname(filePath).toLowerCase();
        const findings = [];

        // تحديد لغة البرمجة إذا لم يتم توفيرها
        if (!language) {
            language = this.getLanguageByExtension(fileExtension);
            if (!language) {
                return [];
            }
        }

        // الحصول على أنماط البطارية المناسبة للغة البرمجة والفئة
        const patterns = (this.batteryPatterns[language] || []).filter(p => p.category === categoryName);

        if (patterns.length === 0) {
            return [];
        }

        // تحليل كل نمط للبطارية
        for (const pattern of patterns) {
            try {
                const matches = this.findPatternMatches(fileContent, pattern);

                if (matches && matches.length > 0) {
                    // تحديد رقم السطر للمطابقة الأولى
                    const firstMatchLineNumber = this.getLineNumber(fileContent, matches[0].index);

                    // إنشاء كائن النتيجة
                    const finding = {
                        title: `مشكلة بطارية: ${pattern.name}`,
                        category: pattern.category,
                        severity: pattern.severity,
                        description: pattern.description,
                        recommendation: pattern.recommendation,
                        lineNumber: firstMatchLineNumber,
                        matchCount: matches.length,
                        matches: matches.slice(0, 3).map(m => m.text) // الاحتفاظ بأول 3 مطابقات فقط
                    };

                    findings.push(finding);
                }
            } catch (error) {
                logger.error(`خطأ أثناء تحليل نمط البطارية ${pattern.name} في الملف ${filePath}: ${error.message}`);
            }
        }

        return findings;
    }

    /**
     * الحصول على قائمة بفئات مشاكل البطارية المتوفرة
     * @returns {Array} قائمة بفئات البطارية
     */
    getBatteryCategories() {
        return Object.values(BATTERY_CATEGORIES);
    }

    /**
     * الحصول على أنماط البطارية المتاحة للغة برمجة معينة
     * @param {string} language - لغة البرمجة
     * @returns {Array} أنماط البطارية المتاحة
     */
    getBatteryPatternsForLanguage(language) {
        return this.batteryPatterns[language] || [];
    }

    /**
     * تحليل مشاكل البطارية وتوليد تقرير ملخص
     * @param {Array} files - قائمة الملفات في المشروع
     * @param {string} appType - نوع تطبيق الموبايل
     * @returns {Object} تقرير ملخص عن مشاكل البطارية
     */
    generateBatteryReport(files, appType) {
        const allIssues = this.analyzeProjectBatteryIssues(files, appType);

        // تجميع المشاكل حسب الفئة
        const issuesByCategory = {};
        let criticalCount = 0;
        let highCount = 0;
        let mediumCount = 0;
        let lowCount = 0;

        for (const issue of allIssues) {
            if (!issuesByCategory[issue.category]) {
                issuesByCategory[issue.category] = [];
            }
            issuesByCategory[issue.category].push(issue);

            // حساب العدد حسب الشدة
            switch (issue.severity) {
                case SEVERITY_LEVELS.CRITICAL:
                    criticalCount++;
                    break;
                case SEVERITY_LEVELS.HIGH:
                    highCount++;
                    break;
                case SEVERITY_LEVELS.MEDIUM:
                    mediumCount++;
                    break;
                case SEVERITY_LEVELS.LOW:
                    lowCount++;
                    break;
            }
        }

        // إنشاء ملخص
        const summary = {
            totalIssuesCount: allIssues.length,
            issuesBySeverity: {
                critical: criticalCount,
                high: highCount,
                medium: mediumCount,
                low: lowCount
            },
            issuesByCategory: {}
        };

        // إضافة تفاصيل لكل فئة
        for (const category in issuesByCategory) {
            summary.issuesByCategory[category] = {
                count: issuesByCategory[category].length,
                issues: issuesByCategory[category].map(issue => ({
                    title: issue.title,
                    severity: issue.severity,
                    filePath: issue.filePath,
                    lineNumber: issue.lineNumber,
                    recommendation: issue.recommendation
                }))
            };
        }

        return summary;
    }
}
module.exports = BatteryAnalyzer;