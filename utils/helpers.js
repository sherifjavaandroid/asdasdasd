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
        file.path.includes('package.json') &&
        (file.content && file.content.includes('react-native'))
    );
    if (hasReactNativeFiles) return 'reactNative';

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
 * التحقق مما إذا كان يجب تحليل الملف بناءً على امتداده والمسار
 * @param {string} filePath - مسار الملف
 * @param {string} appType - نوع تطبيق الموبايل
 * @returns {boolean} صحيح إذا كان يجب تحليل الملف
 */
function shouldAnalyzeFile(filePath, appType) {
    const extension = path.extname(filePath).toLowerCase();

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
            return extension === '.dart' || filePath.includes('pubspec.yaml');
        }

        // في حالة React Native، نحلل فقط ملفات JS/TS
        if (appType === 'reactNative') {
            return ['.js', '.jsx', '.ts', '.tsx'].includes(extension);
        }

        // في حالة Xamarin، نحلل فقط ملفات C# و XAML
        if (appType === 'xamarin') {
            return ['.cs', '.xaml'].includes(extension);
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

    // التحقق من امتدادات الملفات بناء على نوع التطبيق
    const fileTypes = config.analysis.fileTypes;

    switch (appType) {
        case 'flutter':
            return fileTypes.flutter.includes(extension) || filePath.includes('pubspec.yaml');
        case 'xamarin':
            return fileTypes.xamarin.includes(extension);
        case 'nativeAndroid':
            return fileTypes.nativeAndroid.includes(extension);
        case 'nativeIOS':
            return fileTypes.nativeIOS.includes(extension);
        case 'reactNative':
            return fileTypes.reactNative.includes(extension);
        default:
            // إذا كان نوع التطبيق غير معروف، نقوم بتحليل جميع ملفات الكود
            return ['.java', '.kt', '.swift', '.m', '.h', '.cs', '.dart', '.js', '.jsx', '.ts', '.tsx', '.xaml', '.xml'].includes(extension);
    }
}

/**
 * فلترة الملفات بناء على أقصى حجم مسموح به
 * @param {Object} file - معلومات الملف
 * @returns {boolean} صحيح إذا كان حجم الملف مناسب للتحليل
 */
function isFileSizeAcceptable(file) {
    return file.size <= config.analysis.maxFileSize;
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