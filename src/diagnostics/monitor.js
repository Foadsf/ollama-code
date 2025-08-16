import { getOllamaClient } from '../ollama.js';
import { auditLogger } from '../security/auditLogger.js';
import { bashTool } from '../tools/bashTool.js';
import { fileReadTool } from '../tools/fileReadTool.js';
import { globTool } from '../tools/globTool.js';

export class SystemMonitor {
    constructor() {
        this.healthChecks = new Map();
        this.diagnosticHistory = [];
        this.alertThresholds = {
            responseTime: 5000, // 5 seconds
            memoryUsage: 0.85,  // 85%
            diskSpace: 0.90,    // 90%
            errorRate: 0.10     // 10%
        };
    }

    async performHealthCheck() {
        const healthReport = {
            timestamp: new Date().toISOString(),
            overall: 'unknown',
            checks: {},
            recommendations: []
        };

        console.log('🔍 Running comprehensive health check...');

        // 1. Ollama Service Health
        healthReport.checks.ollama = await this.checkOllamaHealth();

        // 2. System Resources
        healthReport.checks.system = await this.checkSystemResources();

        // 3. File System Health
        healthReport.checks.fileSystem = await this.checkFileSystemHealth();

        // 4. Configuration Validation
        healthReport.checks.configuration = await this.checkConfiguration();

        // 5. Security Status
        healthReport.checks.security = await this.checkSecurityStatus();

        // 6. Performance Metrics
        healthReport.checks.performance = await this.checkPerformanceMetrics();

        // Determine overall health
        healthReport.overall = this.calculateOverallHealth(healthReport.checks);

        // Generate recommendations
        healthReport.recommendations = this.generateRecommendations(healthReport.checks);

        this.diagnosticHistory.push(healthReport);
        return healthReport;
    }

    async checkOllamaHealth() {
        const check = {
            status: 'unknown',
            responseTime: null,
            availableModels: [],
            currentModel: null,
            issues: [],
            details: {}
        };

        try {
            const startTime = Date.now();
            const ollama = getOllamaClient();

            // Test basic connectivity
            const models = await ollama.listModels();
            check.responseTime = Date.now() - startTime;
            check.availableModels = models.map(m => m.name);
            check.currentModel = ollama.model;

            if (check.responseTime > this.alertThresholds.responseTime) {
                check.issues.push(`Slow response time: ${check.responseTime}ms`);
            }

            if (models.length === 0) {
                check.issues.push('No models available');
                check.status = 'warning';
            } else if (!models.find(m => m.name === ollama.model)) {
                check.issues.push(`Configured model '${ollama.model}' not found`);
                check.status = 'warning';
            } else {
                check.status = 'healthy';
            }

            // Test basic completion
            try {
                const testResponse = await ollama.chatCompletion({
                    messages: [{ role: 'user', content: 'Test: respond with "OK"' }],
                    useCache: false
                });

                if (!testResponse.message?.content?.includes('OK')) {
                    check.issues.push('Model not responding correctly to test prompt');
                    check.status = 'warning';
                }
            } catch (error) {
                check.issues.push(`Model completion test failed: ${error.message}`);
                check.status = 'error';
            }

        } catch (error) {
            check.status = 'error';
            check.issues.push(`Ollama connection failed: ${error.message}`);
        }

        return check;
    }

    async checkSystemResources() {
        const check = {
            status: 'unknown',
            memory: {},
            disk: {},
            cpu: {},
            issues: []
        };

        try {
            // Memory usage
            const memUsage = process.memoryUsage();
            check.memory = {
                used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
                total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
                usage: memUsage.heapUsed / memUsage.heapTotal
            };

            if (check.memory.usage > this.alertThresholds.memoryUsage) {
                check.issues.push(`High memory usage: ${Math.round(check.memory.usage * 100)}%`);
            }

            // Disk space (approximate check)
            try {
                const diskInfo = await bashTool({
                    command: process.platform === 'win32' ? 'dir /-c' : 'df -h .',
                    timeout: 5000
                });

                check.disk.info = diskInfo;
                // Parse disk usage if needed

            } catch (error) {
                check.issues.push('Could not check disk space');
            }

            // CPU usage (basic check via load average on Unix)
            if (process.platform !== 'win32') {
                try {
                    const loadavg = await bashTool({
                        command: 'cat /proc/loadavg',
                        timeout: 2000
                    });
                    check.cpu.loadavg = loadavg.trim().split(' ')[0];
                } catch (error) {
                    // Load average check failed, not critical
                }
            }

            check.status = check.issues.length === 0 ? 'healthy' : 'warning';

        } catch (error) {
            check.status = 'error';
            check.issues.push(`System resource check failed: ${error.message}`);
        }

        return check;
    }

