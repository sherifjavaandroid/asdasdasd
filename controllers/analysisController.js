
require('dotenv').config();

const analyzerService = require('../services/analyzerService');
const openaiService = require('../services/openaiService');
const logger = require('../utils/logger');

// مخزن مؤقت للتقارير (يمكن استبداله بقاعدة بيانات في الإنتاج)
const reportsCache = new Map();

/**
 * تحليل مستودع GitHub
 * @param {Object} req - كائن الطلب
 * @param {Object} res - كائن الاستجابة
 */
const analyzeRepository = async (req, res) => {
    try {
        const { repoUrl } = req.body;
        const options = req.body.options || {};

        logger.info(`طلب تحليل المستودع: ${repoUrl}`);

        // بدء عملية التحليل
        const report = await analyzerService.analyzeRepository(repoUrl, options);

        // حفظ التقرير في المخزن المؤقت
        reportsCache.set(report.id, report);

        // إعداد استجابة للعميل
        let response;

        if (report.status === 'completed') {
            // إذا اكتمل التحليل، أرسل التقرير الكامل
            response = {
                success: true,
                message: 'تم تحليل المستودع بنجاح',
                report: {
                    id: report.id,
                    repoUrl: report.repoUrl,
                    repoOwner: report.repoOwner,
                    repoName: report.repoName,
                    appType: report.appType,
                    createdAt: report.createdAt,
                    completedAt: report.completedAt,
                    status: report.status,
                    summary: report.summary,
                }
            };
        } else if (report.status === 'failed') {
            // في حالة فشل التحليل
            response = {
                success: false,
                message: 'فشل تحليل المستودع',
                error: report.error.message,
                report: {
                    id: report.id,
                    status: report.status,
                }
            };
        } else {
            // في حالة أخرى (مثل التحليل قيد التقدم)
            response = {
                success: true,
                message: 'تم بدء تحليل المستودع',
                report: {
                    id: report.id,
                    status: report.status,
                }
            };
        }

        res.status(200).json(response);
    } catch (error) {
        logger.error(`خطأ في تحليل المستودع: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء تحليل المستودع',
            error: error.message
        });
    }
};

/**
 * الحصول على تقرير تحليل بواسطة المعرف
 * @param {Object} req - كائن الطلب
 * @param {Object} res - كائن الاستجابة
 */
const getReportById = async (req, res) => {
    try {
        const { id } = req.params;

        // البحث عن التقرير في المخزن المؤقت
        const report = reportsCache.get(id);

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'التقرير غير موجود'
            });
        }

        // توليد ملخص للتقرير إذا كان مكتملًا
        let summary = null;
        if (report.status === 'completed') {
            try {
                summary = await openaiService.generateSummaryReport(report);
            } catch (summaryError) {
                logger.error(`خطأ في توليد الملخص: ${summaryError.message}`);
            }
        }

        res.status(200).json({
            success: true,
            report: report.toJSON(),
            summary
        });
    } catch (error) {
        logger.error(`خطأ في الحصول على التقرير: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء الحصول على التقرير',
            error: error.message
        });
    }
};

module.exports = {
    analyzeRepository,
    getReportById
};