/**
 * اختبار تطبيق تقنية SSL Pinning في تطبيقات الموبايل
 * يقوم هذا الملف باختبار وجود تقنية SSL Pinning في كود تطبيق موبايل
 */
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const securityAnalyzer = require('../services/securityAnalyzer');

// تعريف أنماط SSL Pinning حسب كل لغة برمجة
const SSL_PINNING_PATTERNS = {
    Android: [
        'CertificatePinner',
        'okhttp3.CertificatePinner',
        'NetworkSecurityConfig',
        'pinCertificates',
        'TrustManagerFactory',
        'X509TrustManager',
        'PinnedCertificateSource',
        'SubjectPublicKeyInfo'
    ],
    iOS: [
        'SSLPinningMode',
        'AFSecurityPolicy',
        'evaluateServerTrust',
        'SecTrustRef',
        'NSURLSession delegate',
        'URLSession delegate',
        'serverTrustPolicy',
        'certificatePinningEnabled',
        'pinCertificates',
        'allowInvalidCertificates'
    ],
    ReactNative: [
        'ssl-pinning',
        'sslPinning',
        'pinning',
        'react-native-ssl-pinning',
        'sslCertificate',
        'fetchWithSSLPinning',
        'trustKit',
        'pinPublicKey'
    ],
    Flutter: [
        'SecurityContext',
        'setTrustedCertificatesBytes',
        'ssl_pinning_plugin',
        'badCertificateCallback',
        'io_client_certificate',
        'HttpClient',
        'add_trusted_certificate'
    ],
    Xamarin: [
        'ServicePointManager.ServerCertificateValidationCallback',
        'CertificateValidationCallback',
        'CustomCertificatePolicy',
        'WebRequestHandler.ServerCertificateValidationCallback',
        'AddCertificateToStore',
        'X509Certificate2'
    ]
};

// أمثلة لكود يستخدم SSL Pinning
const SSL_PINNING_EXAMPLES = {
    Android: `// مثال لتطبيق SSL Pinning في أندرويد باستخدام OkHttp
val certificatePinner = CertificatePinner.Builder()
    .add("example.com", "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
    .build()
val client = OkHttpClient.Builder()
    .certificatePinner(certificatePinner)
    .build()
`,
    iOS: `// مثال لتطبيق SSL Pinning في iOS باستخدام AFNetworking
let serverTrustPolicy = ServerTrustPolicy.pinCertificates(
    certificates: ServerTrustPolicy.certificates(),
    validateCertificateChain: true,
    validateHost: true
)

let serverTrustPolicies = [
    "example.com": serverTrustPolicy
]

let sessionManager = Alamofire.SessionManager(
    configuration: URLSessionConfiguration.default,
    serverTrustPolicyManager: ServerTrustPolicyManager(policies: serverTrustPolicies)
)
`,
    ReactNative: `// مثال لتطبيق SSL Pinning في React Native
import { fetch } from 'react-native-ssl-pinning';

fetch('https://example.com/api/data', {
  method: 'GET',
  timeoutInterval: 10000,
  sslPinning: {
    certs: ['cert1', 'cert2'] // أسماء الملفات في مجلد الموارد
  }
})
`,
    Flutter: `// مثال لتطبيق SSL Pinning في Flutter
final String trustedCertificate = '''
-----BEGIN CERTIFICATE-----
MIIFgTCCBGmgAwIBAgIQOXJEOvkit1HX02wQ3TE1lTANBgkqhkiG9w0BAQwFADB7
...
-----END CERTIFICATE-----
''';

final SecurityContext context = SecurityContext()
  ..setTrustedCertificatesBytes(trustedCertificate.codeUnits);

final HttpClient client = HttpClient(context: context);
`,
    Xamarin: `// مثال لتطبيق SSL Pinning في Xamarin
public class SSLPinningHandler : HttpClientHandler
{
    private readonly X509Certificate2[] _pinnedCertificates;

    public SSLPinningHandler(X509Certificate2[] pinnedCertificates)
    {
        _pinnedCertificates = pinnedCertificates;
        ServerCertificateCustomValidationCallback = ValidateServerCertificate;
    }

    private bool ValidateServerCertificate(HttpRequestMessage requestMessage, X509Certificate2 certificate, X509Chain chain, SslPolicyErrors sslErrors)
    {
        foreach (var pinnedCertificate in _pinnedCertificates)
        {
            if (certificate.Thumbprint.Equals(pinnedCertificate.Thumbprint, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }
        
        return false;
    }
}
`
};

