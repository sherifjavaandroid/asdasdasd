const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// تحميل متغيرات البيئة
dotenv.config();

// استيراد مسارات API
const apiRoutes = require('./routes/api');

// استيراد ميدلوير الخطأ
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

// استيراد أداة التسجيل
const logger = require('./utils/logger');

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
app.use(express.json()); // تحليل طلبات JSON
app.use(express.urlencoded({ extended: true })); // تحليل طلبات HTML Form
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// تطبيق محدد معدل الطلبات على جميع طلبات API
app.use('/api', limiter);

// مسارات API
app.use('/api', apiRoutes);

// مسار الاختبار الأساسي
app.get('/', (req, res) => {
    res.json({ message: 'مرحبًا بك في خدمة تحليل تطبيقات الموبايل!' });
});

// ميدلوير معالجة الطلبات غير الموجودة
app.use(notFound);

// ميدلوير معالجة الأخطاء
app.use(errorHandler);

// بدء تشغيل الخادم
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    logger.info(`الخادم يعمل في البيئة ${process.env.NODE_ENV} على المنفذ ${PORT}`);
});

// تسجيل إحصائيات النظام كل دقيقة
// تسجيل إحصائيات النظام كل دقيقة
setInterval(() => {
    const usedMemory = process.memoryUsage();
    logger.info(`📊 إحصائيات النظام: ${JSON.stringify({
        rss: Math.round(usedMemory.rss / 1024 / 1024) + 'MB',
        heapTotal: Math.round(usedMemory.heapTotal / 1024 / 1024) + 'MB',
        heapUsed: Math.round(usedMemory.heapUsed / 1024 / 1024) + 'MB',
        external: Math.round(usedMemory.external / 1024 / 1024) + 'MB',
        uptime: Math.round(process.uptime()) + ' seconds'
    })}`);
}, 60000);
// تصدير التطبيق للاختبارات
module.exports = app;
