
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
        // تخزين المشاكل حسب الفئة
        const categorizedIssues = {};

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

            // فحص وجود تقنية SSL Pinning
            this.checkSSLPinning(code, filePath, language, appType, issues);
            this.checkSQLInjectionVulnerabilities(code, filePath, language, appType, issues);

            this.checkVulnerableDependencyInjection(code, filePath, language, appType, issues);

            this.checkCommandInjection(code, filePath, language, appType, issues);

            this.checkFileUploadHandling(code, filePath, language, appType, issues);
            this.checkDynamicCodeExecution(code, filePath, language, appType, issues);
            this.checkWebViewSecurity(code, filePath, language, appType, issues);
            this.checkExcessivePermissions(code, filePath, language, appType, issues);
            this.checkDebugLogging(code, filePath, language, appType, issues);
            this.checkSessionManagement(code, filePath, language, appType, issues);

            // تجميع المشاكل حسب الفئة
            issues.forEach(issue => {
                const category = issue.category || "UNDEFINED_CATEGORY";
                if (!categorizedIssues[category]) {
                    categorizedIssues[category] = [];
                }
                categorizedIssues[category].push(issue);
            });

            // إعادة تنظيم المشاكل حسب الفئة والخطورة
            const sortedIssues = [];

            // ترتيب الفئات حسب الخطورة
            const sortedCategories = Object.keys(categorizedIssues).sort();

            // أولوية ترتيب الخطورة
            const severityOrder = {
                'critical': 4,
                'high': 3,
                'medium': 2,
                'low': 1,
                'info': 0
            };

            // إضافة المشاكل المجمعة إلى القائمة النهائية
            for (const category of sortedCategories) {
                // ترتيب المشاكل ضمن كل فئة حسب الخطورة
                categorizedIssues[category].sort((a, b) => {
                    const severityA = severityOrder[a.severity?.toLowerCase()] || 0;
                    const severityB = severityOrder[b.severity?.toLowerCase()] || 0;
                    return severityB - severityA;
                });

                // إضافة المشاكل المرتبة لهذه الفئة
                sortedIssues.push(...categorizedIssues[category]);
            }

            logger.debug(`تم اكتشاف ${sortedIssues.length} مشكلة أمنية في الملف: ${filePath}`);
            return sortedIssues;
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
        // أنماط للبحث عن الأسرار المضمنة في الكود - تعديل التعبيرات النمطية لتكون أكثر دقة
        const secretPatterns = [
            {
                // عدل النمط للبحث عن الأسرار الحقيقية مثل المفاتيح والرموز
                pattern: /(['"])(?:api|jwt|auth|app|token|secret|password|pw|key|cert|oauth|access_token|client_secret)_?(?:key|token|secret|password|auth)?['"\s]*(?::|=>|=)\s*['"]([a-zA-Z0-9_\-\.=]{16,})['"]|['"]sk_live_[a-zA-Z0-9]{24,}['"]|['"]ak_live_[a-zA-Z0-9]{24,}['"]|['"]pk_live_[a-zA-Z0-9]{24,}['"]/gi,
                category: SECURITY_RISKS.HARDCODED_SECRETS,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'تم العثور على سر مضمن في الكود مثل API key أو token. يجب تخزين الأسرار في مخزن آمن أو متغيرات بيئية.',
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
                // تعديل نمط البحث عن سلاسل Base64 لتجنب نصوص واجهة المستخدم العادية
                pattern: /(['"])((?:[A-Za-z0-9+\/]{24,})(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=|[A-Za-z0-9+\/]{4}))(['"])/g,
                exclude: /(Text|title|label|button|content|message|description|name|username)/i, // استبعاد النصوص العادية
                category: SECURITY_RISKS.HARDCODED_SECRETS,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'تم العثور على سلسلة تشبه بيانات مشفرة بـ Base64. قد تكون بيانات حساسة مشفرة بشكل ضعيف.',
                recommendation: 'تأكد من أن هذه البيانات ليست معلومات سرية وأنها لا تكشف معلومات حساسة.'
            }
        ];

        for (const { pattern, category, severity, description, recommendation, exclude } of secretPatterns) {
            // إعادة تعيين lastIndex للتأكد من بدء البحث من بداية السلسلة
            pattern.lastIndex = 0;

            let match;
            while ((match = pattern.exec(code)) !== null) {
                // فحص إضافي لتجاهل النصوص العادية المتعلقة بواجهة المستخدم
                if (exclude && exclude.test(code.substring(Math.max(0, match.index - 30), match.index + match[0].length + 30))) {
                    continue;
                }

                // تجاهل النصوص العادية مثل 'text' و 'label' والرسائل
                const context = code.substring(Math.max(0, match.index - 50), match.index + match[0].length + 50);
                if (context.match(/(?:const|new|var|let|final)\s+(?:Text|Button|Label|Message|String)/i)) {
                    continue;
                }

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
     * فحص مشاكل التشفير غير الكافي مع تحسين دقة التقييم
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {string} appType - نوع تطبيق الموبايل
     * @param {Array} issues - قائمة المشاكل المكتشفة
     */
    checkInsufficientCryptography(code, filePath, language, appType, issues) {
        // تعديل: تحسين الفحص بتحليل سياق الكود قبل تحديد وجود مشكلة

        // 1. أولاً نتحقق ما إذا كان الملف يتعامل أصلاً مع التشفير أو البيانات الحساسة
        const securityKeywords = [
            'security', 'crypto', 'crypt', 'cipher', 'encrypt', 'decrypt',
            'auth', 'login', 'password', 'cert', 'sign', 'hash',
            'token', 'key', 'secret', 'credentials', 'ssl', 'tls'
        ];

        // بدلاً من التحقق البسيط، نبحث عن تطابق السياق
        let isSecurityRelatedFile = false;

        // فحص ما إذا كان اسم الملف يشير إلى أنه متعلق بالأمان
        if (filePath.toLowerCase().match(/security|auth|crypt|cipher|encrypt|login|password|secret|token|api|key/)) {
            isSecurityRelatedFile = true;
        }

        // فحص وجود كلمات مفتاحية متعلقة بالأمان في محتوى الملف
        if (!isSecurityRelatedFile) {
            const securityPatternRegex = new RegExp(securityKeywords.join('|'), 'i');
            // تحقق من وجود كلمات أمنية محددة السياق - وليس فقط أي ذكر
            const codeLines = code.split('\n');
            for (let i = 0; i < codeLines.length; i++) {
                const line = codeLines[i];
                if (securityPatternRegex.test(line)) {
                    // تأكيد إضافي: تحقق من أن الكلمة المفتاحية موجودة في سياق دالة أو متغير
                    if (line.match(/\b(function|class|var|let|const|import|require|final|public|private|protected)\b/)
                        && !line.match(/\/\/.*|\/\*.*/) // تجاهل التعليقات
                        && !line.match(/^\s*[\*\/]/) // تجاهل أسطر التعليقات متعددة الأسطر
                    ) {
                        isSecurityRelatedFile = true;
                        break;
                    }
                }
            }
        }

        // 2. التحقق من استخدام دوال التشفير الفعلية
        let hasCryptoFunctionality = false;
        if (isSecurityRelatedFile) {
            const cryptoFunctionsRegex = /\b(encrypt|decrypt|createHash|createCipher|createCipheriv|createHmac|createSign|verify|sign)\b/;
            hasCryptoFunctionality = cryptoFunctionsRegex.test(code);
        }

        // 3. إذا لم يكن الملف متعلق بالأمان أو التشفير، نتوقف عن التحليل
        if (!isSecurityRelatedFile && !hasCryptoFunctionality) {
            return;
        }

        // أنماط للبحث عن مشاكل التشفير
        const insufficientCryptoPatterns = [
            {
                pattern: /\b(DES|3DES|RC4|Blowfish)\b/gi,
                category: SECURITY_RISKS.M10_INSUFFICIENT_CRYPTOGRAPHY,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'استخدام خوارزميات تشفير ضعيفة أو مهجورة (DES, 3DES, RC4, Blowfish).',
                recommendation: 'استخدم خوارزميات تشفير حديثة مثل AES-256 أو ChaCha20-Poly1305.'
            },
            {
                pattern: /\bECB\b/g,
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
                // 4. تحليل السياق لتأكيد أن هذا استخدام فعلي لخوارزمية تشفير وليس مجرد نص
                const contextStart = Math.max(0, match.index - 100);
                const contextEnd = Math.min(code.length, match.index + match[0].length + 100);
                const context = code.substring(contextStart, contextEnd);

                // أنماط تشير إلى استخدام حقيقي للتشفير
                const cryptoUsageIndicators = /\b(encrypt|decrypt|cipher|crypto|security|algorithm|mode|transform|key|iv|salt|block)\b/i;

                // أنماط تشير إلى أن هذا مجرد نص تعليق أو اسم متغير عابر
                const falsePositiveIndicators = /\b(comment|deprecated|not used|don't use|example of|class name|variable name|interface|enum|import)\b/i;

                // أنماط تجاهل البيانات في واجهة المستخدم أو النصوص الوصفية
                const uiTextIndicators = /\b(Text|title|label|button|content|message|description|hint|display|show)\b/i;

                // فحص إضافي: التأكد من أن هذا استخدام حقيقي للخوارزمية
                if ((cryptoUsageIndicators.test(context) || hasCryptoFunctionality) &&
                    !falsePositiveIndicators.test(context) &&
                    !uiTextIndicators.test(context)) {

                    const lineNumber = this.getLineNumber(code, match.index);

                    // استخراج الدالة الكاملة التي تحتوي على المشكلة
                    const codeSnippet = this._extractFullFunction(code, match.index);

                    // إنشاء اقتراح للكود المصحح
                    const fixedCodeSnippet = this._generateFixedCode(codeSnippet, match[0]);

                    issues.push({
                        title: 'تشفير غير كافٍ',
                        category,
                        severity,
                        description,
                        recommendation,
                        filePath,
                        lineNumber,
                        codeSnippet,
                        fixedCodeSnippet
                    });
                }
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
     * فحص وجود تقنية SSL Pinning
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {string} appType - نوع تطبيق الموبايل
     * @param {Array} issues - قائمة المشاكل المكتشفة
     */
    checkSSLPinning(code, filePath, language, appType, issues) {
        // أنماط للكشف عن وجود SSL Pinning
        const sslPinningPatterns = [];

        if (language === 'Java' || language === 'Kotlin') {
            // Android - أنماط تثبيت الشهادات في Java/Kotlin
            sslPinningPatterns.push({
                pattern: /CertificatePinner|okhttp3\.CertificatePinner|NetworkSecurityConfig/g,
                negative: true, // نحن نبحث عن غياب هذه الأنماط
                category: SECURITY_RISKS.M5_INSECURE_COMMUNICATION,
                severity: SEVERITY_LEVELS.CRITICAL,
                description: 'عدم استخدام تقنية SSL Pinning للتحقق من صحة شهادة الخادم، مما يعرّض التطبيق لهجمات Man-in-the-Middle.',
                recommendation: 'قم بتطبيق SSL Pinning باستخدام CertificatePinner من OkHttp أو استخدام Android Network Security Config.'
            });
        } else if (language === 'Swift' || language === 'Objective-C') {
            // iOS - أنماط تثبيت الشهادات في Swift/Objective-C
            sslPinningPatterns.push({
                pattern: /SSLPinningMode|AFSecurityPolicy|evaluateServerTrust|SecTrustRef|NSURLSession delegate|URLSession delegate|serverTrustPolicy/g,
                negative: true, // نحن نبحث عن غياب هذه الأنماط
                category: SECURITY_RISKS.M5_INSECURE_COMMUNICATION,
                severity: SEVERITY_LEVELS.CRITICAL,
                description: 'عدم استخدام تقنية SSL Pinning للتحقق من صحة شهادة الخادم، مما يعرّض التطبيق لهجمات Man-in-the-Middle.',
                recommendation: 'قم بتطبيق SSL Pinning في iOS باستخدام NSURLSession delegate أو Alamofire مع ServerTrustPolicy.'
            });
        } else if (language === 'JavaScript' || language === 'TypeScript') {
            // React Native - أنماط تثبيت الشهادات في JavaScript/TypeScript
            sslPinningPatterns.push({
                pattern: /ssl-pinning|sslPinning|pinning|react-native-ssl-pinning|sslCertificate|fetchWithSSLPinning/g,
                negative: true, // نحن نبحث عن غياب هذه الأنماط
                category: SECURITY_RISKS.M5_INSECURE_COMMUNICATION,
                severity: SEVERITY_LEVELS.CRITICAL,
                description: 'عدم استخدام تقنية SSL Pinning للتحقق من صحة شهادة الخادم في React Native، مما يعرّض التطبيق لهجمات Man-in-the-Middle.',
                recommendation: 'قم بتطبيق SSL Pinning في React Native باستخدام مكتبات مثل react-native-ssl-pinning أو react-native-pinch.'
            });
        } else if (language === 'Dart') {
            // Flutter - أنماط تثبيت الشهادات في Dart
            sslPinningPatterns.push({
                pattern: /SecurityContext|setTrustedCertificatesBytes|ssl_pinning_plugin|badCertificateCallback|io_client_certificate|HttpClient/g,
                negative: true, // نحن نبحث عن غياب هذه الأنماط
                category: SECURITY_RISKS.M5_INSECURE_COMMUNICATION,
                severity: SEVERITY_LEVELS.CRITICAL,
                description: 'عدم استخدام تقنية SSL Pinning للتحقق من صحة شهادة الخادم في Flutter، مما يعرّض التطبيق لهجمات Man-in-the-Middle.',
                recommendation: 'قم بتطبيق SSL Pinning في Flutter باستخدام HttpClient مع SecurityContext أو استخدام مكتبة مثل ssl_pinning_plugin.'
            });
        } else if (language === 'C#') {
            // Xamarin - أنماط تثبيت الشهادات في C#
            sslPinningPatterns.push({
                pattern: /ServicePointManager\.ServerCertificateValidationCallback|CertificateValidationCallback|CustomCertificatePolicy|WebRequestHandler\.ServerCertificateValidationCallback/g,
                negative: true, // نحن نبحث عن غياب هذه الأنماط
                category: SECURITY_RISKS.M5_INSECURE_COMMUNICATION,
                severity: SEVERITY_LEVELS.CRITICAL,
                description: 'عدم استخدام تقنية SSL Pinning للتحقق من صحة شهادة الخادم في Xamarin، مما يعرّض التطبيق لهجمات Man-in-the-Middle.',
                recommendation: 'قم بتطبيق SSL Pinning في Xamarin باستخدام ServicePointManager.ServerCertificateValidationCallback أو WebRequestHandler.ServerCertificateValidationCallback.'
            });
        }

        // البحث عن أنماط SSL Pinning، ولكن فقط في الملفات ذات الصلة بالشبكة
        const networkRelatedFile = filePath.match(/network|http|connection|api|service|client|config|security|communication|certificate|ssl|authentication/i);

        if (networkRelatedFile) {
            for (const { pattern, negative, category, severity, description, recommendation } of sslPinningPatterns) {
                pattern.lastIndex = 0;

                // هل الكود يحتوي على أنماط SSL Pinning؟
                const hasSSLPinning = pattern.test(code);

                // إذا لم يكن هناك SSL Pinning وهذا ما نبحث عنه (negative = true)
                if (negative && !hasSSLPinning) {
                    issues.push({
                        title: 'غياب تقنية SSL Pinning',
                        category,
                        severity,
                        description,
                        recommendation,
                        filePath,
                        lineNumber: this.getLineNumber(code, 0),
                        codeSnippet: "يجب تطبيق SSL Pinning في هذا الملف",
                        type: 'issue'
                    });

                    // نوقف البحث بعد العثور على مشكلة واحدة
                    break;
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


























    //-----------------------------update code ----------------------------//




    /**
     * فحص تنفيذ الكود الديناميكي (مثل eval, Function, exec)
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {string} appType - نوع تطبيق الموبايل
     * @param {Array} issues - قائمة المشاكل المكتشفة
     */
    checkDynamicCodeExecution(code, filePath, language, appType, issues) {
        // أنماط تنفيذ الكود الديناميكي للغات المختلفة
        const dynamicCodePatterns = [];

        if (language === 'JavaScript' || language === 'TypeScript') {
            dynamicCodePatterns.push({
                pattern: /eval\s*\(/g,
                category: SECURITY_RISKS.M4_INSUFFICIENT_VALIDATION,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'استخدام دالة eval() يسمح بتنفيذ كود جافاسكريبت ديناميكي، مما قد يؤدي إلى ثغرات حقن الكود.',
                recommendation: 'تجنب استخدام eval() واستخدم بدائل آمنة مثل JSON.parse() للتعامل مع البيانات الديناميكية.'
            });

            dynamicCodePatterns.push({
                pattern: /new\s+Function\s*\(/g,
                category: SECURITY_RISKS.M4_INSUFFICIENT_VALIDATION,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'استخدام Function constructor يسمح بإنشاء دوال ديناميكية، مما قد يؤدي إلى ثغرات حقن الكود.',
                recommendation: 'تجنب إنشاء دوال ديناميكية واستخدم بدائل آمنة.'
            });

            dynamicCodePatterns.push({
                pattern: /setTimeout\s*\(\s*(['"`][^'"`]+['"`])/g,
                category: SECURITY_RISKS.M4_INSUFFICIENT_VALIDATION,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام setTimeout مع نص برمجي بدلاً من دالة يمكن أن يسبب ثغرات أمنية.',
                recommendation: 'استخدم دالة بدلاً من سلسلة نصية مع setTimeout: setTimeout(() => { ... }, delay).'
            });

            dynamicCodePatterns.push({
                pattern: /dangerouslySetInnerHTML|\$\{\s*([^}]*)\s*\}/g,
                category: SECURITY_RISKS.M4_INSUFFICIENT_VALIDATION,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام dangerouslySetInnerHTML في React أو تضمين متغيرات مباشرة في قوالب السلاسل النصية قد يؤدي إلى ثغرات XSS.',
                recommendation: 'استخدم مكتبات لتطهير البيانات قبل عرضها أو معالجة النصوص البرمجية بشكل آمن.'
            });
        } else if (language === 'Java' || language === 'Kotlin') {
            dynamicCodePatterns.push({
                pattern: /\bRuntime\.getRuntime\(\).exec\(/g,
                category: SECURITY_RISKS.M4_INSUFFICIENT_VALIDATION,
                severity: SEVERITY_LEVELS.CRITICAL,
                description: 'استخدام Runtime.exec() لتنفيذ أوامر النظام، مما قد يؤدي إلى ثغرات تنفيذ الأوامر عن بعد.',
                recommendation: 'تجنب تنفيذ أوامر النظام، وإذا كان ضرورياً فتأكد من تطهير المدخلات وتقييد الأوامر المسموح بها.'
            });

            dynamicCodePatterns.push({
                pattern: /DexClassLoader|PathClassLoader|InMemoryDexClassLoader/g,
                category: SECURITY_RISKS.M4_INSUFFICIENT_VALIDATION,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'استخدام محملات الفئات الديناميكية لتحميل تعليمات برمجية في وقت التشغيل، مما قد يشكل مخاطر أمنية.',
                recommendation: 'تأكد من التحقق من مصدر ونزاهة أي كود يتم تحميله ديناميكياً.'
            });

            dynamicCodePatterns.push({
                pattern: /\bClass\.forName\(/g,
                category: SECURITY_RISKS.M4_INSUFFICIENT_VALIDATION,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام Class.forName() لتحميل فئات ديناميكياً، مما قد يشكل مخاطر أمنية إذا كان اسم الفئة من مصدر غير موثوق.',
                recommendation: 'تحقق من اسم الفئة والتأكد من أنه يأتي من مصدر موثوق قبل استخدام Class.forName().'
            });
        } else if (language === 'Swift' || language === 'Objective-C') {
            dynamicCodePatterns.push({
                pattern: /@selector|NSSelectorFromString/g,
                category: SECURITY_RISKS.M4_INSUFFICIENT_VALIDATION,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام selectors الديناميكية في Objective-C قد يؤدي إلى تنفيذ كود غير متوقع.',
                recommendation: 'تأكد من أن أسماء selectors تأتي من مصادر موثوقة وتحقق من صحتها قبل الاستخدام.'
            });

            dynamicCodePatterns.push({
                pattern: /NSInvocation|NSMethodSignature/g,
                category: SECURITY_RISKS.M4_INSUFFICIENT_VALIDATION,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام NSInvocation لاستدعاء طرق ديناميكياً قد يؤدي إلى تنفيذ كود غير متوقع.',
                recommendation: 'تجنب استخدام NSInvocation مع بيانات من مصادر غير موثوقة.'
            });
        } else if (language === 'Dart') {
            dynamicCodePatterns.push({
                pattern: /\bFunction\s*\(/g,
                category: SECURITY_RISKS.M4_INSUFFICIENT_VALIDATION,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام Function في Dart لإنشاء وتنفيذ دوال ديناميكية قد يشكل مخاطر أمنية.',
                recommendation: 'تجنب إنشاء دوال ديناميكية في Dart واستخدم بدائل أكثر أماناً.'
            });
        } else if (language === 'C#') {
            dynamicCodePatterns.push({
                pattern: /Activator\.CreateInstance|Assembly\.Load/g,
                category: SECURITY_RISKS.M4_INSUFFICIENT_VALIDATION,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'استخدام Activator.CreateInstance أو Assembly.Load لتحميل وإنشاء كائنات ديناميكية قد يشكل مخاطر أمنية.',
                recommendation: 'تأكد من أن أسماء النوع أو مسارات التجميع تأتي من مصادر موثوقة وتحقق من صحتها قبل الاستخدام.'
            });

            dynamicCodePatterns.push({
                pattern: /Process\.Start/g,
                category: SECURITY_RISKS.M4_INSUFFICIENT_VALIDATION,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'استخدام Process.Start لتنفيذ أوامر النظام، مما قد يؤدي إلى ثغرات تنفيذ الأوامر عن بعد.',
                recommendation: 'تجنب تنفيذ أوامر النظام، وإذا كان ضرورياً فتأكد من تطهير المدخلات وتقييد الأوامر المسموح بها.'
            });
        }

        // البحث عن أنماط تنفيذ الكود الديناميكي
        for (const { pattern, category, severity, description, recommendation } of dynamicCodePatterns) {
            pattern.lastIndex = 0;

            let match;
            while ((match = pattern.exec(code)) !== null) {
                const lineNumber = this.getLineNumber(code, match.index);
                const codeSnippet = this.extractCodeSnippet(code, match.index, match[0].length);

                issues.push({
                    title: 'تنفيذ كود ديناميكي غير آمن',
                    category,
                    severity,
                    description,
                    recommendation,
                    filePath,
                    lineNumber,
                    codeSnippet,
                    type: 'issue'
                });
            }
        }
    }

    /**
     * فحص أمان WebView
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {string} appType - نوع تطبيق الموبايل
     * @param {Array} issues - قائمة المشاكل المكتشفة
     */
    checkWebViewSecurity(code, filePath, language, appType, issues) {
        // أنماط التكوين غير الآمن للـ WebView
        const webViewPatterns = [];

        if (language === 'Java' || language === 'Kotlin') {
            webViewPatterns.push({
                pattern: /setJavaScriptEnabled\s*\(\s*true\s*\)/g,
                category: SECURITY_RISKS.M7_CLIENT_CODE_QUALITY,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'تمكين JavaScript في WebView بدون تدابير أمان إضافية يمكن أن يؤدي إلى هجمات XSS.',
                recommendation: 'قم بتقييد JavaScript في WebView باستخدام تمرير الأصل المحدد أو تعطيل JavaScript إذا لم يكن ضرورياً.'
            });

            webViewPatterns.push({
                pattern: /setAllowFileAccess\s*\(\s*true\s*\)/g,
                category: SECURITY_RISKS.M7_CLIENT_CODE_QUALITY,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'السماح بالوصول إلى نظام الملفات من خلال WebView يمكن أن يؤدي إلى تسريب معلومات حساسة.',
                recommendation: 'عطل الوصول إلى الملفات في WebView باستخدام setAllowFileAccess(false) إلا إذا كان ضرورياً.'
            });

            webViewPatterns.push({
                pattern: /setAllowFileAccessFromFileURLs\s*\(\s*true\s*\)|setAllowUniversalAccessFromFileURLs\s*\(\s*true\s*\)/g,
                category: SECURITY_RISKS.M7_CLIENT_CODE_QUALITY,
                severity: SEVERITY_LEVELS.CRITICAL,
                description: 'السماح بالوصول العالمي من عناوين URL للملفات يمكن أن يؤدي إلى هجمات XSS وتسريب بيانات حساسة.',
                recommendation: 'عطل الوصول من عناوين URL للملفات باستخدام setAllowFileAccessFromFileURLs(false) و setAllowUniversalAccessFromFileURLs(false).'
            });

            webViewPatterns.push({
                pattern: /addJavascriptInterface\s*\(/g,
                category: SECURITY_RISKS.M7_CLIENT_CODE_QUALITY,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'استخدام addJavascriptInterface بدون الحماية المناسبة يمكن أن يؤدي إلى RCE في الإصدارات القديمة من Android.',
                recommendation: 'تأكد من استخدام @JavascriptInterface و تعمل فقط على Android 4.2 (API level 17) أو أعلى، وتقييد الطرق المكشوفة.'
            });
        } else if (language === 'Swift' || language === 'Objective-C') {
            webViewPatterns.push({
                pattern: /\.javaScriptEnabled\s*=\s*true|preferences\.javaScriptEnabled\s*=\s*true/g,
                category: SECURITY_RISKS.M7_CLIENT_CODE_QUALITY,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'تمكين JavaScript في WKWebView بدون تدابير أمان إضافية يمكن أن يؤدي إلى هجمات XSS.',
                recommendation: 'قم بتقييد JavaScript في WKWebView باستخدام content controller المناسب لمعالجة الرسائل بأمان.'
            });

            webViewPatterns.push({
                pattern: /\.allowsInlineMediaPlayback\s*=\s*true/g,
                category: SECURITY_RISKS.M7_CLIENT_CODE_QUALITY,
                severity: SEVERITY_LEVELS.LOW,
                description: 'السماح بتشغيل الوسائط المضمنة في WebView قد يؤدي إلى تجربة مستخدم غير متوقعة.',
                recommendation: 'استخدم بدائل آمنة أو تأكد من المصادر الموثوقة عند تمكين تشغيل الوسائط المضمنة.'
            });

            webViewPatterns.push({
                pattern: /addScriptMessageHandler|userContentController/g,
                category: SECURITY_RISKS.M7_CLIENT_CODE_QUALITY,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام addScriptMessageHandler يمكن أن يسمح للـ JavaScript بالتفاعل مع الكود المحلي، مما يزيد من مساحة الهجوم.',
                recommendation: 'تأكد من التحقق من صحة كل البيانات المستلمة من WebView وتقييد الوظائف المكشوفة للـ JavaScript.'
            });
        } else if (language === 'JavaScript' || language === 'TypeScript') {
            // React Native WebView
            webViewPatterns.push({
                pattern: /<WebView[^>]*source\s*=\s*\{\s*uri\s*:\s*([^}]*)\s*\}/g,
                category: SECURITY_RISKS.M7_CLIENT_CODE_QUALITY,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام WebView مع مصادر خارجية بدون تدابير أمان كافية.',
                recommendation: 'تأكد من أن URI مصدر الـ WebView يأتي من مصدر موثوق وفكر في استخدام originWhitelist لتقييد المواقع المسموح بها.'
            });

            webViewPatterns.push({
                pattern: /<WebView[^>]*javaScriptEnabled\s*=\s*\{\s*true\s*\}/g,
                category: SECURITY_RISKS.M7_CLIENT_CODE_QUALITY,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'تمكين JavaScript في WebView بدون تدابير أمان إضافية يمكن أن يؤدي إلى هجمات XSS.',
                recommendation: 'استخدم originWhitelist لتقييد المواقع المسموح بها في WebView.'
            });
        } else if (language === 'Dart') {
            // Flutter WebView
            webViewPatterns.push({
                pattern: /WebView\s*\(/g,
                category: SECURITY_RISKS.M7_CLIENT_CODE_QUALITY,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام WebView في Flutter يمكن أن يزيد من مساحة الهجوم إذا لم يتم تكوينه بشكل آمن.',
                recommendation: 'استخدم navigationDelegate للتحكم في المواقع التي يمكن للـ WebView الوصول إليها وتقييد الـ JavaScript عند الإمكان.'
            });

            webViewPatterns.push({
                pattern: /javascriptMode\s*:\s*JavascriptMode\.unrestricted/g,
                category: SECURITY_RISKS.M7_CLIENT_CODE_QUALITY,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام وضع JavaScript غير المقيد في Flutter WebView يمكن أن يؤدي إلى هجمات XSS.',
                recommendation: 'استخدم JavascriptMode.disabled عندما لا يكون JavaScript ضرورياً، أو قم بتنفيذ التحقق المناسب باستخدام navigationDelegate.'
            });
        }

        // البحث عن أنماط WebView غير الآمنة
        for (const { pattern, category, severity, description, recommendation } of webViewPatterns) {
            pattern.lastIndex = 0;

            let match;
            while ((match = pattern.exec(code)) !== null) {
                const lineNumber = this.getLineNumber(code, match.index);
                const codeSnippet = this.extractCodeSnippet(code, match.index, match[0].length);

                issues.push({
                    title: 'تكوين WebView غير آمن',
                    category,
                    severity,
                    description,
                    recommendation,
                    filePath,
                    lineNumber,
                    codeSnippet,
                    type: 'issue'
                });
            }
        }
    }



    /**
     * فحص الأذونات الزائدة في التطبيق
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {string} appType - نوع تطبيق الموبايل
     * @param {Array} issues - قائمة المشاكل المكتشفة
     */
    checkExcessivePermissions(code, filePath, language, appType, issues) {
        // فحص الأذونات في Android
        if ((appType === 'nativeAndroid' || appType === 'reactNative' || appType === 'flutter') &&
            filePath.toLowerCase().includes('androidmanifest.xml')) {

            // أذونات Android الخطيرة
            const dangerousPermissions = [
                {
                    pattern: /<uses-permission[^>]*android:name\s*=\s*["']android\.permission\.READ_SMS["']/g,
                    severity: SEVERITY_LEVELS.HIGH,
                    description: 'طلب إذن قراءة الرسائل النصية SMS قد يؤثر على خصوصية المستخدم. هذا الإذن حساس ويجب استخدامه فقط عند الضرورة القصوى.',
                    recommendation: 'تجنب طلب إذن READ_SMS ما لم يكن ضرورياً لوظائف التطبيق الأساسية. فكر في بدائل أقل اختراقاً مثل SMS Retriever API.'
                },
                {
                    pattern: /<uses-permission[^>]*android:name\s*=\s*["']android\.permission\.RECEIVE_SMS["']/g,
                    severity: SEVERITY_LEVELS.HIGH,
                    description: 'طلب إذن استقبال الرسائل النصية SMS قد يؤثر على خصوصية المستخدم.',
                    recommendation: 'تجنب طلب إذن RECEIVE_SMS ما لم يكن ضرورياً لوظائف التطبيق الأساسية.'
                },
                {
                    pattern: /<uses-permission[^>]*android:name\s*=\s*["']android\.permission\.SEND_SMS["']/g,
                    severity: SEVERITY_LEVELS.HIGH,
                    description: 'طلب إذن إرسال الرسائل النصية SMS قد يؤدي إلى تكاليف غير متوقعة للمستخدم.',
                    recommendation: 'تجنب طلب إذن SEND_SMS ما لم يكن ضرورياً لوظائف التطبيق الأساسية.'
                },
                {
                    pattern: /<uses-permission[^>]*android:name\s*=\s*["']android\.permission\.READ_CALL_LOG["']/g,
                    severity: SEVERITY_LEVELS.HIGH,
                    description: 'طلب إذن قراءة سجل المكالمات قد يؤثر على خصوصية المستخدم.',
                    recommendation: 'تجنب طلب إذن READ_CALL_LOG ما لم يكن ضرورياً لوظائف التطبيق الأساسية.'
                },
                {
                    pattern: /<uses-permission[^>]*android:name\s*=\s*["']android\.permission\.READ_CONTACTS["']/g,
                    severity: SEVERITY_LEVELS.MEDIUM,
                    description: 'طلب إذن قراءة جهات الاتصال قد يؤثر على خصوصية المستخدم.',
                    recommendation: 'تأكد من أن إذن READ_CONTACTS ضروري لوظائف التطبيق الأساسية وشرح سبب الحاجة إليه للمستخدم.'
                },
                {
                    pattern: /<uses-permission[^>]*android:name\s*=\s*["']android\.permission\.CAMERA["']/g,
                    severity: SEVERITY_LEVELS.MEDIUM,
                    description: 'طلب إذن استخدام الكاميرا قد يؤثر على خصوصية المستخدم.',
                    recommendation: 'تأكد من أن إذن CAMERA ضروري لوظائف التطبيق الأساسية وشرح سبب الحاجة إليه للمستخدم.'
                },
                {
                    pattern: /<uses-permission[^>]*android:name\s*=\s*["']android\.permission\.RECORD_AUDIO["']/g,
                    severity: SEVERITY_LEVELS.MEDIUM,
                    description: 'طلب إذن تسجيل الصوت قد يؤثر على خصوصية المستخدم.',
                    recommendation: 'تأكد من أن إذن RECORD_AUDIO ضروري لوظائف التطبيق الأساسية وشرح سبب الحاجة إليه للمستخدم.'
                },
                {
                    pattern: /<uses-permission[^>]*android:name\s*=\s*["']android\.permission\.ACCESS_FINE_LOCATION["']/g,
                    severity: SEVERITY_LEVELS.MEDIUM,
                    description: 'طلب إذن الوصول إلى الموقع الدقيق قد يؤثر على خصوصية المستخدم.',
                    recommendation: 'فكر في استخدام ACCESS_COARSE_LOCATION بدلاً من ذلك إذا كان الموقع الدقيق غير ضروري لوظائف التطبيق.'
                },
                {
                    pattern: /<uses-permission[^>]*android:name\s*=\s*["']android\.permission\.READ_EXTERNAL_STORAGE["']/g,
                    severity: SEVERITY_LEVELS.LOW,
                    description: 'طلب إذن قراءة التخزين الخارجي قد يؤثر على خصوصية المستخدم.',
                    recommendation: 'في Android 10 وما فوق، استخدم الوصول المقيد لملفات الوسائط مع MediaStore API بدلاً من طلب إذن كامل.'
                },
                {
                    pattern: /<uses-permission[^>]*android:name\s*=\s*["']android\.permission\.WRITE_EXTERNAL_STORAGE["']/g,
                    severity: SEVERITY_LEVELS.LOW,
                    description: 'طلب إذن الكتابة على التخزين الخارجي قد يؤثر على خصوصية المستخدم.',
                    recommendation: 'في Android 10 وما فوق، استخدم الوصول المقيد لملفات الوسائط مع MediaStore API بدلاً من طلب إذن كامل.'
                }
            ];

            // فحص وجود أذونات خطيرة
            for (const { pattern, severity, description, recommendation } of dangerousPermissions) {
                pattern.lastIndex = 0;

                if (pattern.test(code)) {
                    const match = pattern.exec(code);
                    pattern.lastIndex = 0; // إعادة تعيين lastIndex للتعبير المنتظم

                    const lineNumber = match ? this.getLineNumber(code, match.index) : 1;
                    const codeSnippet = match ? this.extractCodeSnippet(code, match.index, match[0].length) : "أذونات زائدة في AndroidManifest.xml";

                    issues.push({
                        title: 'أذونات تطبيق مفرطة',
                        category: SECURITY_RISKS.M1_IMPROPER_PLATFORM_USAGE,
                        severity,
                        description,
                        recommendation,
                        filePath,
                        lineNumber,
                        codeSnippet,
                        type: 'issue'
                    });
                }
            }

            // فحص عدد الأذونات الإجمالي (إذا كان كبيرًا جدًا)
            const permissionMatches = code.match(/<uses-permission/g);
            const permissionCount = permissionMatches ? permissionMatches.length : 0;

            if (permissionCount > 8) { // عدد كبير من الأذونات يعتبر مشكلة
                issues.push({
                    title: 'عدد كبير من الأذونات',
                    category: SECURITY_RISKS.M1_IMPROPER_PLATFORM_USAGE,
                    severity: SEVERITY_LEVELS.MEDIUM,
                    description: `تم اكتشاف ${permissionCount} من الأذونات في التطبيق، وهو عدد كبير نسبيًا. قد يؤدي طلب الكثير من الأذونات إلى تقليل ثقة المستخدم ويزيد من مساحة الهجوم للتطبيق.`,
                    recommendation: 'راجع الأذونات المطلوبة وقم بإزالة أي أذونات غير ضرورية لوظائف التطبيق الأساسية.',
                    filePath,
                    lineNumber: 1,
                    codeSnippet: "عدد كبير من الأذونات في AndroidManifest.xml",
                    type: 'issue'
                });
            }
        }

        // فحص الأذونات في iOS (Info.plist)
        else if ((appType === 'nativeIOS' || appType === 'reactNative' || appType === 'flutter') &&
            filePath.toLowerCase().includes('info.plist')) {

            // أذونات iOS الحساسة
            const iosPermissions = [
                {
                    pattern: /NSCameraUsageDescription|NSMicrophoneUsageDescription|NSLocationWhenInUseUsageDescription|NSLocationAlwaysUsageDescription|NSContactsUsageDescription|NSCalendarsUsageDescription|NSPhotoLibraryUsageDescription|NSPhotoLibraryAddUsageDescription|NSFaceIDUsageDescription|NSBluetoothAlwaysUsageDescription|NSBluetoothPeripheralUsageDescription|NSMotionUsageDescription|NSHealthShareUsageDescription|NSHealthUpdateUsageDescription|NSSpeechRecognitionUsageDescription|NSAppleMusicUsageDescription|NSHomeKitUsageDescription|NSLocationAlwaysAndWhenInUseUsageDescription/g,
                    severity: SEVERITY_LEVELS.MEDIUM,
                    description: 'طلب أذونات وصول حساسة في iOS. يجب أن تكون هذه الأذونات مبررة ومشروحة بشكل جيد للمستخدم.',
                    recommendation: 'تأكد من توفير وصف واضح ودقيق لسبب حاجة التطبيق لكل إذن من هذه الأذونات في ملف Info.plist.'
                }
            ];

            // فحص وجود أذونات iOS مع وصف فارغ أو غير كافٍ
            for (const { pattern, severity, description, recommendation } of iosPermissions) {
                pattern.lastIndex = 0;

                if (pattern.test(code)) {
                    // تحقق من وجود أوصاف فارغة أو ناقصة
                    const emptyDescPattern = new RegExp(`<key>(${pattern.source})</key>\\s*<string>\\s*(|TBD|TODO|test|testing|Insert description here)\\s*</string>`, 'gi');
                    emptyDescPattern.lastIndex = 0;

                    if (emptyDescPattern.test(code)) {
                        const match = emptyDescPattern.exec(code);
                        emptyDescPattern.lastIndex = 0;

                        const lineNumber = match ? this.getLineNumber(code, match.index) : 1;
                        const codeSnippet = match ? this.extractCodeSnippet(code, match.index, match[0].length) : "أذونات بدون وصف كافٍ في Info.plist";

                        issues.push({
                            title: 'وصف غير كافٍ لأذونات iOS',
                            category: SECURITY_RISKS.M1_IMPROPER_PLATFORM_USAGE,
                            severity: SEVERITY_LEVELS.MEDIUM,
                            description: 'تم العثور على أذونات iOS بدون وصف كافٍ. يجب توفير أوصاف واضحة تشرح سبب حاجة التطبيق لهذه الأذونات.',
                            recommendation: 'قم بتحديث قيم الوصف لكل إذن ليشرح بوضوح سبب حاجة التطبيق لهذا الإذن وكيف سيتم استخدامه.',
                            filePath,
                            lineNumber,
                            codeSnippet,
                            type: 'issue'
                        });
                    }
                }
            }
        }
    }

    /**
     * فحص استخدام تسجيل التصحيح (debugging logs) المفرط
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {string} appType - نوع تطبيق الموبايل
     * @param {Array} issues - قائمة المشاكل المكتشفة
     */
    checkDebugLogging(code, filePath, language, appType, issues) {
        // أنماط تسجيل التصحيح لمختلف اللغات
        const debugLoggingPatterns = [];

        if (language === 'Java' || language === 'Kotlin') {
            debugLoggingPatterns.push({
                pattern: /Log\.d\s*\(|Log\.v\s*\(|Log\.i\s*\(|System\.out\.print|e\.printStackTrace\s*\(|Log\s*\.\s*e\s*\(/g,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام تسجيل التصحيح في الكود. قد يؤدي هذا إلى تسرب معلومات حساسة في بيئة الإنتاج.',
                recommendation: 'قم بإزالة تعليمات التسجيل التصحيحي أو قم بتغليفها بشرط يتحقق من أن التطبيق في وضع التطوير فقط، مثل: if (BuildConfig.DEBUG) { Log.d(...); }'
            });
        } else if (language === 'Swift' || language === 'Objective-C') {
            debugLoggingPatterns.push({
                pattern: /print\s*\(|NSLog\s*\(|os_log\s*\(|println\s*\(|dump\s*\(/g,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام تسجيل التصحيح في الكود. قد يؤدي هذا إلى تسرب معلومات حساسة في بيئة الإنتاج.',
                recommendation: 'قم بإزالة تعليمات التسجيل التصحيحي أو قم بتغليفها بشرط #if DEBUG للتأكد من أنها تعمل فقط في وضع التطوير.'
            });
        } else if (language === 'JavaScript' || language === 'TypeScript') {
            debugLoggingPatterns.push({
                pattern: /console\.(log|debug|info|warn|error|trace)\s*\(/g,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام تسجيل التصحيح في الكود. قد يؤدي هذا إلى تسرب معلومات حساسة في بيئة الإنتاج.',
                recommendation: 'قم بإزالة تعليمات التسجيل التصحيحي أو استخدم مكتبة للتسجيل تسمح بتعطيل التسجيل في بيئة الإنتاج، مثل __DEV__ في React Native.'
            });
        } else if (language === 'Dart') {
            debugLoggingPatterns.push({
                pattern: /print\s*\(|debugPrint\s*\(|log\s*\.\s*d\s*\(|log\s*\.\s*v\s*\(|log\s*\.\s*i\s*\(/g,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام تسجيل التصحيح في الكود. قد يؤدي هذا إلى تسرب معلومات حساسة في بيئة الإنتاج.',
                recommendation: 'قم بإزالة تعليمات التسجيل التصحيحي أو قم بتغليفها بشرط kDebugMode للتأكد من أنها تعمل فقط في وضع التطوير.'
            });
        } else if (language === 'C#') {
            debugLoggingPatterns.push({
                pattern: /Console\.(WriteLine|Write)\s*\(|System\.Diagnostics\.Debug\.(WriteLine|Write)\s*\(|Debug\.(WriteLine|Write)\s*\(/g,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام تسجيل التصحيح في الكود. قد يؤدي هذا إلى تسرب معلومات حساسة في بيئة الإنتاج.',
                recommendation: 'قم بإزالة تعليمات التسجيل التصحيحي أو قم بتغليفها بشرط #if DEBUG للتأكد من أنها تعمل فقط في وضع التطوير.'
            });
        }

        // لتجنب تكرار المشكلات المبلغ عنها، نحتفظ بمجموعة للخطوط التي تم الإبلاغ عنها
        const reportedLines = new Set();

        // البحث عن أنماط تسجيل التصحيح
        for (const { pattern, severity, description, recommendation } of debugLoggingPatterns) {
            pattern.lastIndex = 0;

            let match;
            while ((match = pattern.exec(code)) !== null) {
                const lineNumber = this.getLineNumber(code, match.index);

                // تجنب الإبلاغ عن نفس الخط مرتين
                if (reportedLines.has(lineNumber)) {
                    continue;
                }
                reportedLines.add(lineNumber);

                // تحقق مما إذا كان التسجيل مغلفًا بشرط تصحيح
                const lineContent = this.getLineContent(code, lineNumber);
                const surroundingContext = this.getSurroundingLines(code, lineNumber, 2); // الحصول على السطور المحيطة

                // تحقق مما إذا كان هناك شرط تصحيح بالقرب
                const hasDebugCondition = this.checkForDebugCondition(surroundingContext, language);

                // إذا كان التسجيل مغلفًا بشرط تصحيح، نتجاهله
                if (hasDebugCondition) {
                    continue;
                }

                const codeSnippet = this.extractCodeSnippet(code, match.index, match[0].length);

                issues.push({
                    title: 'تسجيل تصحيح غير آمن',
                    category: SECURITY_RISKS.M6_INADEQUATE_PRIVACY,
                    severity,
                    description,
                    recommendation,
                    filePath,
                    lineNumber,
                    codeSnippet,
                    type: 'issue'
                });
            }
        }
    }

    /**
     * الحصول على محتوى سطر معين
     * @param {string} code - الكود المصدر
     * @param {number} lineNumber - رقم السطر
     * @returns {string} محتوى السطر
     */
    getLineContent(code, lineNumber) {
        const lines = code.split('\n');
        if (lineNumber > 0 && lineNumber <= lines.length) {
            return lines[lineNumber - 1];
        }
        return '';
    }

    /**
     * الحصول على السطور المحيطة بسطر معين
     * @param {string} code - الكود المصدر
     * @param {number} lineNumber - رقم السطر
     * @param {number} contextSize - عدد السطور قبل وبعد السطر المحدد
     * @returns {string} السطور المحيطة
     */


    getSurroundingLines(code, lineNumber, contextSize) {
        const lines = code.split('\n');
        const startLine = Math.max(0, lineNumber - contextSize - 1);
        const endLine = Math.min(lines.length, lineNumber + contextSize);

        return lines.slice(startLine, endLine).join('\n');
    }

    /**
     * التحقق مما إذا كان هناك شرط تصحيح يحيط بالكود
     * @param {string} context - سياق الكود المحيط
     * @param {string} language - لغة البرمجة
     * @returns {boolean} صحيح إذا كان هناك شرط تصحيح
     */
    checkForDebugCondition(context, language) {
        // أنماط شروط التصحيح لمختلف اللغات
        let debugPatterns = [];

        if (language === 'Java' || language === 'Kotlin') {
            debugPatterns = [
                /if\s*\(\s*BuildConfig\.DEBUG\s*\)/,
                /if\s*\(\s*DEBUG\s*\)/,
                /if\s*\(\s*isDebugMode\(\)\s*\)/
            ];
        } else if (language === 'Swift') {
            debugPatterns = [
                /#if\s+DEBUG/,
                /if\s*\(\s*isDebugMode\s*\)/
            ];
        } else if (language === 'JavaScript' || language === 'TypeScript') {
            debugPatterns = [
                /if\s*\(\s*__DEV__\s*\)/,
                /if\s*\(\s*process\.env\.NODE_ENV\s*!==\s*['"]production['"]\s*\)/,
                /if\s*\(\s*process\.env\.NODE_ENV\s*===\s*['"]development['"]\s*\)/
            ];
        } else if (language === 'Dart') {
            debugPatterns = [
                /if\s*\(\s*kDebugMode\s*\)/,
                /if\s*\(\s*kReleaseMode\s*==\s*false\s*\)/
            ];
        } else if (language === 'C#') {
            debugPatterns = [
                /#if\s+DEBUG/,
                /if\s*\(\s*Debugger\.IsAttached\s*\)/
            ];
        }

        // التحقق من وجود أي نمط شرط تصحيح
        for (const pattern of debugPatterns) {
            if (pattern.test(context)) {
                return true;
            }
        }

        return false;
    }

    /**
     * فحص إدارة الجلسات
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {string} appType - نوع تطبيق الموبايل
     * @param {Array} issues - قائمة المشاكل المكتشفة
     */
    checkSessionManagement(code, filePath, language, appType, issues) {
        // أنماط إدارة الجلسات غير الآمنة
        const sessionPatterns = [];

        if (language === 'Java' || language === 'Kotlin') {
            // أنماط للتحقق من تخزين الجلسات/المعرفات/الرموز غير الآمن في أندرويد
            sessionPatterns.push({
                pattern: /getSharedPreferences\s*\([^)]*\)\..*?\.putString\s*\(\s*["'](token|auth_token|session|jwt|access_token|user_token|refresh_token|id_token|bearer|auth)["']/gi,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'تخزين رموز المصادقة أو معرفات الجلسة في SharedPreferences بشكل غير آمن. يمكن الوصول إلى هذه البيانات على الأجهزة التي تم عمل روت لها.',
                recommendation: 'استخدم Android Keystore System أو EncryptedSharedPreferences لتخزين بيانات المصادقة الحساسة.'
            });

            sessionPatterns.push({
                pattern: /\.edit\(\)\.putString\s*\(\s*["'](api_key|secret|password|pin|credential)["']/gi,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'تخزين بيانات حساسة في SharedPreferences بشكل غير آمن.',
                recommendation: 'استخدم Android Keystore System أو EncryptedSharedPreferences لتخزين البيانات الحساسة.'
            });

            // فحص وجود TransportSecurity
            sessionPatterns.push({
                pattern: /\.setHostnameVerifier|\.setDefaultHostnameVerifier/g,
                severity: SEVERITY_LEVELS.CRITICAL,
                description: 'تعديل التحقق من اسم المضيف للاتصالات الآمنة قد يضعف أمان SSL/TLS.',
                recommendation: 'لا تقم بتعديل عمليات التحقق الافتراضية من اسم المضيف ما لم يكن ذلك ضرورياً للغاية، وإذا كان الأمر كذلك، تأكد من تنفيذ تحقق ملائم.'
            });

            // التحقق من استخدام EncryptedSharedPreferences (تعتبر ممارسة جيدة)
            const encryptedPrefsPattern = /EncryptedSharedPreferences|MasterKey/g;

            if (!encryptedPrefsPattern.test(code) &&
                (code.includes('getSharedPreferences') || code.includes('edit().put'))) {
                // يبدو أن التطبيق يستخدم SharedPreferences بدون تشفير
                issues.push({
                    title: 'استخدام SharedPreferences غير المشفرة',
                    category: SECURITY_RISKS.M9_INSECURE_DATA_STORAGE,
                    severity: SEVERITY_LEVELS.MEDIUM,
                    description: 'يستخدم التطبيق SharedPreferences العادية بدون تشفير. هذا قد يعرض البيانات الحساسة للخطر على الأجهزة التي تم عمل روت لها.',
                    recommendation: 'استبدل SharedPreferences العادية بـ EncryptedSharedPreferences للبيانات الحساسة.',
                    filePath,
                    lineNumber: 1, // قد لا يكون دقيقًا، لكنه يشير إلى المشكلة
                    codeSnippet: "استخدام SharedPreferences بدون تشفير",
                    type: 'issue'
                });
            }
        } else if (language === 'Swift' || language === 'Objective-C') {
            // أنماط للتحقق من تخزين الجلسات/المعرفات/الرموز غير الآمن في iOS
            sessionPatterns.push({
                pattern: /UserDefaults\.standard\.set\s*\([^,]+,\s*forKey:\s*["'](token|auth_token|session|jwt|access_token|user_token|refresh_token|id_token|bearer|auth|api_key|secret|password|pin|credential)["']/gi,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'تخزين بيانات جلسة أو مصادقة حساسة في UserDefaults. UserDefaults غير آمن لتخزين بيانات المصادقة.',
                recommendation: 'استخدم Keychain Services لتخزين بيانات المصادقة الحساسة في تطبيقات iOS.'
            });

            // فحص إعدادات ATS
            sessionPatterns.push({
                pattern: /NSAllowsArbitraryLoads.*true/g,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'تعطيل App Transport Security (ATS) يسمح بالاتصالات غير المشفرة (HTTP) ويضعف أمان التطبيق.',
                recommendation: 'تجنب تعطيل ATS بشكل كامل. استخدم استثناءات محددة للنطاقات فقط إذا كان ضرورياً.'
            });

            // التحقق من استخدام Keychain (تعتبر ممارسة جيدة)
            const keychainPattern = /SecItemAdd|SecItemUpdate|SecItemCopyMatching|KeychainSwift|kSecAttrService/g;

            if (!keychainPattern.test(code) && code.includes('UserDefaults.standard.set')) {
                // يبدو أن التطبيق يستخدم UserDefaults بدلاً من Keychain
                issues.push({
                    title: 'استخدام UserDefaults بدلاً من Keychain',
                    category: SECURITY_RISKS.M9_INSECURE_DATA_STORAGE,
                    severity: SEVERITY_LEVELS.MEDIUM,
                    description: 'يستخدم التطبيق UserDefaults لتخزين البيانات. للبيانات الحساسة، يجب استخدام Keychain لضمان التخزين الآمن.',
                    recommendation: 'استخدم Keychain Services لتخزين البيانات الحساسة مثل رموز المصادقة.',
                    filePath,
                    lineNumber: 1, // قد لا يكون دقيقًا، لكنه يشير إلى المشكلة
                    codeSnippet: "استخدام UserDefaults بدلاً من Keychain",
                    type: 'issue'
                });
            }
        } else if (language === 'JavaScript' || language === 'TypeScript') {
            // أنماط للتحقق من تخزين الجلسات/المعرفات/الرموز غير الآمن في JavaScript
            sessionPatterns.push({
                pattern: /(localStorage|sessionStorage|AsyncStorage)\.setItem\s*\(\s*["'](token|auth_token|session|jwt|access_token|user_token|refresh_token|id_token|bearer|auth|api_key|secret|password|pin|credential)["']/gi,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'تخزين بيانات جلسة أو مصادقة حساسة في localStorage/sessionStorage/AsyncStorage غير المشفر. هذه البيانات قد تكون عرضة للوصول غير المصرح به.',
                recommendation: 'استخدم حلاً مشفرًا مثل react-native-encrypted-storage أو عبوات آمنة مخصصة للمنصة.'
            });

            // فحص CORS غير الآمن
            sessionPatterns.push({
                pattern: /headers: \{\s*['"]Access-Control-Allow-Origin['"]:\s*['"]\*['"]/g,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'استخدام Access-Control-Allow-Origin: * يسمح لأي موقع بالوصول إلى API الخاص بك، مما قد يشكل مخاطر أمنية.',
                recommendation: 'حدد النطاقات المسموح بها بدلاً من استخدام النجمة (*).'
            });

            // التحقق من استخدام التخزين المشفر (تعتبر ممارسة جيدة)
            const encryptedStoragePattern = /EncryptedStorage|SecureStore|expo-secure-store|react-native-encrypted-storage|react-native-keychain/g;

            if (!encryptedStoragePattern.test(code) &&
                (code.includes('localStorage') || code.includes('sessionStorage') || code.includes('AsyncStorage'))) {
                // يبدو أن التطبيق يستخدم تخزين غير مشفر
                issues.push({
                    title: 'استخدام تخزين غير مشفر',
                    category: SECURITY_RISKS.M9_INSECURE_DATA_STORAGE,
                    severity: SEVERITY_LEVELS.MEDIUM,
                    description: 'يستخدم التطبيق وسائل تخزين غير مشفرة مثل localStorage/sessionStorage/AsyncStorage. هذا قد يعرض البيانات الحساسة للخطر.',
                    recommendation: 'استخدم وسائل تخزين مشفرة مثل react-native-encrypted-storage أو expo-secure-store للبيانات الحساسة.',
                    filePath,
                    lineNumber: 1, // قد لا يكون دقيقًا، لكنه يشير إلى المشكلة
                    codeSnippet: "استخدام تخزين غير مشفر",
                    type: 'issue'
                });
            }
        } else if (language === 'Dart') {
            // أنماط للتحقق من تخزين الجلسات/المعرفات/الرموز غير الآمن في Flutter
            sessionPatterns.push({
                pattern: /prefs\.setString\s*\(\s*["'](token|auth_token|session|jwt|access_token|user_token|refresh_token|id_token|bearer|auth|api_key|secret|password|pin|credential)["']/gi,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'تخزين بيانات جلسة أو مصادقة حساسة في SharedPreferences غير المشفرة.',
                recommendation: 'استخدم flutter_secure_storage أو مكتبة مشابهة لتخزين البيانات الحساسة.'
            });

            // التحقق من استخدام التخزين الآمن (تعتبر ممارسة جيدة)
            const secureStoragePattern = /flutter_secure_storage|FlutterSecureStorage/g;

            if (!secureStoragePattern.test(code) && code.includes('prefs.setString')) {
                // يبدو أن التطبيق يستخدم SharedPreferences بدلاً من التخزين الآمن
                issues.push({
                    title: 'استخدام SharedPreferences بدلاً من التخزين الآمن',
                    category: SECURITY_RISKS.M9_INSECURE_DATA_STORAGE,
                    severity: SEVERITY_LEVELS.MEDIUM,
                    description: 'يستخدم التطبيق SharedPreferences لتخزين البيانات. للبيانات الحساسة، يجب استخدام flutter_secure_storage لضمان التخزين الآمن.',
                    recommendation: 'استخدم flutter_secure_storage لتخزين البيانات الحساسة مثل رموز المصادقة.',
                    filePath,
                    lineNumber: 1, // قد لا يكون دقيقًا، لكنه يشير إلى المشكلة
                    codeSnippet: "استخدام SharedPreferences بدلاً من التخزين الآمن",
                    type: 'issue'
                });
            }
        } else if (language === 'C#') {
            // أنماط للتحقق من تخزين الجلسات/المعرفات في Xamarin/MAUI
            sessionPatterns.push({
                pattern: /Preferences\.Set\s*\(\s*["'](token|auth_token|session|jwt|access_token|user_token|refresh_token|id_token|bearer|auth|api_key|secret|password|pin|credential)["']/gi,
                severity: SEVERITY_LEVELS.HIGH,
                description: 'تخزين بيانات جلسة أو مصادقة حساسة في Preferences غير المشفرة.',
                recommendation: 'استخدم SecureStorage أو Xamarin.Essentials.SecureStorage لتخزين البيانات الحساسة.'
            });

            // فحص استخدام التخزين الآمن
            const secureStoragePattern = /SecureStorage|Xamarin\.Essentials\.SecureStorage/g;

            if (!secureStoragePattern.test(code) && code.includes('Preferences.Set')) {
                issues.push({
                    title: 'استخدام Preferences بدلاً من التخزين الآمن',
                    category: SECURITY_RISKS.M9_INSECURE_DATA_STORAGE,
                    severity: SEVERITY_LEVELS.MEDIUM,
                    description: 'يستخدم التطبيق Preferences لتخزين البيانات. للبيانات الحساسة، يجب استخدام SecureStorage لضمان التخزين الآمن.',
                    recommendation: 'استخدم Xamarin.Essentials.SecureStorage لتخزين البيانات الحساسة مثل رموز المصادقة.',
                    filePath,
                    lineNumber: 1,
                    codeSnippet: "استخدام Preferences بدلاً من التخزين الآمن",
                    type: 'issue'
                });
            }
        }

        // البحث عن أنماط إدارة الجلسات غير الآمنة
        for (const { pattern, severity, description, recommendation } of sessionPatterns) {
            pattern.lastIndex = 0;

            let match;
            while ((match = pattern.exec(code)) !== null) {
                const lineNumber = this.getLineNumber(code, match.index);
                const codeSnippet = this.extractCodeSnippet(code, match.index, match[0].length);

                issues.push({
                    title: 'إدارة جلسات غير آمنة',
                    category: SECURITY_RISKS.M9_INSECURE_DATA_STORAGE,
                    severity,
                    description,
                    recommendation,
                    filePath,
                    lineNumber,
                    codeSnippet,
                    type: 'issue'
                });
            }
        }

        // فحص مشاكل ترحيل الجلسة
        this.checkForSessionFixation(code, filePath, language, issues);

        // التحقق من أنماط انتهاء صلاحية الجلسة
        this.checkSessionExpiration(code, filePath, language, appType, issues);
    }

    /**
     * فحص مشاكل ترحيل الجلسة (Session Fixation)
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {Array} issues - قائمة المشاكل المكتشفة
     */
    checkForSessionFixation(code, filePath, language, issues) {
        if ((filePath.toLowerCase().includes('auth') ||
                filePath.toLowerCase().includes('login') ||
                filePath.toLowerCase().includes('session')) &&
            (code.includes('login') || code.includes('signin') || code.includes('authenticate'))) {

            // البحث عن أنماط تجديد الجلسة بعد تسجيل الدخول
            let sessionRegenerationFound = false;

            if (language === 'JavaScript' || language === 'TypeScript') {
                sessionRegenerationFound = /regenerate\s*\(|session\.destroy\s*\(|req\.session\.id\s*=\s*generateId\(\)|session\.generate\s*\(/g.test(code);
            } else if (language === 'Java' || language === 'Kotlin') {
                sessionRegenerationFound = /session\.invalidate\s*\(|getSession\s*\(\s*true\s*\)|HttpSession\s+\w+\s*=\s*request\.getSession\s*\(\s*true\s*\)/g.test(code);
            } else if (language === 'PHP') {
                sessionRegenerationFound = /session_regenerate_id|session_destroy/g.test(code);
            }

            if (!sessionRegenerationFound) {
                issues.push({
                    title: 'عدم تجديد معرف الجلسة بعد المصادقة',
                    category: SECURITY_RISKS.M18_WEAK_SESSION_MANAGEMENT,
                    severity: SEVERITY_LEVELS.MEDIUM,
                    description: 'قد تكون هناك مشكلة ترحيل الجلسة (Session Fixation). لم يتم العثور على إعادة إنشاء الجلسة أو تجديد معرف الجلسة بعد عملية المصادقة.',
                    recommendation: 'قم دائمًا بتوليد معرف جلسة جديد بعد تسجيل الدخول الناجح لمنع هجمات ترحيل الجلسة.',
                    filePath,
                    lineNumber: 1,
                    codeSnippet: "عملية مصادقة أو تسجيل دخول",
                    type: 'issue'
                });
            }
        }
    }

    /**
     * فحص آليات انتهاء صلاحية الجلسة
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {string} appType - نوع تطبيق الموبايل
     * @param {Array} issues - قائمة المشاكل المكتشفة
     */

    checkSessionExpiration(code, filePath, language, appType, issues) {
        // البحث عن علامات وجود انتهاء صلاحية الجلسة
        const sessionTimeoutPatterns = [];

        if (language === 'Java' || language === 'Kotlin') {
            sessionTimeoutPatterns.push(/setTimeout|setExpiration|sessionTimeout|idleTimeout|inactivityTimeout|expiresAt|expiryTime|JWT\.verify|token\.verify|setMaxInactiveInterval/gi);
        } else if (language === 'Swift' || language === 'Objective-C') {
            sessionTimeoutPatterns.push(/sessionTimeout|idleTimeout|inactivityTimeout|expiresAt|expiryTime|JWT\.verify|token\.verify|setTimeout|expirationDate/gi);
        } else if (language === 'JavaScript' || language === 'TypeScript') {
            sessionTimeoutPatterns.push(/setTimeout|setInterval|clearTimeout|clearInterval|expiresAt|expiryTime|JWT\.verify|token\.verify|sessionTimeout|idleTimeout|inactivityTimeout|maxAge|cookie\.maxAge|expires/gi);
        } else if (language === 'Dart') {
            sessionTimeoutPatterns.push(/Timer|Duration|dispose|sessionTimeout|idleTimeout|inactivityTimeout|expiresAt|expiryTime|JWT\.verify|token\.verify|expiration|expires|tokenExpiry/gi);
        } else if (language === 'C#') {
            sessionTimeoutPatterns.push(/Timeout|ExpireTime|ExpiresIn|SessionTimeout|TokenLifetime|ExpirationTime|TokenExpiration|ExpireTimeSpan/gi);
        }

        // تجميع جميع الأنماط في تعبير منتظم واحد
        const combinedPattern = new RegExp(sessionTimeoutPatterns.map(p => p.source).join('|'), 'gi');

        // التحقق من وجود آليات انتهاء صلاحية الجلسة
        const hasSessionExpirationMechanisms = combinedPattern.test(code);

        // التحقق من وجود مقارنة للتاريخ/الوقت (قد تكون للتحقق من انتهاء الصلاحية)
        const dateComparisonPattern = /\s*(new Date|Date\.now|currentTimeMillis|System\.currentTimeMillis|Calendar\.getInstance|DateTime\.now|new DateTime|Date\(\)|getTime|currentTime)\s*(?:>|<|>=|<=|==|!=|\.after|\.before|\.compareTo|\.isAfter|\.isBefore)\s*/gi;
        const hasDateComparison = dateComparisonPattern.test(code);

        // إذا كان الملف يحتوي على كلمات مفتاحية تتعلق بالمصادقة أو الجلسات
        if ((code.includes('session') || code.includes('token') || code.includes('auth') ||
                code.includes('login') || code.includes('user') || code.includes('JWT')) &&
            !hasSessionExpirationMechanisms && !hasDateComparison &&
            (filePath.toLowerCase().includes('auth') || filePath.toLowerCase().includes('session') ||
                filePath.toLowerCase().includes('login') || filePath.toLowerCase().includes('user') ||
                filePath.toLowerCase().includes('token'))) {

            // هذا الملف مرتبط بالمصادقة ولكن لا يظهر به آليات انتهاء صلاحية الجلسة
            issues.push({
                title: 'آليات انتهاء صلاحية الجلسة مفقودة',
                category: SECURITY_RISKS.M18_WEAK_SESSION_MANAGEMENT,
                severity: SEVERITY_LEVELS.MEDIUM,
                description: 'لم يتم اكتشاف آليات انتهاء صلاحية الجلسة في ملف متعلق بالمصادقة أو الجلسات. عدم وجود آلية انتهاء صلاحية للجلسة يمكن أن يؤدي إلى استخدام الجلسات لفترة غير محدودة، مما يزيد من مخاطر الاستيلاء على الجلسة.',
                recommendation: 'قم بتنفيذ آليات انتهاء صلاحية الجلسة مثل مهلة عدم النشاط، وتواريخ انتهاء الصلاحية للرموز، وإلغاء صلاحية الجلسة عند تسجيل الخروج. التأكد من تعيين فترة صلاحية معقولة للجلسات والرموز.',
                filePath,
                lineNumber: 1, // قد لا يكون دقيقًا
                codeSnippet: "ملف متعلق بالمصادقة أو الجلسات",
                type: 'issue'
            });
        }

        // فحص للتأكد من عدم وجود فترات طويلة جدًا لانتهاء الصلاحية
        const longExpirationPattern = /expiresIn:\s*["']?(3600000|[0-9]{8,}|86400000|604800000)["']?|maxAge:\s*["']?(3600000|[0-9]{8,}|86400000|604800000)["']?|setMaxInactiveInterval\s*\(\s*([0-9]{6,})\s*\)/g;

        let match;
        while ((match = longExpirationPattern.exec(code)) !== null) {
            const lineNumber = this.getLineNumber(code, match.index);
            const codeSnippet = this.extractCodeSnippet(code, match.index, match[0].length);

            issues.push({
                title: 'فترة انتهاء صلاحية الجلسة طويلة جدًا',
                category: SECURITY_RISKS.M18_WEAK_SESSION_MANAGEMENT,
                severity: SEVERITY_LEVELS.LOW,
                description: 'تم اكتشاف فترة طويلة لانتهاء صلاحية الجلسة أو الرمز. الفترات الطويلة تزيد من مخاطر الاستيلاء على الجلسة.',
                recommendation: 'قم بتقليل فترة انتهاء صلاحية الجلسة أو الرمز. يُنصح باستخدام فترة تتراوح بين 15 دقيقة إلى ساعة للجلسات النشطة، مع إمكانية استخدام رموز تحديث لفترات أطول.',
                filePath,
                lineNumber,
                codeSnippet,
                type: 'issue'
            });
        }

        // فحص خاص برموز JWT
        if (code.includes('jwt') || code.includes('JWT') || code.includes('JsonWebToken')) {
            const noExpirationPattern = /jwt\.sign\s*\(\s*{(?![^}]*exp\s*:)[^}]*}\s*,/g;

            // فحص عدم وجود فترة انتهاء صلاحية في رموز JWT
            if (noExpirationPattern.test(code)) {
                match = noExpirationPattern.exec(code);
                const lineNumber = match ? this.getLineNumber(code, match.index) : 1;
                const codeSnippet = match ? this.extractCodeSnippet(code, match.index, match[0].length) : "توقيع JWT بدون exp";

                issues.push({
                    title: 'رمز JWT بدون فترة انتهاء صلاحية',
                    category: SECURITY_RISKS.M18_WEAK_SESSION_MANAGEMENT,
                    severity: SEVERITY_LEVELS.HIGH,
                    description: 'تم اكتشاف توقيع رمز JWT بدون تحديد فترة انتهاء الصلاحية (exp). الرموز بدون فترة انتهاء صلاحية تظل صالحة للأبد، مما يشكل مخاطر أمنية كبيرة.',
                    recommendation: 'قم دائمًا بتضمين حقل exp (وقت انتهاء الصلاحية) في رموز JWT. استخدم فترات انتهاء صلاحية قصيرة نسبيًا وقم بتنفيذ آلية تحديث الرموز عند الحاجة.',
                    filePath,
                    lineNumber,
                    codeSnippet,
                    type: 'issue'
                });
            }
        }
    }

    /**
     * فحص ثغرات حقن SQL
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {string} appType - نوع تطبيق الموبايل
     * @param {Array} issues - قائمة المشاكل المكتشفة
     */
    checkSQLInjectionVulnerabilities(code, filePath, language, appType, issues) {
        // أنماط للكشف عن ثغرات حقن SQL
        const sqlInjectionPatterns = [
            {
                pattern: /(\bexec(SQL|Query)|executeQuery|rawQuery|db\.raw|\.raw\(|sqlite|SELECT|INSERT|UPDATE|DELETE)(.*)(\+\s*|\.concat\(|`\${|\$\{|\$\(|'\s*\+\s*|"\s*\+\s*)/gi,
                exclude: /(\.(setOnClickListener|setText|setTitle|addListener|addEventListener)\(|SELECT\s*\(|const\s|let\s|var\s|private\s|public\s|protected\s)/g,
                category: this.SECURITY_RISKS?.M4_INSUFFICIENT_VALIDATION || 'SQL Injection',
                severity: this.SEVERITY_LEVELS?.HIGH || 'high',
                description: 'محتمل وجود ثغرة حقن SQL. يتم بناء استعلام SQL باستخدام مدخلات المستخدم مباشرة دون تعقيم مناسب.',
                recommendation: 'استخدم الاستعلامات المُعدّة مسبقاً (Prepared Statements) أو الاستعلامات المعلمة (Parameterized Queries) لفصل البيانات عن الاستعلام. استخدم أيضاً ORM أو أدوات مماثلة للتعامل الآمن مع قواعد البيانات.'
            },
            {
                pattern: /\.execute\(\s*["'`](.*)["'`]\s*\+\s*|\.query\(\s*["'`](.*)["'`]\s*\+\s*|\.raw\(\s*["'`](.*)["'`]\s*\+\s*/gi,
                category: this.SECURITY_RISKS?.M4_INSUFFICIENT_VALIDATION || 'SQL Injection',
                severity: this.SEVERITY_LEVELS?.HIGH || 'high',
                description: 'محتمل وجود ثغرة حقن SQL. يتم دمج مدخلات المستخدم مع استعلام SQL دون تعقيم.',
                recommendation: 'استخدم الاستعلامات المُعدّة مسبقاً (Prepared Statements) أو الاستعلامات المعلمة (Parameterized Queries) بدلاً من دمج السلاسل النصية.'
            }
        ];

        // إضافة أنماط خاصة بلغات البرمجة المختلفة
        if (language === 'Java' || language === 'Kotlin') {
            sqlInjectionPatterns.push({
                pattern: /\bStatement\b(.*)\.execute(Query|Update)?\(\s*.*?\+|\.rawQuery\(\s*.*?\+/gi,
                category: this.SECURITY_RISKS?.M4_INSUFFICIENT_VALIDATION || 'SQL Injection',
                severity: this.SEVERITY_LEVELS?.HIGH || 'high',
                description: 'استخدام Statement.execute مع استعلام مُركّب باستخدام دمج السلاسل النصية يشكل خطر حقن SQL.',
                recommendation: 'استخدم PreparedStatement أو SQLiteDatabase.query مع المعلمات بدلاً من دمج سلاسل نصية في الاستعلام.'
            });
        } else if (language === 'JavaScript' || language === 'TypeScript') {
            sqlInjectionPatterns.push({
                pattern: /\b(knex|sequelize|mongoose|db|conn|connection|database)\.([a-zA-Z]+\.)*(query|raw|execute|run)\(\s*(`|\"|\')/gi,
                category: this.SECURITY_RISKS?.M4_INSUFFICIENT_VALIDATION || 'SQL Injection',
                severity: this.SEVERITY_LEVELS?.MEDIUM || 'medium',
                description: 'استخدام محتمل لطرق الاستعلام المباشر في قواعد البيانات. يجب فحص مدخلات المستخدم بعناية.',
                recommendation: 'استخدم parametrized queries مع مكتبات مثل knex.js أو sequelize أو استخدم ORM للتعامل الآمن مع قواعد البيانات.'
            });
        } else if (language === 'Swift' || language === 'Objective-C') {
            sqlInjectionPatterns.push({
                pattern: /sqlite3_prepare_v2|sqlite3_exec|executeQuery|executeUpdate|NSPredicate\s*.*?stringWithFormat:/gi,
                category: this.SECURITY_RISKS?.M4_INSUFFICIENT_VALIDATION || 'SQL Injection',
                severity: this.SEVERITY_LEVELS?.HIGH || 'high',
                description: 'استخدام واجهات برمجة التطبيقات المباشرة لـ SQLite أو تكوين NSPredicate من نص مُركّب قد يشكل خطر حقن SQL.',
                recommendation: 'استخدم المعلمات المنفصلة مع SQLite، أو استخدم Core Data مع NSPredicate بشكل آمن.'
            });
        } else if (language === 'Dart') {
            sqlInjectionPatterns.push({
                pattern: /rawQuery|rawInsert|rawUpdate|rawDelete|execSQL|execQueryAndReturnInt|execQueryAndReturnBool/gi,
                category: this.SECURITY_RISKS?.M4_INSUFFICIENT_VALIDATION || 'SQL Injection',
                severity: this.SEVERITY_LEVELS?.HIGH || 'high',
                description: 'استخدام طرق raw* للاستعلام في Flutter يمكن أن يؤدي إلى ثغرات حقن SQL إذا تم دمج مدخلات المستخدم بشكل مباشر.',
                recommendation: 'استخدم query و insert و update و delete مع الأرجومنتس المنفصلة بدلاً من الطرق raw*.'
            });
        }

        // فحص أنماط حقن SQL
        for (const { pattern, exclude, category, severity, description, recommendation } of sqlInjectionPatterns) {
            pattern.lastIndex = 0;

            let match;
            while ((match = pattern.exec(code)) !== null) {
                // التحقق من استبعاد بعض النتائج الإيجابية الخاطئة
                if (exclude) {
                    exclude.lastIndex = 0;
                    if (exclude.test(match[0])) {
                        continue;
                    }
                }

                // فحص إضافي لاستبعاد النتائج الإيجابية الخاطئة
                const context = code.substring(Math.max(0, match.index - 50), match.index + match[0].length + 50);
                if (context.includes('escape(') || context.includes('sanitize(') || context.includes('prepared') || context.includes('parameterized')) {
                    continue; // احتمال أن الكود يستخدم معالجة آمنة
                }

                const lineNumber = this.getLineNumber(code, match.index);
                const codeSnippet = this.extractCodeSnippet(code, match.index, match[0].length);

                issues.push({
                    title: 'ثغرة حقن SQL محتملة',
                    category,
                    severity,
                    description,
                    recommendation,
                    filePath,
                    lineNumber,
                    codeSnippet,
                    type: 'issue'
                });
            }
        }
    }

    /**
     * فحص ثغرات حقن التبعيات
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {string} appType - نوع تطبيق الموبايل
     * @param {Array} issues - قائمة المشاكل المكتشفة
     */
    checkVulnerableDependencyInjection(code, filePath, language, appType, issues) {
        // أنماط للكشف عن ثغرات حقن التبعيات
        const dependencyInjectionPatterns = [];

        if (language === 'Java' || language === 'Kotlin') {
            dependencyInjectionPatterns.push({
                pattern: /Class\.forName\(\s*[\w\s+.]*?\)/gi,
                category: this.SECURITY_RISKS?.M4_INSUFFICIENT_VALIDATION || 'Dependency Injection',
                severity: this.SEVERITY_LEVELS?.MEDIUM || 'medium',
                description: 'استخدام Class.forName مع مدخلات متغيرة قد يؤدي إلى ثغرات حقن التبعيات أو التنفيذ العشوائي للتعليمات البرمجية.',
                recommendation: 'تأكد من التحقق بشكل صارم من أسماء الفئات قبل تحميلها ديناميكيًا.'
            });

            dependencyInjectionPatterns.push({
                pattern: /getMethod\(\s*[\w\s+.]*?\)|getDeclaredMethod\(\s*[\w\s+.]*?\)/gi,
                category: this.SECURITY_RISKS?.M4_INSUFFICIENT_VALIDATION || 'Reflection Injection',
                severity: this.SEVERITY_LEVELS?.MEDIUM || 'medium',
                description: 'استخدام getMethod/getDeclaredMethod مع مدخلات متغيرة قد يسمح باستدعاء طرق غير متوقعة.',
                recommendation: 'تأكد من التحقق من أسماء الطرق قبل استخدامها في reflection وتحديد صلاحيات الوصول بشكل مناسب.'
            });
        } else if (language === 'JavaScript' || language === 'TypeScript') {
            dependencyInjectionPatterns.push({
                pattern: /eval\(\s*[\w\s+.]*?\)|new\s+Function\(\s*[\w\s+.]*?\)|setTimeout\(\s*["'`][\w\s+.]*?["'`]/gi,
                category: this.SECURITY_RISKS?.M4_INSUFFICIENT_VALIDATION || 'Code Injection',
                severity: this.SEVERITY_LEVELS?.HIGH || 'high',
                description: 'استخدام eval أو new Function أو setTimeout مع نص قد يؤدي إلى تنفيذ كود غير موثوق.',
                recommendation: 'تجنب استخدام eval أو new Function. استخدم دوالًا بدلاً من النصوص مع setTimeout.'
            });

            dependencyInjectionPatterns.push({
                pattern: /require\(\s*[\w\s+.]*?\)|import\(\s*[\w\s+.]*?\)/gi,
                category: this.SECURITY_RISKS?.M4_INSUFFICIENT_VALIDATION || 'Dependency Injection',
                severity: this.SEVERITY_LEVELS?.MEDIUM || 'medium',
                description: 'استخدام require أو import ديناميكي مع مدخلات متغيرة قد يؤدي إلى تحميل وحدات غير متوقعة.',
                recommendation: 'استخدم قائمة بيضاء للوحدات المسموح بها أو تحقق بشكل صارم من مسارات الوحدات قبل تحميلها.'
            });
        } else if (language === 'Swift' || language === 'Objective-C') {
            dependencyInjectionPatterns.push({
                pattern: /NSClassFromString\(\s*[\w\s+.]*?\)|performSelector:|respondsToSelector:/gi,
                category: this.SECURITY_RISKS?.M4_INSUFFICIENT_VALIDATION || 'Dynamic Method Execution',
                severity: this.SEVERITY_LEVELS?.MEDIUM || 'medium',
                description: 'استخدام NSClassFromString أو performSelector مع مدخلات متغيرة قد يؤدي إلى سلوك غير متوقع.',
                recommendation: 'تحقق بشكل صارم من أسماء الفئات والطرق قبل استخدامها في reflection أو تنفيذ الطرق ديناميكيًا.'
            });
        } else if (language === 'Dart') {
            dependencyInjectionPatterns.push({
                pattern: /Type\s+[\w\s+.]*?\s*=\s*[\w\s+.]*?;|\.runtimeType|\.invoke\(|Isolate\.spawnUri\(/gi,
                category: this.SECURITY_RISKS?.M4_INSUFFICIENT_VALIDATION || 'Dynamic Typing',
                severity: this.SEVERITY_LEVELS?.MEDIUM || 'medium',
                description: 'استخدام الأنواع الديناميكية أو استدعاء الطرق ديناميكيًا قد يؤدي إلى ثغرات إذا لم يتم التحقق بشكل مناسب.',
                recommendation: 'استخدم قائمة محددة من الأنواع المسموح بها وتحقق من الأنواع بشكل آمن قبل استخدامها.'
            });
        }

        // فحص أنماط حقن التبعيات
        for (const { pattern, category, severity, description, recommendation } of dependencyInjectionPatterns) {
            pattern.lastIndex = 0;

            let match;
            while ((match = pattern.exec(code)) !== null) {
                // فحص إضافي لتجنب النتائج الإيجابية الخاطئة
                // التحقق مما إذا كان النمط محاط بجملة التحقق من المدخلات
                const surroundingCode = code.substring(Math.max(0, match.index - 50), match.index + match[0].length + 50);
                const hasValidation = /validate|verify|check|assert|is(Valid|Safe)|sanitize/.test(surroundingCode);
                const isConstant = /["'`][^"'`\r\n${]+["'`]/.test(match[0]); // التحقق من أن القيمة ثابتة

                // تجاهل الحالات التي تكون فيها القيمة ثابتة أو يتم التحقق منها
                if (isConstant || hasValidation) {
                    continue;
                }

                const lineNumber = this.getLineNumber(code, match.index);
                const codeSnippet = this.extractCodeSnippet(code, match.index, match[0].length);

                issues.push({
                    title: 'ثغرة حقن تبعيات محتملة',
                    category,
                    severity,
                    description,
                    recommendation,
                    filePath,
                    lineNumber,
                    codeSnippet,
                    type: 'issue'
                });
            }
        }
    }

    /**
     * فحص ثغرات حقن الأوامر
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {string} appType - نوع تطبيق الموبايل
     * @param {Array} issues - قائمة المشاكل المكتشفة
     */
    checkCommandInjection(code, filePath, language, appType, issues) {
        // أنماط للكشف عن ثغرات حقن الأوامر
        const commandInjectionPatterns = [
            {
                pattern: /(Runtime\.exec|ProcessBuilder|system|popen|exec|spawn|shell_exec)\s*\(\s*(.*)(\+\s*|\.concat\(|`\${|\$\{|\$\(|'\s*\+\s*|"\s*\+\s*)/gi,
                category: this.SECURITY_RISKS?.M4_INSUFFICIENT_VALIDATION || 'Command Injection',
                severity: this.SEVERITY_LEVELS?.CRITICAL || 'critical',
                description: 'محتمل وجود ثغرة حقن أوامر. يتم بناء أمر نظام التشغيل باستخدام مدخلات المستخدم مباشرة دون تعقيم مناسب.',
                recommendation: 'تجنب تنفيذ أوامر نظام التشغيل من مدخلات المستخدم. إذا كان ذلك ضروريًا، استخدم قائمة بيضاء للأوامر المسموح بها وتعقيم المدخلات بشكل مناسب.'
            }
        ];

        // إضافة أنماط خاصة بلغات البرمجة المختلفة
        if (language === 'Java' || language === 'Kotlin') {
            commandInjectionPatterns.push({
                pattern: /ProcessBuilder\([^)]*\)|Runtime\.getRuntime\(\)\.exec\([^)]*\)/gi,
                category: this.SECURITY_RISKS?.M4_INSUFFICIENT_VALIDATION || 'Command Injection',
                severity: this.SEVERITY_LEVELS?.CRITICAL || 'critical',
                description: 'استخدام ProcessBuilder أو Runtime.exec لتنفيذ أوامر نظام التشغيل قد يؤدي إلى ثغرات حقن الأوامر.',
                recommendation: 'تأكد من تصفية وتعقيم جميع المدخلات المستخدمة في بناء أوامر نظام التشغيل. استخدم مصفوفة من الأجزاء بدلاً من سلسلة نصية واحدة.'
            });
        } else if (language === 'JavaScript' || language === 'TypeScript') {
            commandInjectionPatterns.push({
                pattern: /exec\s*\(|execSync\s*\(|spawn\s*\(|spawnSync\s*\(|child_process\.[^)]*\(/gi,
                category: this.SECURITY_RISKS?.M4_INSUFFICIENT_VALIDATION || 'Command Injection',
                severity: this.SEVERITY_LEVELS?.CRITICAL || 'critical',
                description: 'استخدام وحدة child_process لتنفيذ أوامر نظام التشغيل قد يؤدي إلى ثغرات حقن الأوامر.',
                recommendation: 'تجنب استخدام child_process مع مدخلات مستخدم. إذا كان ضروريًا، استخدم execFile أو spawn مع الأرجومنتس المنفصلة وقائمة بيضاء للأوامر.'
            });
        } else if (language === 'Swift' || language === 'Objective-C') {
            commandInjectionPatterns.push({
                pattern: /Process|NSTask|popen\s*\(|system\s*\(|NSPipe/gi,
                category: this.SECURITY_RISKS?.M4_INSUFFICIENT_VALIDATION || 'Command Injection',
                severity: this.SEVERITY_LEVELS?.CRITICAL || 'critical',
                description: 'استخدام Process أو NSTask أو وظائف C مثل system أو popen لتنفيذ أوامر نظام التشغيل قد يؤدي إلى ثغرات حقن الأوامر.',
                recommendation: 'تأكد من تصفية وتعقيم جميع المدخلات. استخدم Process.arguments أو NSTask.arguments بدلاً من سلسلة نصية كاملة.'
            });
        } else if (language === 'Dart') {
            commandInjectionPatterns.push({
                pattern: /Process\.run\s*\(|Process\.start\s*\(|Process\.runSync\s*\(|Process\.startSync\s*\(/gi,
                category: this.SECURITY_RISKS?.M4_INSUFFICIENT_VALIDATION || 'Command Injection',
                severity: this.SEVERITY_LEVELS?.CRITICAL || 'critical',
                description: 'استخدام Process في Dart لتنفيذ أوامر نظام التشغيل قد يؤدي إلى ثغرات حقن الأوامر.',
                recommendation: 'استخدم الأرجومنتس كمصفوفة منفصلة وليس كسلسلة نصية واحدة. تحقق من صحة جميع المدخلات قبل استخدامها.'
            });
        }

        // فحص أنماط حقن الأوامر
        for (const { pattern, category, severity, description, recommendation } of commandInjectionPatterns) {
            pattern.lastIndex = 0;

            let match;
            while ((match = pattern.exec(code)) !== null) {
                // فحص إضافي للتأكد من أن الأمر يستخدم مدخلات متغيرة
                const statementLine = code.substring(Math.max(0, match.index - 50), match.index + match[0].length + 100);

                // تجاهل الأوامر الثابتة التي لا تستخدم مدخلات متغيرة
                if (/exec\s*\(\s*["'`][^"'`${]+["'`]\s*\)/.test(statementLine) ||
                    /\.run\s*\(\s*["'`][^"'`${]+["'`]\s*\)/.test(statementLine)) {
                    continue;
                }

                // تجاهل الحالات التي تحتوي على تحقق مناسب
                if (statementLine.includes('sanitize(') ||
                    statementLine.includes('escapeshell') ||
                    statementLine.includes('validateCommand')) {
                    continue;
                }

                const lineNumber = this.getLineNumber(code, match.index);
                const codeSnippet = this.extractCodeSnippet(code, match.index, match[0].length);

                issues.push({
                    title: 'ثغرة حقن أوامر محتملة',
                    category,
                    severity,
                    description,
                    recommendation,
                    filePath,
                    lineNumber,
                    codeSnippet,
                    type: 'issue'
                });
            }
        }
    }



    /**
     * فحص مشاكل التعامل مع تحميل الملفات
     * @param {string} code - الكود المراد تحليله
     * @param {string} filePath - مسار الملف
     * @param {string} language - لغة البرمجة
     * @param {string} appType - نوع تطبيق الموبايل
     * @param {Array} issues - قائمة المشاكل المكتشفة
     */
    checkFileUploadHandling(code, filePath, language, appType, issues) {
        // أنماط للكشف عن مشاكل تحميل الملفات
        const fileUploadPatterns = [
            {
                pattern: /(upload|file|attachment|document|image|photo|video).*\.(upload|save|write|move|copy|store)/gi,
                exclude: /validate|verify|check|sanitize|secure/gi,
                category: this.SECURITY_RISKS?.M9_INSECURE_DATA_STORAGE || 'Insecure File Upload',
                severity: this.SEVERITY_LEVELS?.MEDIUM || 'medium',
                description: 'محتمل وجود عملية تحميل ملفات دون التحقق الكافي من نوع الملف أو حجمه أو محتواه.',
                recommendation: 'تحقق من امتداد الملف، ونوع المحتوى (MIME type)، وحجم الملف. استخدم أيضًا اسم ملف عشوائي جديد، وتحقق من محتوى الملف بعد التحميل.'
            }
        ];

        // إضافة أنماط خاصة بلغات البرمجة المختلفة
        if (language === 'Java' || language === 'Kotlin') {
            fileUploadPatterns.push({
                pattern: /MultipartFile|FileOutputStream|FileInputStream|new\s+File\(|createTempFile|getOriginalFilename/gi,
                exclude: /(validateFile|checkMimeType|validateExtension|verifyContent)/gi,
                category: this.SECURITY_RISKS?.M9_INSECURE_DATA_STORAGE || 'Insecure File Handling',
                severity: this.SEVERITY_LEVELS?.MEDIUM || 'medium',
                description: 'عمليات التعامل مع الملفات قد تكون غير آمنة إذا لم يتم التحقق بشكل مناسب من نوع الملف وموقع التخزين.',
                recommendation: 'استخدم MultipartFile.getContentType() للتحقق من نوع الملف. لا تعتمد على اسم الملف الأصلي. استخدم مسارًا آمنًا بعيدًا عن المجلد الجذر للتطبيق.'
            });

            fileUploadPatterns.push({
                pattern: /\.transferTo\(|FileUtils\.copyInputStreamToFile|Files\.copy\(|FileOutputStream|FileWriter/gi,
                category: this.SECURITY_RISKS?.M4_INSUFFICIENT_VALIDATION || 'Path Traversal',
                severity: this.SEVERITY_LEVELS?.HIGH || 'high',
                description: 'احتمال وجود ثغرة تجاوز المسار (Path Traversal) عند كتابة ملفات باستخدام مدخلات المستخدم.',
                recommendation: 'تحقق من مسار الملف وتأكد أنه لا يحتوي على تسلسلات مثل "../" أو أحرف خاصة. استخدم Files.getCanonicalPath() واختبر المسار قبل الكتابة.'
            });
        } else if (language === 'JavaScript' || language === 'TypeScript') {
            fileUploadPatterns.push({
                pattern: /multer|formidable|busboy|multipart\/form-data|fs\.write|fs\.create|createWriteStream/gi,
                exclude: /(validateFile|checkMimeType|validateExtension|verifyContent)/gi,
                category: this.SECURITY_RISKS?.M9_INSECURE_DATA_STORAGE || 'Insecure File Upload',
                severity: this.SEVERITY_LEVELS?.MEDIUM || 'medium',
                description: 'استخدام مكتبات تحميل الملفات دون إعدادات التحقق المناسبة قد يؤدي إلى ثغرات أمنية.',
                recommendation: 'تحقق من نوع MIME، وحدد أنواع الملفات المسموح بها صراحة، وحدد الحجم الأقصى للملف. استخدم أيضًا مكتبات مثل file-type للتحقق من نوع الملف الفعلي.'
            });

            fileUploadPatterns.push({
                pattern: /fs\.createWriteStream\(|fs\.writeFile\(|fs\.writeFileSync\(|fs\.appendFile\(|fs\.appendFileSync\(/gi,
                category: this.SECURITY_RISKS?.M4_INSUFFICIENT_VALIDATION || 'Path Traversal',
                severity: this.SEVERITY_LEVELS?.HIGH || 'high',
                description: 'استخدام وظائف كتابة الملفات في Node.js مع مدخلات المستخدم قد يؤدي إلى ثغرات تجاوز المسار.',
                recommendation: 'استخدم وظائف مثل path.normalize() و path.resolve() للتحقق من المسار، وتأكد من أن الملف داخل الدليل المقصود باستخدام path.dirname().'
            });

            fileUploadPatterns.push({
                pattern: /express-fileupload|connect-multiparty|connect-busboy|(?<!limits: *{)|fileSize:/gi,
                category: this.SECURITY_RISKS?.M4_INSUFFICIENT_VALIDATION || 'File Size Limit',
                severity: this.SEVERITY_LEVELS?.MEDIUM || 'medium',
                description: 'قد يؤدي عدم تحديد حد لحجم الملف إلى هجمات حجب الخدمة (DoS).',
                recommendation: 'حدد دائمًا الحد الأقصى لحجم الملف باستخدام خيار limits مع multer أو fileSize مع express-fileupload.'
            });
        } else if (language === 'Swift' || language === 'Objective-C') {
            fileUploadPatterns.push({
                pattern: /UIImagePickerController|NSURLSession\s+.*upload|Data\s+.*write|FileManager|createFile/gi,
                exclude: /(validateFile|checkMimeType|validateExtension|verifyContent)/gi,
                category: this.SECURITY_RISKS?.M9_INSECURE_DATA_STORAGE || 'Insecure File Handling',
                severity: this.SEVERITY_LEVELS?.MEDIUM || 'medium',
                description: 'عمليات التعامل مع الملفات في iOS قد تكون غير آمنة إذا تم تخزينها في مواقع غير آمنة أو بدون تحقق مناسب.',
                recommendation: 'استخدم FileManager.default.urls(for: .documentDirectory, in: .userDomainMask) للحصول على مسار آمن. تحقق من نوع الملف قبل تخزينه.'
            });

            fileUploadPatterns.push({
                pattern: /(?<!let|var).*\.write\(.*\.path|createFile\(atPath:|writeToFile:|writeToURL:/gi,
                category: this.SECURITY_RISKS?.M4_INSUFFICIENT_VALIDATION || 'Path Traversal',
                severity: this.SEVERITY_LEVELS?.MEDIUM || 'medium',
                description: 'كتابة ملفات باستخدام مسارات من مدخلات المستخدم قد تؤدي إلى ثغرات تجاوز المسار.',
                recommendation: 'تأكد من أن المسار داخل مساحة التخزين المخصصة للتطبيق. استخدم FileManager.default.containerURL للحصول على المسار الأساسي الآمن.'
            });
        } else if (language === 'Dart') {
            fileUploadPatterns.push({
                pattern: /File\.|image_picker|file_picker|dio.*upload|http.*MultipartFile|writeAsBytes|writeAsString/gi,
                exclude: /(validateFile|checkMimeType|validateExtension|verifyContent)/gi,
                category: this.SECURITY_RISKS?.M9_INSECURE_DATA_STORAGE || 'Insecure File Handling',
                severity: this.SEVERITY_LEVELS?.MEDIUM || 'medium',
                description: 'استخدام File API أو مكتبات تحميل الملفات دون التحقق المناسب قد يؤدي إلى مشاكل أمنية.',
                recommendation: 'استخدم getApplicationDocumentsDirectory() من package:path_provider للحصول على مسار آمن. تحقق دائمًا من امتداد الملف ونوعه قبل التخزين.'
            });

            fileUploadPatterns.push({
                pattern: /http\.MultipartFile\.fromPath|dio\s+.*upload|FormData\.fromMap/gi,
                category: this.SECURITY_RISKS?.M5_INSECURE_COMMUNICATION || 'Unencrypted File Upload',
                severity: this.SEVERITY_LEVELS?.MEDIUM || 'medium',
                description: 'تحميل الملفات عبر HTTP بدلاً من HTTPS قد يعرض بيانات المستخدم للخطر.',
                recommendation: 'تأكد من استخدام HTTPS لتحميل الملفات. افحص BaseOptions.baseUrl أو Uri لضمان استخدام HTTPS.'
            });
        }

        // فحص أنماط مشاكل تحميل الملفات
        for (const { pattern, exclude, category, severity, description, recommendation } of fileUploadPatterns) {
            pattern.lastIndex = 0;

            let match;
            while ((match = pattern.exec(code)) !== null) {
                // تجاهل الحالات التي تحتوي على تحقق مناسب
                if (exclude) {
                    exclude.lastIndex = 0;
                    const context = code.substring(Math.max(0, match.index - 100), match.index + match[0].length + 100);
                    if (exclude.test(context)) {
                        continue;
                    }
                }

                // فحص إضافي للتحقق من مدى خطورة المشكلة
                const context = code.substring(Math.max(0, match.index - 200), match.index + match[0].length + 200);

                // التحقق من وجود ممارسات جيدة في السياق
                const hasSecurity = /allowedTypes|allowedExtensions|maxFileSize|verifyFile|validat(e|ion)|sanitize|fileType|setMaxSize|secur(e|ity)/.test(context);
                const hasRandomization = /UUID|random|uuid|uniqueId|newFileName/.test(context);
                const hasDirectoryCheck = /getAppDir|sanitizePath|safePath|resolvedPath|isChild|verifyPath/.test(context);

                // إذا كان يبدو أن هناك ممارسات أمنية جيدة، قلل مستوى الخطورة
                let adjustedSeverity = severity;
                if (hasSecurity && hasRandomization && hasDirectoryCheck) {
                    // إذا كانت تطبق كل الممارسات الجيدة، اعتبرها معلومات فقط
                    adjustedSeverity = this.SEVERITY_LEVELS?.INFO || 'info';
                } else if (hasSecurity || hasRandomization || hasDirectoryCheck) {
                    // إذا كانت تطبق بعض الممارسات الجيدة، قلل مستوى الخطورة
                    if (severity === this.SEVERITY_LEVELS?.HIGH || severity === 'high') {
                        adjustedSeverity = this.SEVERITY_LEVELS?.MEDIUM || 'medium';
                    } else if (severity === this.SEVERITY_LEVELS?.MEDIUM || severity === 'medium') {
                        adjustedSeverity = this.SEVERITY_LEVELS?.LOW || 'low';
                    }
                }

                const lineNumber = this.getLineNumber(code, match.index);
                const codeSnippet = this.extractCodeSnippet(code, match.index, match[0].length);

                // إنشاء توصية مخصصة بناءً على نوع المشكلة
                let customRecommendation = recommendation;
                if (context.includes('getOriginalFilename') || context.includes('originalname')) {
                    customRecommendation += " تجنب استخدام اسم الملف الأصلي كما هو، فقد يحتوي على أحرف خاصة أو مسارات نسبية.";
                }
                if (context.includes('createWriteStream') || context.includes('writeFile')) {
                    customRecommendation += " تأكد من استخدام path.resolve() والتحقق من أن المسار النهائي داخل الدليل المسموح به.";
                }

                issues.push({
                    title: match[0].includes('path') || match[0].includes('Path') ? 'ثغرة تجاوز المسار المحتملة' : 'معالجة غير آمنة لتحميل الملفات',
                    category,
                    severity: adjustedSeverity,
                    description,
                    recommendation: customRecommendation,
                    filePath,
                    lineNumber,
                    codeSnippet,
                    type: 'issue'
                });
            }
        }

        // فحص إضافي للتحقق من الممارسات الآمنة
        const securityPractices = [
            {
                pattern: /\.getMimeType\(\)|mime\.lookup\(|mime\.getType\(|contentType|MimeTypeMap|URLConnection\.getContentType/gi,
                type: 'positive',
                category: this.SECURITY_RISKS?.M9_INSECURE_DATA_STORAGE || 'Secure File Upload',
                severity: this.SEVERITY_LEVELS?.INFO || 'info',
                description: 'التحقق من نوع MIME للملف، وهي ممارسة أمنية جيدة.',
                recommendation: 'استمر في التحقق من نوع MIME للملفات المحملة، مع العلم أن هذا ليس كافياً وحده - يجب دمجه مع فحوصات أخرى.'
            },
            {
                pattern: /FilenameUtils\.getExtension|path\.extname|getFileExtension|getPathExtension|fileExtension|extractFileExtension/gi,
                type: 'positive',
                category: this.SECURITY_RISKS?.M9_INSECURE_DATA_STORAGE || 'Secure File Upload',
                severity: this.SEVERITY_LEVELS?.INFO || 'info',
                description: 'التحقق من امتداد الملف، وهي ممارسة أمنية جيدة.',
                recommendation: 'استمر في التحقق من امتدادات الملفات، مع التأكد من استخدام قائمة بيضاء بالامتدادات المسموح بها.'
            },
            {
                pattern: /\.setMaxSize\(|\.size\s*\(\s*\)\s*<|maxFileSize|limits:\s*{\s*fileSize|maxSize|MAX_FILE_SIZE/gi,
                type: 'positive',
                category: this.SECURITY_RISKS?.M9_INSECURE_DATA_STORAGE || 'Secure File Upload',
                severity: this.SEVERITY_LEVELS?.INFO || 'info',
                description: 'تحديد الحد الأقصى لحجم الملف، وهي ممارسة أمنية جيدة.',
                recommendation: 'استمر في تحديد الحد الأقصى لحجم الملفات المحملة لمنع هجمات حجب الخدمة.'
            },
            {
                pattern: /UUID\.randomUUID\(\)|uuid\.v4\(\)|Math\.random\(\)|Random\(\)|SecureRandom\(\)|uniqueFileName|generateUniqueFileName/gi,
                type: 'positive',
                category: this.SECURITY_RISKS?.M9_INSECURE_DATA_STORAGE || 'Secure File Upload',
                severity: this.SEVERITY_LEVELS?.INFO || 'info',
                description: 'استخدام أسماء ملفات عشوائية أو فريدة، وهي ممارسة أمنية جيدة.',
                recommendation: 'استمر في استخدام أسماء ملفات عشوائية أو فريدة لتجنب تخمين أسماء الملفات وتجاوز المسار.'
            }
        ];

        // فحص ممارسات الأمان الإيجابية
        for (const { pattern, type, category, severity, description, recommendation } of securityPractices) {
            pattern.lastIndex = 0;

            let match;
            while ((match = pattern.exec(code)) !== null) {
                const lineNumber = this.getLineNumber(code, match.index);
                const codeSnippet = this.extractCodeSnippet(code, match.index, match[0].length);

                // إضافة إلى قائمة المشكلات فقط إذا كان نوع التقرير "الإيجابي" مطلوبًا
                // عادة، نحن نبلغ فقط عن المشكلات، لكن يمكن تغيير هذا السلوك إذا كان مطلوبًا
                if (type === 'positive' && false) { // تم تعطيله افتراضيًا
                    issues.push({
                        title: 'ممارسة أمنية جيدة في تحميل الملفات',
                        category,
                        severity,
                        description,
                        recommendation,
                        filePath,
                        lineNumber,
                        codeSnippet,
                        type: 'recommendation'
                    });
                }
            }
        }

        // فحص خاص بالممارسات المفقودة
        // في حالة وجود عمليات تحميل ملفات بدون التحقق من الامتداد أو نوع MIME
        if (code.toLowerCase().includes('upload') || code.toLowerCase().includes('file')) {
            const hasUploadPattern = /(upload|file|attachment|document|image|photo|video).*\.(upload|save|write|move|copy|store)/gi.test(code);
            const hasExtensionCheck = /getExtension|extname|fileExtension|extractFileExtension/gi.test(code);
            const hasMimeCheck = /getMimeType|mime\.lookup|mime\.getType|contentType|MimeTypeMap/gi.test(code);
            const hasSizeCheck = /setMaxSize|size\s*\(\s*\)\s*<|maxFileSize|limits:\s*{\s*fileSize|maxSize|MAX_FILE_SIZE/gi.test(code);

            if (hasUploadPattern && (!hasExtensionCheck || !hasMimeCheck || !hasSizeCheck)) {
                // إذا كان هناك تحميل ملفات ولكن تنقص بعض عمليات التحقق
                const missingChecks = [];
                if (!hasExtensionCheck) missingChecks.push("التحقق من امتداد الملف");
                if (!hasMimeCheck) missingChecks.push("التحقق من نوع MIME");
                if (!hasSizeCheck) missingChecks.push("تحديد الحد الأقصى لحجم الملف");

                issues.push({
                    title: 'فحص غير مكتمل لتحميل الملفات',
                    category: this.SECURITY_RISKS?.M9_INSECURE_DATA_STORAGE || 'Incomplete File Upload Validation',
                    severity: this.SEVERITY_LEVELS?.MEDIUM || 'medium',
                    description: `تم العثور على عمليات تحميل ملفات ولكن تنقص بعض عمليات التحقق الهامة: ${missingChecks.join(', ')}.`,
                    recommendation: 'تطبيق جميع عمليات التحقق الأساسية: التحقق من امتداد الملف، ونوع MIME، وتحديد الحد الأقصى لحجم الملف، واستخدام أسماء ملفات عشوائية، والتأكد من المسار الآمن للتخزين.',
                    filePath,
                    lineNumber: 1, // لا نعرف السطر المحدد، لذا نستخدم السطر الأول كافتراضي
                    codeSnippet: '',
                    type: 'issue'
                });
            }
        }
    }

    //-----------------------------update code ----------------------------//

}

module.exports = new SecurityAnalyzer();