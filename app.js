const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

// تحميل متغيرات البيئة
dotenv.config();

// استيراد أداة التسجيل
const logger = require('./utils/logger');

// إنشاء كائن المخزن المؤقت للتقارير
const reportsCache = new Map();
global.reportsCache = reportsCache;
logger.info(`تم تهيئة ذاكرة التخزين المؤقت للتقارير. الحجم الحالي: ${global.reportsCache.size}`);

// استيراد مسارات API
const apiRoutes = require('./routes/api');

// استيراد ميدلوير الخطأ
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

// إنشاء تطبيق Express
const app = express();

// إعدادات محدد معدل الطلبات
const limiter = rateLimit({
    windowMs: 60 * 60 * 1000, // ساعة واحدة
    max: process.env.RATE_LIMIT || 100, // الحد الأقصى للطلبات لكل IP
    message: 'تم تجاوز العدد المسموح به من الطلبات. يرجى المحاولة لاحقًا.'
});

// تطبيق الميدلوير الأساسي
app.use(helmet()); // إضافة رؤوس أمان HTTP
app.use(cors({
    // Add the actual origin your frontend is running from
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost', 'http://127.0.0.1', 'file://', 'null'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json({ limit: '50mb' })); // تحليل طلبات JSON مع زيادة الحد الأقصى
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // تحليل طلبات HTML Form مع زيادة الحد الأقصى
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// إعداد المجلد العام للملفات الثابتة
app.use(express.static(path.join(__dirname, 'public')));

// تطبيق محدد معدل الطلبات على جميع طلبات API
app.use('/api', limiter);

// مسارات API
app.use('/api', apiRoutes);

// مسار الاختبار الأساسي
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// واجهة التوثيق
app.get('/docs', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'docs.html'));
});

// ميدلوير معالجة الطلبات غير الموجودة
app.use(notFound);

// ميدلوير معالجة الأخطاء
app.use(errorHandler);

// ميدلوير مخصص لمعالجة أخطاء محددة لهذا التطبيق
app.use((err, req, res, next) => {
    // إذا كان الخطأ من نوع خاص متعلق بالتحليل، معالجته بشكل محدد
    if (err.name === 'AnalysisError') {
        logger.error(`خطأ في التحليل: ${err.message}`);
        return res.status(400).json({
            success: false,
            message: 'خطأ في التحليل',
            error: err.message
        });
    }

    // للأخطاء الأخرى، استخدام المعالج العام
    next(err);
});

// إذا لم يتم تشغيله كوحدة (أي مباشرة)
if (!module.parent) {
    // بدء تشغيل الخادم
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        logger.info(`الخادم يعمل في البيئة ${process.env.NODE_ENV} على المنفذ ${PORT}`);
        logger.info(`واجهة المستخدم متاحة على: http://localhost:${PORT}`);
        logger.info(`توثيق API متاح على: http://localhost:${PORT}/docs`);
    });

    // تسجيل إحصائيات النظام كل دقيقة
    setInterval(() => {
        const usedMemory = process.memoryUsage();
        logger.info(`📊 إحصائيات النظام: ${JSON.stringify({
            rss: Math.round(usedMemory.rss / 1024 / 1024) + 'MB',
            heapTotal: Math.round(usedMemory.heapTotal / 1024 / 1024) + 'MB',
            heapUsed: Math.round(usedMemory.heapUsed / 1024 / 1024) + 'MB',
            external: Math.round(usedMemory.external / 1024 / 1024) + 'MB',
            uptime: Math.round(process.uptime()) + ' ثانية',
            reportsInCache: global.reportsCache.size
        })}`);
    }, 60000);
}

// تصدير التطبيق والمخزن المؤقت للتقارير
module.exports = { app, reportsCache };