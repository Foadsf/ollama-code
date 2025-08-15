import { globTool } from '../tools/globTool.js';
import { fileReadTool } from '../tools/fileReadTool.js';
import { grepTool } from '../tools/grepTool.js';
import * as espree from 'espree';
import { simple as walk } from 'acorn-walk';

export class CodeAnalyzer {
    constructor() {
        this.metrics = new Map();
        this.patterns = new Map();
        this.dependencies = new Map();
        this.issues = [];
        this.recommendations = [];
    }

    async analyzeCodebase() {
        // For now, we only call analyzeStructure as per the plan step.
        // The other analysis types will be added in subsequent steps.
        const analysis = {
            structure: await this.analyzeStructure(),
            quality: await this.analyzeQuality(),
            security: await this.analyzeSecurity(),
            // performance: await this.analyzePerformance(),
            // maintainability: await this.analyzeMaintainability(),
            // testCoverage: await this.analyzeTestCoverage(),
            // dependencies: await this.analyzeDependencies()
        };

        // this.generateRecommendations(analysis);
        return analysis;
    }

    async analyzeStructure() {
        // Analyze project structure for patterns and anti-patterns
        const files = await globTool({ pattern: '**/*.js' });

        // The other methods are placeholders for now and will be implemented later.
        return {
            fileCount: files.length,
            // directoryStructure: await this.mapDirectoryStructure(),
            // moduleComplexity: await this.calculateModuleComplexity(files),
            // circularDependencies: await this.detectCircularDependencies(files),
            // codeOrganization: await this.assessCodeOrganization(files)
        };
    }

    async analyzeQuality() {
        // Code quality metrics
        const files = await globTool({ pattern: 'src/**/*.js' });
        let totalComplexity = 0;
        let totalLines = 0;
        const issues = [];

        for (const file of files) {
            const content = await fileReadTool({ path: file });
            const analysis = await this.analyzeFile(content, file);

            totalComplexity += analysis.complexity;
            totalLines += analysis.lines;
            issues.push(...analysis.issues);
        }

        return {
            averageComplexity: files.length > 0 ? totalComplexity / files.length : 0,
            totalLines,
            codeSmells: issues.filter(i => i.type === 'smell'),
            // duplicateCode: await this.detectDuplicateCode(files),
            // technicalDebt: this.calculateTechnicalDebt(issues)
        };
    }

    async analyzeFile(content, filePath) {
        // Individual file analysis using AST
        try {
            const ast = espree.parse(content, {
                ecmaVersion: 'latest',
                sourceType: 'module',
                loc: true, // Include line and column numbers
            });

            return {
                complexity: this.calculateCyclomaticComplexity(ast),
                lines: content.split('\n').length,
                // functions: this.extractFunctions(ast),
                // imports: this.extractImports(ast),
                // exports: this.extractExports(ast),
                issues: [] // this.detectCodeIssues(ast, content, filePath)
            };
        } catch (error) {
            return {
                complexity: 0,
                lines: content.split('\n').length,
                functions: [],
                imports: [],
                exports: [],
                issues: [{ type: 'syntax-error', message: error.message, file: filePath }]
            };
        }
    }

    async analyzeSecurity() {
        // Security vulnerability detection
        const vulnerabilities = [];

        // Check for common security issues
        const dangerousPatterns = [
            { pattern: 'eval\\(', severity: 'high', type: 'code-injection' },
            { pattern: 'innerHTML\\s*=', severity: 'medium', type: 'xss' },
            { pattern: '\\.exec\\(', severity: 'medium', type: 'command-injection' }
        ];

        for (const { pattern, severity, type } of dangerousPatterns) {
            const results = await grepTool({
                pattern,
                // In grepTool, `regex: true` is not an option, the pattern is the regex
                glob: 'src/**/*.js'
            });

            vulnerabilities.push(...(results || []).map(result => ({
                file: result.file,
                line: result.line,
                severity,
                type,
                description: `Potentially dangerous pattern: ${pattern}`
            })));
        }

        return {
            vulnerabilities,
            // securityScore: this.calculateSecurityScore(vulnerabilities),
            // recommendations: this.generateSecurityRecommendations(vulnerabilities)
        };
    }

    calculateCyclomaticComplexity(ast) {
        let complexity = 1;

        walk(ast, {
            IfStatement(node) {
                complexity++;
                if (node.alternate) {
                    // Don't count 'else if' as a separate complexity, as it's part of the 'if' chain.
                    // A simple 'else' does not add complexity. This is a simplification.
                }
            },
            ForStatement() { complexity++; },
            ForInStatement() { complexity++; },
            ForOfStatement() { complexity++; },
            WhileStatement() { complexity++; },
            DoWhileStatement() { complexity++; },
            SwitchCase() { complexity++; },
            ConditionalExpression() { complexity++; },
            LogicalExpression(node) {
                if (node.operator === '&&' || node.operator === '||') {
                    complexity++;
                }
            }
        });

        return complexity;
    }
}
