const { generateUniqueId } = require('../utils/helpers');

/**
 * نموذج تقرير التحليل
 * ملاحظة: هذا نموذج بسيط في الذاكرة. في تطبيق الإنتاج، قد ترغب في استخدام قاعدة بيانات.
 */
class Report {
    /**
     * إنشاء تقرير تحليل جديد
     * @param {Object} data - بيانات التقرير
     */
    constructor(data = {}) {
        this.id = data.id || generateUniqueId();
        this.repoUrl = data.repoUrl || '';
        this.repoOwner = data.repoOwner || '';
        this.repoName = data.repoName || '';
        this.appType = data.appType || 'unknown';
        this.createdAt = data.createdAt || new Date();
        this.completedAt = data.completedAt || null;
        this.status = data.status || 'pending'; // pending, processing, completed, failed
        this.summary = data.summary || {
            security: {
                critical: 0,
                high: 0,
                medium: 0,
                low: 0,
                info: 0,
                total: 0,
            },
            performance: {
                issues: 0,
                recommendations: 0,
            },
            memory: {
                issues: 0,
                recommendations: 0,
            },
            battery: {
                issues: 0,
                recommendations: 0,
            },
        };
        this.findings = data.findings || {
            security: [],
            performance: [],
            memory: [],
            battery: [],
        };
        this.error = data.error || null;
    }

