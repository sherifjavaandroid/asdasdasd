require('dotenv').config();

const analyzerService = require('../services/analyzerService');
const openaiService = require('../services/openaiService');
const logger = require('../utils/logger');

// Acceder al caché global definido en app.js
const reportsCache = global.reportsCache;

/**
 * تحليل مستودع GitHub
 * @param {Object} req - كائن الطلب
 * @param {Object} res - كائن الاستجابة
 */
const analyzeRepository = async (req, res) => {
    try {
        const { repoUrl } = req.body;
        const options = req.body.options || {};

        // استخراج أسلوب التحليل أو استخدام القيمة الافتراضية (محلي + ذكاء اصطناعي)
        const analysisMode = options.analysisMode || 'local_ai';

        logger.info(`طلب تحليل المستودع: ${repoUrl} بأسلوب: ${analysisMode === 'local' ? 'محلي فقط' : 'محلي + ذكاء اصطناعي'}`);

        // بدء عملية التحليل مع تمرير خيارات التحليل
        const report = await analyzerService.analyzeRepository(repoUrl, options);

        // حفظ التقرير في المخزن المؤقت
        global.reportsCache.set(report.id, report);
        logger.info(`تم حفظ التقرير في الذاكرة المؤقتة بمعرف: ${report.id}, عدد التقارير المخزنة: ${global.reportsCache.size}`);

        // إعداد استجابة للعميل
        let response;

        if (report.status === 'completed') {
            // إذا اكتمل التحليل، أرسل التقرير الكامل
            response = {
                success: true,
                message: 'تم تحليل المستودع بنجاح',
                analysisMode: analysisMode, // إضافة أسلوب التحليل المستخدم للاستجابة
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
                analysisMode: analysisMode, // إضافة أسلوب التحليل المستخدم للاستجابة
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

        // طباعة معلومات تصحيح للمساعدة في تشخيص المشكلة
        logger.info(`محاولة الوصول إلى التقرير بمعرف: ${id}`);
        logger.info(`عدد التقارير المخزنة حاليًا: ${reportsCache.size}`);

        if (reportsCache.size > 0) {
            logger.info(`معرفات التقارير المتاحة: ${Array.from(reportsCache.keys()).join(', ')}`);
        }

        // البحث عن التقرير في المخزن المؤقت
        const report = global.reportsCache.get(id);


        if (!report) {
            logger.warn(`التقرير غير موجود: ${id}`);
            return res.status(404).json({
                success: false,
                message: 'التقرير غير موجود'
            });
        }

        logger.info(`تم العثور على التقرير بمعرف: ${id}, الحالة: ${report.status}`);

        // توليد ملخص للتقرير إذا كان مكتملًا وطريقة التحليل تتضمن الذكاء الاصطناعي
        let summary = null;
        if (report.status === 'completed') {
            // استخراج أسلوب التحليل من البيانات المحفوظة أو افتراض أنه محلي + ذكاء اصطناعي
            const analysisMode = report.analysisMode || 'local_ai';

            // فقط إذا كان التحليل يتضمن الذكاء الاصطناعي، نقوم بتوليد ملخص
            if (analysisMode === 'local_ai') {
                try {
                    summary = await openaiService.generateSummaryReport(report);
                } catch (summaryError) {
                    logger.error(`خطأ في توليد الملخص: ${summaryError.message}`);
                }
            } else {
                // في حالة التحليل المحلي فقط، نقدم ملخصًا بسيطًا
                summary = "تم إجراء التحليل المحلي فقط، لا يوجد ملخص معتمد على الذكاء الاصطناعي.";
            }
        }

        // التأكد من أن التقرير لديه دالة toJSON
        const reportData = typeof report.toJSON === 'function' ? report.toJSON() : report;

        res.status(200).json({
            success: true,
            report: reportData,
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
    getReportById,
    reportsCache // Exponer el caché para poder acceder desde otros lugares
};