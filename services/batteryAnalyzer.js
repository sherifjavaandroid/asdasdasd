const logger = require('../utils/logger');
const { BATTERY_CATEGORIES, SEVERITY_LEVELS } = require('../utils/constants');

/**
 * خدمة تحليل استهلاك البطارية في الكود
 */
class BatteryAnalyzer {
    /**
     * تحليل الكود للكشف عن مشاكل استهلاك البطارية
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {string} appType - نوع تطبيق الموبايل
     * @returns {Array} قائمة بمشاكل استهلاك البطارية المكتشفة
     */
    analyzeBatteryPatterns(code, filePath, language, appType) {
        const issues = [];

        logger.debug(`تحليل أنماط استهلاك البطارية للملف: ${filePath}`);

        try {
            // فحص استخدام خدمات الموقع
            this.checkLocationServices(code, filePath, language, appType, issues);

            // فحص استخدام أجهزة الاستشعار
            this.checkSensorUsage(code, filePath, language, appType, issues);

            // فحص إيقاظ الجهاز
            this.checkWakeLocks(code, filePath, language, appType, issues);

            // فحص العمليات الخلفية
            this.checkBackgroundProcessing(code, filePath, language, appType, issues);

            // فحص عمليات الشبكة
            this.checkNetworkOperations(code, filePath, language, appType, issues);

            logger.debug(`تم اكتشاف ${issues.length} مشكلة استهلاك بطارية في الملف: ${filePath}`);

            return issues;
        } catch (error) {
            logger.error(`خطأ في تحليل أنماط استهلاك البطارية: ${error.message}`);
            return issues;
        }
    }

