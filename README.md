# نظام تحليل أمان وأداء تطبيقات الموبايل

نظام متكامل لتحليل مستودعات GitHub لتطبيقات الموبايل واكتشاف مشاكل الأمان والأداء واستهلاك الذاكرة والبطارية.

## الميزات الرئيسية

* تحليل أمان الكود للكشف عن الثغرات الأمنية المحتملة
* تحليل أداء التطبيق وتحديد نقاط الضعف
* تحليل استخدام الذاكرة واكتشاف التسريبات
* تحليل استهلاك البطارية وتحسين الأداء

## التقنيات المستخدمة

* **Node.js** و **Express** لبناء واجهة API
* **OpenAI API (غير رسمي)** عبر GitHub Token للتحليل العام
* **DeepSeek API (غير رسمي)** عبر GitHub Token لتحليل الأمان
* **GitHub API** للوصول إلى مستودعات الكود

## المتطلبات الأساسية

* Node.js (الإصدار 16 أو أحدث)
* حساب GitHub وتوكن بالصلاحيات المناسبة

## التثبيت

1. استنساخ المستودع:

```bash
git clone https://github.com/username/mobile-app-analyzer.git
cd mobile-app-analyzer
```

2. تثبيت التبعيات:

```bash
npm install
```

3. إنشاء ملف `.env` في المجلد الجذر واضبط المتغيرات المطلوبة:

```bash
# بيئة التشغيل
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# توكن GitHub للوصول إلى GitHub API وخدمات AI
GITHUB_TOKEN=your_github_token_here

# الحد الأقصى لعدد الطلبات
RATE_LIMIT=100
```

## تشغيل التطبيق

* للتشغيل في بيئة التطوير مع إعادة التحميل التلقائي:

```bash
npm run dev
```

* للتشغيل في بيئة الإنتاج:

```bash
npm start
```

## مثال لاستخدام API

### تحليل مستودع GitHub

طلب POST إلى `/api/analyze`:

```json
{
  "repoUrl": "https://github.com/username/sample-mobile-app",
  "options": {
    "analysisTypes": ["security", "performance", "memory", "battery"]
  }
}
```

استجابة ناجحة:

```json
{
  "success": true,
  "message": "تم بدء تحليل المستودع",
  "report": {
    "id": "1234abcd",
    "status": "processing"
  }
}
```

### الحصول على نتائج التحليل

طلب GET إلى `/api/reports/1234abcd`.

## تحميل وتشغيل النماذج المحلية

يتم استخدام نماذج OpenAI وDeepSeek عبر GitHub Token، وذلك بدلاً من استخدام API الرسمي. لتشغيل النماذج، تأكد من إضافة GitHub Token صالح في ملف `.env`.

## ملاحظات هامة

* هذا المشروع يستخدم GitHub Token للوصول إلى نماذج AI المختلفة، وليس عبر API الرسمي للخدمات.
* يتم الوصول إلى النماذج عبر "https://models.inference.ai.azure.com".
* تأكد من امتلاك صلاحيات كافية في توكن GitHub للوصول إلى الخدمات المطلوبة.

## هيكل المشروع

```
mobile-app-analyzer/
├── config/           # ملفات الإعدادات
├── controllers/      # وحدات التحكم بـ API
├── middleware/       # وحدات الوسيط لـ Express
├── models/           # نماذج البيانات
├── routes/           # مسارات API
├── services/         # خدمات تحليل الكود
├── utils/            # أدوات مساعدة
├── app.js            # نقطة الدخول الرئيسية
├── package.json      # تبعيات المشروع
└── .env              # متغيرات البيئة
```

## المساهمة

نرحب بالمساهمات! يرجى إنشاء "fork" وتقديم "pull request" للميزات أو الإصلاحات.

## الترخيص

هذا المشروع مرخص تحت [MIT License](LICENSE).