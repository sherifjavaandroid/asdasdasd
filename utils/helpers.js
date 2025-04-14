const path = require('path');
const config = require('../config/config');

/**
 * مجموعة من الدوال المساعدة للمشروع
 */

/**
 * تحديد نوع تطبيق الموبايل بناء على محتوى المستودع
 * @param {Array} files - قائمة بالملفات في المستودع
 * @returns {string} نوع تطبيق الموبايل أو 'unknown' إذا لم يتم التعرف عليه
 */
function detectMobileAppType(files) {
    // تجميع جميع مسارات الملفات للتسهيل
    const filePaths = files.map(file => file.path.toLowerCase());

    // التحقق من وجود ملفات Flutter
    const hasFlutterFiles = filePaths.some(path =>
        path.includes('pubspec.yaml') ||
        path.endsWith('.dart') ||
        path.includes('/lib/') ||
        path.includes('flutter')
    );

    if (hasFlutterFiles) {
        return 'flutter';
    }

    // التحقق من وجود ملفات React Native
    const hasReactNativeFiles = filePaths.some(path =>
        (path.includes('package.json') && files.find(f => f.path === path)?.content?.includes('react-native')) ||
        path.includes('react-native.config.js') ||
        path.includes('app.json') ||
        (path.includes('index.js') && files.find(f => f.path === path)?.content?.includes('AppRegistry'))
    );

    if (hasReactNativeFiles) {
        return 'reactNative';
    }

    // التحقق من وجود ملفات Xamarin
    const hasXamarinFiles = filePaths.some(path =>
        path.includes('.csproj') ||
        path.endsWith('.xaml') ||
        path.includes('xamarin') ||
        (path.endsWith('.cs') && (path.includes('/forms/') || path.includes('/android/') || path.includes('/ios/')))
    );

    if (hasXamarinFiles) {
        return 'xamarin';
    }

    // التحقق من وجود ملفات Native Android
    const hasNativeAndroidFiles = filePaths.some(path =>
        path.includes('androidmanifest.xml') ||
        path.includes('/res/layout/') ||
        path.includes('/res/values/') ||
        path.includes('build.gradle') ||
        path.endsWith('.java') ||
        path.endsWith('.kt')
    );

    if (hasNativeAndroidFiles) {
        return 'nativeAndroid';
    }

    // التحقق من وجود ملفات Native iOS
    const hasNativeIOSFiles = filePaths.some(path =>
        path.includes('info.plist') ||
        path.includes('appdelegate.') ||
        path.includes('xcodeproj') ||
        path.includes('xcworkspace') ||
        path.endsWith('.swift') ||
        path.endsWith('.m') ||
        path.endsWith('.h')
    );

    if (hasNativeIOSFiles) {
        return 'nativeIOS';
    }

    // غير معروف
    return 'unknown';
}

/**
 * التحقق من صحة رابط مستودع GitHub
 * @param {string} repoUrl - رابط المستودع
 * @returns {boolean} صحيح إذا كان الرابط صالحًا
 */
function isValidGithubUrl(repoUrl) {
    const githubUrlPattern = /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+\/?$/;
    return githubUrlPattern.test(repoUrl);
}

/**
 * استخراج اسم المستخدم واسم المستودع من رابط GitHub
 * @param {string} repoUrl - رابط المستودع
 * @returns {Object} كائن يحتوي على اسم المستخدم واسم المستودع
 */
function extractRepoInfo(repoUrl) {
    const url = new URL(repoUrl);
    const pathParts = url.pathname.split('/').filter(part => part.length > 0);

    if (pathParts.length < 2) {
        throw new Error('رابط GitHub غير صالح');
    }

    return {
        owner: pathParts[0],
        repo: pathParts[1]
    };
}

/**
 * التحقق مما إذا كان يجب تحليل الملف بناءً على امتداده والمسار ونوع التطبيق
 * @param {string} filePath - مسار الملف
 * @param {string} appType - نوع تطبيق الموبايل
 * @returns {boolean} صحيح إذا كان يجب تحليل الملف
 */
