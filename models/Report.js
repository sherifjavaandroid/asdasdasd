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
        }
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