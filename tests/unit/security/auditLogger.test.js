import { jest } from '@jest/globals';
import fs from 'fs/promises';

// Mock fs.promises to avoid actual file system writes
const mockFs = {
    appendFile: jest.fn().mockResolvedValue(undefined),
    stat: jest.fn(),
    unlink: jest.fn().mockResolvedValue(undefined),
};
jest.unstable_mockModule('fs/promises', () => mockFs);

// Import the logger AFTER mocking fs
const { AuditLogger } = await import('../../../src/security/auditLogger.js');

describe('AuditLogger', () => {
    let auditLogger;

    beforeEach(async () => {
        jest.clearAllMocks();
        auditLogger = new AuditLogger();
        // Ensure logging is enabled for tests
        auditLogger.isEnabled = true;
    });

    test('should log successful tool executions', async () => {
        await auditLogger.logToolExecution(
            'BashTool',
            { command: 'ls' },
            { success: true }
        );

        expect(mockFs.appendFile).toHaveBeenCalledTimes(1);
        const logEntry = JSON.parse(mockFs.appendFile.mock.calls[0][1]);

        expect(logEntry.type).toBe('tool_execution');
        expect(logEntry.tool).toBe('BashTool');
        expect(logEntry.success).toBe(true);
        expect(logEntry.error).toBeNull();
    });

    test('should log failed tool executions', async () => {
        const error = new Error('Command failed');
        await auditLogger.logToolExecution(
            'BashTool',
            { command: 'invalid-command' },
            { success: false, error: error.message }
        );

        expect(mockFs.appendFile).toHaveBeenCalledTimes(1);
        const logEntry = JSON.parse(mockFs.appendFile.mock.calls[0][1]);

        expect(logEntry.success).toBe(false);
        expect(logEntry.error).toBe('Command failed');
    });

    test('should log security events', async () => {
        await auditLogger.logSecurityEvent(
            'blocked_command',
            { command: 'rm -rf /', reason: 'Dangerous pattern detected' },
            'high'
        );

        expect(mockFs.appendFile).toHaveBeenCalledTimes(1);
        const logEntry = JSON.parse(mockFs.appendFile.mock.calls[0][1]);

        expect(logEntry.type).toBe('security_event');
        expect(logEntry.eventType).toBe('blocked_command');
        expect(logEntry.severity).toBe('high');
    });

    test('should log permission requests', async () => {
        await auditLogger.logPermissionRequest(
            'BashTool',
            { command: 'sudo apt update' },
            true,
            false
        );

        expect(mockFs.appendFile).toHaveBeenCalledTimes(1);
        const logEntry = JSON.parse(mockFs.appendFile.mock.calls[0][1]);

        expect(logEntry.type).toBe('permission_request');
        expect(logEntry.granted).toBe(true);
        expect(logEntry.permanent).toBe(false);
    });

    test('clearLogs should attempt to delete the log file', async () => {
        await auditLogger.clearLogs();
        expect(mockFs.unlink).toHaveBeenCalledWith(auditLogger.logPath);
    });
});
