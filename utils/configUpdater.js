// إضافة اعدادات Google Gemini API
module.exports = function updateConfig(config) {
    // إضافة اعدادات Gemini
    config.gemini = {
        apiKey: process.env.GEMINI_API_KEY, // يجب تعيين هذا في ملف .env
        model: 'gemini-2.0-flash', // النموذج المستخدم
        maxTokens: 4000,
        temperature: 0.3,
    };

    return config;
};