    /**
     * إنشاء ملخص للنتائج
     * هذه الطريقة تحسب مجموع النتائج في كل فئة وتحدّث الملخص
     */
    createSummary() {
        // التأكد من وجود بنية صحيحة للملخص
        this.ensureSummaryStructure();

        // إعادة حساب ملخص الأمان
        if (this.findings.security && this.findings.security.length > 0) {
            // إعادة تعيين العدادات
            this.summary.security.critical = 0;
            this.summary.security.high = 0;
            this.summary.security.medium = 0;
            this.summary.security.low = 0;
            this.summary.security.info = 0;

            // حساب مجموع كل مستوى خطورة
            for (const finding of this.findings.security) {
                if (finding.severity && typeof finding.severity === 'string') {
                    const severity = finding.severity.toLowerCase();
                    if (this.summary.security[severity] !== undefined) {
                        this.summary.security[severity]++;
                    }
                }
            }

            // حساب المجموع الكلي
            this.summary.security.total =
                this.summary.security.critical +
                this.summary.security.high +
                this.summary.security.medium +
                this.summary.security.low +
                this.summary.security.info;

            // ترتيب النتائج حسب الخطورة ونقل النتائج "لم يتم العثور على مشكلات" إلى آخر القائمة
            this.findings.security.sort((a, b) => {
                // تحقق من وجود عنوان "لم يتم العثور على مشكلات"
                const isANoIssues = a.title && a.title.includes('لم يتم العثور على مشكلات');
                const isBNoIssues = b.title && b.title.includes('لم يتم العثور على مشكلات');

                // إذا كان إحداهما "لم يتم العثور على مشكلات"، نضعه في النهاية
                if (isANoIssues && !isBNoIssues) return 1;
                if (!isANoIssues && isBNoIssues) return -1;

                // إذا كان كلاهما نفس النوع، نرتب حسب الخطورة
                const severityOrder = {
                    'critical': 0,
                    'high': 1,
                    'medium': 2,
                    'low': 3,
                    'info': 4
                };

                const severityA = a.severity ? a.severity.toLowerCase() : 'info';
                const severityB = b.severity ? b.severity.toLowerCase() : 'info';

                // ترتيب أولاً حسب الخطورة
                if (severityOrder[severityA] !== severityOrder[severityB]) {
                    return severityOrder[severityA] - severityOrder[severityB];
                }

                // في حالة تساوي الخطورة، نرتب حسب العنوان
                return (a.title || '').localeCompare(b.title || '');
            });

            // تجميع المشاكل حسب النوع
            this.groupFindingsByType('security');
        }

        // إعادة حساب ملخص الأداء
        if (this.findings.performance && this.findings.performance.length > 0) {
            this.summary.performance.issues = 0;
            this.summary.performance.recommendations = 0;

            for (const finding of this.findings.performance) {
                if (finding.type === 'issue') {
                    this.summary.performance.issues++;
                } else if (finding.type === 'recommendation') {
                    this.summary.performance.recommendations++;
                }
            }

            // ترتيب نتائج الأداء - ضع القضايا أولاً، ثم التوصيات، ثم "لم يتم العثور على مشكلات"
            this.findings.performance.sort((a, b) => {
                // تحقق من وجود عنوان "لم يتم العثور على مشكلات"
                const isANoIssues = a.title && a.title.includes('لم يتم العثور على مشكلات');
                const isBNoIssues = b.title && b.title.includes('لم يتم العثور على مشكلات');

                // إذا كان إحداهما "لم يتم العثور على مشكلات"، نضعه في النهاية
                if (isANoIssues && !isBNoIssues) return 1;
                if (!isANoIssues && isBNoIssues) return -1;

                // ترتيب حسب النوع (قضية أولاً، ثم توصية)
                const typeOrder = { 'issue': 0, 'recommendation': 1 };
                const typeA = a.type || 'recommendation';
                const typeB = b.type || 'recommendation';

                // ترتيب أولاً حسب النوع
                if (typeOrder[typeA] !== typeOrder[typeB]) {
                    return typeOrder[typeA] - typeOrder[typeB];
                }

                // ثم ترتيب حسب الخطورة إذا كانت متاحة
                const severityOrder = {
                    'critical': 0,
                    'high': 1,
                    'medium': 2,
                    'low': 3,
                    'info': 4
                };

                const severityA = a.severity ? a.severity.toLowerCase() : 'info';
                const severityB = b.severity ? b.severity.toLowerCase() : 'info';

                if (severityOrder[severityA] !== severityOrder[severityB]) {
                    return severityOrder[severityA] - severityOrder[severityB];
                }

                // في حالة تساوي الخطورة والنوع، نرتب حسب العنوان
                return (a.title || '').localeCompare(b.title || '');
            });

            // تجميع المشاكل حسب النوع
            this.groupFindingsByType('performance');
        }

        // إعادة حساب ملخص الذاكرة
        if (this.findings.memory && this.findings.memory.length > 0) {
            this.summary.memory.issues = 0;
            this.summary.memory.recommendations = 0;

            for (const finding of this.findings.memory) {
                if (finding.type === 'issue') {
                    this.summary.memory.issues++;
                } else if (finding.type === 'recommendation') {
                    this.summary.memory.recommendations++;
                }
            }

            // ترتيب نتائج الذاكرة
            this.findings.memory.sort((a, b) => {
                // تحقق من وجود عنوان "لم يتم العثور على مشكلات"
                const isANoIssues = a.title && a.title.includes('لم يتم العثور على مشكلات');
                const isBNoIssues = b.title && b.title.includes('لم يتم العثور على مشكلات');

                // إذا كان إحداهما "لم يتم العثور على مشكلات"، نضعه في النهاية
                if (isANoIssues && !isBNoIssues) return 1;
                if (!isANoIssues && isBNoIssues) return -1;

                // ترتيب حسب النوع (قضية أولاً، ثم توصية)
                const typeOrder = { 'issue': 0, 'recommendation': 1 };
                const typeA = a.type || 'recommendation';
                const typeB = b.type || 'recommendation';

                // ترتيب أولاً حسب النوع
                if (typeOrder[typeA] !== typeOrder[typeB]) {
                    return typeOrder[typeA] - typeOrder[typeB];
                }

                // ثم ترتيب حسب الخطورة إذا كانت متاحة
                const severityOrder = {
                    'critical': 0,
                    'high': 1,
                    'medium': 2,
                    'low': 3,
                    'info': 4
                };

                const severityA = a.severity ? a.severity.toLowerCase() : 'info';
                const severityB = b.severity ? b.severity.toLowerCase() : 'info';

                if (severityOrder[severityA] !== severityOrder[severityB]) {
                    return severityOrder[severityA] - severityOrder[severityB];
                }

                // في حالة تساوي الخطورة والنوع، نرتب حسب العنوان
                return (a.title || '').localeCompare(b.title || '');
            });

            // تجميع المشاكل حسب النوع
            this.groupFindingsByType('memory');
        }

        // إعادة حساب ملخص البطارية
        if (this.findings.battery && this.findings.battery.length > 0) {
            this.summary.battery.issues = 0;
            this.summary.battery.recommendations = 0;

            for (const finding of this.findings.battery) {
                if (finding.type === 'issue') {
                    this.summary.battery.issues++;
                } else if (finding.type === 'recommendation') {
                    this.summary.battery.recommendations++;
                }
            }

            // ترتيب نتائج البطارية
            this.findings.battery.sort((a, b) => {
                // تحقق من وجود عنوان "لم يتم العثور على مشكلات"
                const isANoIssues = a.title && a.title.includes('لم يتم العثور على مشكلات');
                const isBNoIssues = b.title && b.title.includes('لم يتم العثور على مشكلات');

                // إذا كان إحداهما "لم يتم العثور على مشكلات"، نضعه في النهاية
                if (isANoIssues && !isBNoIssues) return 1;
                if (!isANoIssues && isBNoIssues) return -1;

                // ترتيب حسب النوع (قضية أولاً، ثم توصية)
                const typeOrder = { 'issue': 0, 'recommendation': 1 };
                const typeA = a.type || 'recommendation';
                const typeB = b.type || 'recommendation';

                // ترتيب أولاً حسب النوع
                if (typeOrder[typeA] !== typeOrder[typeB]) {
                    return typeOrder[typeA] - typeOrder[typeB];
                }

                // ثم ترتيب حسب الخطورة إذا كانت متاحة
                const severityOrder = {
                    'critical': 0,
                    'high': 1,
                    'medium': 2,
                    'low': 3,
                    'info': 4
                };

                const severityA = a.severity ? a.severity.toLowerCase() : 'info';
                const severityB = b.severity ? b.severity.toLowerCase() : 'info';

                if (severityOrder[severityA] !== severityOrder[severityB]) {
                    return severityOrder[severityA] - severityOrder[severityB];
                }

                // في حالة تساوي الخطورة والنوع، نرتب حسب العنوان
                return (a.title || '').localeCompare(b.title || '');
            });

            // تجميع المشاكل حسب النوع
            this.groupFindingsByType('battery');
        }
    }

