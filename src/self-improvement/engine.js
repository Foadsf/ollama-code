import { CodeAnalyzer } from './analyzer.js';
import { ImprovementProposer } from './proposer.js';
import { ImprovementValidator } from './validator.js';
import { ImprovementExecutor } from './executor.js';

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

        console.log(`\n🔄 Starting improvement cycle ${this.cycleCount}...`);

        try {
            // 1. Analyze current state
            console.log('📊 Analyzing codebase...');
            const analysis = await this.analyzer.analyzeCodebase();

            // 2. Generate improvements
            console.log('💡 Generating improvement proposals...');
            const proposals = await this.proposer.proposeImprovements(analysis);

            if (proposals.length === 0) {
                console.log('✨ No improvements needed - codebase is in good shape!');
                this.isRunning = false;
                return { improvements: 0, analysis };
            }

            // 3. Process improvements
            const results = [];
            const maxImprovements = Math.min(proposals.length, this.options.maxImprovementsPerCycle);

            for (let i = 0; i < maxImprovements; i++) {
                const proposal = proposals[i];
                console.log(`\n🔍 Validating improvement ${i + 1}/${maxImprovements}: ${proposal.description}`);

                const validation = await this.validator.validateImprovement(proposal);

                if (validation.isValid && this.shouldApplyImprovement(proposal, validation)) {
                    console.log('✅ Applying improvement...');
                    const execution = await this.executor.executeImprovement(proposal, validation);

                    if (execution.success) {
                        this.totalImprovements++;
                        console.log('🎉 Improvement applied successfully!');
                    }

                    results.push({ proposal, validation, execution });
                } else {
                    console.log('❌ Improvement rejected due to validation issues');
                    results.push({ proposal, validation, execution: null });
                }
            }

            return {
                cycle: this.cycleCount,
                improvements: results.filter(r => r.execution?.success).length,
                total: this.totalImprovements,
                analysis,
                results
            };

        } finally {
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