/**
 * اختبار وجود تقنية SSL Pinning في ملف كود
 * @param {string} filePath - مسار ملف الكود
 * @param {string} language - لغة البرمجة
 * @returns {Object} - نتيجة الاختبار
 */
function testSSLPinningInFile(filePath, language) {
    // قراءة محتوى الملف
    let fileContent;
    try {
        fileContent = fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        logger.error(`خطأ في قراءة الملف ${filePath}: ${error.message}`);
        return {
            file: filePath,
            language,
            hasSslPinning: false,
            error: `خطأ في قراءة الملف: ${error.message}`
        };
    }

    // تحديد نمط البحث بناءً على اللغة
    let patterns = [];

    if (language === 'Java' || language === 'Kotlin') {
        patterns = SSL_PINNING_PATTERNS.Android;
    } else if (language === 'Swift' || language === 'Objective-C') {
        patterns = SSL_PINNING_PATTERNS.iOS;
    } else if (language === 'JavaScript' || language === 'TypeScript') {
        patterns = SSL_PINNING_PATTERNS.ReactNative;
    } else if (language === 'Dart') {
        patterns = SSL_PINNING_PATTERNS.Flutter;
    } else if (language === 'C#') {
        patterns = SSL_PINNING_PATTERNS.Xamarin;
    } else {
        // إذا كانت اللغة غير معروفة، نقوم بالبحث في جميع الأنماط
        patterns = [
            ...SSL_PINNING_PATTERNS.Android,
            ...SSL_PINNING_PATTERNS.iOS,
            ...SSL_PINNING_PATTERNS.ReactNative,
            ...SSL_PINNING_PATTERNS.Flutter,
            ...SSL_PINNING_PATTERNS.Xamarin
        ];
    }

    // البحث عن أنماط SSL Pinning في الكود
    const matchingPatterns = [];
    for (const pattern of patterns) {
        if (fileContent.includes(pattern)) {
            matchingPatterns.push(pattern);
        }
    }

    // ملاحظة: يمكننا أيضاً استخدام محلل الأمان المخصص لدينا
    const securityIssues = securityAnalyzer.analyzeSecurityPatterns(fileContent, filePath, language, 'unknown');

    // البحث عن مشكلة "غياب تقنية SSL Pinning" في قائمة المشاكل الأمنية
    const sslPinningIssue = securityIssues.find(issue => issue.title === 'غياب تقنية SSL Pinning');

    return {
        file: filePath,
        language,
        hasSslPinning: matchingPatterns.length > 0,
        matchingPatterns,
        sslPinningIssue: sslPinningIssue || null
    };
}

/**
 * اختبار وجود تقنية SSL Pinning في مجلد
 * @param {string} directoryPath - مسار المجلد
 * @param {string} appType - نوع تطبيق الموبايل
 * @returns {Object} - نتائج الاختبار
 */
