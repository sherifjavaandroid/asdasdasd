const path = require('path');
const logger = require('../utils/logger');
const githubService = require('./githubService');
const openaiService = require('./openaiService');
const deepSeekService = require('./deepSeekService');
const llamaService = require('./llamaService');
const { detectMobileAppType } = require('../utils/helpers');
const Report = require('../models/Report');
const config = require('../config/config');

/**
 * خدمة تحليل الكود الرئيسية مع تحسينات توزيع الطلبات وإدارة معدلات الطلبات
 */
class AnalyzerService {
    constructor() {
        // إعداد متتبعات معدلات الطلبات
        this.rateLimiters = {
            openai: {
                requestsInWindow: 0,
                windowStart: Date.now(),
                windowSize: 60000, // 1 دقيقة
                maxRequestsPerWindow: 20 // الحد الأقصى للطلبات في النافذة الزمنية
            },
            deepSeek: {
                requestsInWindow: 0,
                windowStart: Date.now(),
                windowSize: 60000, // 1 دقيقة
                maxRequestsPerWindow: 1 // الحد الأقصى للطلبات في النافذة الزمنية (1 طلب كل دقيقة)
            },
            llama: {
                requestsInWindow: 0,
                windowStart: Date.now(),
                windowSize: 60000, // 1 دقيقة
                maxRequestsPerWindow: 5 // الحد الأقصى للطلبات في النافذة الزمنية
            }
        };

        // طابور تأجيل للطلبات المؤجلة
        this.deferredRequests = [];

        // حالة تنفيذ الطلبات المؤجلة
        this.isProcessingDeferred = false;

        logger.info(`تهيئة خدمة التحليل الجديدة - وقت البدء: ${new Date().toISOString()}`);
    }

    /**
     * تحليل مستودع GitHub
     * @param {string} repoUrl - رابط المستودع
     * @param {Object} options - خيارات التحليل الإضافية
     * @returns {Promise<Report>} تقرير التحليل
     */
    /**
     * Corrección de la función analyzeRepository en la línea 95
     * para llamar correctamente a analyzeFiles en lugar de analyzeFile
     */
    async analyzeRepository(repoUrl, options = {}) {
        const startTime = Date.now();
        logger.info(`📊 بدء تحليل المستودع: ${repoUrl}`);
        logger.info(`   ⏱️ وقت البدء: ${new Date().toISOString()}`);

        // إنشاء تقرير جديد
        const report = new Report({ repoUrl });

        try {
            report.setStatus('processing');

            // الحصول على معلومات المستودع
            logger.info(`🔍 جاري الحصول على معلومات المستودع: ${repoUrl}`);
            const repoInfo = await githubService.getRepositoryInfo(repoUrl);
            report.repoOwner = repoInfo.owner;
            report.repoName = repoInfo.repo;
            logger.info(`✓ تم الحصول على معلومات المستودع:`);
            logger.info(`   مالك: ${repoInfo.owner}, اسم: ${repoInfo.repo}, الفرع: ${repoInfo.defaultBranch}`);

            // زيادة حد عدد الملفات إذا تم توفير خيار مخصص
            const maxFilesPerRepo = options.maxFilesPerRepo || config.analysis.maxFilesPerRepo;
            logger.info(`ℹ️ حد الملفات المستخدم للتحليل: ${maxFilesPerRepo}`);

            // الحصول على ملفات المستودع
            logger.info(`📂 جاري الحصول على ملفات المستودع: ${repoInfo.owner}/${repoInfo.repo}`);
            const files = await githubService.getAllRepositoryFiles(
                repoInfo.owner,
                repoInfo.repo,
                repoInfo.defaultBranch,
                'unknown', // سنكتشف نوع التطبيق بعد الحصول على الملفات
                maxFilesPerRepo
            );
            logger.info(`✅ تم الحصول على ${files.length} ملف من المستودع`);

            // اكتشاف نوع تطبيق الموبايل
            const appType = detectMobileAppType(files);
            report.appType = appType;
            logger.info(`🔍 تم اكتشاف نوع التطبيق: ${appType}`);

            // تحديد أنواع التحليل المطلوبة
            const analysisTypes = options.analysisTypes || ['security', 'performance', 'memory', 'battery'];
            logger.info(`🔬 أنواع التحليل المطلوبة: ${analysisTypes.join(', ')}`);

            // معالجة الملفات وتحليلها - AQUÍ ESTÁ EL ERROR CORREGIDO
            // Cambiamos de analyzeFile a analyzeFiles
            await this.analyzeFiles(files, appType, analysisTypes, report, options);

            // معالجة الطلبات المؤجلة
            if (this.deferredRequests.length > 0) {
                logger.info(`⏳ بدء معالجة ${this.deferredRequests.length} طلبات مؤجلة`);
                await this.processDeferredRequests(report);
            }

            // تعيين حالة التقرير كمكتمل
            report.setStatus('completed');
            const duration = (Date.now() - startTime) / 1000;
            logger.info(`🎉 تم الانتهاء من تحليل المستودع: ${repoUrl}, المدة: ${duration.toFixed(2)} ثانية`);

            return report;
        } catch (error) {
            const duration = (Date.now() - startTime) / 1000;
            logger.error(`❌ خطأ في تحليل المستودع: ${error.message}, المدة: ${duration.toFixed(2)} ثانية`);
            logger.error(`تفاصيل الخطأ: ${error.stack || 'لا توجد تفاصيل إضافية'}`);
            report.setError(error);
            return report;
        }
    }