    /**
     * فحص استخدام خدمات الموقع
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {string} appType - نوع تطبيق الموبايل
     * @param {Array} issues - قائمة بمشاكل استهلاك البطارية المكتشفة
     */
    checkLocationServices(code, filePath, language, appType, issues) {
        const locationPatterns = [];

        if (language === 'Java' || language === 'Kotlin') {
            // فحص استخدام خدمات الموقع عالية الدقة
            locationPatterns.push({
                pattern: /LocationManager|FusedLocationProviderClient/g,
                context: /requestLocation|getLastLocation|getCurrentLocation|requestLocationUpdates/g,
                secondaryContext: /PRIORITY_HIGH_ACCURACY|GPS_PROVIDER/g,
                category: BATTERY_CATEGORIES.LOCATION_SERVICES,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'استخدام خدمات الموقع عالية الدقة تستهلك طاقة كبيرة من البطارية.',
                recommendation: 'استخدم PRIORITY_BALANCED_POWER_ACCURACY بدلاً من PRIORITY_HIGH_ACCURACY عندما لا تكون الدقة العالية ضرورية، أو استخدم NETWORK_PROVIDER بدلاً من GPS_PROVIDER إذا كانت الدقة المنخفضة كافية.'
            });

            // فحص تحديث الموقع المستمر
            locationPatterns.push({
                pattern: /requestLocationUpdates/g,
                negative: true,
                negativePattern: /removeLocationUpdates|onPause|onDestroy/g,
                category: BATTERY_CATEGORIES.LOCATION_SERVICES,
                severity: SEVERITY_LEVELS.CRITICAL,
                description: 'طلب تحديثات الموقع دون إيقافها يمكن أن يستنزف البطارية بسرعة.',
                recommendation: 'تأكد من إيقاف تحديثات الموقع في onPause() واستئنافها في onResume() إذا لزم الأمر.'
            });
        } else if (language === 'JavaScript' || language === 'TypeScript') {
            // فحص استخدام خدمات الموقع في React Native
            locationPatterns.push({
                pattern: /navigator\.geolocation|Geolocation\.getCurrentPosition|Geolocation\.watchPosition/g,
                negative: true,
                negativePattern: /Geolocation\.clearWatch|componentWillUnmount|useEffect[\s\S]*return[\s\S]*\{/g,
                category: BATTERY_CATEGORIES.LOCATION_SERVICES,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'استخدام خدمات الموقع دون إيقافها يمكن أن يستنزف البطارية.',
                recommendation: 'تأكد من إيقاف مراقبة الموقع في componentWillUnmount() أو في دالة التنظيف في useEffect().'
            });
        } else if (language === 'Swift') {
            // فحص استخدام خدمات الموقع في iOS
            locationPatterns.push({
                pattern: /CLLocationManager|startUpdatingLocation|requestLocation/g,
                negative: true,
                negativePattern: /stopUpdatingLocation|didEnterBackground|viewWillDisappear/g,
                category: BATTERY_CATEGORIES.LOCATION_SERVICES,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'استخدام خدمات الموقع دون إيقافها يمكن أن يستنزف البطارية.',
                recommendation: 'تأكد من إيقاف خدمات الموقع عندما لا تكون ضرورية باستخدام stopUpdatingLocation.'
            });
        } else if (language === 'Dart') {
            // فحص استخدام خدمات الموقع في Flutter
            locationPatterns.push({
                pattern: /location\.onLocationChanged|geolocator\.getPositionStream/g,
                negative: true,
                negativePattern: /\.cancel\(\)|dispose\(\)/g,
                category: BATTERY_CATEGORIES.LOCATION_SERVICES,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'استخدام خدمات الموقع دون إيقافها يمكن أن يستنزف البطارية.',
                recommendation: 'تأكد من إلغاء اشتراكات تحديثات الموقع في دالة dispose().'
            });
        }

        for (const { pattern, context, secondaryContext, negative, negativePattern, category, severity, description, recommendation } of locationPatterns) {
            pattern.lastIndex = 0;

            let match;
            while ((match = pattern.exec(code)) !== null) {
                // تحقق من السياق إذا كان مطلوبًا
                if (context) {
                    const contextStart = Math.max(0, match.index - 300);
                    const contextEnd = Math.min(code.length, match.index + match[0].length + 300);
                    const surroundingCode = code.substring(contextStart, contextEnd);

                    if (!context.test(surroundingCode)) {
                        continue;
                    }

                    // إذا كان هناك سياق ثانوي، تحقق منه أيضًا
                    if (secondaryContext && !secondaryContext.test(surroundingCode)) {
                        continue;
                    }
                }

                // إذا كان نمطًا سلبيًا، تحقق من وجود النمط السلبي
                if (negative) {
                    const contextStart = Math.max(0, match.index - 500);
                    const contextEnd = Math.min(code.length, match.index + match[0].length + 500);
                    const surroundingCode = code.substring(contextStart, contextEnd);

                    if (negativePattern && negativePattern.test(surroundingCode)) {
                        continue;
                    }
                }

                const lineNumber = this.getLineNumber(code, match.index);
                const codeSnippet = this.extractCodeSnippet(code, match.index, match[0].length);

                issues.push({
                    title: 'استخدام غير فعال لخدمات الموقع',
                    category,
                    severity,
                    description,
                    recommendation,
                    filePath,
                    lineNumber,
                    codeSnippet,
                    type: 'issue',
                    impact: 'استهلاك عالي للبطارية بسبب تشغيل خدمات الموقع باستمرار أو بدقة عالية غير ضرورية.'
                });
            }
        }
    }

    /**
     * فحص استخدام أجهزة الاستشعار
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {string} appType - نوع تطبيق الموبايل
     * @param {Array} issues - قائمة بمشاكل استهلاك البطارية المكتشفة
     */
    checkSensorUsage(code, filePath, language, appType, issues) {
        const sensorPatterns = [];

        if (language === 'Java' || language === 'Kotlin') {
            // فحص استخدام أجهزة الاستشعار
            sensorPatterns.push({
                pattern: /SensorManager|registerListener/g,
                negative: true,
                negativePattern: /unregisterListener|onPause|onDestroy/g,
                category: BATTERY_CATEGORIES.SENSOR_USAGE,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'تسجيل مستمعي أجهزة الاستشعار دون إلغاء تسجيلهم.',
                recommendation: 'تأكد من إلغاء تسجيل مستمعي أجهزة الاستشعار في onPause() أو onDestroy().'
            });

            // فحص معدل أخذ العينات للمستشعرات
            sensorPatterns.push({
                pattern: /SENSOR_DELAY_FASTEST|SENSOR_DELAY_GAME/g,
                category: BATTERY_CATEGORIES.SENSOR_USAGE,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام معدلات أخذ عينات عالية للمستشعرات يستهلك طاقة أكثر.',
                recommendation: 'استخدم SENSOR_DELAY_NORMAL أو SENSOR_DELAY_UI لتوفير البطارية عندما لا يكون معدل العينات العالي ضروريًا.'
            });
        } else if (language === 'JavaScript' || language === 'TypeScript') {
            // فحص استخدام المستشعرات في React Native
            sensorPatterns.push({
                pattern: /DeviceMotion|DeviceOrientation|Accelerometer|Gyroscope|Magnetometer/g,
                negative: true,
                negativePattern: /remove|stop|unsubscribe|componentWillUnmount|useEffect[\s\S]*return[\s\S]*\{/g,
                category: BATTERY_CATEGORIES.SENSOR_USAGE,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'استخدام أجهزة الاستشعار دون إيقافها.',
                recommendation: 'تأكد من إيقاف مستمعي أجهزة الاستشعار في componentWillUnmount() أو في دالة التنظيف في useEffect().'
            });
        }

        for (const { pattern, negative, negativePattern, category, severity, description, recommendation } of sensorPatterns) {
            pattern.lastIndex = 0;

            let match;
            while ((match = pattern.exec(code)) !== null) {
                if (negative) {
                    const contextStart = Math.max(0, match.index - 500);
                    const contextEnd = Math.min(code.length, match.index + match[0].length + 500);
                    const surroundingCode = code.substring(contextStart, contextEnd);

                    if (negativePattern && negativePattern.test(surroundingCode)) {
                        continue;
                    }
                }

                const lineNumber = this.getLineNumber(code, match.index);
                const codeSnippet = this.extractCodeSnippet(code, match.index, match[0].length);

                issues.push({
                    title: 'استخدام غير فعال لأجهزة الاستشعار',
                    category,
                    severity,
                    description,
                    recommendation,
                    filePath,
                    lineNumber,
                    codeSnippet,
                    type: 'issue',
                    impact: 'استهلاك عالي للبطارية بسبب تشغيل أجهزة الاستشعار باستمرار أو بمعدل أخذ عينات عالي.'
                });
            }
        }
    }

    /**
     * فحص إيقاظ الجهاز
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {string} appType - نوع تطبيق الموبايل
     * @param {Array} issues - قائمة بمشاكل استهلاك البطارية المكتشفة
     */
    checkWakeLocks(code, filePath, language, appType, issues) {
        const wakeLockPatterns = [];

        if (language === 'Java' || language === 'Kotlin') {
            // فحص استخدام Wake Locks في Android
            wakeLockPatterns.push({
                pattern: /PowerManager\.WakeLock|createWakeLock|acquire\(\)/g,
                negative: true,
                negativePattern: /release\(\)|onPause|onDestroy/g,
                category: BATTERY_CATEGORIES.WAKE_LOCKS,
                severity: SEVERITY_LEVELS.CRITICAL,
                description: 'استخدام WakeLock دون تحريره يمكن أن يستنزف البطارية بسرعة كبيرة.',
                recommendation: 'تأكد من تحرير WakeLock في onPause() أو عند انتهاء العملية التي تحتاجه.'
            });

            // فحص استخدام الاستيقاظ المتكرر
            wakeLockPatterns.push({
                pattern: /AlarmManager|setInexactRepeating|setRepeating/g,
                context: /ELAPSED_REALTIME_WAKEUP|RTC_WAKEUP|setAndAllowWhileIdle|setExactAndAllowWhileIdle/g,
                category: BATTERY_CATEGORIES.WAKE_LOCKS,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'استخدام المنبهات التي توقظ الجهاز بشكل متكرر يستهلك البطارية.',
                recommendation: 'استخدم ELAPSED_REALTIME أو RTC بدلاً من ELAPSED_REALTIME_WAKEUP أو RTC_WAKEUP عندما لا يكون إيقاظ الجهاز ضروريًا. استخدم setInexactRepeating بدلاً من setRepeating لتوفير البطارية.'
            });
        } else if (language === 'JavaScript' || language === 'TypeScript') {
            // فحص استخدام Wake Locks في React Native
            wakeLockPatterns.push({
                pattern: /KeepAwake|preventSleep|activateKeepAwake/g,
                negative: true,
                negativePattern: /deactivateKeepAwake|componentWillUnmount|useEffect[\s\S]*return[\s\S]*\{/g,
                category: BATTERY_CATEGORIES.WAKE_LOCKS,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'منع الجهاز من النوم دون إعادة تمكين النوم لاحقًا.',
                recommendation: 'تأكد من إعادة تمكين النوم عند الانتهاء من العملية التي تتطلب بقاء الشاشة مضاءة.'
            });
        }

        for (const { pattern, context, negative, negativePattern, category, severity, description, recommendation } of wakeLockPatterns) {
            pattern.lastIndex = 0;

            let match;
            while ((match = pattern.exec(code)) !== null) {
                // تحقق من السياق إذا كان مطلوبًا
                if (context) {
                    const contextStart = Math.max(0, match.index - 300);
                    const contextEnd = Math.min(code.length, match.index + match[0].length + 300);
                    const surroundingCode = code.substring(contextStart, contextEnd);

                    if (!context.test(surroundingCode)) {
                        continue;
                    }
                }

                // تحقق من النمط السلبي إذا كان مطلوبًا
                if (negative) {
                    const contextStart = Math.max(0, match.index - 500);
                    const contextEnd = Math.min(code.length, match.index + match[0].length + 500);
                    const surroundingCode = code.substring(contextStart, contextEnd);

                    if (negativePattern && negativePattern.test(surroundingCode)) {
                        continue;
                    }
                }

                const lineNumber = this.getLineNumber(code, match.index);
                const codeSnippet = this.extractCodeSnippet(code, match.index, match[0].length);

                issues.push({
                    title: 'استخدام غير فعال لإيقاظ الجهاز',
                    category,
                    severity,
                    description,
                    recommendation,
                    filePath,
                    lineNumber,
                    codeSnippet,
                    type: 'issue',
                    impact: 'استهلاك عالي للبطارية بسبب إبقاء الجهاز مستيقظًا أو إيقاظه بشكل متكرر.'
                });
            }
        }
    }

    /**
     * فحص العمليات الخلفية
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {string} appType - نوع تطبيق الموبايل
     * @param {Array} issues - قائمة بمشاكل استهلاك البطارية المكتشفة
     */
    checkBackgroundProcessing(code, filePath, language, appType, issues) {
        const backgroundPatterns = [];

        if (language === 'Java' || language === 'Kotlin') {
            // فحص استخدام الخدمات المستمرة في Android
            backgroundPatterns.push({
                pattern: /extends\s+Service|startService|startForegroundService/g,
                context: /START_STICKY|START_REDELIVER_INTENT/g,
                category: BATTERY_CATEGORIES.BACKGROUND_PROCESSES,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'استخدام الخدمات المستمرة في الخلفية يستهلك البطارية.',
                recommendation: 'استخدم JobScheduler أو WorkManager بدلاً من الخدمات المستمرة، أو استخدم START_NOT_STICKY عندما يكون ذلك مناسبًا.'
            });

            // فحص استخدام المؤقتات المتكررة
            backgroundPatterns.push({
                pattern: /Timer\s*\(|scheduleAtFixedRate|postDelayed/g,
                category: BATTERY_CATEGORIES.BACKGROUND_PROCESSES,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام المؤقتات أو التأخيرات المجدولة بشكل متكرر يمكن أن يؤثر على استهلاك البطارية.',
                recommendation: 'قلل من تكرار المؤقتات واستخدم JobScheduler أو WorkManager للمهام المتكررة في الخلفية.'
            });
        } else if (language === 'JavaScript' || language === 'TypeScript') {
            // فحص استخدام setInterval في React Native
            backgroundPatterns.push({
                pattern: /setInterval\s*\([^,]+,\s*(\d+)\s*\)/g,
                category: BATTERY_CATEGORIES.BACKGROUND_PROCESSES,
                severity: function(match) {
                    const interval = parseInt(match[1], 10);
                    return interval < 1000 ? SEVERITY_LEVELS.HIGH : (interval < 10000 ? SEVERITY_LEVELS.MEDIUM : SEVERITY_LEVELS.LOW);
                },
                description: function(match) {
                    const interval = parseInt(match[1], 10);
                    return `استخدام setInterval بفاصل زمني صغير (${interval}ms) يمكن أن يستهلك البطارية.`;
                },
                recommendation: 'زيادة الفاصل الزمني للمؤقتات واستخدام آليات أكثر كفاءة للعمليات المتكررة في الخلفية.'
            });
        }

        for (const { pattern, context, category, severity, description, recommendation } of backgroundPatterns) {
            pattern.lastIndex = 0;

            let match;
            while ((match = pattern.exec(code)) !== null) {
                // تحقق من السياق إذا كان مطلوبًا
                if (context) {
                    const contextStart = Math.max(0, match.index - 300);
                    const contextEnd = Math.min(code.length, match.index + match[0].length + 300);
                    const surroundingCode = code.substring(contextStart, contextEnd);

                    if (!context.test(surroundingCode)) {
                        continue;
                    }
                }

                const lineNumber = this.getLineNumber(code, match.index);
                const codeSnippet = this.extractCodeSnippet(code, match.index, match[0].length);

                // تعامل مع حالات الشدة والوصف الديناميكية
                let severityValue = typeof severity === 'function' ? severity(match) : severity;
                let descriptionValue = typeof description === 'function' ? description(match) : description;

                issues.push({
                    title: 'عمليات خلفية غير فعالة',
                    category,
                    severity: severityValue,
                    description: descriptionValue,
                    recommendation,
                    filePath,
                    lineNumber,
                    codeSnippet,
                    type: 'issue',
                    impact: 'استهلاك عالي للبطارية بسبب تشغيل عمليات في الخلفية بشكل مستمر أو متكرر.'
                });
            }
        }
    }

    /**
     * فحص عمليات الشبكة
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {string} appType - نوع تطبيق الموبايل
     * @param {Array} issues - قائمة بمشاكل استهلاك البطارية المكتشفة
     */
    checkNetworkOperations(code, filePath, language, appType, issues) {
        const networkPatterns = [];

        // فحص للعمليات الشبكية المتكررة
        if (language === 'Java' || language === 'Kotlin') {
            networkPatterns.push({
                pattern: /HttpURLConnection|OkHttpClient|Retrofit|Volley/g,
                context: /Timer|TimerTask|ScheduledExecutorService|AlarmManager|Handler.*postDelayed/g,
                category: BATTERY_CATEGORIES.NETWORK_OPERATIONS,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'عمليات شبكية متكررة بشكل مجدول يمكن أن تستهلك البطارية بشكل كبير.',
                recommendation: 'قلل من تكرار الطلبات الشبكية واستخدم آليات مزامنة أكثر كفاءة مثل WorkManager أو SyncAdapter.'
            });

            // فحص للتحميل المسبق أو المتزامن لعدة موارد
            networkPatterns.push({
                pattern: /executeOnExecutor\(AsyncTask\.THREAD_POOL_EXECUTOR|Executors\.newFixedThreadPool|parallel/g,
                context: /http|download|load|fetch|get\(/g,
                category: BATTERY_CATEGORIES.NETWORK_OPERATIONS,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'تنفيذ عدة عمليات شبكية متوازية يمكن أن يزيد من استهلاك البطارية.',
                recommendation: 'حاول تسلسل الطلبات الشبكية بدلاً من تنفيذها بالتوازي عندما يكون ذلك ممكنًا، أو جمعها في طلب واحد.'
            });
        } else if (language === 'JavaScript' || language === 'TypeScript') {
            networkPatterns.push({
                pattern: /fetch\s*\(|\.ajax\s*\(|\.get\s*\(|\.post\s*\(|axios/g,
                context: /setInterval|setTimeout/g,
                category: BATTERY_CATEGORIES.NETWORK_OPERATIONS,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'عمليات شبكية متكررة بشكل مجدول يمكن أن تستهلك البطارية بشكل كبير.',
                recommendation: 'قلل من تكرار الطلبات الشبكية واستخدم تقنيات مثل التخزين المؤقت والمزامنة عند الطلب.'
            });

            // فحص للتحميل المتزامن لعدة موارد
            networkPatterns.push({
                pattern: /Promise\.all\s*\(\s*\[/g,
                context: /fetch|\.ajax|\.get|\.post|axios/g,
                category: BATTERY_CATEGORIES.NETWORK_OPERATIONS,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'تنفيذ عدة عمليات شبكية متوازية يمكن أن يزيد من استهلاك البطارية.',
                recommendation: 'حاول تسلسل الطلبات الشبكية عندما يكون ذلك ممكنًا، خاصة للموارد غير الضرورية على الفور.'
            });
        }

        for (const { pattern, context, category, severity, description, recommendation } of networkPatterns) {
            pattern.lastIndex = 0;

            let match;
            while ((match = pattern.exec(code)) !== null) {
                // تحقق من السياق إذا كان مطلوبًا
                if (context) {
                    const contextStart = Math.max(0, match.index - 300);
                    const contextEnd = Math.min(code.length, match.index + match[0].length + 300);
                    const surroundingCode = code.substring(contextStart, contextEnd);

                    if (!context.test(surroundingCode)) {
                        continue;
                    }
                }

                const lineNumber = this.getLineNumber(code, match.index);
                const codeSnippet = this.extractCodeSnippet(code, match.index, match[0].length);

                issues.push({
                    title: 'عمليات شبكة غير فعالة',
                    category,
                    severity,
                    description,
                    recommendation,
                    filePath,
                    lineNumber,
                    codeSnippet,
                    type: 'issue',
                    impact: 'استهلاك عالي للبطارية والبيانات بسبب عمليات شبكية متكررة أو متوازية.'
                });
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
     * @returns {string} مقتطف من الكود
     */
    extractCodeSnippet(code, position, matchLength) {
        // تحديد حجم السياق (عدد الأحرف قبل وبعد المطابقة)
        const contextSize = 150;

        // تحديد بداية ونهاية المقتطف
        const start = Math.max(0, position - contextSize);
        const end = Math.min(code.length, position + matchLength + contextSize);

        // استخراج النص المحيط
        let snippet = code.substring(start, end);

        // إيجاد بداية ونهاية السطور الكاملة
        const firstNewLine = snippet.indexOf('\n') === -1 ? 0 : snippet.indexOf('\n') + 1;
        const lastNewLine = snippet.lastIndexOf('\n') === -1 ? snippet.length : snippet.lastIndexOf('\n');

        // اقتصاص المقتطف للحصول على سطور كاملة
        snippet = snippet.substring(firstNewLine, lastNewLine);

        // إذا كان المقتطف لا يتضمن النص المطابق، أضف جزءًا من النص المطابق
        if (start > position || end < position + matchLength) {
            const matchText = code.substring(position, position + matchLength);
            snippet += '\n[...]\n' + matchText;
        }

        // إضافة علامات إذا كان المقتطف مقتطعًا من بداية أو نهاية الكود
        if (start > 0) {
            snippet = '[...]\n' + snippet;
        }

        if (end < code.length) {
            snippet = snippet + '\n[...]';
        }

        return snippet;
    }
}

module.exports = BatteryAnalyzer;

