import { CodeAnalyzer } from './analyzer.js';
import { ImprovementProposer } from './proposer.js';
import { ImprovementValidator } from './validator.js';
import { ImprovementExecutor } from './executor.js';
import { progressManager } from '../performance/progressManager.js';

export class SelfImprovementEngine {
    constructor(options = {}) {
        this.analyzer = new CodeAnalyzer();
        this.proposer = new ImprovementProposer();
        this.validator = new ImprovementValidator();
        this.executor = new ImprovementExecutor();

        this.options = {
            maxImprovementsPerCycle: 3,
            autoApprove: false,
            riskThreshold: 'medium', // low, medium, high
            ...options
        };

        this.isRunning = false;
        this.cycleCount = 0;
        this.totalImprovements = 0;
    }

    async runImprovementCycle() {
        if (this.isRunning) {
            throw new Error('Improvement cycle already running');
        }

        this.isRunning = true;
        this.cycleCount++;

        const operationId = progressManager.createOperation('Running improvement cycle', 4);

        try {
            // 1. Analyze current state
            progressManager.updateProgress(operationId, 1, 'Analyzing codebase...');
            const analysis = await this.analyzer.analyzeCodebase();

            // 2. Generate improvements
            progressManager.updateProgress(operationId, 2, 'Generating improvement proposals...');
            const proposals = await this.proposer.proposeImprovements(analysis);

            if (proposals.length === 0) {
                progressManager.completeOperation(operationId, 'No improvements needed - codebase is in good shape!');
                this.isRunning = false;
                return { improvements: 0, analysis };
            }

            // 3. Process improvements
            progressManager.updateProgress(operationId, 3, 'Validating and executing proposals...');
            const results = [];
            const maxImprovements = Math.min(proposals.length, this.options.maxImprovementsPerCycle);

            for (let i = 0; i < maxImprovements; i++) {
                const proposal = proposals[i];

                const validation = await this.validator.validateImprovement(proposal);

                if (validation.isValid && this.shouldApplyImprovement(proposal, validation)) {
                    const execution = await this.executor.executeImprovement(proposal, validation);
                    if (execution.success) {
                        this.totalImprovements++;
                    }
                    results.push({ proposal, validation, execution });
                } else {
                    results.push({ proposal, validation, execution: null });
                }
            }

            progressManager.updateProgress(operationId, 4, 'Finalizing cycle...');
            const improvementsApplied = results.filter(r => r.execution?.success).length;
            progressManager.completeOperation(operationId, `Cycle complete: ${improvementsApplied} improvements applied.`);

            return {
                cycle: this.cycleCount,
                improvements: improvementsApplied,
                total: this.totalImprovements,
                analysis,
                results
            };

        } catch(error) {
            progressManager.failOperation(operationId, error.message);
            throw error;
        }
        finally {
            this.isRunning = false;
        }
    }

    shouldApplyImprovement(proposal, validation) {
        // Risk-based decision making
        const riskLevels = { low: 1, medium: 2, high: 3 };
        const thresholdLevels = { low: 1, medium: 2, high: 3 };

        if (riskLevels[validation.riskAssessment] > thresholdLevels[this.options.riskThreshold]) {
            return false;
        }

        // Auto-approve if configured
        if (this.options.autoApprove) {
            return true;
        }

        // For now, approve low-risk improvements automatically
        return validation.riskAssessment === 'low';
    }
}