    async checkFileSystemHealth() {
        const check = {
            status: 'unknown',
            projectStructure: {},
            permissions: {},
            issues: []
        };

        try {
            // Check critical files exist
            const criticalFiles = [
                'package.json',
                'src/index.js',
                'src/cli.js',
                'src/repl.js',
                'bin/ollama-code.js'
            ];

            for (const file of criticalFiles) {
                try {
                    await fileReadTool({ path: file });
                    check.projectStructure[file] = 'exists';
                } catch (error) {
                    check.projectStructure[file] = 'missing';
                    check.issues.push(`Critical file missing: ${file}`);
                }
            }

            // Check node_modules
            try {
                const nodeModules = await globTool({ pattern: 'node_modules/*', onlyDirectories: true });
                check.projectStructure.nodeModules = nodeModules.length;

                if (nodeModules.length === 0) {
                    check.issues.push('No dependencies installed (run npm install)');
                }
            } catch (error) {
                check.issues.push('Could not check node_modules');
            }

            // Check write permissions
            try {
                const testFile = `.olc-permission-test-${Date.now()}`;
                await bashTool({ command: `touch ${testFile} && rm ${testFile}` });
                check.permissions.write = true;
            } catch (error) {
                check.permissions.write = false;
                check.issues.push('No write permission in current directory');
            }

            check.status = check.issues.length === 0 ? 'healthy' : 'warning';

        } catch (error) {
            check.status = 'error';
            check.issues.push(`File system check failed: ${error.message}`);
        }

        return check;
    }

    async checkConfiguration() {
        const check = {
            status: 'unknown',
            config: {},
            issues: [],
            warnings: []
        };

        try {
            // Import config dynamically to avoid circular dependencies
            const { listConfig } = await import('../config.js');
            const config = listConfig();

            check.config = config;

            // Validate critical configuration
            if (!config.ollamaBaseUrl) {
                check.issues.push('Ollama base URL not configured');
            }

            if (!config.ollamaModel) {
                check.issues.push('Ollama model not configured');
            }

            if (!config.securityProfile) {
                check.warnings.push('Security profile not explicitly set');
            }

            // Check for reasonable limits
            if (config.maxTokens > 8000) {
                check.warnings.push('Max tokens setting is very high');
            }

            check.status = check.issues.length === 0 ? 'healthy' : 'warning';

        } catch (error) {
            check.status = 'error';
            check.issues.push(`Configuration check failed: ${error.message}`);
        }

        return check;
    }

    async checkSecurityStatus() {
        const check = {
            status: 'unknown',
            profile: null,
            auditLog: {},
            issues: [],
            warnings: []
        };

        try {
            // Check security profile
            const { getConfig } = await import('../config.js');
            check.profile = getConfig('securityProfile') || 'moderate';

            if (check.profile === 'permissive') {
                check.warnings.push('Using permissive security profile - consider stricter settings for production');
            }

            // Check audit logging
            try {
                const auditSummary = await auditLogger.getAuditSummary(24);
                check.auditLog = auditSummary;

                if (auditSummary.securityEvents > 10) {
                    check.warnings.push(`High number of security events: ${auditSummary.securityEvents}`);
                }
            } catch (error) {
                check.warnings.push('Could not access audit log');
            }

            check.status = check.issues.length === 0 ? 'healthy' : 'warning';

        } catch (error) {
            check.status = 'error';
            check.issues.push(`Security check failed: ${error.message}`);
        }

        return check;
    }

    async checkPerformanceMetrics() {
        const check = {
            status: 'unknown',
            cacheStats: {},
            responseTime: null,
            issues: []
        };

        try {
            // Check AI cache performance
            const ollama = getOllamaClient();
            if (ollama.getCacheStats) {
                check.cacheStats = ollama.getCacheStats();

                if (check.cacheStats.hitRate < 0.3) {
                    check.issues.push(`Low cache hit rate: ${Math.round(check.cacheStats.hitRate * 100)}%`);
                }
            }

            // Test response time
            const startTime = Date.now();
            try {
                await ollama.chatCompletion({
                    messages: [{ role: 'user', content: 'ping' }],
                    useCache: true
                });
                check.responseTime = Date.now() - startTime;

                if (check.responseTime > this.alertThresholds.responseTime) {
                    check.issues.push(`Slow response time: ${check.responseTime}ms`);
                }
            } catch (error) {
                check.issues.push('Performance test failed');
            }

            check.status = check.issues.length === 0 ? 'healthy' : 'warning';

        } catch (error) {
            check.status = 'error';
            check.issues.push(`Performance check failed: ${error.message}`);
        }

        return check;
    }

    calculateOverallHealth(checks) {
        const statuses = Object.values(checks).map(check => check.status);

        if (statuses.includes('error')) {
            return 'error';
        } else if (statuses.includes('warning')) {
            return 'warning';
        } else if (statuses.every(status => status === 'healthy')) {
            return 'healthy';
        } else {
            return 'unknown';
        }
    }

