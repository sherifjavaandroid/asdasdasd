/**
 * سكريبت مقارنة نماذج تحليل الكود
 * يقوم بتحليل نفس الملف باستخدام جميع نماذج التحليل للمقارنة بينها
 */
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const openaiService = require('../services/openaiService');
const deepSeekService = require('../services/deepSeekService');
const llamaService = require('../services/llamaService');
const geminiService = require('../services/geminiService');

// نوع التحليل المطلوب (security, performance, memory, battery)
const ANALYSIS_TYPE = process.argv[2] || 'security';
// نوع التطبيق
const APP_TYPE = 'reactNative';
// لغة البرمجة
const LANGUAGE = 'JavaScript';

// رمز مثال للاختبار
const SAMPLE_CODE = `
function getUserData(userId) {
  // استخدام اتصال HTTP غير مشفر
  const url = 'http://api.example.com/users/' + userId;
  
  // طلب HTTP غير آمن
  fetch(url)
    .then(response => response.json())
    .then(data => {
      // تخزين بيانات المستخدم في التخزين المحلي بدون تشفير
      localStorage.setItem('user_token', data.token);
      localStorage.setItem('user_data', JSON.stringify(data));
      
      // عرض معلومات المستخدم
      document.getElementById('username').innerText = data.username;
      
      // تسجيل معلومات المستخدم
      console.log('تم تسجيل دخول المستخدم: ' + data.username);
      console.log('معرف المستخدم: ' + data.id);
      console.log('رمز API: ' + data.apiKey);
    });
}

// استخدام تقنية eval لتنفيذ سلسلة نصية كشيفرة
function executeUserCommand(command) {
  // خطر أمني: تنفيذ كود من مدخلات المستخدم
  eval(command);
}

// تحديث موقع المستخدم كل 5 ثوانٍ
setInterval(() => {
  // استدعاء خدمة تحديد الموقع باستمرار يستهلك البطارية
  navigator.geolocation.getCurrentPosition(position => {
    sendLocationToServer(position.coords);
  });
}, 5000);

// إرسال بيانات الموقع للخادم
function sendLocationToServer(coords) {
  // استخدام اتصال HTTP غير مشفر
  fetch('http://api.example.com/update-location', {
    method: 'POST',
    body: JSON.stringify({
      lat: coords.latitude,
      lng: coords.longitude,
      // تخزين معلومات حساسة في كود ثابت
      apiKey: 'sk_live_12345abcdef6789',
      userId: localStorage.getItem('user_id')
    })
  });
}

// معالجة صور المستخدم في الخيط الرئيسي
function processUserImages(images) {
  const results = [];
  // حلقة كبيرة ستؤثر على أداء الخيط الرئيسي
  for (let i = 0; i < images.length; i++) {
    // عمليات معالجة مكثفة في الخيط الرئيسي
    const processedImage = heavyImageProcessing(images[i]);
    results.push(processedImage);
  }
  return results;
}

// تنفيذ عمليات حسابية مكثفة
function heavyImageProcessing(image) {
  // محاكاة عملية معالجة مكثفة
  let result = image;
  for (let i = 0; i < 10000; i++) {
    for (let j = 0; j < 1000; j++) {
      result += Math.sin(i) * Math.cos(j);
    }
  }
  return result;
}
`;

/**
 * تحليل الكود باستخدام جميع نماذج التحليل
 */