function testSSLPinningInDirectory(directoryPath, appType = 'unknown') {
    const results = {
        appType,
        totalFiles: 0,
        networkRelatedFiles: 0,
        filesWithSSLPinning: 0,
        filesWithoutSSLPinning: 0,
        detectedPatterns: {},
        fileResults: []
    };

    try {
        // التحقق مما إذا كان المجلد موجوداً
        if (!fs.existsSync(directoryPath) || !fs.statSync(directoryPath).isDirectory()) {
            throw new Error(`المسار ${directoryPath} ليس مجلداً أو غير موجود`);
        }

        // قراءة جميع الملفات في المجلد بشكل متكرر
        const files = readFilesRecursively(directoryPath);
        results.totalFiles = files.length;

        // تصفية الملفات المتعلقة بالشبكة فقط
        const networkRelatedFiles = files.filter(file =>
            isNetworkRelatedFile(file) && shouldAnalyzeFile(file, appType)
        );
        results.networkRelatedFiles = networkRelatedFiles.length;

        // اختبار وجود تقنية SSL Pinning في كل ملف متعلق بالشبكة
        for (const file of networkRelatedFiles) {
            const fileExtension = path.extname(file).toLowerCase();
            const language = getLanguageFromExtension(fileExtension);

            const fileResult = testSSLPinningInFile(file, language);
            results.fileResults.push(fileResult);

            if (fileResult.hasSslPinning) {
                results.filesWithSSLPinning++;

                // إضافة الأنماط المكتشفة إلى القائمة
                fileResult.matchingPatterns.forEach(pattern => {
                    results.detectedPatterns[pattern] = (results.detectedPatterns[pattern] || 0) + 1;
                });
            } else {
                results.filesWithoutSSLPinning++;
            }
        }

        return results;
    } catch (error) {
        logger.error(`خطأ في اختبار SSL Pinning في المجلد ${directoryPath}: ${error.message}`);
        throw error;
    }
}

/**
 * اختبار وجود تقنية SSL Pinning في مستودع GitHub
 * @param {string} repoUrl - رابط مستودع GitHub
 * @returns {Promise<Object>} - نتائج الاختبار
 */