    /**
     * تحليل مجموعة من الملفات
     * @param {Array} files - قائمة بالملفات
     * @param {string} appType - نوع تطبيق الموبايل
     * @param {Array} analysisTypes - أنواع التحليل المطلوبة
     * @param {Report} report - تقرير التحليل
     * @param {Object} options - خيارات إضافية
     */
    /**


    /**
     * تصنيف الملفات حسب لغة البرمجة
     * @param {Array} files - قائمة بالملفات
     * @returns {Object} ملفات مصنفة حسب اللغة
     */
    categorizeFilesByLanguage(files) {
        logger.debug(`بدء تصنيف ${files.length} ملف حسب اللغة`);

        const filesByLanguage = {
            java: [],
            kotlin: [],
            swift: [],
            objectiveC: [],
            dart: [],
            javascript: [],
            typescript: [],
            csharp: [],
            xml: [],
            other: []
        };

        for (const file of files) {
            const fileExtension = path.extname(file.path).toLowerCase();

            if (fileExtension === '.java') {
                filesByLanguage.java.push(file);
            } else if (fileExtension === '.kt') {
                filesByLanguage.kotlin.push(file);
            } else if (fileExtension === '.swift') {
                filesByLanguage.swift.push(file);
            } else if (fileExtension === '.m' || fileExtension === '.h') {
                filesByLanguage.objectiveC.push(file);
            } else if (fileExtension === '.dart') {
                filesByLanguage.dart.push(file);
            } else if (fileExtension === '.js' || fileExtension === '.jsx') {
                filesByLanguage.javascript.push(file);
            } else if (fileExtension === '.ts' || fileExtension === '.tsx') {
                filesByLanguage.typescript.push(file);
            } else if (fileExtension === '.cs') {
                filesByLanguage.csharp.push(file);
            } else if (fileExtension === '.xml') {
                filesByLanguage.xml.push(file);
            } else {
                filesByLanguage.other.push(file);
                logger.debug(`تصنيف الملف ${file.path} مع الامتداد ${fileExtension} كملف من نوع 'other'`);
            }
        }

        logger.debug(`اكتمل تصنيف الملفات حسب اللغة`);
        return filesByLanguage;
    }

