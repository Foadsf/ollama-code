import { jest } from '@jest/globals';

describe('SystemMonitor', () => {
    let SystemMonitor;
    let monitor;
    let mockOllamaClient;
    let mockBashTool;
    let mockFileReadTool;
    let mockAuditLogger;

    beforeEach(async () => {
        // Reset module registry
        jest.resetModules();

        // Create mocks
        mockOllamaClient = {
            listModels: jest.fn(),
            chatCompletion: jest.fn(),
            getCacheStats: jest.fn(),
            model: 'test-model'
        };

        mockBashTool = jest.fn();
        mockFileReadTool = jest.fn();
        mockAuditLogger = {
            getAuditSummary: jest.fn()
        };

        // Mock modules BEFORE importing
        jest.doMock('../../../src/ollama.js', () => ({
            getOllamaClient: jest.fn(() => mockOllamaClient)
        }));

        jest.doMock('../../../src/tools/bashTool.js', () => ({
            bashTool: mockBashTool
        }));

        jest.doMock('../../../src/tools/fileReadTool.js', () => ({
            fileReadTool: mockFileReadTool
        }));

        jest.doMock('../../../src/security/auditLogger.js', () => ({
            auditLogger: mockAuditLogger
        }));

        jest.doMock('../../../src/tools/globTool.js', () => ({
            globTool: jest.fn()
        }));

        jest.doMock('../../../src/config.js', () => ({
            listConfig: jest.fn(() => ({ ollamaModel: 'test-model' })),
            getConfig: jest.fn(),
        }));

        // Import AFTER mocking
        const monitorModule = await import('../../../src/diagnostics/monitor.js');
        SystemMonitor = monitorModule.SystemMonitor;
        monitor = new SystemMonitor();
    });

    afterEach(() => {
        jest.resetAllMocks();
        jest.resetModules();
    });

    describe('performHealthCheck', () => {
        test('should perform comprehensive health check', async () => {
            // Setup mocks
            mockOllamaClient.listModels.mockResolvedValue([
                { name: 'test-model', size: '7B' }
            ]);

            mockOllamaClient.chatCompletion.mockResolvedValue({
                message: { content: 'OK test response' }
            });

            mockFileReadTool.mockResolvedValue('{"version": "1.0.0"}');
            mockBashTool.mockResolvedValue('test output');
            mockAuditLogger.getAuditSummary.mockResolvedValue({
                totalEvents: 5,
                securityEvents: 0
            });

            // Execute
            const result = await monitor.performHealthCheck();

            // Verify
            expect(result).toBeDefined();
            expect(result.overall).toBeDefined();
            expect(result.checks).toBeDefined();
            expect(result.checks.ollama).toBeDefined();
            expect(result.checks.system).toBeDefined();
            expect(result.timestamp).toBeDefined();
        });

        test('should handle Ollama connection failure', async () => {
            // Setup mock to fail
            mockOllamaClient.listModels.mockRejectedValue(new Error('Connection failed'));

            // Execute
            const result = await monitor.performHealthCheck();

            // Verify
            expect(result.checks.ollama.status).toBe('error');
            expect(result.checks.ollama.issues).toContain('Ollama connection failed: Connection failed');
        });
    });

    describe('checkOllamaHealth', () => {
        test('should return healthy status for working Ollama', async () => {
            mockOllamaClient.listModels.mockResolvedValue([
                { name: 'test-model' }
            ]);

            mockOllamaClient.chatCompletion.mockResolvedValue({
                message: { content: 'OK' }
            });

            const result = await monitor.checkOllamaHealth();

            expect(result.status).toBe('healthy');
            expect(result.availableModels).toContain('test-model');
            expect(result.responseTime).toBeGreaterThanOrEqual(0);
        });

        test('should detect slow response times', async () => {
            mockOllamaClient.listModels.mockImplementation(() => {
                return new Promise(resolve => {
                    setTimeout(() => resolve([{ name: 'test-model' }]), 6000);
                });
            });

            // Need to use fake timers for this test
            jest.useFakeTimers();
            const promise = monitor.checkOllamaHealth();
            jest.advanceTimersByTime(6000);
            const result = await promise;
            jest.useRealTimers();

            expect(result.issues).toContain(expect.stringContaining('Slow response time'));
        });
    });

    describe('generateDiagnosticReport', () => {
        test('should generate comprehensive diagnostic report', async () => {
            // Setup mocks
            mockFileReadTool.mockResolvedValue('{"version": "1.0.0"}');
            mockOllamaClient.listModels.mockResolvedValue([]);
            mockBashTool.mockResolvedValue('test system info');

            const result = await monitor.generateDiagnosticReport();

            expect(result).toBeDefined();
            expect(result.timestamp).toBeDefined();
            expect(result.version).toBe('1.0.0');
            expect(result.environment).toBeDefined();
            expect(result.healthCheck).toBeDefined();
        });
    });
});
