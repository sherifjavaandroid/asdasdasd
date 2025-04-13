const { body, validationResult } = require('express-validator');
const { isValidGithubUrl } = require('../utils/helpers');

/**
 * التحقق من صحة طلب تحليل المستودع
 */
const validateAnalysisRequest = [
    // التحقق من وجود رابط المستودع
    body('repoUrl')
        .notEmpty()
        .withMessage('رابط المستودع مطلوب')
        .isString()
        .withMessage('رابط المستودع يجب أن يكون نصًا')
        .custom(isValidGithubUrl)
        .withMessage('رابط المستودع غير صالح. يجب أن يكون رابط مستودع GitHub صالح'),

    // اختياري: الإعدادات المخصصة للتحليل
    body('options')
        .optional()
        .isObject()
        .withMessage('الإعدادات يجب أن تكون كائنًا'),

    // اختياري: تحديد أنواع التحليل
    body('options.analysisTypes')
        .optional()
        .isArray()
        .withMessage('أنواع التحليل يجب أن تكون مصفوفة')
        .custom((value) => {
            const validTypes = ['security', 'performance', 'memory', 'battery'];
            return value.every(type => validTypes.includes(type));
        })
        .withMessage('أنواع التحليل غير صالحة. القيم المسموح بها هي: security, performance, memory, battery'),

    // التحقق من نتائج التحقق وإرسال أي أخطاء
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array().map(error => ({
                    param: error.param,
                    message: error.msg
                }))
            });
        }
        next();
    }
];

module.exports = {
    validateAnalysisRequest
};