    /**
     * توزيع الملفات على خدمات التحليل المختلفة
     * @param {Object} filesByLanguage - ملفات مصنفة حسب اللغة
     * @returns {Object} ملفات موزعة على خدمات التحليل
     */
    distributeFilesByService(filesByLanguage) {
        logger.debug(`بدء توزيع الملفات على خدمات التحليل المختلفة`);

        // تجميع كل الملفات في قائمة واحدة
        const allFiles = [
            ...filesByLanguage.java,
            ...filesByLanguage.kotlin,
            ...filesByLanguage.swift,
            ...filesByLanguage.objectiveC,
            ...filesByLanguage.dart,
            ...filesByLanguage.javascript,
            ...filesByLanguage.typescript,
            ...filesByLanguage.csharp,
            ...filesByLanguage.xml,
            ...filesByLanguage.other
        ];

        // تقسيم الملفات بالتساوي بين الخدمات الثلاث
        const totalFiles = allFiles.length;
        const filesPerService = Math.ceil(totalFiles / 3);

        const distribution = {
            openai: allFiles.slice(0, filesPerService),
            deepSeek: allFiles.slice(filesPerService, filesPerService * 2),
            llama: allFiles.slice(filesPerService * 2)
        };

        logger.debug(`اكتمل توزيع الملفات: openai=${distribution.openai.length}, deepSeek=${distribution.deepSeek.length}, llama=${distribution.llama.length}`);
        return distribution;
    }

    /**
     * تحليل مجموعة من الملفات
     * @param {Array} files - قائمة بالملفات
     * @param {string} appType - نوع تطبيق الموبايل
     * @param {Array} analysisTypes - أنواع التحليل المطلوبة
     * @param {Report} report - تقرير التحليل
     * @param {Object} options - خيارات إضافية
     */
    async analyzeFiles(files, appType, analysisTypes, report, options = {}) {
        const startTime = Date.now();
        logger.info(`📊 بدء تحليل مجموعة الملفات`);
        logger.info(`   📁 عدد الملفات: ${files.length}, وقت البدء: ${new Date().toISOString()}`);
        logger.info(`   🔍 أنواع التحليل: ${analysisTypes.join(', ')}`);
        logger.info(`   📱 نوع التطبيق: ${appType}`);

        // تقسيم الملفات حسب اللغة البرمجية لتخصيص توزيع المهام بشكل أفضل
        const filesByLanguage = this.categorizeFilesByLanguage(files);

        // سجل عدد الملفات لكل لغة
        logger.info(`📋 توزيع الملفات حسب اللغة:`);
        Object.entries(filesByLanguage).forEach(([language, langFiles]) => {
            if (langFiles.length > 0) {
                logger.info(`   ${language}: ${langFiles.length} ملف`);
            }
        });

        // تقسيم الملفات إلى مجموعات لكل خدمة تحليل
        const distributedFiles = this.distributeFilesByService(filesByLanguage);

        // سجل عدد الملفات لكل خدمة
        logger.info(`🔄 توزيع الملفات على خدمات التحليل:`);
        Object.entries(distributedFiles).forEach(([service, serviceFiles]) => {
            if (serviceFiles.length > 0) {
                logger.info(`   ${service}: ${serviceFiles.length} ملف`);
            }
        });

        const totalFilesCount = Object.values(distributedFiles).reduce((sum, files) => sum + files.length, 0);
        let analysedFilesCount = 0;

        // تحليل الملفات لكل خدمة تحليل
        for (const serviceName in distributedFiles) {
            const serviceFiles = distributedFiles[serviceName];
            if (serviceFiles.length === 0) continue;

            logger.info(`🚀 بدء تحليل ${serviceFiles.length} ملف باستخدام خدمة ${serviceName}`);

            let completedFiles = 0;
            let skippedFiles = 0;
            let errorFiles = 0;

            for (const file of serviceFiles) {
                try {
                    // تحديد لغة البرمجة بناء على امتداد الملف
                    const fileExtension = path.extname(file.path).toLowerCase();
                    const language = this.getLanguageByExtension(fileExtension);

                    if (!language) {
                        logger.debug(`⏭️ تخطي تحليل الملف (لغة غير مدعومة): ${file.path}`);
                        skippedFiles++;
                        continue;
                    }

                    analysedFilesCount++;
                    logger.info(`📌 الملف ${analysedFilesCount}/${totalFilesCount}: ${file.path}`);

                    // معالجة كل نوع تحليل على حدة لهذا الملف
                    for (const analysisType of analysisTypes) {
                        try {
                            await this.analyzeFile(file, language, analysisType, appType, report, serviceName);
                            // إضافة تأخير قصير بين أنواع التحليل المختلفة لنفس الملف
                            await this.delay(1000);
                        } catch (analysisError) {
                            logger.error(`❌ خطأ في تحليل نوع ${analysisType} للملف ${file.path}: ${analysisError.message}`);
                        }
                    }

                    completedFiles++;

                    // عرض تقدم التحليل
                    const progressPercent = Math.round((analysedFilesCount / totalFilesCount) * 100);
                    logger.info(`🔄 تقدم التحليل: ${progressPercent}% (${analysedFilesCount}/${totalFilesCount})`);
                } catch (fileError) {
                    logger.error(`❌ خطأ في تحليل الملف ${file.path}: ${fileError.message}`);
                    logger.error(`تفاصيل الخطأ: ${fileError.stack || 'لا توجد تفاصيل إضافية'}`);
                    errorFiles++;
                    // استمر في التحليل حتى مع وجود خطأ في ملف واحد
                }
            }

            const serviceDuration = (Date.now() - startTime) / 1000;
            logger.info(`✅ اكتمل تحليل خدمة ${serviceName}:`);
            logger.info(`   ✓ ملفات مكتملة: ${completedFiles}`);
            logger.info(`   ⏭️ ملفات متخطاة: ${skippedFiles}`);
            logger.info(`   ❌ ملفات بها أخطاء: ${errorFiles}`);
            logger.info(`   ⏱️ المدة الكلية: ${serviceDuration.toFixed(2)} ثانية`);
        }

        const totalDuration = (Date.now() - startTime) / 1000;
        logger.info(`🎉 اكتمل تحليل جميع الملفات بنجاح`);
        logger.info(`   ⏱️ المدة الكلية: ${totalDuration.toFixed(2)} ثانية`);
        logger.info(`   📊 إجمالي النتائج: ${Object.values(report.findings).flat().length} مشكلة محتملة`);
    }

