import os

def create_file_structure():
    # قائمة الملفات مع مساراتها النسبية
    files = [
        ".env",                        # ملف البيئة
        ".gitignore",                  # ملف تجاهل Git
        "package.json",                # ملف تكوين NPM
        "README.md",                   # ملف التوثيق
        "app.js",                      # نقطة الدخول الرئيسية
        os.path.join("config", "config.js"),                   # ملف الإعدادات الرئيسي
        os.path.join("controllers", "analysisController.js"),  # تحكم في عملية التحليل
        os.path.join("middleware", "errorMiddleware.js"),      # معالجة الأخطاء
        os.path.join("middleware", "authMiddleware.js"),       # مصادقة المستخدم (اختياري)
        os.path.join("middleware", "validationMiddleware.js"), # التحقق من صحة الطلبات
        os.path.join("models", "Report.js"),                   # نموذج تقرير التحليل
        os.path.join("routes", "api.js"),                      # تعريف مسارات API
        os.path.join("services", "githubService.js"),          # خدمة التفاعل مع GitHub
        os.path.join("services", "openaiService.js"),          # خدمة التفاعل مع OpenAI API
        os.path.join("services", "deepSeekService.js"),        # خدمة التفاعل مع Deep Seek API
        os.path.join("services", "analyzerService.js"),        # خدمة التحليل الرئيسية
        os.path.join("services", "securityAnalyzer.js"),       # محلل الأمان
        os.path.join("services", "performanceAnalyzer.js"),    # محلل الأداء
        os.path.join("services", "memoryAnalyzer.js"),         # محلل استخدام الذاكرة
        os.path.join("services", "batteryAnalyzer.js"),        # محلل استهلاك البطارية
        os.path.join("utils", "logger.js"),                    # تسجيل الأحداث
        os.path.join("utils", "helpers.js"),                   # دوال مساعدة
        os.path.join("utils", "constants.js")                  # الثوابت
    ]

    # إنشاء المجلدات المطلوبة للملفات وإنشاء الملفات الفارغة
    for file_path in files:
        # الحصول على مسار الدليل إذا كان موجوداً
        dir_path = os.path.dirname(file_path)
        if dir_path:
            os.makedirs(dir_path, exist_ok=True)
        # إنشاء الملف الفارغ (أو إعادة كتابته إذا كان موجوداً)
        with open(file_path, "w", encoding="utf-8") as f:
            pass
        print(f"تم إنشاء الملف: {file_path}")

    # إنشاء مجلدات للاختبارات (tests/unit و tests/integration)
    test_dirs = [os.path.join("tests", "unit"), os.path.join("tests", "integration")]
    for test_dir in test_dirs:
        os.makedirs(test_dir, exist_ok=True)
        print(f"تم إنشاء المجلد: {test_dir}")

if __name__ == "__main__":
    create_file_structure()
