import { jest } from '@jest/globals';

describe('SystemMonitor', () => {
    let SystemMonitor;
    let monitor;
    let mockOllamaClient;

    beforeEach(async () => {
        // Reset modules to ensure mocks are clean for each test
        jest.resetModules();

        // Mock all dependencies first
        mockOllamaClient = {
            listModels: jest.fn().mockResolvedValue([{ name: 'test-model' }]),
            chatCompletion: jest.fn().mockResolvedValue({ message: { content: 'OK' } }),
        };
        jest.doMock('../../../src/ollama.js', () => ({
            getOllamaClient: () => mockOllamaClient,
        }));

        jest.doMock('../../../src/security/auditLogger.js', () => ({
            auditLogger: { getAuditSummary: jest.fn().mockResolvedValue({}) },
        }));

        jest.doMock('../../../src/tools/bashTool.js', () => ({ bashTool: jest.fn() }));
        jest.doMock('../../../src/tools/fileReadTool.js', () => ({ fileReadTool: jest.fn() }));
        jest.doMock('../../../src/tools/globTool.js', () => ({ globTool: jest.fn() }));
        jest.doMock('../../../src/config.js', () => ({
            listConfig: jest.fn(() => ({})),
            getConfig: jest.fn(),
        }));

        // Import after all mocks are set up
        const { SystemMonitor: SM } = await import('../../../src/diagnostics/monitor.js');
        SystemMonitor = SM;
        monitor = new SystemMonitor();
    });

    test('should create SystemMonitor instance', () => {
        expect(monitor).toBeInstanceOf(SystemMonitor);
        expect(monitor.alertThresholds).toBeDefined();
    });

    test('calculateOverallHealth should return healthy when all checks are healthy', () => {
        const checks = {
            ollama: { status: 'healthy' },
            system: { status: 'healthy' },
        };
        expect(monitor.calculateOverallHealth(checks)).toBe('healthy');
    });

    test('calculateOverallHealth should return error if any check is an error', () => {
        const checks = {
            ollama: { status: 'error' },
            system: { status: 'healthy' },
        };
        expect(monitor.calculateOverallHealth(checks)).toBe('error');
    });

    test('calculateOverallHealth should return warning if any check is a warning', () => {
        const checks = {
            ollama: { status: 'warning' },
            system: { status: 'healthy' },
        };
        expect(monitor.calculateOverallHealth(checks)).toBe('warning');
    });
});