    /**
     * تحليل ملف واحد
     * @param {Object} file - معلومات الملف
     * @param {string} language - لغة البرمجة
     * @param {string} analysisType - نوع التحليل
     * @param {string} appType - نوع تطبيق الموبايل
     * @param {Report} report - تقرير التحليل
     * @param {string} preferredService - خدمة التحليل المفضلة
     */
    async analyzeFile(file, language, analysisType, appType, report, preferredService = 'openai') {
        const fileAnalysisStart = Date.now();
        try {
            logger.debug(`تحليل نوع ${analysisType} للملف: ${file.path} باستخدام ${preferredService}, وقت البدء: ${new Date(fileAnalysisStart).toISOString()}`);

            // التحقق من معدل الطلبات والتبديل إلى خدمة أخرى إذا لزم الأمر
            let service = await this.getAvailableService(preferredService, file, language, analysisType, appType, report);

            // إذا كانت الخدمة المفضلة غير متاحة، جرب الخدمات الأخرى بالترتيب
            if (!service) {
                const allServices = ['openai', 'deepSeek', 'llama'];
                for (const altService of allServices) {
                    if (altService !== preferredService) {
                        service = await this.getAvailableService(altService, file, language, analysisType, appType, report);
                        if (service) break;
                    }
                }
            }

            if (!service) {
                // إذا لم تكن هناك خدمة متاحة، قم بتأجيل الطلب
                logger.info(`لا توجد خدمة متاحة لتحليل الملف: ${file.path}، سيتم التأجيل`);
                this.deferRequest(file, language, analysisType, appType, report, preferredService);
                return;
            }

            logger.info(`تحليل الملف: ${file.path} باستخدام الخدمة: ${service}, نوع التحليل: ${analysisType}`);

            let analysisResult = {};
            const modelStartTime = Date.now();

            switch (service) {
                case 'openai':
                    // تحديث معدل الطلبات
                    this.updateRateLimit('openai');
                    logger.info(`بدء تحليل الكود باستخدام OpenAI, حجم الكود: ${file.content.length} حرف`);

                    // استخدام OpenAI للتحليل
                    analysisResult = await openaiService.analyzeCode(file.content, language, analysisType, appType);
                    break;

                case 'deepSeek':
                    // تحديث معدل الطلبات
                    this.updateRateLimit('deepSeek');
                    logger.info(`بدء تحليل الكود باستخدام DeepSeek, حجم الكود: ${file.content.length} حرف`);

                    // استخدام Deep Seek للتحليل
                    if (analysisType === 'security') {
                        analysisResult = await deepSeekService.analyzeCodeSecurity(file.content, language, appType);
                    } else {
                        // استخدام DeepSeek للتحليل العام
                        analysisResult = await this.mockDeepSeekAnalysis(file.content, language, analysisType, appType);
                    }
                    break;

                case 'llama':
                    // تحديث معدل الطلبات
                    this.updateRateLimit('llama');
                    logger.info(`بدء تحليل الكود باستخدام Llama, حجم الكود: ${file.content.length} حرف`);

                    // استخدام Llama للتحليل
                    analysisResult = await llamaService.analyzeCode(file.content, language, analysisType, appType);
                    break;

                default:
                    throw new Error(`خدمة تحليل غير معروفة: ${service}`);
            }

            const modelDuration = (Date.now() - modelStartTime) / 1000;
            logger.info(`اكتمل تحليل النموذج لـ ${service}: ${file.path}, نوع ${analysisType}, المدة: ${modelDuration} ثانية`);

            // سجل معلومات النتائج
            const findingsCount = analysisResult.findings ? analysisResult.findings.length : 0;
            logger.info(`تم العثور على ${findingsCount} نتيجة لملف: ${file.path}, نوع تحليل: ${analysisType}`);

            // إضافة نتائج التحليل إلى التقرير
            if (analysisResult.findings && Array.isArray(analysisResult.findings)) {
                for (const finding of analysisResult.findings) {
                    // إضافة معلومات إضافية للنتيجة
                    finding.filePath = file.path;
                    finding.type = finding.type || 'issue';
                    finding.source = service; // إضافة مصدر التحليل
                    finding.analysisTimestamp = new Date().toISOString(); // إضافة وقت التحليل
                    report.addFinding(analysisType, finding);

                    // سجل خطورة كل نتيجة
                    logger.debug(`نتيجة: ${finding.title}, الخطورة: ${finding.severity}, المصدر: ${finding.source}`);
                }
            }

            const fileAnalysisDuration = (Date.now() - fileAnalysisStart) / 1000;
            logger.debug(`تم الانتهاء من تحليل نوع ${analysisType} للملف: ${file.path} باستخدام ${service}, وقت الانتهاء: ${new Date().toISOString()}, المدة: ${fileAnalysisDuration} ثانية`);

            return analysisResult;
        } catch (error) {
            const fileAnalysisDuration = (Date.now() - fileAnalysisStart) / 1000;
            logger.error(`خطأ في تحليل نوع ${analysisType} للملف ${file.path}: ${error.message}, المدة: ${fileAnalysisDuration} ثانية`);
            logger.error(`تفاصيل الخطأ: ${error.stack || 'لا توجد تفاصيل إضافية'}`);

            // إذا فشل التحليل باستخدام الخدمة المحددة، حاول استخدام خدمة أخرى
            if (preferredService !== 'openai') {
                logger.info(`محاولة استخدام OpenAI كخيار احتياطي للملف: ${file.path}`);
                try {
                    return await this.analyzeFile(file, language, analysisType, appType, report, 'openai');
                } catch (fallbackError) {
                    logger.error(`فشل التحليل البديل للملف ${file.path}: ${fallbackError.message}`);
                    logger.error(`تفاصيل الخطأ البديل: ${fallbackError.stack || 'لا توجد تفاصيل إضافية'}`);
                    throw fallbackError;
                }
            } else {
                throw error;
            }
        }
    }

