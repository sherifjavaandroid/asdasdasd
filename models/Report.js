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
     * تعيين حالة التقرير
     * @param {string} status - حالة التقرير الجديدة
     */
    setStatus(status) {
        this.status = status;
        if (status === 'completed') {
            this.completedAt = new Date();
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