    /**
     * تجميع المشاكل حسب النوع أو الفئة
     * @param {string} category - فئة التحليل (security, performance, memory, battery)
     */
    groupFindingsByType(category) {
        if (!this.findings[category] || this.findings[category].length === 0) {
            return;
        }

        // تجميع المشاكل حسب العنوان
        const groupedByTitle = {};
        const groupedFindings = [];

        for (const finding of this.findings[category]) {
            // استخدام العنوان كمفتاح للتجميع
            const title = finding.title || '';

            // تجاهل الرسائل "لم يتم العثور على مشكلات"
            if (title.includes('لم يتم العثور على مشكلات')) {
                groupedFindings.push(finding);
                continue;
            }

            // إنشاء مفتاح تجميع من العنوان
            if (!groupedByTitle[title]) {
                // نسخ العنصر الأول لهذا النوع
                groupedByTitle[title] = { ...finding, instances: [{ ...finding }] };

                // تحديث الوصف ليعكس أنه مجموعة
                if (groupedByTitle[title].description) {
                    groupedByTitle[title].originalDescription = finding.description;
                }

                // إزالة المعلومات الخاصة بمثيل معين
                delete groupedByTitle[title].lineNumber;
                delete groupedByTitle[title].codeSnippet;
            } else {
                // إضافة هذا المثيل إلى المجموعة
                groupedByTitle[title].instances.push({ ...finding });

                // تحديث عدد المثيلات في الوصف
                const instanceCount = groupedByTitle[title].instances.length;
                if (instanceCount > 1 && groupedByTitle[title].originalDescription) {
                    groupedByTitle[title].description = `تم العثور على ${instanceCount} حالة من هذه المشكلة. ${groupedByTitle[title].originalDescription}`;
                }
            }
        }

        // تحويل المجموعات إلى مصفوفة
        for (const key in groupedByTitle) {
            groupedFindings.push(groupedByTitle[key]);
        }

        // إعادة ترتيب النتائج المجمعة حسب الخطورة
        groupedFindings.sort((a, b) => {
            const severityOrder = {
                'critical': 0,
                'high': 1,
                'medium': 2,
                'low': 3,
                'info': 4
            };

            const severityA = a.severity ? a.severity.toLowerCase() : 'info';
            const severityB = b.severity ? b.severity.toLowerCase() : 'info';

            return severityOrder[severityA] - severityOrder[severityB];
        });

        // تحديث النتائج بالمجموعات المرتبة
        this.findings[category] = groupedFindings;
    }