    /**
     * معالجة الطلبات المؤجلة
     * @param {Report} report - تقرير التحليل
     */
    async processDeferredRequests(report) {
        if (this.isProcessingDeferred) {
            logger.debug(`هناك عملية معالجة للطلبات المؤجلة قيد التنفيذ بالفعل، تم تخطي هذه المحاولة`);
            return;
        }

        const startTime = Date.now();
        logger.info(`بدء معالجة ${this.deferredRequests.length} طلبات مؤجلة، وقت البدء: ${new Date(startTime).toISOString()}`);

        this.isProcessingDeferred = true;

        try {
            // ترتيب الطلبات المؤجلة حسب وقت الإضافة
            this.deferredRequests.sort((a, b) => a.timestamp - b.timestamp);
            logger.debug(`تم ترتيب الطلبات المؤجلة حسب وقت الإضافة`);

            // معالجة الطلبات المؤجلة بشكل متتالي مع إضافة تأخير بينها
            for (let i = 0; i < this.deferredRequests.length; i++) {
                const request = this.deferredRequests[i];
                const requestAge = (Date.now() - request.timestamp) / 1000;

                logger.debug(`معالجة طلب مؤجل ${i+1}/${this.deferredRequests.length}: ${request.file.path}, نوع التحليل: ${request.analysisType}, عمر الطلب: ${requestAge.toFixed(1)} ثانية`);

                // تحديد أفضل خدمة متاحة
                const availableServices = ['openai', 'deepSeek', 'llama'];
                let service = null;

                for (const serviceOption of availableServices) {
                    if (this.isServiceAvailable(serviceOption)) {
                        service = serviceOption;
                        break;
                    }
                }

                if (service) {
                    try {
                        logger.info(`بدء تنفيذ الطلب المؤجل: ${request.file.path} باستخدام ${service}`);

                        // تنفيذ التحليل
                        await this.analyzeFile(
                            request.file,
                            request.language,
                            request.analysisType,
                            request.appType,
                            request.report,
                            service
                        );

                        // إزالة الطلب من قائمة الانتظار بعد معالجته بنجاح
                        this.deferredRequests.splice(i, 1);
                        i--; // تعديل المؤشر بعد الحذف

                        logger.info(`اكتمل تنفيذ الطلب المؤجل: ${request.file.path} باستخدام ${service}`);

                        // إضافة تأخير بين الطلبات
                        await this.delay(2000);
                    } catch (analysisError) {
                        logger.error(`فشل تنفيذ الطلب المؤجل: ${request.file.path}, الخطأ: ${analysisError.message}`);

                        // إضافة تأخير قبل المحاولة التالية
                        await this.delay(3000);
                    }
                } else {
                    // إذا لم تكن هناك خدمة متاحة، انتظر قليلاً قبل الانتقال للطلب التالي
                    logger.debug(`لا توجد خدمة متاحة للطلب المؤجل، الانتظار 5 ثوانٍ...`);
                    await this.delay(5000);
                }

                // سجل التقدم الدوري
                if ((i + 1) % 5 === 0 || i === this.deferredRequests.length - 1) {
                    const elapsedTime = (Date.now() - startTime) / 1000;
                    const remainingRequests = this.deferredRequests.length;
                    logger.info(`حالة معالجة الطلبات المؤجلة: معالجة=${i+1}, المتبقية=${remainingRequests}, الوقت المنقضي=${elapsedTime.toFixed(1)} ثانية`);
                }
            }

            const totalDuration = (Date.now() - startTime) / 1000;
            const remainingRequests = this.deferredRequests.length;

            logger.info(`اكتملت معالجة الطلبات المؤجلة, المدة الكلية: ${totalDuration.toFixed(1)} ثانية`);

            if (remainingRequests > 0) {
                logger.warn(`لا يزال هناك ${remainingRequests} طلب مؤجل في قائمة الانتظار`);

                // جدولة جولة أخرى من المعالجة بعد فترة
                setTimeout(() => {
                    this.isProcessingDeferred = false;
                    this.processDeferredRequests(report);
                }, 10000); // انتظر 10 ثوانٍ قبل جولة المعالجة التالية
            }
        } catch (error) {
            const totalDuration = (Date.now() - startTime) / 1000;
            logger.error(`خطأ في معالجة الطلبات المؤجلة: ${error.message}, المدة: ${totalDuration.toFixed(1)} ثانية`);
            logger.error(`تفاصيل الخطأ: ${error.stack || 'لا توجد تفاصيل إضافية'}`);
        } finally {
            this.isProcessingDeferred = false;
            logger.debug(`تم تحرير حالة معالجة الطلبات المؤجلة`);
        }
    }

