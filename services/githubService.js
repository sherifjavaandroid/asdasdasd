const axios = require('axios');
const path = require('path');
const config = require('../config/config');
const logger = require('../utils/logger');
const { extractRepoInfo, shouldAnalyzeFile, isFileSizeAcceptable } = require('../utils/helpers');

/**
 * خدمة محسنة للتفاعل مع GitHub API مع دعم لتجميع الملفات ومعالجة تجاوز العدد الأقصى
 */
class GitHubService {
    constructor() {
        // إعداد عميل axios لطلبات GitHub API
        this.client = axios.create({
            baseURL: config.github.apiUrl,
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `token ${config.github.token}`,
            },
            timeout: 15000, // 15 ثانية
        });

        // فترة الانتظار بين الطلبات (بالمللي ثانية)
        this.requestDelay = 500;

        // متتبع طلبات API
        this.apiRequests = {
            count: 0,
            resetTime: Date.now() + 3600000, // تعيين وقت إعادة التعيين الافتراضي إلى ساعة من الآن
            limit: 5000 // الحد الافتراضي للطلبات
        };
    }

    /**
     * وظيفة تأخير للانتظار بين الطلبات
     * @param {number} ms - مدة الانتظار بالمللي ثانية
     * @returns {Promise} وعد ينتهي بعد الانتظار
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * الحصول على معلومات المستودع
     * @param {string} repoUrl - رابط المستودع
     * @returns {Promise<Object>} معلومات المستودع
     */
    async getRepositoryInfo(repoUrl) {
        try {
            const { owner, repo } = extractRepoInfo(repoUrl);

            // التحقق من معدل الطلبات وإدارة التأخير
            await this.checkRateLimit();

            const response = await this.client.get(`/repos/${owner}/${repo}`);

            // تحديث معلومات معدل الطلبات من الرأس
            this.updateRateLimitInfo(response.headers);

            logger.info(`تم الحصول على معلومات المستودع: ${owner}/${repo}`);

            return {
                owner,
                repo: repo,
                name: response.data.name,
                fullName: response.data.full_name,
                description: response.data.description,
                defaultBranch: response.data.default_branch,
                stars: response.data.stargazers_count,
                forks: response.data.forks_count,
                visibility: response.data.visibility,
                language: response.data.language,
                createdAt: response.data.created_at,
                updatedAt: response.data.updated_at,
            };
        } catch (error) {
            // معالجة حالة تجاوز معدل الطلبات
            if (this.isRateLimitExceeded(error)) {
                await this.handleRateLimit(error);
                return this.getRepositoryInfo(repoUrl);
            }

            logger.error(`خطأ في الحصول على معلومات المستودع: ${error.message}`);
            throw new Error(`فشل الحصول على معلومات المستودع: ${error.message}`);
        }
    }

    /**
     * الحصول على محتويات المستودع
     * @param {string} owner - اسم مالك المستودع
     * @param {string} repo - اسم المستودع
     * @param {string} path - المسار داخل المستودع
     * @param {string} branch - الفرع
     * @returns {Promise<Array>} محتويات المستودع
     */
    async getRepositoryContents(owner, repo, path = '', branch = '') {
        try {
            const params = {};
            if (branch) {
                params.ref = branch;
            }

            // التحقق من معدل الطلبات وإدارة التأخير
            await this.checkRateLimit();

            // إضافة تأخير بين الطلبات لتجنب تجاوز معدل الطلبات
            await this.delay(this.requestDelay);

            const response = await this.client.get(`/repos/${owner}/${repo}/contents/${path}`, { params });

            // تحديث معلومات معدل الطلبات من الرأس
            this.updateRateLimitInfo(response.headers);

            logger.info(`تم الحصول على محتويات المستودع: ${owner}/${repo}/${path}`);

            // إذا كان الرد عبارة عن مصفوفة، فهو دليل
            if (Array.isArray(response.data)) {
                return response.data;
            }

            // إذا كان الرد عبارة عن كائن واحد، فهو ملف
            return [response.data];
        } catch (error) {
            // معالجة حالة تجاوز معدل الطلبات
            if (this.isRateLimitExceeded(error)) {
                await this.handleRateLimit(error);
                return this.getRepositoryContents(owner, repo, path, branch);
            }

            logger.error(`خطأ في الحصول على محتويات المستودع: ${error.message}`);
            throw new Error(`فشل الحصول على محتويات المستودع: ${error.message}`);
        }
    }

    /**
     * تحديث معلومات معدل الطلبات من رؤوس HTTP
     * @param {Object} headers - رؤوس HTTP من استجابة الخادم
     */
    updateRateLimitInfo(headers) {
        if (headers['x-ratelimit-limit']) {
            this.apiRequests.limit = parseInt(headers['x-ratelimit-limit'], 10);
        }

        if (headers['x-ratelimit-remaining']) {
            this.apiRequests.count = this.apiRequests.limit - parseInt(headers['x-ratelimit-remaining'], 10);
        }

        if (headers['x-ratelimit-reset']) {
            this.apiRequests.resetTime = parseInt(headers['x-ratelimit-reset'], 10) * 1000;
        }
    }

    /**
     * التحقق مما إذا كان الخطأ بسبب تجاوز معدل الطلبات
     * @param {Error} error - كائن الخطأ
     * @returns {boolean} صحيح إذا كان الخطأ بسبب تجاوز معدل الطلبات
     */
    isRateLimitExceeded(error) {
        return (
            error.response &&
            error.response.status === 403 &&
            (
                error.response.headers['x-ratelimit-remaining'] === '0' ||
                error.response.data.message?.includes('rate limit exceeded')
            )
        );
    }

    /**
     * معالجة حالة تجاوز معدل الطلبات
     * @param {Error} error - كائن الخطأ
     */
    async handleRateLimit(error) {
        let waitTime = 60000; // افتراضي 60 ثانية

        if (error.response && error.response.headers['x-ratelimit-reset']) {
            const resetTime = parseInt(error.response.headers['x-ratelimit-reset'], 10) * 1000;
            waitTime = Math.max(0, resetTime - Date.now());
        }

        logger.warn(`تم تجاوز معدل طلبات GitHub API، الانتظار ${Math.ceil(waitTime / 1000)} ثانية...`);

        // الانتظار حتى وقت إعادة التعيين، ولكن بحد أقصى 5 دقائق
        await this.delay(Math.min(waitTime, 300000));
    }

    /**
     * التحقق من معدل الطلبات وتأخير الطلبات إذا لزم الأمر
     */
    async checkRateLimit() {
        // إذا كان الوقت الحالي بعد وقت إعادة التعيين، أعد تعيين العداد
        if (Date.now() > this.apiRequests.resetTime) {
            this.apiRequests.count = 0;
            this.apiRequests.resetTime = Date.now() + 3600000; // افتراضي إلى ساعة من الآن
        }

        // إذا تم استخدام أكثر من 80% من الحد، أضف تأخيرًا طويلًا بين الطلبات
        if (this.apiRequests.count > this.apiRequests.limit * 0.8) {
            const remainingTime = Math.max(0, this.apiRequests.resetTime - Date.now());
            const remainingRequests = this.apiRequests.limit - this.apiRequests.count;

            if (remainingRequests <= 10) {
                // إذا كان هناك عدد قليل جدًا من الطلبات المتبقية، انتظر حتى إعادة التعيين
                logger.warn(`عدد طلبات GitHub API منخفض جدًا (${remainingRequests} متبقي)، الانتظار حتى إعادة التعيين...`);
                await this.delay(Math.min(remainingTime, 300000)); // انتظر حتى 5 دقائق كحد أقصى
            } else {
                // تعديل فترة التأخير بناءً على الوقت المتبقي والطلبات المتبقية
                const delayPerRequest = Math.max(
                    1000, // الحد الأدنى 1 ثانية
                    Math.min(remainingTime / remainingRequests, 5000) // تأخير متوازن، بحد أقصى 5 ثواني
                );

                logger.info(`ضبط تأخير الطلبات إلى ${Math.ceil(delayPerRequest)} مللي ثانية لإدارة معدل الطلبات`);
                this.requestDelay = delayPerRequest;
            }
        } else {
            // إعادة تعيين التأخير إلى القيمة الافتراضية إذا كان معدل الطلبات منخفضًا
            this.requestDelay = 500;
        }

        // زيادة عداد الطلبات
        this.apiRequests.count++;
    }

    /**
     * استرجاع جميع ملفات المستودع بشكل متكرر مع تحسينات للكشف عن أنواع التطبيقات
     * @param {string} owner - اسم مالك المستودع
     * @param {string} repo - اسم المستودع
     * @param {string} branch - الفرع
     * @param {string} appType - نوع تطبيق الموبايل
     * @param {number} maxFiles - الحد الأقصى لعدد الملفات (اختياري)
     * @returns {Promise<Array>} مصفوفة بالملفات
     */
    async getAllRepositoryFiles(owner, repo, branch, appType, maxFiles = null) {
        // تعديل الحد الأقصى لعدد الملفات بناءً على نوع التطبيق
        let maxFilesToFetch = maxFiles || config.analysis.maxFilesPerRepo;
        // زيادة العدد الافتراضي للملفات لضمان رؤية جميع ملفات التطبيق
        if (appType === 'unknown') {
            maxFilesToFetch = Math.max(maxFilesToFetch, 200); // زيادة العدد للتأكد من اكتشاف النوع بشكل صحيح
        }

        const files = [];
        const processedPaths = new Set(); // لتجنب معالجة نفس المسار مرتين
        let fileCount = 0;

        // قائمة الأدلة التي تم تخطيها
        const skippedDirs = [
            '.git', 'node_modules', 'build', 'dist', 'bin', 'obj',
            'packages', '.gradle', '.dart_tool', '.idea', '.vscode'
        ];

        // قائمة الأدلة ذات الأولوية حسب نوع التطبيق
        let priorityDirs = [];
        if (appType === 'flutter' || appType === 'unknown') {
            priorityDirs.push('lib', 'android/app/src', 'ios/Runner', 'pubspec.yaml');
        }
        if (appType === 'reactNative' || appType === 'unknown') {
            priorityDirs.push('src', 'app', 'components', 'screens', 'package.json', 'index.js');
        }
        if (appType === 'nativeAndroid' || appType === 'unknown') {
            priorityDirs.push('app/src/main', 'AndroidManifest.xml', 'java', 'kotlin');
        }
        if (appType === 'nativeIOS' || appType === 'unknown') {
            priorityDirs.push('ViewController', 'AppDelegate', 'Info.plist');
        }
        if (appType === 'xamarin' || appType === 'unknown') {
            priorityDirs.push('Forms', 'Xamarin.Forms', '.csproj');
        }

        // دالة مساعدة متكررة لجمع الملفات
        const fetchContentsRecursively = async (path = '', depth = 0, maxDepth = 6) => {
            // إذا كان العمق أكبر من الحد الأقصى، توقف
            if (depth > maxDepth || fileCount >= maxFilesToFetch) {
                return;
            }

            // تسجيل المسار كمعالج
            if (processedPaths.has(path)) {
                return; // تجنب المسارات المكررة
            }
            processedPaths.add(path);

            // التحقق مما إذا كان المسار يحتوي على أي من الأدلة التي يجب تخطيها
            if (path !== '' && skippedDirs.some(dir =>
                path.includes(`/${dir}/`) || path === dir || path.endsWith(`/${dir}`))) {
                logger.debug(`تخطي مسار: ${path} (ضمن الأدلة المتجاهلة)`);
                return;
            }

            try {
                const contents = await this.getRepositoryContents(owner, repo, path, branch);

                // تصفية العناصر المستبعدة من الأدلة المتجاهلة
                const filteredContents = contents.filter(item =>
                    !skippedDirs.some(dir =>
                        item.path.includes(`/${dir}/`) ||
                        item.path === dir ||
                        item.path.endsWith(`/${dir}`)
                    )
                );

                // ترتيب العناصر بناءً على الأولوية
                filteredContents.sort((a, b) => {
                    const aIsPriority = priorityDirs.some(dir => a.path.includes(dir));
                    const bIsPriority = priorityDirs.some(dir => b.path.includes(dir));
                    if (aIsPriority && !bIsPriority) return -1;
                    if (!aIsPriority && bIsPriority) return 1;
                    return 0;
                });

                // قائمة المسارات للاستكشاف لاحقًا
                const dirsToExplore = [];

                // معالجة جميع العناصر
                for (const item of filteredContents) {
                    if (fileCount >= maxFilesToFetch) {
                        logger.warn(`تم الوصول إلى الحد الأقصى لعدد الملفات (${maxFilesToFetch})`);
                        break;
                    }

                    if (item.type === 'dir') {
                        // إذا كان المسار له أولوية، نضيفه في بداية القائمة
                        if (priorityDirs.some(dir => item.path.includes(dir))) {
                            dirsToExplore.unshift(item.path);
                        } else {
                            dirsToExplore.push(item.path);
                        }
                    } else if (item.type === 'file') {
                        // التحقق من أن الملف يستحق التحليل وليس كبيرًا جدًا
                        const isAnalyzable = shouldAnalyzeFile(item.path, appType) && isFileSizeAcceptable(item);
                        if (isAnalyzable || fileCount < 20) { // جمع بعض الملفات العامة في البداية للاكتشاف
                            try {
                                // الحصول على محتوى الملف
                                const fileContent = await this.getFileContent(item);

                                files.push({
                                    name: item.name,
                                    path: item.path,
                                    size: item.size,
                                    content: fileContent,
                                    download_url: item.download_url,
                                    url: item.url,
                                });

                                fileCount++;
                            } catch (fileError) {
                                logger.error(`فشل الحصول على محتوى الملف ${item.path}: ${fileError.message}`);
                            }
                        }
                    }
                }

                // استكشاف المسارات الفرعية
                for (const dirPath of dirsToExplore) {
                    if (fileCount >= maxFilesToFetch) break;
                    await fetchContentsRecursively(dirPath, depth + 1, maxDepth);
                }
            } catch (error) {
                // سجل الخطأ لكن استمر في الاستكشاف
                logger.error(`خطأ في استكشاف المسار ${path}: ${error.message}`);
            }
        };

        // بدء الاستكشاف من جذر المستودع أولاً للملفات المهمة في الجذر
        await fetchContentsRecursively('');

        // استكشاف المسارات ذات الأولوية بشكل صريح إذا لم نتمكن من العثور على ملفات كافية
        if (files.length < 10 && priorityDirs.length > 0) {
            for (const dir of priorityDirs) {
                if (!processedPaths.has(dir) && fileCount < maxFilesToFetch) {
                    logger.info(`استكشاف مسار ذات أولوية: ${dir}`);
                    await fetchContentsRecursively(dir, 0, 6);
                }
            }
        }

        logger.info(`تم الحصول على ${files.length} ملف للتحليل`);

        // تحديث appType بناءً على الملفات المكتشفة إذا كان "unknown"
        if (appType === 'unknown' && files.length > 0) {
            const { detectMobileAppType } = require('../utils/helpers');
            const detectedAppType = detectMobileAppType(files);
            if (detectedAppType !== 'unknown') {
                logger.info(`تم اكتشاف نوع التطبيق بناءً على الملفات المجموعة: ${detectedAppType}`);
                appType = detectedAppType;

                // إعادة فلترة الملفات بناء على النوع المكتشف
                const filteredFiles = files.filter(file => shouldAnalyzeFile(file.path, appType));
                logger.info(`بعد فلترة الملفات بناء على النوع المكتشف: ${filteredFiles.length} ملف للتحليل`);
                return filteredFiles;
            }
        }

        return files;
    }

    /**
     * الحصول على محتوى ملف مع معالجة محسنة للأخطاء وإعادة المحاولات
     * @param {Object} file - معلومات الملف
     * @returns {Promise<string>} محتوى الملف
     */
    async getFileContent(file) {
        try {
            // إذا كان الملف كبيرًا جدًا، استخدم رابط التنزيل بدلاً من المحتوى المُضمن
            if (file.size > 1024 * 1024) { // أكبر من 1 ميغابايت
                return await this.getFileContentByDownloadUrl(file.download_url);
            }

            // للملفات الصغيرة، استخدم المحتوى المُضمن إذا كان متاحًا
            if (file.content) {
                // فك ترميز محتوى base64
                return Buffer.from(file.content, 'base64').toString('utf-8');
            }

            // إذا لم يكن المحتوى متاحًا، قم بطلب منفصل
            // التحقق من معدل الطلبات وإدارة التأخير
            await this.checkRateLimit();

            const response = await this.client.get(file.url);

            // تحديث معلومات معدل الطلبات من الرأس
            this.updateRateLimitInfo(response.headers);

            if (response.data.content) {
                return Buffer.from(response.data.content, 'base64').toString('utf-8');
            }

            throw new Error('محتوى الملف غير متاح');
        } catch (error) {
            // معالجة حالة تجاوز معدل الطلبات
            if (this.isRateLimitExceeded(error)) {
                await this.handleRateLimit(error);
                return this.getFileContent(file);
            }

            // إذا فشل الطلب، حاول استخدام رابط التنزيل المباشر إذا كان متاحًا
            if (file.download_url) {
                logger.info(`محاولة الحصول على محتوى الملف ${file.path} باستخدام رابط التنزيل المباشر`);
                return this.getFileContentByDownloadUrl(file.download_url);
            }

            logger.error(`خطأ في الحصول على محتوى الملف: ${error.message}`);
            throw new Error(`فشل الحصول على محتوى الملف: ${error.message}`);
        }
    }

    /**
     * الحصول على محتوى ملف باستخدام رابط التنزيل المباشر
     * @param {string} downloadUrl - رابط التنزيل المباشر
     * @returns {Promise<string>} محتوى الملف
     */
    async getFileContentByDownloadUrl(downloadUrl) {
        try {
            // إضافة تأخير بين الطلبات
            await this.delay(this.requestDelay);

            const response = await axios.get(downloadUrl);

            // إذا كان الرد عبارة عن نص، أعد النص مباشرة
            if (typeof response.data === 'string') {
                return response.data;
            }

            // إذا كان الرد عبارة عن كائن، حاول تحويله إلى نص
            return JSON.stringify(response.data);
        } catch (error) {
            logger.error(`خطأ في الحصول على محتوى الملف من رابط التنزيل: ${error.message}`);
            throw new Error(`فشل الحصول على محتوى الملف من رابط التنزيل: ${error.message}`);
        }
    }
}

module.exports = new GitHubService();