function shouldAnalyzeFile(filePath, appType) {
    // تحويل المسار إلى حروف صغيرة للمقارنة بشكل أفضل
    const normalizedPath = filePath.toLowerCase();
    const extension = path.extname(normalizedPath).toLowerCase();

    // استبعاد الملفات والمجلدات العامة
    const excludedPatterns = [
        '.git', '.github', 'node_modules', 'build', 'dist', '.gradle',
        '.idea', '.vscode', '.dart_tool', '/pods/', '/build/',
        '.ds_store', 'thumbs.db', '.gitignore', 'license', 'readme',
        'yarn.lock', 'package-lock.json', 'podfile.lock', '.classpath',
        '.project', '.settings', 'gradlew', 'gradlew.bat', '.iml',
        'proguard-rules.pro', '.pbxproj'
    ];

    // التحقق من استبعاد المسارات العامة
    if (excludedPatterns.some(pattern => normalizedPath.includes(pattern))) {
        return false;
    }

    // الملفات المدعومة حسب نوع التطبيق
    switch (appType) {
        case 'flutter':
            // تحليل ملفات Flutter والمرتبطة بها
            return extension === '.dart' ||
                normalizedPath.includes('pubspec.yaml') ||
                normalizedPath.includes('flutter') ||
                (extension === '.yaml' && normalizedPath.includes('flutter')) ||
                (extension === '.json' && normalizedPath.includes('flutter'));

        case 'reactNative':
            // تحليل ملفات React Native الأساسية
            return ['.js', '.jsx', '.ts', '.tsx'].includes(extension) ||
                (normalizedPath.includes('package.json') && !normalizedPath.includes('node_modules')) ||
                normalizedPath.includes('app.json') ||
                normalizedPath.includes('react-native.config.js');

        case 'xamarin':
            // تحليل ملفات Xamarin الأساسية
            return ['.cs', '.xaml', '.xml'].includes(extension) ||
                normalizedPath.includes('.csproj') ||
                normalizedPath.includes('manifest') ||
                normalizedPath.includes('info.plist');

        case 'nativeAndroid':
            // تحليل ملفات Android الأساسية
            return ['.java', '.kt', '.xml'].includes(extension) ||
                normalizedPath.includes('manifest') ||
                normalizedPath.includes('gradle') ||
                normalizedPath.includes('/res/') ||
                normalizedPath.includes('/assets/');

        case 'nativeIOS':
            // تحليل ملفات iOS الأساسية
            return ['.swift', '.m', '.h', '.storyboard', '.xib'].includes(extension) ||
                normalizedPath.includes('info.plist') ||
                normalizedPath.includes('appdelegate') ||
                normalizedPath.includes('/assets/');

        default:
            // إذا كان النوع غير معروف، نحلل الملفات الشائعة في تطبيقات الموبايل
            const commonExtensions = [
                '.java', '.kt', '.swift', '.m', '.h', '.cs', '.dart',
                '.js', '.jsx', '.ts', '.tsx', '.xaml', '.xml', '.gradle',
                '.plist', '.yaml', '.json'
            ];

            return commonExtensions.includes(extension) ||
                normalizedPath.includes('manifest') ||
                normalizedPath.includes('info.plist') ||
                normalizedPath.includes('build.gradle') ||
                normalizedPath.includes('pubspec.yaml') ||
                normalizedPath.includes('package.json');
    }
}

/**
 * فلترة الملفات بناء على أقصى حجم مسموح به
 * @param {Object} file - معلومات الملف
 * @returns {boolean} صحيح إذا كان حجم الملف مناسب للتحليل
 */
function isFileSizeAcceptable(file) {
    // زيادة الحد الأقصى لحجم الملف للملفات المهمة
    const maxSize = file.path.toLowerCase().includes('manifest') ||
    file.path.toLowerCase().includes('gradle') ||
    file.path.toLowerCase().includes('pubspec.yaml') ||
    file.path.toLowerCase().includes('package.json')
        ? config.analysis.maxFileSize * 2 // مضاعفة الحد للملفات المهمة
        : config.analysis.maxFileSize;

    return file.size <= maxSize;
}

/**
 * تحويل حجم الملف إلى تنسيق مقروء
 * @param {number} bytes - حجم الملف بالبايت
 * @returns {string} الحجم بتنسيق مقروء
 */
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

/**
 * تحويل مستوى الخطورة إلى قيمة رقمية للترتيب
 * @param {string} severity - مستوى الخطورة
 * @returns {number} قيمة رقمية لمستوى الخطورة
 */
function severityToNumber(severity) {
    const severityMap = {
        'critical': 4,
        'high': 3,
        'medium': 2,
        'low': 1,
        'info': 0
    };
    return severityMap[severity.toLowerCase()] || 0;
}

/**
 * توليد معرف فريد بناء على التاريخ والوقت الحالي
 * @returns {string} معرف فريد
 */
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

module.exports = {
    detectMobileAppType,
    isValidGithubUrl,
    extractRepoInfo,
    shouldAnalyzeFile,
    isFileSizeAcceptable,
    formatFileSize,
    severityToNumber,
    generateUniqueId
};