    /**
     * تعيين حالة التقرير
     * @param {string} status - حالة التقرير الجديدة
     */
    setStatus(status) {
        this.status = status;

        if (status === 'completed') {
            this.completedAt = new Date().toISOString();
            // إنشاء ملخص للنتائج
            this.createSummary();
            // التأكد من وجود بنية صحيحة للملخص
            this.ensureSummaryStructure();
        }
    }

    // إضافة طريقة للتأكد من وجود بنية صحيحة في ملخص التقرير
    ensureSummaryStructure() {
        // التأكد من وجود جميع فئات التحليل في الملخص
        const analysisTypes = ['security', 'performance', 'memory', 'battery'];

        // إذا لم يكن الملخص موجودًا، قم بإنشائه
        if (!this.summary) {
            this.summary = {};
        }

        // إنشاء الهيكل الصحيح لكل نوع تحليل إذا لم يكن موجودًا
        for (const type of analysisTypes) {
            if (!this.summary[type]) {
                if (type === 'security') {
                    this.summary[type] = {
                        critical: 0,
                        high: 0,
                        medium: 0,
                        low: 0,
                        info: 0,
                        total: 0
                    };
                } else {
                    this.summary[type] = {
                        issues: 0,
                        recommendations: 0
                    };
                }
            }
        }
    }

    /**
     * إضافة نتيجة تحليل
     * @param {string} category - فئة التحليل (security, performance, memory, battery)
     * @param {Object} finding - نتيجة التحليل
     */
    addFinding(category, finding) {
        if (!this.findings[category]) {
            this.findings[category] = [];
        }

        this.findings[category].push(finding);

        // تحديث الملخص
        if (category === 'security' && finding.severity) {
            this.summary.security[finding.severity.toLowerCase()]++;
            this.summary.security.total++;
        } else if (['performance', 'memory', 'battery'].includes(category)) {
            if (finding.type === 'issue') {
                this.summary[category].issues++;
            } else if (finding.type === 'recommendation') {
                this.summary[category].recommendations++;
            }
        }
    }

    /**
     * تعيين خطأ في التحليل
     * @param {Error} error - كائن الخطأ
     */
    setError(error) {
        this.error = {
            message: error.message,
            stack: error.stack,
            time: new Date(),
        };
        this.setStatus('failed');
    }

    /**
     * تحويل التقرير إلى كائن JSON
     * @returns {Object} تمثيل JSON للتقرير
     */
    toJSON() {
        return {
            id: this.id,
            repoUrl: this.repoUrl,
            repoOwner: this.repoOwner,
            repoName: this.repoName,
            appType: this.appType,
            createdAt: this.createdAt,
            completedAt: this.completedAt,
            status: this.status,
            summary: this.summary,
            findings: this.findings,
            error: this.error,
        };
    }
}

module.exports = Report;