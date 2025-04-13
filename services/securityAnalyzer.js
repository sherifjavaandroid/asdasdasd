const logger = require('../utils/logger');
const { SECURITY_RISKS, MOBILE_RISKS, SEVERITY_LEVELS } = require('../utils/constants');

/**
 * خدمة تحليل أمان الكود
 */
class SecurityAnalyzer {
    /**
     * تحليل أنماط المشاكل الأمنية الشائعة في الكود
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {string} appType - نوع تطبيق الموبايل
     * @returns {Array} قائمة بالمشاكل الأمنية المكتشفة
     */
    analyzeSecurityPatterns(code, filePath, language, appType) {
        const issues = [];

        logger.debug(`تحليل أنماط الأمان لملف: ${filePath}`);

        try {
            // تنفيذ فحوصات أمان مختلفة بناءً على لغة البرمجة ونوع التطبيق

            // فحص الأسرار المضمنة في الكود
            this.checkHardcodedSecrets(code, filePath, language, issues);

            // فحص مشاكل الاتصال غير الآمن
            this.checkInsecureCommunication(code, filePath, language, appType, issues);

            // فحص مشاكل التخزين غير الآمن للبيانات
            this.checkInsecureDataStorage(code, filePath, language, appType, issues);

            // فحص مشاكل المصادقة والتفويض غير الآمنة
            this.checkInsecureAuthentication(code, filePath, language, appType, issues);

            // فحص مشاكل التشفير غير الكافي
            this.checkInsufficientCryptography(code, filePath, language, appType, issues);

            // فحص مشاكل التحقق من الإدخال
            this.checkInputValidation(code, filePath, language, appType, issues);

            logger.debug(`تم اكتشاف ${issues.length} مشكلة أمنية في الملف: ${filePath}`);

            return issues;
        } catch (error) {
            logger.error(`خطأ في تحليل أنماط الأمان: ${error.message}`);
            return issues;
        }
    }