    /**
     * الحصول على خدمة متاحة للتحليل
     * @param {string} preferredService - الخدمة المفضلة
     * @param {Object} file - معلومات الملف
     * @param {string} language - لغة البرمجة
     * @param {string} analysisType - نوع التحليل
     * @param {string} appType - نوع تطبيق الموبايل
     * @param {Report} report - تقرير التحليل
     * @returns {string|null} اسم الخدمة المتاحة أو null إذا لم تكن هناك خدمة متاحة
     */
    async getAvailableService(preferredService, file, language, analysisType, appType, report) {
        logger.debug(`البحث عن خدمة متاحة لتحليل ملف: ${file.path}, الخدمة المفضلة: ${preferredService}`);

        // التحقق أولاً من الخدمة المفضلة
        if (this.isServiceAvailable(preferredService)) {
            logger.debug(`الخدمة المفضلة ${preferredService} متاحة`);
            return preferredService;
        }

        logger.debug(`الخدمة المفضلة ${preferredService} غير متاحة، البحث عن بدائل`);

        // سجل حالة كل خدمة
        Object.entries(this.rateLimiters).forEach(([service, limiter]) => {
            const windowRemaining = Math.max(0, limiter.windowSize - (Date.now() - limiter.windowStart));
            logger.debug(`حالة خدمة ${service}: ${limiter.requestsInWindow}/${limiter.maxRequestsPerWindow} طلبات، ${windowRemaining / 1000} ثانية متبقية في النافذة`);
        });

        // إذا لم تكن الخدمة المفضلة متاحة، ابحث عن خدمة بديلة
        const services = ['openai', 'deepSeek', 'llama'].filter(s => s !== preferredService);

        for (const service of services) {
            if (this.isServiceAvailable(service)) {
                logger.info(`تبديل من ${preferredService} إلى ${service} للملف: ${file.path}`);
                return service;
            }
        }

        // إذا لم تكن هناك خدمة متاحة، عد null
        logger.debug(`لا توجد خدمات متاحة لتحليل الملف: ${file.path}`);
        return null;
    }