    generateRecommendations(checks) {
        const recommendations = [];

        // Ollama recommendations
        if (checks.ollama?.status === 'error') {
            recommendations.push({
                priority: 'high',
                category: 'ollama',
                title: 'Fix Ollama Connection',
                description: 'Ensure Ollama is running and accessible',
                action: 'Run: ollama serve'
            });
        }

        if (checks.ollama?.responseTime > this.alertThresholds.responseTime) {
            recommendations.push({
                priority: 'medium',
                category: 'performance',
                title: 'Improve Ollama Performance',
                description: 'Consider using a faster model or upgrading hardware',
                action: 'Try: olc config set ollamaModel llama2:7b'
            });
        }

        // System recommendations
        if (checks.system?.memory?.usage > this.alertThresholds.memoryUsage) {
            recommendations.push({
                priority: 'medium',
                category: 'system',
                title: 'High Memory Usage',
                description: 'Consider restarting OLC or clearing caches',
                action: 'Use: /clear command in REPL'
            });
        }

        // File system recommendations
        if (checks.fileSystem?.projectStructure?.nodeModules === 0) {
            recommendations.push({
                priority: 'high',
                category: 'setup',
                title: 'Install Dependencies',
                description: 'Project dependencies are not installed',
                action: 'Run: npm install'
            });
        }

        // Security recommendations
        if (checks.security?.profile === 'permissive') {
            recommendations.push({
                priority: 'low',
                category: 'security',
                title: 'Consider Stricter Security',
                description: 'Using permissive security profile',
                action: 'Run: olc config set securityProfile moderate'
            });
        }

        return recommendations;
    }

    async generateDiagnosticReport() {
        console.log('📋 Generating comprehensive diagnostic report...');

        const report = {
            timestamp: new Date().toISOString(),
            version: await this.getVersion(),
            environment: this.getEnvironmentInfo(),
            healthCheck: await this.performHealthCheck(),
            recentHistory: this.diagnosticHistory.slice(-5),
            systemInfo: await this.getSystemInfo()
        };

        return report;
    }

    async getVersion() {
        try {
            const packageJson = await fileReadTool({ path: 'package.json' });
            return JSON.parse(packageJson).version;
        } catch (error) {
            return 'unknown';
        }
    }

    getEnvironmentInfo() {
        return {
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            cwd: process.cwd(),
            uptime: process.uptime()
        };
    }

    async getSystemInfo() {
        const info = {
            memory: process.memoryUsage(),
            cpuUsage: process.cpuUsage(),
            env: {
                NODE_ENV: process.env.NODE_ENV,
                PATH: process.env.PATH?.split(':').length || 0
            }
        };

        // Add OS-specific info
        try {
            if (process.platform !== 'win32') {
                const osInfo = await bashTool({ command: 'uname -a', timeout: 2000 });
                info.os = osInfo.trim();
            }
        } catch (error) {
            // OS info not critical
        }

        return info;
    }

    async performanceProfile() {
        console.log('⚡ Starting performance profiling...');

        const profile = {
            timestamp: new Date().toISOString(),
            tests: []
        };

        // Test AI response time
        const aiTest = await this.profileAIPerformance();
        profile.tests.push(aiTest);

        // Test file operations
        const fileTest = await this.profileFileOperations();
        profile.tests.push(fileTest);

        // Test tool execution
        const toolTest = await this.profileToolExecution();
        profile.tests.push(toolTest);

        return profile;
    }

    async profileAIPerformance() {
        const test = {
            name: 'AI Response Performance',
            metrics: {}
        };

        try {
            const ollama = getOllamaClient();

            // Test cached vs uncached
            const startUncached = Date.now();
            await ollama.chatCompletion({
                messages: [{ role: 'user', content: 'performance test query' }],
                useCache: false
            });
            test.metrics.uncachedTime = Date.now() - startUncached;

            const startCached = Date.now();
            await ollama.chatCompletion({
                messages: [{ role: 'user', content: 'performance test query' }],
                useCache: true
            });
            test.metrics.cachedTime = Date.now() - startCached;

            test.metrics.cacheEffectiveness = test.metrics.uncachedTime / test.metrics.cachedTime;

        } catch (error) {
            test.error = error.message;
        }

        return test;
    }

    async profileFileOperations() {
        const test = {
            name: 'File Operation Performance',
            metrics: {}
        };

        try {
            // Test file reading
            const startRead = Date.now();
            await fileReadTool({ path: 'package.json' });
            test.metrics.readTime = Date.now() - startRead;

            // Test glob operations
            const startGlob = Date.now();
            await globTool({ pattern: '*.js' });
            test.metrics.globTime = Date.now() - startGlob;

        } catch (error) {
            test.error = error.message;
        }

        return test;
    }

    async profileToolExecution() {
        const test = {
            name: 'Tool Execution Performance',
            metrics: {}
        };

        try {
            // Test simple bash command
            const startBash = Date.now();
            await bashTool({ command: 'echo "test"' });
            test.metrics.bashTime = Date.now() - startBash;

        } catch (error) {
            test.error = error.message;
        }

        return test;
    }
}

// Export singleton instance
export const systemMonitor = new SystemMonitor();
