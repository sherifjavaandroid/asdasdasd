const winston = require('winston');
const config = require('../config/config');

// تكوين مستويات السجل
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

// تكوين ألوان كل مستوى
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};

// إضافة ألوان إلى winston
winston.addColors(colors);

// تنسيق السجلات
const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`,
    ),
);

// تكوين أهداف السجلات (أين سيتم تخزين السجلات)
const transports = [
    // طباعة جميع السجلات في وحدة التحكم
    new winston.transports.Console(),

    // حفظ سجلات الأخطاء في ملف
    new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
    }),

    // حفظ جميع السجلات في ملف آخر
    new winston.transports.File({ filename: 'logs/all.log' }),
];

// إنشاء كائن المسجل
const logger = winston.createLogger({
    level: config.logs.level || 'info',
    levels,
    format,
    transports,
});

module.exports = logger;