async function testSSLPinningInGitHubRepo(repoUrl) {
    // هذا الأسلوب سيتم تنفيذه بعد تنزيل المستودع
    logger.info(`بدء فحص تقنية SSL Pinning في مستودع: ${repoUrl}`);

    try {
        // التحقق من وجود GITHUB_TOKEN
        if (!process.env.GITHUB_TOKEN) {
            throw new Error('لم يتم تعيين GITHUB_TOKEN. يرجى تعيين رمز GitHub في متغيرات البيئة أو ملف .env');
        }

        // لتحميل متغيرات البيئة من ملف .env إذا لم تكن محملة بالفعل
        require('dotenv').config();

        // استخدام خدمة GitHub للحصول على معلومات المستودع وملفاته
        const githubService = require('../services/githubService');
        // استخدام الدالة من الملف helpers.js بدلاً من githubService
        const { extractRepoInfo } = require('../utils/helpers');

        // استخراج معلومات المستودع
        const { owner, repo } = extractRepoInfo(repoUrl);
        logger.info(`المالك: ${owner}, المستودع: ${repo}`);

        // استخدام طريقة أبسط لاختبار المستودع باستخدام GitHub API مباشرة
        const axios = require('axios');

        // إعداد العميل مع الرأس المناسب
        const githubClient = axios.create({
            baseURL: 'https://api.github.com',
            headers: {
                'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        // الحصول على معلومات المستودع
        logger.info(`جلب معلومات المستودع: ${owner}/${repo}`);
        const repoInfoResponse = await githubClient.get(`/repos/${owner}/${repo}`);
        const repoInfo = repoInfoResponse.data;

        // الحصول على قائمة الملفات في المستودع
        logger.info(`جلب قائمة الملفات من الفرع: ${repoInfo.default_branch}`);
        const contentResponse = await githubClient.get(`/repos/${owner}/${repo}/git/trees/${repoInfo.default_branch}?recursive=1`);

        // تحويل البيانات إلى تنسيق مناسب للتحليل
        const files = contentResponse.data.tree
            .filter(item => item.type === 'blob')
            .map(item => ({
                path: item.path,
                size: item.size,
                url: item.url,
                content: '' // سيتم ملؤها لاحقًا حسب الحاجة
            }));

        // جلب محتويات الملفات المتعلقة بالشبكة فقط
        logger.info(`تحليل أنواع الملفات وتحديد الملفات المتعلقة بالشبكة`);

        // تصفية الملفات المتعلقة بالشبكة
        const networkRelatedFiles = files.filter(file =>
            isNetworkRelatedFile(file.path)
        );

        // اكتشاف نوع التطبيق
        const appType = detectAppTypeFromFileList(files);

        // إعداد كائن النتائج
        const results = {
            repoUrl,
            appType,
            totalFiles: files.length,
            networkRelatedFiles: networkRelatedFiles.length,
            filesWithSSLPinning: 0,
            filesWithoutSSLPinning: 0,
            detectedPatterns: {},
            sslPinningImplementation: false,
            fileResults: []
        };

        logger.info(`إجمالي الملفات: ${files.length}, ملفات متعلقة بالشبكة: ${networkRelatedFiles.length}`);

        // جلب وتحليل محتوى الملفات المتعلقة بالشبكة
        for (const file of networkRelatedFiles) {
            try {
                const fileExtension = path.extname(file.path).toLowerCase();
                const language = getLanguageFromExtension(fileExtension);

                // جلب محتوى الملف
                logger.info(`جلب محتوى الملف: ${file.path}`);
                const contentResponse = await githubClient.get(file.url);
                // فك تشفير المحتوى من base64
                const content = Buffer.from(contentResponse.data.content, 'base64').toString('utf8');

                // فحص نمط SSL Pinning في محتوى الملف
                const hasSslPinning = checkSSLPinningInContent(content, language);
                results.fileResults.push({
                    file: file.path,
                    language,
                    hasSslPinning: hasSslPinning.implemented,
                    matchingPatterns: hasSslPinning.patterns
                });

                if (hasSslPinning.implemented) {
                    results.filesWithSSLPinning++;

                    // إضافة الأنماط المكتشفة إلى القائمة
                    hasSslPinning.patterns.forEach(pattern => {
                        results.detectedPatterns[pattern] = (results.detectedPatterns[pattern] || 0) + 1;
                    });
                } else {
                    results.filesWithoutSSLPinning++;
                }
            } catch (error) {
                logger.warn(`خطأ في تحليل الملف ${file.path}: ${error.message}`);
                results.fileResults.push({
                    file: file.path,
                    error: error.message
                });
            }
        }

        // تحديد ما إذا كانت تقنية SSL Pinning مطبقة في المشروع
        results.sslPinningImplementation = results.filesWithSSLPinning > 0;

        return results;
    } catch (error) {
        logger.error(`خطأ في اختبار SSL Pinning في مستودع ${repoUrl}: ${error.message}`);
        throw error;
    }
}

/**
 * التحقق من وجود تقنية SSL Pinning في محتوى الملف
 * @param {string} content - محتوى الملف
 * @param {string} language - لغة البرمجة
 * @returns {Object} - نتيجة البحث
 */
function checkSSLPinningInContent(content, language) {
    // تحديد نمط البحث بناءً على اللغة
    let patterns = [];

    if (language === 'Java' || language === 'Kotlin') {
        patterns = SSL_PINNING_PATTERNS.Android;
    } else if (language === 'Swift' || language === 'Objective-C') {
        patterns = SSL_PINNING_PATTERNS.iOS;
    } else if (language === 'JavaScript' || language === 'TypeScript') {
        patterns = SSL_PINNING_PATTERNS.ReactNative;
    } else if (language === 'Dart') {
        patterns = SSL_PINNING_PATTERNS.Flutter;
    } else if (language === 'C#') {
        patterns = SSL_PINNING_PATTERNS.Xamarin;
    } else {
        // إذا كانت اللغة غير معروفة، نقوم بالبحث في جميع الأنماط
        patterns = [
            ...SSL_PINNING_PATTERNS.Android,
            ...SSL_PINNING_PATTERNS.iOS,
            ...SSL_PINNING_PATTERNS.ReactNative,
            ...SSL_PINNING_PATTERNS.Flutter,
            ...SSL_PINNING_PATTERNS.Xamarin
        ];
    }

    // البحث عن أنماط SSL Pinning في الكود
    const matchingPatterns = [];
    for (const pattern of patterns) {
        if (content.includes(pattern)) {
            matchingPatterns.push(pattern);
        }
    }

    return {
        implemented: matchingPatterns.length > 0,
        patterns: matchingPatterns
    };
}

/**
 * التحقق من أن الملف متعلق بالشبكة
 * @param {string} filePath - مسار الملف
 * @returns {boolean} - صحيح إذا كان الملف متعلق بالشبكة
 */
function isNetworkRelatedFile(filePath) {
    const networkRelatedTerms = [
        'network', 'http', 'https', 'ssl', 'tls', 'certificate',
        'connection', 'api', 'service', 'client', 'retrofit', 'okhttp',
        'URLSession', 'AFNetworking', 'Alamofire', 'fetch', 'axios',
        'security', 'communication', 'certificate', 'authentication'
    ];

    // التحقق من أن أسم الملف أو المسار يحتوي على مصطلحات متعلقة بالشبكة
    const lowerFilePath = filePath.toLowerCase();
    return networkRelatedTerms.some(term => lowerFilePath.includes(term));
}

/**
 * قراءة جميع الملفات في مجلد بشكل متكرر
 * @param {string} directoryPath - مسار المجلد
 * @param {Array} fileList - قائمة الملفات (للاستدعاء المتكرر)
 * @returns {Array} - قائمة بجميع مسارات الملفات
 */
function readFilesRecursively(directoryPath, fileList = []) {
    const files = fs.readdirSync(directoryPath);

    files.forEach(file => {
        const filePath = path.join(directoryPath, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            // استبعاد بعض المجلدات غير المهمة
            if (!['node_modules', '.git', 'build', 'dist'].includes(file)) {
                readFilesRecursively(filePath, fileList);
            }
        } else {
            fileList.push(filePath);
        }
    });

    return fileList;
}

/**
 * استنتاج لغة البرمجة من امتداد الملف
 * @param {string} extension - امتداد الملف
 * @returns {string} - لغة البرمجة
 */
function getLanguageFromExtension(extension) {
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
        '.tsx': 'TypeScript'
    };

    return extensionMap[extension] || 'Unknown';
}

/**
 * التحقق من أن الملف يجب تحليله
 * @param {string} filePath - مسار الملف
 * @param {string} appType - نوع تطبيق الموبايل
 * @returns {boolean} - صحيح إذا كان يجب تحليل الملف
 */
function shouldAnalyzeFile(filePath, appType) {
    // استبعاد المجلدات الخاصة بالمنصات في الفريموركس الكروس بلاتفورم
    if (appType === 'flutter' || appType === 'reactNative' || appType === 'xamarin') {
        // استبعاد ملفات المنصات المحددة (android, ios, macos, windows)
        if (filePath.startsWith('android/') ||
            filePath.startsWith('ios/') ||
            filePath.startsWith('macos/') ||
            filePath.startsWith('windows/') ||
            filePath.includes('/android/') ||
            filePath.includes('/ios/') ||
            filePath.includes('/macos/') ||
            filePath.includes('/windows/')) {
            return false;
        }

        // في حالة Flutter، نحلل فقط ملفات Dart
        if (appType === 'flutter') {
            return path.extname(filePath) === '.dart' || filePath.includes('pubspec.yaml');
        }

        // في حالة React Native، نحلل فقط ملفات JS/TS
        if (appType === 'reactNative') {
            const ext = path.extname(filePath);
            return ['.js', '.jsx', '.ts', '.tsx'].includes(ext);
        }

        // في حالة Xamarin، نحلل فقط ملفات C# و XAML
        if (appType === 'xamarin') {
            const ext = path.extname(filePath);
            return ['.cs', '.xaml'].includes(ext);
        }
    }

    // استبعاد ملفات معينة
    const excludedFiles = [
        '.git', '.github', 'node_modules', 'build', 'dist', '.gradle',
        '.idea', '.vscode', '.dart_tool', 'ios/Pods', 'android/build',
        '.DS_Store', 'Thumbs.db', '.gitignore', 'LICENSE', 'README.md',
        'yarn.lock', 'package-lock.json', 'Podfile.lock'
    ];

    if (excludedFiles.some(excluded => filePath.includes(excluded))) {
        return false;
    }

    // التحقق من امتدادات الملفات المدعومة
    const supportedExtensions = [
        '.java', '.kt', '.swift', '.m', '.h', '.cs', '.dart',
        '.js', '.jsx', '.ts', '.tsx', '.xaml', '.xml'
    ];

    return supportedExtensions.includes(path.extname(filePath).toLowerCase());
}

/**
 * اكتشاف نوع التطبيق من قائمة الملفات
 * @param {Array} files - قائمة بالملفات
 * @returns {string} - نوع تطبيق الموبايل
 */
function detectAppTypeFromFileList(files) {
    // التحقق من وجود ملفات Flutter
    const hasFlutterFiles = files.some(file =>
        file.path.includes('pubspec.yaml') ||
        file.path.endsWith('.dart')
    );
    if (hasFlutterFiles) return 'flutter';

    // التحقق من وجود ملفات Xamarin
    const hasXamarinFiles = files.some(file =>
        file.path.includes('.csproj') ||
        file.path.endsWith('.xaml') ||
        file.path.endsWith('.cs')
    );
    if (hasXamarinFiles) return 'xamarin';

    // التحقق من وجود ملفات Native Android
    const hasNativeAndroidFiles = files.some(file =>
        file.path.includes('AndroidManifest.xml') ||
        file.path.endsWith('.java') ||
        file.path.endsWith('.kt')
    );
    if (hasNativeAndroidFiles) return 'nativeAndroid';

    // التحقق من وجود ملفات Native iOS
    const hasNativeIOSFiles = files.some(file =>
        file.path.includes('Info.plist') ||
        file.path.endsWith('.swift') ||
        file.path.endsWith('.m') ||
        file.path.endsWith('.h')
    );
    if (hasNativeIOSFiles) return 'nativeIOS';

    // التحقق من وجود ملفات React Native
    const hasReactNativeFiles = files.some(file =>
        file.path.includes('package.json') ||
        (file.path.endsWith('.js') && file.path.includes('react-native'))
    );
    if (hasReactNativeFiles) return 'reactNative';

    // غير معروف
    return 'unknown';
}

/**
 * تنفيذ اختبار SSL Pinning من سطر الأوامر
 */
function runSSLPinningTest() {
    const args = process.argv.slice(2);

    // التحقق من وجود مسار أو رابط مستودع
    if (args.length === 0) {
        console.error('الرجاء تحديد مسار المجلد أو رابط مستودع GitHub للاختبار');
        process.exit(1);
    }

    const target = args[0];

    // التحقق مما إذا كان الهدف رابط مستودع GitHub
    if (target.startsWith('https://github.com/')) {
        testSSLPinningInGitHubRepo(target)
            .then(results => {
                console.log('نتائج اختبار SSL Pinning في مستودع GitHub:');
                console.log(JSON.stringify(results, null, 2));

                if (results.sslPinningImplementation) {
                    console.log('✅ تم تطبيق تقنية SSL Pinning في المشروع.');
                } else {
                    console.log('❌ لم يتم العثور على تطبيق تقنية SSL Pinning في المشروع.');
                }
            })
            .catch(error => {
                console.error(`خطأ: ${error.message}`);
                process.exit(1);
            });
    } else {
        // افتراض أن الهدف هو مسار مجلد محلي
        try {
            const results = testSSLPinningInDirectory(target);
            console.log('نتائج اختبار SSL Pinning في المجلد المحلي:');
            console.log(JSON.stringify(results, null, 2));

            if (results.filesWithSSLPinning > 0) {
                console.log(`✅ تم تطبيق تقنية SSL Pinning في ${results.filesWithSSLPinning} من ${results.networkRelatedFiles} ملف متعلق بالشبكة.`);
            } else {
                console.log('❌ لم يتم العثور على تطبيق تقنية SSL Pinning في المشروع.');
            }
        } catch (error) {
            console.error(`خطأ: ${error.message}`);
            process.exit(1);
        }
    }
}

/**
 * تصدير الوظائف للاستخدام في ملفات أخرى
 */
module.exports = {
    testSSLPinningInFile,
    testSSLPinningInDirectory,
    testSSLPinningInGitHubRepo,
    checkSSLPinningInContent,
    SSL_PINNING_PATTERNS,
    SSL_PINNING_EXAMPLES,
    runSSLPinningTest
};

// تنفيذ الاختبار إذا تم استدعاء الملف مباشرة
if (require.main === module) {
    runSSLPinningTest();
}