    /**
     * التحقق مما إذا كانت الخدمة متاحة (لم تتجاوز حد معدل الطلبات)
     * @param {string} service - اسم الخدمة
     * @returns {boolean} صحيح إذا كانت الخدمة متاحة
     */
    isServiceAvailable(service) {
        const limiter = this.rateLimiters[service];

        // إعادة تعيين نافذة معدل الطلبات إذا انتهت
        if (Date.now() - limiter.windowStart > limiter.windowSize) {
            const oldWindow = new Date(limiter.windowStart).toISOString();
            limiter.windowStart = Date.now();
            const oldRequests = limiter.requestsInWindow;
            limiter.requestsInWindow = 0;
            logger.debug(`إعادة تعيين نافذة معدل الطلبات للخدمة ${service}: النافذة القديمة بدأت في ${oldWindow} مع ${oldRequests} طلبات`);
            return true;
        }

        // التحقق مما إذا كانت الخدمة تجاوزت حد معدل الطلبات
        const isAvailable = limiter.requestsInWindow < limiter.maxRequestsPerWindow;
        if (!isAvailable) {
            const windowRemainingTime = (limiter.windowStart + limiter.windowSize - Date.now()) / 1000;
            logger.debug(`خدمة ${service} غير متاحة: ${limiter.requestsInWindow}/${limiter.maxRequestsPerWindow} طلبات، ${windowRemainingTime.toFixed(1)} ثانية متبقية في النافذة`);
        }
        return isAvailable;
    }

