const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

const { asyncHandler } = require('../middleware/errorMiddleware');
const { validateAnalysisRequest } = require('../middleware/validationMiddleware');
const analysisController = require('../controllers/analysisController');

// Middleware para registro de detalles de rutas
const logRouteDetails = (req, res, next) => {
    logger.debug(`Acceso a la ruta: ${req.method} ${req.originalUrl}`);
    if (req.params.id) {
        logger.debug(`ID de informe solicitado: ${req.params.id}`);
    }
    next();
};

/**
 * @route   POST /api/analyze
 * @desc    تحليل مستودع GitHub لتطبيق موبايل
 * @access  العام
 */
router.post('/analyze', validateAnalysisRequest, asyncHandler(analysisController.analyzeRepository));

/**
 * @route   GET /api/reports/:id
 * @desc    الحصول على تقرير تحليل بواسطة المعرف
 * @access  العام
 */
router.get('/reports/:id', logRouteDetails, asyncHandler(analysisController.getReportById));

/**
 * @route   GET /api/analysis-modes
 * @desc    الحصول على أساليب التحليل المتاحة
 * @access  العام
 */
router.get('/analysis-modes', (req, res) => {
    res.json({
        success: true,
        analysisModes: [
            {
                id: 'local',
                name: 'التحليل المحلي فقط',
                description: 'استخدام المحللات البرمجية المحلية فقط، بدون استخدام نماذج الذكاء الاصطناعي.',
                benefits: [
                    'سرعة أعلى في التحليل',
                    'استهلاك أقل للموارد',
                    'عدم الاعتماد على خدمات طرف ثالث',
                    'مناسب للتحليلات السريعة'
                ]
            },
            {
                id: 'local_ai',
                name: 'التحليل المحلي + الذكاء الاصطناعي',
                description: 'الجمع بين المحللات البرمجية المحلية ونماذج الذكاء الاصطناعي المختلفة.',
                benefits: [
                    'تحليل أعمق وأكثر شمولاً',
                    'اكتشاف مشاكل معقدة',
                    'تقديم توصيات متقدمة للإصلاح',
                    'مناسب للتحليلات المتعمقة'
                ],
                aiModels: ['OpenAI', 'DeepSeek', 'Llama', 'Gemini']
            }
        ]
    });
});

/**
 * @route   GET /api/status
 * @desc    التحقق من حالة خدمة API
 * @access  العام
 */
router.get('/status', (req, res) => {
    // Añadir información sobre el caché de reportes para facilitar la depuración
    const reportsCount = analysisController.reportsCache ? analysisController.reportsCache.size : 0;
    const reportIDs = analysisController.reportsCache ? Array.from(analysisController.reportsCache.keys()) : [];

    res.json({
        success: true,
        message: 'API تعمل بشكل طبيعي',
        time: new Date(),
        version: '1.1.0',
        features: {
            localAnalysis: true,
            aiAnalysis: true,
            multiModelSupport: true
        },
        // Información de depuración
        debug: {
            reportsInCache: reportsCount,
            reportIDs: reportIDs.slice(0, 10) // Mostrar solo los primeros 10 para evitar respuestas muy grandes
        }
    });
});

// Registrar las rutas disponibles al iniciar
logger.info('Rutas API configuradas: POST /api/analyze, GET /api/reports/:id, GET /api/analysis-modes, GET /api/status');

module.exports = router;