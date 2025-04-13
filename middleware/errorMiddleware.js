const logger = require('../utils/logger');

/**
 * ميدلوير للتعامل مع الطلبات غير الموجودة
 * @param {Object} req - كائن الطلب
 * @param {Object} res - كائن الاستجابة
 * @param {Function} next - الدالة التالية
 */
const notFound = (req, res, next) => {
    const error = new Error(`المسار غير موجود - ${req.originalUrl}`);
    error.statusCode = 404;
    logger.error(`404 - ${req.originalUrl}`);
    next(error);
};

/**
 * ميدلوير للتعامل مع الأخطاء العامة
 * @param {Object} err - كائن الخطأ
 * @param {Object} req - كائن الطلب
 * @param {Object} res - كائن الاستجابة
 * @param {Function} next - الدالة التالية
 */
const errorHandler = (err, req, res, next) => {
    // تحديد رمز الحالة
    const statusCode = err.statusCode || 500;

    // تسجيل الخطأ
    const logMsg = `${statusCode} - ${err.message}`;
    if (statusCode === 500) {
        logger.error(logMsg);
        logger.error(err.stack);
    } else {
        logger.warn(logMsg);
    }

    // إعداد رسالة الخطأ
    const errorResponse = {
        success: false,
        error: {
            message: err.message,
            stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
        },
    };

    // إرسال الاستجابة
    res.status(statusCode).json(errorResponse);
};

/**
 * معالج أخطاء غير متزامن لتغليف الأخطاء غير المتزامنة
 * @param {Function} fn - دالة غير متزامنة
 * @returns {Function} دالة مغلفة تتعامل مع الأخطاء غير المتزامنة
 */
const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

module.exports = {
    notFound,
    errorHandler,
    asyncHandler,
};