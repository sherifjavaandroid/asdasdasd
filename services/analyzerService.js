const path = require('path');
const logger = require('../utils/logger');
const githubService = require('./githubService');
const openaiService = require('./openaiService');
const deepSeekService = require('./deepSeekService');
const llamaService = require('./llamaService');
const { detectMobileAppType } = require('../utils/helpers');
const Report = require('../models/Report');
const config = require('../config/config');
const securityAnalyzer = require('./securityAnalyzer');
const BatteryAnalyzer = require('./batteryAnalyzer');
const batteryAnalyzer = new BatteryAnalyzer();




const performanceAnalyzer = require('./performanceAnalyzer');
const memoryAnalyzer = require('./memoryAnalyzer');


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
            },
            gemini: {
                requestsInWindow: 0,
                windowStart: Date.now(),
                windowSize: 60000, // 1 دقيقة
                maxRequestsPerWindow: 10 // الحد الأقصى للطلبات في النافذة الزمنية
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

            // تحديد أسلوب التحليل (محلي فقط أو محلي + ذكاء اصطناعي)
            const analysisMode = options.analysisMode || 'local_ai'; // القيمة الافتراضية هي الجمع بين التحليل المحلي ونماذج الذكاء الاصطناعي
            logger.info(`🔬 أسلوب التحليل المختار: ${analysisMode === 'local' ? 'محلي فقط' : 'محلي + ذكاء اصطناعي'}`);

            // تحديث خيارات التحليل بأسلوب التحليل
            const analysisOptions = {
                ...options,
                analysisMode
            };

            // معالجة الملفات وتحليلها
            await this.analyzeFiles(files, appType, analysisTypes, report, analysisOptions);

            // معالجة الطلبات المؤجلة - فقط في حالة التحليل بالذكاء الاصطناعي
            if (analysisMode === 'local_ai' && this.deferredRequests.length > 0) {
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
        const filesPerService = Math.ceil(totalFiles / 4);

        const distribution = {
            openai: allFiles.slice(0, filesPerService),
            gemini: allFiles.slice(filesPerService, filesPerService * 2),
            deepSeek: allFiles.slice(filesPerService, filesPerService * 2),
            llama: allFiles.slice(filesPerService * 2)
        };

        logger.debug(`اكتمل توزيع الملفات: openai=${distribution.openai.length}, gemini=${distribution.gemini.length}, deepSeek=${distribution.deepSeek.length}, llama=${distribution.llama.length}`);
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
    /**
     * تحليل مجموعة من الملفات
     * @param {Array} files - قائمة بالملفات
     * @param {string} appType - نوع تطبيق الموبايل
     * @param {Array} analysisTypes - أنواع التحليل المطلوبة
     * @param {Report} report - تقرير التحليل
     * @param {Object} options - خيارات إضافية
     */
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

        // استخراج أسلوب التحليل من الخيارات
        const analysisMode = options.analysisMode || 'local_ai';

        logger.info(`📊 بدء تحليل مجموعة الملفات`);
        logger.info(`   📁 عدد الملفات: ${files.length}, وقت البدء: ${new Date().toISOString()}`);
        logger.info(`   🔍 أنواع التحليل: ${analysisTypes.join(', ')}`);
        logger.info(`   📱 نوع التطبيق: ${appType}`);
        logger.info(`   🔬 أسلوب التحليل: ${analysisMode === 'local' ? 'محلي فقط' : 'محلي + ذكاء اصطناعي'}`);

        // تقسيم الملفات حسب اللغة البرمجية لتخصيص توزيع المهام بشكل أفضل
        const filesByLanguage = this.categorizeFilesByLanguage(files);

        // سجل عدد الملفات لكل لغة
        logger.info(`📋 توزيع الملفات حسب اللغة:`);
        Object.entries(filesByLanguage).forEach(([language, langFiles]) => {
            if (langFiles.length > 0) {
                logger.info(`   ${language}: ${langFiles.length} ملف`);
            }
        });

        // تقسيم الملفات إلى مجموعات لكل خدمة تحليل (فقط إذا كان أسلوب التحليل يتضمن الذكاء الاصطناعي)
        let distributedFiles = {};

        if (analysisMode === 'local_ai') {
            distributedFiles = this.distributeFilesByService(filesByLanguage);

            // سجل عدد الملفات لكل خدمة
            logger.info(`🔄 توزيع الملفات على خدمات التحليل:`);
            Object.entries(distributedFiles).forEach(([service, serviceFiles]) => {
                if (serviceFiles.length > 0) {
                    logger.info(`   ${service}: ${serviceFiles.length} ملف`);
                }
            });
        } else {
            // في حالة التحليل المحلي فقط، نجمع كل الملفات في قائمة واحدة
            distributedFiles = {
                local: [
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
                ]
            };
            logger.info(`🔄 تحليل محلي فقط: ${distributedFiles.local.length} ملف`);
        }

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
                            // تمرير خيارات التحليل التي تتضمن أسلوب التحليل
                            await this.analyzeFile(file, language, analysisType, appType, report, {
                                ...options,
                                preferredService: serviceName !== 'local' ? serviceName : 'openai'
                            });

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
    /**
     * تحليل ملف واحد
     * @param {Object} file - معلومات الملف
     * @param {string} language - لغة البرمجة
     * @param {string} analysisType - نوع التحليل
     * @param {string} appType - نوع تطبيق الموبايل
     * @param {Report} report - تقرير التحليل
     * @param {Object} options - خيارات التحليل
     * @returns {Promise<Object>} نتائج التحليل
     */

    async analyzeFile(file, language, analysisType, appType, report, options = {}) {
        const fileAnalysisStart = Date.now();
        try {
            // استخراج أسلوب التحليل من الخيارات (محلي فقط أو محلي + ذكاء اصطناعي)
            const analysisMode = options.analysisMode || 'local_ai';
            const preferredService = options.preferredService || 'openai';
            logger.debug(`تحليل نوع ${analysisType} للملف: ${file.path} باستخدام أسلوب التحليل: ${analysisMode}, وقت البدء: ${new Date(fileAnalysisStart).toISOString()}`);

            // بدء التحليل المحلي أولاً لجميع الأنواع
            let localAnalysisResults = [];

            // تنفيذ التحليل المحلي بناءً على نوع التحليل
            if (analysisType === 'security') {
                try {
                    // استدعاء محلل الأمان المحلي
                    const securityIssues = securityAnalyzer.analyzeSecurityPatterns(
                        file.content,
                        file.path,
                        language,
                        appType
                    );

                    // إضافة المشكلات الأمنية المكتشفة محلياً إلى التقرير
                    if (securityIssues && securityIssues.length > 0) {
                        for (const finding of securityIssues) {
                            report.addFinding('security', {
                                ...finding,
                                filePath: file.path,
                                type: finding.type || 'issue',
                                source: 'local_analyzer',
                                analysisTimestamp: new Date().toISOString()
                            });
                        }
                        localAnalysisResults = securityIssues;
                        logger.info(`تم اكتشاف ${securityIssues.length} مشكلة أمان محلياً في الملف: ${file.path}`);
                    } else {
                        // إضافة رسالة فارغة لضمان وجود نتائج
                        const emptyIssue = {
                            title: 'لم يتم العثور على مشكلات أمنية',
                            category: 'SECURITY_BEST_PRACTICE',
                            severity: 'info',
                            description: 'لم يتم العثور على مشكلات أمنية في هذا الملف.',
                            recommendation: 'استمر في الممارسات الأمنية الجيدة.',
                            filePath: file.path,
                            lineNumber: 1,
                            type: 'recommendation',
                            source: 'local_analyzer',
                            analysisTimestamp: new Date().toISOString()
                        };
                        report.addFinding('security', emptyIssue);
                        localAnalysisResults = [emptyIssue];
                        logger.info(`لم يتم العثور على مشكلات أمنية في الملف: ${file.path}`);
                    }
                } catch (localAnalysisError) {
                    logger.error(`خطأ في التحليل المحلي للأمان: ${localAnalysisError.message}`);
                }
            } else if (analysisType === 'memory') {
                try {
                    // استدعاء تحليل الذاكرة
                    const memoryIssues = memoryAnalyzer.analyzeMemoryPatterns(file.content, file.path, language, appType);

                    // في حالة وجود نتائج تحليل
                    if (memoryIssues && memoryIssues.length > 0) {
                        memoryIssues.forEach(finding => {
                            report.addFinding('memory', {
                                ...finding,
                                filePath: file.path,
                                type: finding.type || 'issue',
                                source: 'local_analyzer',
                                analysisTimestamp: new Date().toISOString()
                            });
                        });
                        localAnalysisResults = memoryIssues;
                        logger.info(`تم اكتشاف ${memoryIssues.length} مشكلة ذاكرة في الملف: ${file.path}`);
                    } else {
                        // إضافة رسالة فارغة لضمان وجود نتائج
                        const emptyIssue = {
                            title: 'لم يتم العثور على مشكلات ذاكرة',
                            category: 'MEMORY_EFFICIENCY',
                            severity: 'info',
                            description: 'لم يتم العثور على مشكلات متعلقة بالذاكرة في هذا الملف.',
                            recommendation: 'استمر في الممارسات الجيدة لإدارة الذاكرة.',
                            filePath: file.path,
                            lineNumber: 1,
                            type: 'recommendation',
                            source: 'local_analyzer',
                            analysisTimestamp: new Date().toISOString()
                        };
                        report.addFinding('memory', emptyIssue);
                        localAnalysisResults = [emptyIssue];
                        logger.info(`لم يتم العثور على مشكلات ذاكرة في الملف: ${file.path}`);
                    }
                } catch (error) {
                    logger.error(`خطأ في تحليل الذاكرة للملف ${file.path}: ${error.message}`);
                }
            } else if (analysisType === 'battery') {
                try {
                    // استدعاء محلل البطارية
                    const batteryIssues = batteryAnalyzer.analyzeBatteryPatterns(
                        file.content,
                        file.path,
                        language,
                        appType
                    );

                    // إضافة مشاكل البطارية إلى التقرير
                    if (batteryIssues && batteryIssues.length > 0) {
                        for (const finding of batteryIssues) {
                            report.addFinding('battery', {
                                ...finding,
                                filePath: file.path,
                                type: finding.type || 'issue',
                                source: 'local_analyzer',
                                analysisTimestamp: new Date().toISOString()
                            });
                        }
                        localAnalysisResults = batteryIssues;
                        logger.info(`تم اكتشاف ${batteryIssues.length} مشكلة بطارية في الملف: ${file.path}`);
                    } else {
                        // إضافة رسالة فارغة لضمان وجود نتائج
                        const emptyIssue = {
                            title: 'لم يتم العثور على مشكلات بطارية',
                            category: 'BATTERY_EFFICIENCY',
                            severity: 'info',
                            description: 'لم يتم العثور على مشكلات متعلقة بالبطارية في هذا الملف.',
                            recommendation: 'استمر في الممارسات الجيدة لتوفير البطارية.',
                            filePath: file.path,
                            lineNumber: 1,
                            type: 'recommendation',
                            source: 'local_analyzer',
                            analysisTimestamp: new Date().toISOString()
                        };
                        report.addFinding('battery', emptyIssue);
                        localAnalysisResults = [emptyIssue];
                        logger.info(`لم يتم العثور على مشكلات بطارية في الملف: ${file.path}`);
                    }
                } catch (localAnalysisError) {
                    logger.error(`خطأ في التحليل المحلي للبطارية: ${localAnalysisError.message}`);
                }
            } else if (analysisType === 'performance') {
                try {
                    // استدعاء محلل الأداء
                    const performanceIssues = performanceAnalyzer.analyzePerformancePatterns(
                        file.content,
                        file.path,
                        language,
                        appType
                    );

                    // إضافة مشاكل الأداء إلى التقرير
                    if (performanceIssues && performanceIssues.length > 0) {
                        for (const finding of performanceIssues) {
                            report.addFinding('performance', {
                                ...finding,
                                filePath: file.path,
                                type: finding.type || 'issue',
                                source: 'local_analyzer',
                                analysisTimestamp: new Date().toISOString()
                            });
                        }
                        localAnalysisResults = performanceIssues;
                        logger.info(`تم اكتشاف ${performanceIssues.length} مشكلة أداء في الملف: ${file.path}`);
                    } else {
                        // إضافة رسالة فارغة لضمان وجود نتائج
                        const emptyIssue = {
                            title: 'لم يتم العثور على مشكلات أداء',
                            category: 'PERFORMANCE_EFFICIENCY',
                            severity: 'info',
                            description: 'لم يتم العثور على مشكلات متعلقة بالأداء في هذا الملف.',
                            recommendation: 'استمر في الممارسات الجيدة لتحسين الأداء.',
                            filePath: file.path,
                            lineNumber: 1,
                            type: 'recommendation',
                            source: 'local_analyzer',
                            analysisTimestamp: new Date().toISOString()
                        };
                        report.addFinding('performance', emptyIssue);
                        localAnalysisResults = [emptyIssue];
                        logger.info(`لم يتم العثور على مشكلات أداء في الملف: ${file.path}`);
                    }
                } catch (localAnalysisError) {
                    logger.error(`خطأ في التحليل المحلي للأداء: ${localAnalysisError.message}`);
                }
            }

            // سواء كان التحليل المحلي فقط أو مع الذكاء الاصطناعي، نعيد نتائج التحليل المحلي
            const fileAnalysisDuration = (Date.now() - fileAnalysisStart) / 1000;
            logger.debug(`تم الانتهاء من التحليل المحلي لنوع ${analysisType} للملف: ${file.path}, وقت الانتهاء: ${new Date().toISOString()}, المدة: ${fileAnalysisDuration} ثانية`);

            // اذا كان التحليل المحلي فقط، نكتفي بالنتائج المحلية
            if (analysisMode === 'local') {
                return {
                    findings: localAnalysisResults,
                    summary: `التحليل المحلي: تم اكتشاف ${localAnalysisResults.length} مشكلة من نوع ${analysisType}`
                };
            }

            // إذا كان أسلوب التحليل هو "محلي + ذكاء اصطناعي"، نتابع التحليل باستخدام نماذج الذكاء الاصطناعي
            // التحقق من معدل الطلبات والتبديل إلى خدمة أخرى إذا لزم الأمر
            let service = await this.getAvailableService(preferredService, file, language, analysisType, appType, report);

            // إذا لم تتوفر أي خدمة، قم بتأجيل هذا الطلب للمعالجة لاحقًا
            if (!service) {
                logger.info(`تأجيل تحليل نوع ${analysisType} للملف: ${file.path} لعدم توفر خدمات تحليل الذكاء الاصطناعي حاليًا`);
                this.deferRequest(file, language, analysisType, appType, report, preferredService, options);
                return {
                    findings: localAnalysisResults,
                    summary: `التحليل المحلي فقط (تم تأجيل تحليل الذكاء الاصطناعي): ${localAnalysisResults.length} مشكلة محتملة`
                };
            }

            // تنفيذ التحليل باستخدام خدمة الذكاء الاصطناعي المختارة
            logger.info(`استخدام خدمة ${service} لتحليل نوع ${analysisType} للملف: ${file.path}`);

            try {
                // تحديث معدل الطلبات للخدمة المستخدمة
                this.updateRateLimit(service);

                let aiResult = null;

                // اختيار استراتيجية التحليل المناسبة بناءً على الخدمة المتوفرة
                if (service === 'openai') {
                    // استخدام خدمة OpenAI للتحليل
                    aiResult = await openaiService.analyzeCode(
                        file.content,
                        language,
                        analysisType,
                        appType,
                        localAnalysisResults
                    );
                } else if (service === 'deepSeek') {
                    // استخدام خدمة DeepSeek للتحليل (إذا كانت متاحة)
                    aiResult = await deepSeekService.analyzeCode(
                        file.content,
                        language,
                        analysisType,
                        appType,
                        localAnalysisResults
                    );
                } else if (service === 'llama') {
                    // استخدام خدمة Llama للتحليل (إذا كانت متاحة)
                    aiResult = await llamaService.analyzeCode(
                        file.content,
                        language,
                        analysisType,
                        appType,
                        localAnalysisResults
                    );
                } else {
                    logger.error(`خدمة تحليل غير معروفة: ${service}`);
                    return {
                        findings: localAnalysisResults,
                        summary: `التحليل المحلي فقط (خدمة AI غير معروفة): ${localAnalysisResults.length} مشكلة محتملة`
                    };
                }

                // إذا كانت هناك نتائج من الذكاء الاصطناعي
                if (aiResult && aiResult.findings && aiResult.findings.length > 0) {
                    // إضافة النتائج إلى التقرير
                    for (const finding of aiResult.findings) {
                        report.addFinding(analysisType, {
                            ...finding,
                            filePath: file.path,
                            type: finding.type || 'issue',
                            source: `${service}_analyzer`,
                            analysisTimestamp: new Date().toISOString()
                        });
                    }

                    logger.info(`تم اكتشاف ${aiResult.findings.length} مشكلة ${analysisType} إضافية بواسطة ${service} في الملف: ${file.path}`);

                    // دمج النتائج المحلية ونتائج الذكاء الاصطناعي
                    const combinedResults = [...localAnalysisResults, ...aiResult.findings];
                    return {
                        findings: combinedResults,
                        summary: aiResult.summary || `تم اكتشاف ${combinedResults.length} مشكلة محتملة من نوع ${analysisType}`
                    };
                } else {
                    // لم يتم العثور على مشكلات إضافية من الذكاء الاصطناعي
                    logger.info(`لم يتم اكتشاف مشكلات ${analysisType} إضافية بواسطة ${service} في الملف: ${file.path}`);
                    return {
                        findings: localAnalysisResults,
                        summary: `تم اكتشاف ${localAnalysisResults.length} مشكلة محتملة من نوع ${analysisType} (جميعها من التحليل المحلي)`
                    };
                }
            } catch (aiError) {
                logger.error(`خطأ في تحليل الذكاء الاصطناعي لنوع ${analysisType} للملف ${file.path} باستخدام ${service}: ${aiError.message}`);

                // في حالة الخطأ، نعود بالنتائج المحلية فقط
                return {
                    findings: localAnalysisResults,
                    summary: `التحليل المحلي فقط (فشل تحليل الذكاء الاصطناعي): ${localAnalysisResults.length} مشكلة محتملة`
                };
            }

        } catch (error) {
            const fileAnalysisDuration = (Date.now() - fileAnalysisStart) / 1000;
            logger.error(`خطأ في تحليل نوع ${analysisType} للملف ${file.path}: ${error.message}, المدة: ${fileAnalysisDuration} ثانية`);
            logger.error(`تفاصيل الخطأ: ${error.stack || 'لا توجد تفاصيل إضافية'}`);

            // إعادة النتائج المحلية في حالة الخطأ
            return {
                findings: [],
                summary: `حدث خطأ أثناء تحليل الكود: ${error.message}`
            };
        }
    }
    /**
     * معالجة الطلبات المؤجلة
     * @param {Report} report - تقرير التحليل
     */
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

                // التحقق من أسلوب التحليل، إذا كان "محلي فقط"، نتخطى هذا الطلب
                const analysisMode = request.options?.analysisMode || 'local_ai';
                if (analysisMode === 'local') {
                    logger.debug(`تخطي معالجة طلب مؤجل لأن أسلوب التحليل هو "محلي فقط": ${request.file.path}`);
                    this.deferredRequests.splice(i, 1);
                    i--;
                    continue;
                }

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
                            {
                                ...request.options,
                                preferredService: service
                            }
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
     * تحليل مستودع GitHub
     * @param {Object} req - كائن الطلب
     * @param {Object} res - كائن الاستجابة
     */


    /**
     * الحصول على تقرير تحليل بواسطة المعرف
     * @param {Object} req - كائن الطلب
     * @param {Object} res - كائن الاستجابة
     */
    //   getReportById = async (req, res) => {
    //     try {
    //         const { id } = req.params;
    //
    //         // البحث عن التقرير في المخزن المؤقت
    //         const report = reportsCache.get(id);
    //
    //         if (!report) {
    //             return res.status(404).json({
    //                 success: false,
    //                 message: 'التقرير غير موجود'
    //             });
    //         }
    //
    //         // توليد ملخص للتقرير إذا كان مكتملًا وطريقة التحليل تتضمن الذكاء الاصطناعي
    //         let summary = null;
    //         if (report.status === 'completed') {
    //             // استخراج أسلوب التحليل من البيانات المحفوظة أو افتراض أنه محلي + ذكاء اصطناعي
    //             const analysisMode = report.analysisMode || 'local_ai';
    //
    //             // فقط إذا كان التحليل يتضمن الذكاء الاصطناعي، نقوم بتوليد ملخص
    //             if (analysisMode === 'local_ai') {
    //                 try {
    //                     summary = await openaiService.generateSummaryReport(report);
    //                 } catch (summaryError) {
    //                     logger.error(`خطأ في توليد الملخص: ${summaryError.message}`);
    //                 }
    //             } else {
    //                 // في حالة التحليل المحلي فقط، نقدم ملخصًا بسيطًا
    //                 summary = "تم إجراء التحليل المحلي فقط، لا يوجد ملخص معتمد على الذكاء الاصطناعي.";
    //             }
    //         }
    //
    //         res.status(200).json({
    //             success: true,
    //             report: report.toJSON(),
    //             summary
    //         });
    //     } catch (error) {
    //         logger.error(`خطأ في الحصول على التقرير: ${error.message}`);
    //         res.status(500).json({
    //             success: false,
    //             message: 'حدث خطأ أثناء الحصول على التقرير',
    //             error: error.message
    //         });
    //     }
    // };

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
    /**
     * تأجيل طلب تحليل للمعالجة لاحقًا
     * @param {Object} file - معلومات الملف
     * @param {string} language - لغة البرمجة
     * @param {string} analysisType - نوع التحليل
     * @param {string} appType - نوع تطبيق الموبايل
     * @param {Report} report - تقرير التحليل
     * @param {string} preferredService - خدمة التحليل المفضلة
     * @param {Object} options - خيارات التحليل
     */
    deferRequest(file, language, analysisType, appType, report, preferredService, options = {}) {
        // استخراج أسلوب التحليل، في حالة التحليل المحلي فقط، لا يتم تأجيل الطلب
        const analysisMode = options.analysisMode || 'local_ai';

        if (analysisMode === 'local') {
            logger.debug(`تم تجاهل تأجيل التحليل لأن أسلوب التحليل هو "محلي فقط": ${file.path}`);
            return;
        }

        logger.info(`تأجيل تحليل الملف: ${file.path} باستخدام ${preferredService}, وقت التأجيل: ${new Date().toISOString()}`);

        this.deferredRequests.push({
            file,
            language,
            analysisType,
            appType,
            report,
            preferredService,
            options,
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

    /**
     * تأخير التنفيذ لفترة زمنية محددة
     * @param {number} ms - عدد الميلي ثانية للتأخير
     * @returns {Promise} وعد يتم حله بعد انتهاء فترة التأخير
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = new AnalyzerService();