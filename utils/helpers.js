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
/**
 * تحديد نوع تطبيق الموبايل بناء على محتوى المستودع
 * @param {Array} files - قائمة بالملفات في المستودع
 * @returns {string} نوع تطبيق الموبايل أو 'unknown' إذا لم يتم التعرف عليه
 */
function detectMobileAppType(files) {
    // تجميع جميع مسارات الملفات للتسهيل
    const filePaths = files.map(file => file.path.toLowerCase());
    const fileContents = new Map(files.map(file => [file.path.toLowerCase(), file.content || '']));

    // مُعرِّفات للمنصات المختلفة
    let flutterScore = 0;
    let reactNativeScore = 0;
    let xamarinScore = 0;
    let nativeAndroidScore = 0;
    let nativeIOSScore = 0;

    // البحث عن ملفات Flutter
    for (const path of filePaths) {
        if (path.includes('pubspec.yaml')) {
            const content = fileContents.get(path) || '';
            if (content.includes('flutter:') || content.includes('sdk: flutter')) {
                flutterScore += 10; // مؤشر قوي جدًا
            }
        }
        if (path.endsWith('.dart')) flutterScore += 2;
        if (path.includes('/lib/')) flutterScore += 1;
        if (path.includes('flutter') && !path.includes('flutter_test')) flutterScore += 1;
        if (path.includes('android/app/src') && path.includes('MainActivity')) flutterScore += 1;
        if (path.includes('ios/Runner')) flutterScore += 1;
    }

    // البحث عن ملفات React Native
    for (const path of filePaths) {
        if (path.includes('package.json')) {
            const content = fileContents.get(path) || '';
            if (content.includes('react-native')) {
                reactNativeScore += 10; // مؤشر قوي جدًا
            }
        }
        if (path.includes('app.json') && fileContents.get(path)?.includes('expo')) reactNativeScore += 5;
        if (path.includes('react-native.config.js')) reactNativeScore += 5;
        if (path.includes('index.js') && fileContents.get(path)?.includes('AppRegistry')) reactNativeScore += 5;
        if (path.endsWith('.jsx') || path.endsWith('.tsx')) reactNativeScore += 2;
        if (path.includes('android/app/src/main/java') && path.includes('MainActivity')) reactNativeScore += 1;
        if (path.includes('ios/') && path.includes('AppDelegate')) reactNativeScore += 1;
        if (path.includes('node_modules/react-native')) reactNativeScore += 1;
    }

    // البحث عن ملفات Xamarin
    for (const path of filePaths) {
        if (path.endsWith('.csproj')) {
            const content = fileContents.get(path) || '';
            if (content.includes('Xamarin') || content.includes('<TargetFrameworkVersion>v') || content.includes('Microsoft.NET.Sdk')) {
                xamarinScore += 10; // مؤشر قوي جدًا
            }
        }
        if (path.endsWith('.xaml')) xamarinScore += 3;
        if (path.endsWith('.cs') && (path.includes('/Forms/') || path.includes('/Android/') || path.includes('/iOS/'))) xamarinScore += 2;
        if (path.includes('xamarin') || path.includes('Xamarin')) xamarinScore += 2;
        if (path.includes('MainActivity.cs') || path.includes('AppDelegate.cs')) xamarinScore += 3;
        if (path.includes('Info.plist') && path.includes('iOS')) xamarinScore += 1;
        if (path.includes('AndroidManifest.xml') && path.includes('Android')) xamarinScore += 1;
    }

    // البحث عن ملفات Native Android
    for (const path of filePaths) {
        if (path.includes('androidmanifest.xml')) nativeAndroidScore += 8;
        if (path.includes('build.gradle')) {
            const content = fileContents.get(path) || '';
            if (content.includes('com.android.application') || content.includes('com.android.library')) {
                nativeAndroidScore += 8; // مؤشر قوي
            }
        }
        if (path.includes('/res/layout/')) nativeAndroidScore += 3;
        if (path.includes('/res/values/')) nativeAndroidScore += 2;
        if (path.includes('/src/main/java/') || path.includes('/src/main/kotlin/')) nativeAndroidScore += 3;
        if (path.endsWith('.java') && !path.includes('flutter') && !path.includes('react-native')) nativeAndroidScore += 2;
        if (path.endsWith('.kt') && !path.includes('flutter') && !path.includes('react-native')) nativeAndroidScore += 2;
        if (path.includes('MainActivity') || path.includes('Application.java') || path.includes('Application.kt')) nativeAndroidScore += 2;
    }

    // البحث عن ملفات Native iOS
    for (const path of filePaths) {
        if (path.includes('info.plist') && path.includes('ios/') && !path.includes('flutter') && !path.includes('react-native')) nativeIOSScore += 5;
        if (path.includes('appdelegate.') && !path.includes('flutter') && !path.includes('react-native')) nativeIOSScore += 5;
        if (path.includes('xcodeproj') || path.includes('xcworkspace')) nativeIOSScore += 3;
        if (path.endsWith('.swift') && !path.includes('flutter') && !path.includes('react-native')) nativeIOSScore += 3;
        if (path.endsWith('.m') || path.endsWith('.h')) nativeIOSScore += 2;
        if (path.includes('ViewController') || path.includes('SceneDelegate')) nativeIOSScore += 2;
        if (path.includes('Base.lproj') || path.includes('LaunchScreen.storyboard')) nativeIOSScore += 2;
        if (path.includes('Podfile') && !path.includes('flutter') && !path.includes('react-native')) nativeIOSScore += 3;
    }

    // تعديل النتائج لتفادي التداخل
    // إذا كان هناك ملفات أندرويد و iOS ولكن هناك علامات Flutter/React Native، خفض نتيجة Native
    if (flutterScore > 5 || reactNativeScore > 5) {
        nativeAndroidScore = Math.max(0, nativeAndroidScore - 5);
        nativeIOSScore = Math.max(0, nativeIOSScore - 5);
    }

    // إذا كان هناك علامات Xamarin، خفض نتيجة Native Android/iOS
    if (xamarinScore > 5) {
        nativeAndroidScore = Math.max(0, nativeAndroidScore - 3);
        nativeIOSScore = Math.max(0, nativeIOSScore - 3);
    }

    // جمع النتائج وتحديد النوع الأكثر احتمالاً
    const scores = {
        'flutter': flutterScore,
        'reactNative': reactNativeScore,
        'xamarin': xamarinScore,
        'nativeAndroid': nativeAndroidScore,
        'nativeIOS': nativeIOSScore
    };

    // البحث عن النوع ذو النتيجة الأعلى
    const maxScore = Math.max(...Object.values(scores));

    // إذا كانت النتيجة الأعلى أقل من حد أدنى، اعتبر النوع غير معروف
    if (maxScore < 5) {
        return 'unknown';
    }

    // إرجاع النوع ذو النتيجة الأعلى
    for (const [type, score] of Object.entries(scores)) {
        if (score === maxScore) return type;
    }

    // تأكيد نهائي، إذا وصلنا هنا، فالنوع غير معروف
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
        '.git', '.github', 'node_modules', 'build/generated', 'build/intermediates', '.gradle',
        '.idea', '.vscode', '.dart_tool', '/pods/',
        '.ds_store', 'thumbs.db', '.gitignore', 'license', 'readme',
        'yarn.lock', 'package-lock.json', 'podfile.lock', '.classpath',
        '.project', '.settings', 'gradlew', 'gradlew.bat', '.iml',
        'proguard-rules.pro', '.pbxproj'
    ];

    // لا تستبعد هذه المجلدات لأنها قد تحتوي على ملفات المصدر الهامة
    // 'build', 'dist', '/build/'

    // التحقق من استبعاد المسارات العامة - تحسين الشرط لتجنب استبعاد مجلدات مهمة
    if (excludedPatterns.some(pattern => {
        // تأكد من عدم استبعاد مجلدات المصدر المهمة
        if (pattern === 'build' && (normalizedPath.includes('/build/src/') || normalizedPath.includes('/build/java/'))) {
            return false;
        }
        return normalizedPath.includes(pattern);
    })) {
        return false;
    }

    // للملفات Java و Kotlin، تأكد من تضمينها دائمًا للتحليل في تطبيقات أندرويد الأصلية
    if (appType === 'nativeAndroid') {
        // التحقق بشكل صريح من ملفات Java و Kotlin
        if (extension === '.java' || extension === '.kt') {
            // استثناء ملفات الاختبار فقط
            if (normalizedPath.includes('/test/') || normalizedPath.includes('/androidtest/')) {
                return false;
            }
            return true; // تضمين جميع ملفات Java و Kotlin الأخرى
        }

        // متابعة التحليل لأنواع الملفات الأخرى المهمة لأندرويد
        return extension === '.xml' ||
            normalizedPath.includes('manifest') ||
            normalizedPath.includes('gradle') ||
            normalizedPath.includes('/res/') ||
            normalizedPath.includes('/assets/') ||
            normalizedPath.includes('/src/main/');
    }

    // المنطق الموجود مسبقًا للمنصات الأخرى...
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