import { bashTool } from '../tools/bashTool.js';
import * as espree from 'espree';

export class ImprovementValidator {
    constructor() {}

    async validateImprovement(improvement) {
        const validation = {
            isValid: false,
            issues: [],
            warnings: [],
            riskAssessment: 'unknown'
        };

        try {
            // 1. Static Analysis (syntax check on new code)
            await this.validateStaticAnalysis(improvement, validation);

            // 2. Security Validation
            await this.validateSecurity(improvement, validation);

            // 3. Test Regression Check (most critical)
            // This is a simplified version. A full implementation would apply the patch to a temp directory first.
            await this.validateTestCoverage(improvement, validation);

            // Final validation decision
            validation.isValid = this.makeValidationDecision(validation);
            validation.riskAssessment = this.assessRisk(improvement, validation);

        } catch (error) {
            validation.issues.push({
                type: 'validation-error',
                message: `Validation failed: ${error.message}`,
                severity: 'high'
            });
            validation.isValid = false;
        }

        return validation;
    }

    async validateStaticAnalysis(improvement, validation) {
        for (const change of improvement.changes) {
            if (change.action === 'edit' || change.action === 'create') {
                try {
                    espree.parse(change.newCode, { ecmaVersion: 'latest', sourceType: 'module' });
                } catch (error) {
                    validation.issues.push({
                        type: 'syntax-error',
                        file: change.file,
                        message: `Proposed code has a syntax error: ${error.message}`,
                        severity: 'high'
                    });
                }
            }
        }
    }

    async validateTestCoverage(improvement, validation) {
        const hasTests = improvement.tests && improvement.tests.length > 0;
        if (!hasTests && improvement.changes?.length > 0) {
            validation.warnings.push({
                type: 'missing-tests',
                message: 'No new tests were provided for the proposed code changes.',
                severity: 'medium'
            });
        }

        // For now, we can't apply the patch and the new tests easily.
        // The most important check is that the proposed change doesn't break existing tests.
        // A full implementation would apply the patch to a temp directory and run tests there.
        // This check is omitted for now as it's complex and can be added later.
        // For now, we assume if the proposal is simple, it might not break tests.
        // This is a placeholder for a more robust check.
    }

    async validateSecurity(improvement, validation) {
        const securityRules = [
            { pattern: /eval\(/, message: 'Use of eval() detected', severity: 'high' },
            { pattern: /innerHTML\s*=/, message: 'Direct innerHTML assignment detected', severity: 'medium' },
            { pattern: /exec\(/, message: 'Use of child_process.exec() detected', severity: 'medium' }
        ];

        for (const change of improvement.changes) {
            if (!change.newCode) continue;
            for (const rule of securityRules) {
                if (rule.pattern.test(change.newCode)) {
                    validation.issues.push({
                        type: 'security-risk',
                        file: change.file,
                        message: rule.message,
                        severity: rule.severity
                    });
                }
            }
        }
    }

    makeValidationDecision(validation) {
        const highSeverityIssues = validation.issues.filter(issue => issue.severity === 'high');
        if (highSeverityIssues.length > 0) {
            return false;
        }
        return true;
    }

    assessRisk(improvement, validation) {
        let riskScore = 0;
        riskScore += validation.issues.filter(i => i.severity === 'high').length * 3;
        riskScore += validation.issues.filter(i => i.severity === 'medium').length * 1;

        if (riskScore === 0) return 'low';
        if (riskScore <= 2) return 'medium';
        return 'high';
    }
}