    /**
     * فحص الأسرار المضمنة في الكود (مثل المفاتيح والكلمات السرية)
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {Array} issues - قائمة المشاكل المكتشفة
     */
    checkHardcodedSecrets(code, filePath, language, issues) {
        // أنماط للبحث عن الأسرار المضمنة في الكود
        const secretPatterns = [
            {
                pattern: /(['"])(?:api|jwt|auth|app|token|secret|password|pw|key|cert)_?(?:key|token|secret|password|auth)?['"\s]*(?::|=>|=)\s*['"]([a-zA-Z0-9_\-\.=]{10,})['"]/gi,
                category: SECURITY_RISKS.HARDCODED_SECRETS,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'تم العثور على سر مضمن في الكود. يجب تخزين الأسرار في مخزن آمن أو متغيرات بيئية.',
                recommendation: 'استخدم متغيرات بيئية أو خدمة إدارة أسرار آمنة بدلاً من تضمين الأسرار مباشرة في الكود.'
            },
            {
                pattern: /(['"])(?:https?:\/\/[^\/]+:)([a-zA-Z0-9_\-]{10,})(?:@)/gi,
                category: SECURITY_RISKS.HARDCODED_SECRETS,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'تم العثور على بيانات اعتماد في عنوان URL. يجب عدم تضمين بيانات الاعتماد في عناوين URL.',
                recommendation: 'استخدم طرق آمنة للمصادقة بدلاً من تضمين بيانات الاعتماد في عناوين URL.'
            },
            {
                pattern: /(['"])((?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=|[A-Za-z0-9+\/]{4}))(['"])/g,
                category: SECURITY_RISKS.HARDCODED_SECRETS,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'تم العثور على سلسلة تشبه بيانات مشفرة بـ Base64. قد تكون بيانات حساسة مشفرة بشكل ضعيف.',
                recommendation: 'تأكد من أن هذه البيانات ليست معلومات سرية وأنها لا تكشف معلومات حساسة.'
            }
        ];

        for (const { pattern, category, severity, description, recommendation } of secretPatterns) {
            // إعادة تعيين lastIndex للتأكد من بدء البحث من بداية السلسلة
            pattern.lastIndex = 0;

            let match;
            while ((match = pattern.exec(code)) !== null) {
                const lineNumber = this.getLineNumber(code, match.index);
                const codeSnippet = this.extractCodeSnippet(code, match.index, match[0].length);

                issues.push({
                    title: 'أسرار مضمنة في الكود',
                    category,
                    severity,
                    description,
                    recommendation,
                    filePath,
                    lineNumber,
                    codeSnippet
                });
            }
        }
    }

    /**
     * فحص مشاكل الاتصال غير الآمن
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {string} appType - نوع تطبيق الموبايل
     * @param {Array} issues - قائمة المشاكل المكتشفة
     */
    checkInsecureCommunication(code, filePath, language, appType, issues) {
        // أنماط للبحث عن الاتصالات غير الآمنة
        const insecureCommunicationPatterns = [
            {
                pattern: /http:\/\//g,
                exclude: /localhost|127\.0\.0\.1|10\.|192\.168\./g,
                category: SECURITY_RISKS.M5_INSECURE_COMMUNICATION,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'استخدام بروتوكول HTTP غير المشفر للاتصالات. يمكن اعتراض البيانات المرسلة عبر HTTP.',
                recommendation: 'استخدم HTTPS بدلاً من HTTP لجميع الاتصالات الشبكية.'
            }
        ];

        // إضافة أنماط خاصة بلغات البرمجة المختلفة
        if (language === 'Java' || language === 'Kotlin') {
            insecureCommunicationPatterns.push({
                pattern: /\.setHostnameVerifier\(.*ALLOW_ALL.*\)/g,
                category: SECURITY_RISKS.M5_INSECURE_COMMUNICATION,
                severity: SEVERITY_LEVELS.CRITICAL,
                description: 'تعطيل التحقق من اسم المضيف في اتصالات SSL/TLS، مما يسمح بهجمات man-in-the-middle.',
                recommendation: 'استخدم مدقق اسم مضيف صارم يتحقق من صحة شهادة SSL/TLS.'
            });

            insecureCommunicationPatterns.push({
                pattern: /\.setSSLSocketFactory\(.*AllTrustManager.*\)/g,
                category: SECURITY_RISKS.M5_INSECURE_COMMUNICATION,
                severity: SEVERITY_LEVELS.CRITICAL,
                description: 'استخدام مدير ثقة يقبل جميع الشهادات، مما يسمح بهجمات man-in-the-middle.',
                recommendation: 'استخدم مدير ثقة مناسب يتحقق من صحة الشهادات.'
            });
        } else if (language === 'Swift' || language === 'Objective-C') {
            insecureCommunicationPatterns.push({
                pattern: /NSAllowsArbitraryLoads.*true/g,
                category: SECURITY_RISKS.M5_INSECURE_COMMUNICATION,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'تمكين NSAllowsArbitraryLoads للسماح بالاتصالات HTTP غير المشفرة.',
                recommendation: 'استخدم HTTPS بدلاً من HTTP واضبط NSAllowsArbitraryLoads على false.'
            });
        } else if (language === 'JavaScript' || language === 'TypeScript') {
            insecureCommunicationPatterns.push({
                pattern: /rejectUnauthorized:\s*false/g,
                category: SECURITY_RISKS.M5_INSECURE_COMMUNICATION,
                severity: SEVERITY_LEVELS.CRITICAL,
                description: 'تعطيل التحقق من الشهادات في اتصالات HTTPS، مما يسمح بهجمات man-in-the-middle.',
                recommendation: 'قم بتمكين التحقق من الشهادات في اتصالات HTTPS.'
            });
        }

        for (const { pattern, exclude, category, severity, description, recommendation } of insecureCommunicationPatterns) {
            pattern.lastIndex = 0;

            let match;
            while ((match = pattern.exec(code)) !== null) {
                // تجاوز الأنماط المستثناة (مثل localhost)
                if (exclude && exclude.test(code.substring(match.index, match.index + 100))) {
                    continue;
                }

                const lineNumber = this.getLineNumber(code, match.index);
                const codeSnippet = this.extractCodeSnippet(code, match.index, match[0].length);

                issues.push({
                    title: 'اتصال غير آمن',
                    category,
                    severity,
                    description,
                    recommendation,
                    filePath,
                    lineNumber,
                    codeSnippet
                });
            }
        }
    }

    /**
     * فحص مشاكل التخزين غير الآمن للبيانات
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {string} appType - نوع تطبيق الموبايل
     * @param {Array} issues - قائمة المشاكل المكتشفة
     */
    checkInsecureDataStorage(code, filePath, language, appType, issues) {
        // أنماط للبحث عن التخزين غير الآمن للبيانات
        const insecureStoragePatterns = [];

        if (language === 'Java' || language === 'Kotlin') {
            insecureStoragePatterns.push({
                pattern: /getSharedPreferences\([^,)]*,[^)]*MODE_PRIVATE\)/g,
                negative: true, // نمط إيجابي (ممارسة جيدة)
                category: SECURITY_RISKS.M9_INSECURE_DATA_STORAGE,
                severity: SEVERITY_LEVELS.INFO,
                description: 'استخدام MODE_PRIVATE مع SharedPreferences هو ممارسة أمنية جيدة.',
                recommendation: 'استمر في استخدام MODE_PRIVATE للتخزين المحلي.'
            });

            insecureStoragePatterns.push({
                pattern: /getSharedPreferences\([^,)]*,[^)]*MODE_WORLD_READABLE\)/g,
                category: SECURITY_RISKS.M9_INSECURE_DATA_STORAGE,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'استخدام MODE_WORLD_READABLE يسمح للتطبيقات الأخرى بقراءة البيانات المخزنة.',
                recommendation: 'استخدم MODE_PRIVATE بدلاً من MODE_WORLD_READABLE.'
            });

            insecureStoragePatterns.push({
                pattern: /getSharedPreferences\([^,)]*,[^)]*MODE_WORLD_WRITEABLE\)/g,
                category: SECURITY_RISKS.M9_INSECURE_DATA_STORAGE,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'استخدام MODE_WORLD_WRITEABLE يسمح للتطبيقات الأخرى بتعديل البيانات المخزنة.',
                recommendation: 'استخدم MODE_PRIVATE بدلاً من MODE_WORLD_WRITEABLE.'
            });
        } else if (language === 'Swift' || language === 'Objective-C') {
            insecureStoragePatterns.push({
                pattern: /NSUserDefaults|UserDefaults/g,
                category: SECURITY_RISKS.M9_INSECURE_DATA_STORAGE,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام NSUserDefaults/UserDefaults لتخزين بيانات حساسة. هذه البيانات غير مشفرة.',
                recommendation: 'استخدم Keychain لتخزين البيانات الحساسة بدلاً من UserDefaults.'
            });
        } else if (language === 'JavaScript' || language === 'TypeScript') {
            insecureStoragePatterns.push({
                pattern: /AsyncStorage|localStorage|sessionStorage/g,
                category: SECURITY_RISKS.M9_INSECURE_DATA_STORAGE,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام تخزين غير مشفر مثل AsyncStorage أو localStorage لتخزين البيانات.',
                recommendation: 'استخدم حلاً مشفرًا مثل react-native-encrypted-storage لتخزين البيانات الحساسة.'
            });
        } else if (language === 'Dart') {
            insecureStoragePatterns.push({
                pattern: /SharedPreferences|get\w+\(|put\w+\(/g,
                category: SECURITY_RISKS.M9_INSECURE_DATA_STORAGE,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام SharedPreferences لتخزين بيانات محتمل أن تكون حساسة.',
                recommendation: 'استخدم flutter_secure_storage أو حلولًا مشفرة أخرى لتخزين البيانات الحساسة.'
            });
        }

        for (const { pattern, negative, category, severity, description, recommendation } of insecureStoragePatterns) {
            pattern.lastIndex = 0;

            let match;
            while ((match = pattern.exec(code)) !== null) {
                // تجاهل الأنماط الإيجابية (الممارسات الجيدة)
                if (negative) {
                    continue;
                }

                const lineNumber = this.getLineNumber(code, match.index);
                const codeSnippet = this.extractCodeSnippet(code, match.index, match[0].length);

                issues.push({
                    title: 'تخزين بيانات غير آمن',
                    category,
                    severity,
                    description,
                    recommendation,
                    filePath,
                    lineNumber,
                    codeSnippet
                });
            }
        }
    }

    /**
     * فحص مشاكل المصادقة والتفويض غير الآمنة
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {string} appType - نوع تطبيق الموبايل
     * @param {Array} issues - قائمة المشاكل المكتشفة
     */
    checkInsecureAuthentication(code, filePath, language, appType, issues) {
        // أنماط للبحث عن مشاكل المصادقة
        const insecureAuthPatterns = [
            {
                pattern: /md5|sha1/gi,
                category: SECURITY_RISKS.M3_INSECURE_AUTH,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'استخدام خوارزميات تجزئة ضعيفة (MD5 أو SHA1) غير آمنة للمصادقة.',
                recommendation: 'استخدم خوارزميات تجزئة آمنة مثل SHA-256 أو SHA-3 أو Argon2 أو bcrypt.'
            }
        ];

        for (const { pattern, category, severity, description, recommendation } of insecureAuthPatterns) {
            pattern.lastIndex = 0;

            let match;
            while ((match = pattern.exec(code)) !== null) {
                const lineNumber = this.getLineNumber(code, match.index);
                const codeSnippet = this.extractCodeSnippet(code, match.index, match[0].length);

                issues.push({
                    title: 'مصادقة غير آمنة',
                    category,
                    severity,
                    description,
                    recommendation,
                    filePath,
                    lineNumber,
                    codeSnippet
                });
            }
        }
    }

    /**
     * فحص مشاكل التشفير غير الكافي
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {string} appType - نوع تطبيق الموبايل
     * @param {Array} issues - قائمة المشاكل المكتشفة
     */
    checkInsufficientCryptography(code, filePath, language, appType, issues) {
        // أنماط للبحث عن مشاكل التشفير
        const insufficientCryptoPatterns = [
            {
                pattern: /DES|3DES|RC4|Blowfish/gi,
                category: SECURITY_RISKS.M10_INSUFFICIENT_CRYPTOGRAPHY,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'استخدام خوارزميات تشفير ضعيفة أو مهجورة (DES, 3DES, RC4, Blowfish).',
                recommendation: 'استخدم خوارزميات تشفير حديثة مثل AES-256 أو ChaCha20-Poly1305.'
            },
            {
                pattern: /ECB/g,
                category: SECURITY_RISKS.M10_INSUFFICIENT_CRYPTOGRAPHY,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'استخدام وضع ECB غير الآمن للتشفير، والذي لا يوفر تعمية كافية.',
                recommendation: 'استخدم أوضاع تشفير آمنة مثل GCM أو CBC مع IV عشوائي.'
            }
        ];

        for (const { pattern, category, severity, description, recommendation } of insufficientCryptoPatterns) {
            pattern.lastIndex = 0;

            let match;
            while ((match = pattern.exec(code)) !== null) {
                const lineNumber = this.getLineNumber(code, match.index);
                const codeSnippet = this.extractCodeSnippet(code, match.index, match[0].length);

                issues.push({
                    title: 'تشفير غير كافٍ',
                    category,
                    severity,
                    description,
                    recommendation,
                    filePath,
                    lineNumber,
                    codeSnippet
                });
            }
        }
    }

    /**
     * فحص مشاكل التحقق من الإدخال
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {string} appType - نوع تطبيق الموبايل
     * @param {Array} issues - قائمة المشاكل المكتشفة
     */
    checkInputValidation(code, filePath, language, appType, issues) {
        // أنماط للبحث عن مشاكل التحقق من الإدخال
        const inputValidationPatterns = [];

        if (language === 'Java' || language === 'Kotlin') {
            inputValidationPatterns.push({
                pattern: /getExternalFilesDir|getExternalStorageDirectory/g,
                category: SECURITY_RISKS.M4_INSUFFICIENT_VALIDATION,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام التخزين الخارجي دون التحقق المناسب من المدخلات.',
                recommendation: 'تحقق دائماً من الملفات المقروءة من التخزين الخارجي قبل استخدامها.'
            });

            inputValidationPatterns.push({
                pattern: /WebView.*\.loadUrl\(/g,
                category: SECURITY_RISKS.M4_INSUFFICIENT_VALIDATION,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام WebView.loadUrl() مع مدخلات محتملة غير موثوقة.',
                recommendation: 'تحقق من URL قبل تحميله في WebView وتأكد من أنه من مصدر موثوق.'
            });
        } else if (language === 'JavaScript' || language === 'TypeScript') {
            inputValidationPatterns.push({
                pattern: /eval\(|setTimeout\(\s*["']/g,
                category: SECURITY_RISKS.M4_INSUFFICIENT_VALIDATION,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'استخدام eval() أو setTimeout() مع مدخلات نصية. يمكن أن يؤدي إلى ثغرات حقن الكود.',
                recommendation: 'تجنب استخدام eval() ومرر الدوال بدلاً من السلاسل النصية إلى setTimeout().'
            });
        }

        for (const { pattern, category, severity, description, recommendation } of inputValidationPatterns) {
            pattern.lastIndex = 0;

            let match;
            while ((match = pattern.exec(code)) !== null) {
                const lineNumber = this.getLineNumber(code, match.index);
                const codeSnippet = this.extractCodeSnippet(code, match.index, match[0].length);

                issues.push({
                    title: 'تحقق غير كافٍ من الإدخال',
                    category,
                    severity,
                    description,
                    recommendation,
                    filePath,
                    lineNumber,
                    codeSnippet
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
        // الحصول على النص قبل وبعد الموقع المطابق لإنشاء سياق
        const startPos = Math.max(0, position - 50);
        const endPos = Math.min(code.length, position + matchLength + 50);

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

module.exports = new SecurityAnalyzer();