async function compareModels() {
    logger.info(`====== بدء المقارنة لنوع التحليل: ${ANALYSIS_TYPE} ======`);

    try {
        // إنشاء مجلد للنتائج إذا لم يكن موجوداً
        const resultsDir = path.join(__dirname, 'results');
        if (!fs.existsSync(resultsDir)) {
            fs.mkdirSync(resultsDir, { recursive: true });
        }

        // تحليل الكود باستخدام OpenAI
        logger.info("بدء تحليل الكود باستخدام OpenAI...");
        const openaiStartTime = Date.now();
        const openaiResults = await openaiService.analyzeCode(SAMPLE_CODE, LANGUAGE, ANALYSIS_TYPE, APP_TYPE);
        const openaiDuration = (Date.now() - openaiStartTime) / 1000;
        logger.info(`اكتمل تحليل OpenAI في ${openaiDuration.toFixed(2)} ثانية`);

        // تحليل الكود باستخدام Google Gemini
        logger.info("بدء تحليل الكود باستخدام Google Gemini...");
        const geminiStartTime = Date.now();
        const geminiResults = await geminiService.analyzeCode(SAMPLE_CODE, LANGUAGE, ANALYSIS_TYPE, APP_TYPE);
        const geminiDuration = (Date.now() - geminiStartTime) / 1000;
        logger.info(`اكتمل تحليل Gemini في ${geminiDuration.toFixed(2)} ثانية`);

        // تحليل الكود باستخدام DeepSeek
        logger.info("بدء تحليل الكود باستخدام DeepSeek...");
        let deepSeekResults;
        const deepSeekStartTime = Date.now();
        try {
            if (ANALYSIS_TYPE === 'security') {
                deepSeekResults = await deepSeekService.analyzeCodeSecurity(SAMPLE_CODE, LANGUAGE, APP_TYPE);
            } else {
                // استخدام تحليل محاكي لـ DeepSeek لأنواع التحليل الأخرى
                deepSeekResults = {
                    findings: [{
                        title: `تحليل ${ANALYSIS_TYPE} محاكى`,
                        description: `DeepSeek غير متاح لنوع التحليل ${ANALYSIS_TYPE}`,
                        severity: "info"
                    }],
                    summary: `تحليل ${ANALYSIS_TYPE} محاكى لـ DeepSeek`
                };
            }
        } catch (error) {
            logger.error(`خطأ في تحليل DeepSeek: ${error.message}`);
            deepSeekResults = {
                findings: [{
                    title: "خطأ في تحليل الكود",
                    description: `حدث خطأ أثناء تحليل الكود: ${error.message}`,
                    severity: "info"
                }],
                summary: "حدث خطأ أثناء تحليل الكود باستخدام DeepSeek"
            };
        }
        const deepSeekDuration = (Date.now() - deepSeekStartTime) / 1000;
        logger.info(`اكتمل تحليل DeepSeek في ${deepSeekDuration.toFixed(2)} ثانية`);

        // تحليل الكود باستخدام Llama
        logger.info("بدء تحليل الكود باستخدام Llama...");
        const llamaStartTime = Date.now();
        const llamaResults = await llamaService.analyzeCode(SAMPLE_CODE, LANGUAGE, ANALYSIS_TYPE, APP_TYPE);
        const llamaDuration = (Date.now() - llamaStartTime) / 1000;
        logger.info(`اكتمل تحليل Llama في ${llamaDuration.toFixed(2)} ثانية`);

        // إنشاء تقرير مقارنة
        const comparisonReport = {
            analysisMeta: {
                analysisType: ANALYSIS_TYPE,
                language: LANGUAGE,
                appType: APP_TYPE,
                timestamp: new Date().toISOString()
            },
            models: {
                openai: {
                    duration: openaiDuration,
                    issuesCount: openaiResults.findings?.length || 0,
                    results: openaiResults
                },
                gemini: {
                    duration: geminiDuration,
                    issuesCount: geminiResults.findings?.length || 0,
                    results: geminiResults
                },
                deepSeek: {
                    duration: deepSeekDuration,
                    issuesCount: deepSeekResults.findings?.length || 0,
                    results: deepSeekResults
                },
                llama: {
                    duration: llamaDuration,
                    issuesCount: llamaResults.findings?.length || 0,
                    results: llamaResults
                }
            }
        };

        // حفظ التقرير في ملف
        const outputPath = path.join(resultsDir, `${ANALYSIS_TYPE}_comparison_${Date.now()}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(comparisonReport, null, 2));

        logger.info(`====== اكتملت المقارنة ======`);
        logger.info(`تم حفظ النتائج في: ${outputPath}`);

        // طباعة ملخص المقارنة
        console.log("\n===== ملخص المقارنة =====");
        console.log(`نوع التحليل: ${ANALYSIS_TYPE}`);
        console.log(`لغة البرمجة: ${LANGUAGE}`);
        console.log(`نوع التطبيق: ${APP_TYPE}`);
        console.log("\nعدد المشكلات المكتشفة:");
        console.log(`- OpenAI:   ${openaiResults.findings?.length || 0} (${openaiDuration.toFixed(2)} ثانية)`);
        console.log(`- Gemini:   ${geminiResults.findings?.length || 0} (${geminiDuration.toFixed(2)} ثانية)`);
        console.log(`- DeepSeek: ${deepSeekResults.findings?.length || 0} (${deepSeekDuration.toFixed(2)} ثانية)`);
        console.log(`- Llama:    ${llamaResults.findings?.length || 0} (${llamaDuration.toFixed(2)} ثانية)`);

    } catch (error) {
        logger.error(`خطأ أثناء مقارنة النماذج: ${error.message}`);
        console.error(`خطأ أثناء مقارنة النماذج: ${error.message}`);
    }
}

// تنفيذ المقارنة
compareModels()
    .then(() => {
        logger.info("اكتملت المقارنة بنجاح");
        process.exit(0);
    })
    .catch(error => {
        logger.error(`فشلت المقارنة: ${error.message}`);
        process.exit(1);
    });