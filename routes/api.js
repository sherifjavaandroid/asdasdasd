const express = require('express');
const router = express.Router();

const { asyncHandler } = require('../middleware/errorMiddleware');
const { validateAnalysisRequest } = require('../middleware/validationMiddleware');
const analysisController = require('../controllers/analysisController');

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
router.get('/reports/:id', asyncHandler(analysisController.getReportById));

/**
 * @route   GET /api/status
 * @desc    التحقق من حالة خدمة API
 * @access  العام
 */
router.get('/status', (req, res) => {
    res.json({
        success: true,
        message: 'API تعمل بشكل طبيعي',
        time: new Date(),
        version: '1.0.0'
    });
});

module.exports = router;