require('dotenv').config();
const configUpdater = require('../utils/configUpdater');

/**
 * اعدادات تكوين التطبيق المركزية
 */
let config = {
    // اعدادات بيئة التشغيل
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5000,

    // اعدادات تسجيل الأحداث
    logs: {
        level: process.env.LOG_LEVEL || 'info',
    },

    // اعدادات GitHub API
    github: {
        token: process.env.GITHUB_TOKEN,
        apiUrl: 'https://api.github.com',
        inferenceEndpoint: 'https://models.inference.ai.azure.com',
        rateLimit: {
            maxRequests: 5000,
            windowMs: 60 * 60 * 1000, // ساعة واحدة
        },
    },

    // اعدادات OpenAI API عبر GitHub
    openai: {
        apiKey: process.env.GITHUB_TOKEN, // استخدام نفس توكن GitHub
        model: 'gpt-4o', // النموذج المستخدم
        maxTokens: 4000,
        temperature: 0.3,
    },

    // اعدادات Deep Seek API عبر GitHub
    deepSeek: {
        apiKey: process.env.GITHUB_TOKEN, // استخدام نفس توكن GitHub
        model: 'DeepSeek-R1', // النموذج المستخدم
        maxTokens: 4000,
        temperature: 0.3,
    },

    // اعدادات Llama API عبر GitHub
    llama: {
        apiKey: process.env.GITHUB_TOKEN, // استخدام نفس توكن GitHub
        model: 'Llama-3.3-70B-Instruct', // النموذج المستخدم
        maxTokens: 4000,
        temperature: 0.3,
    },

    // إعدادات تحليل الكود
    analysis: {
        // أنواع الملفات التي سيتم تحليلها
        fileTypes: {
            flutter: ['.dart'],
            xamarin: ['.cs', '.xaml'],
            nativeAndroid: ['.java', '.kt', '.xml'],
            nativeIOS: ['.swift', '.m', '.h'],
            reactNative: ['.js', '.jsx', '.ts', '.tsx'],
        },

        // الحد الأقصى لحجم الملف (بالبايت) للتحليل
        maxFileSize: 1024 * 1024, // 1 ميغابايت

        // الحد الأقصى لعدد الملفات للتحليل في مستودع واحد
        maxFilesPerRepo: 50,

        // وقت انتهاء عملية التحليل (بالمللي ثانية)
        timeout: 10 * 60 * 1000, // 10 دقائق
    },

    // إعدادات تقييد معدل الطلبات
    rateLimit: {
        windowMs: 60 * 60 * 1000, // ساعة واحدة
        maxRequests: process.env.RATE_LIMIT || 100,
    },
};

// تطبيق إعدادات إضافية
config = configUpdater(config);

module.exports = config;