    /**
     * تحديث معدل الطلبات لخدمة معينة
     * @param {string} service - اسم الخدمة
     */
    updateRateLimit(service) {
        const limiter = this.rateLimiters[service];
        const oldRequests = limiter.requestsInWindow;

        // إعادة تعيين نافذة معدل الطلبات إذا انتهت
        if (Date.now() - limiter.windowStart > limiter.windowSize) {
            const oldWindow = new Date(limiter.windowStart).toISOString();
            limiter.windowStart = Date.now();
            limiter.requestsInWindow = 1;
            logger.debug(`إعادة تعيين نافذة معدل الطلبات للخدمة ${service}: النافذة القديمة بدأت في ${oldWindow} مع ${oldRequests} طلبات، تعيين طلب واحد جديد`);
        } else {
            limiter.requestsInWindow++;
            logger.debug(`تحديث معدل الطلبات للخدمة ${service}: ${oldRequests} -> ${limiter.requestsInWindow} من أصل ${limiter.maxRequestsPerWindow}`);
        }
    }

    /**
     * تأجيل طلب تحليل للمعالجة لاحقًا
     * @param {Object} file - معلومات الملف
     * @param {string} language - لغة البرمجة
     * @param {string} analysisType - نوع التحليل
     * @param {string} appType - نوع تطبيق الموبايل
     * @param {Report} report - تقرير التحليل
     * @param {string} preferredService - خدمة التحليل المفضلة
     */
    deferRequest(file, language, analysisType, appType, report, preferredService) {
        logger.info(`تأجيل تحليل الملف: ${file.path} باستخدام ${preferredService}, وقت التأجيل: ${new Date().toISOString()}`);

        this.deferredRequests.push({
            file,
            language,
            analysisType,
            appType,
            report,
            preferredService,
            timestamp: Date.now()
        });

        logger.debug(`إجمالي الطلبات المؤجلة: ${this.deferredRequests.length}`);
    }



    /**
     * محاكاة استجابة DeepSeek للتحليل العام (عندما لا تكون هناك API موثقة)
     * @param {string} code - الكود المراد تحليله
     * @param {string} language - لغة البرمجة
     * @param {string} analysisType - نوع التحليل
     * @param {string} appType - نوع تطبيق الموبايل
     * @returns {Object} نتائج التحليل المحاكية
     */
    async mockDeepSeekAnalysis(code, language, analysisType, appType) {
        logger.debug(`استخدام تحليل DeepSeek المحاكي لنوع ${analysisType}, اللغة: ${language}, حجم الكود: ${code.length} حرف`);

        // في الواقع، يجب استبدال هذه الدالة باستدعاء API حقيقي لـ DeepSeek
        return {
            findings: [
                {
                    title: `محاكاة تحليل ${analysisType} لـ DeepSeek`,
                    description: `هذا تحليل محاكي لنوع ${analysisType} باستخدام DeepSeek.`,
                    severity: 'info',
                    recommendation: `استخدم OpenAI أو Llama للتحليل الحقيقي لنوع ${analysisType}.`
                }
            ],
            summary: `تحليل ${analysisType} محاكي باستخدام DeepSeek`
        };
    }

    /**
     * الحصول على لغة البرمجة بناء على امتداد الملف
     * @param {string} extension - امتداد الملف
     * @returns {string|null} اسم لغة البرمجة أو null
     */
    getLanguageByExtension(extension) {
        const extensionMap = {
            '.java': 'Java',
            '.kt': 'Kotlin',
            '.swift': 'Swift',
            '.m': 'Objective-C',
            '.h': 'Objective-C',
            '.cs': 'C#',
            '.dart': 'Dart',
            '.js': 'JavaScript',
            '.jsx': 'JavaScript',
            '.ts': 'TypeScript',
            '.tsx': 'TypeScript',
            '.xml': 'XML',
            '.xaml': 'XAML',
            '.json': 'JSON',
            '.plist': 'XML',
            '.gradle': 'Groovy',
            '.podspec': 'Ruby',
        };

        const language = extensionMap[extension] || null;
        if (!language) {
            logger.debug(`امتداد غير معروف: ${extension}`);
        }
        return language;
    }
}

module.exports = new AnalyzerService();