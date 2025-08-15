import { jest } from '@jest/globals';

// Mock dependencies
const mockSanitizer = { sanitizeCommand: jest.fn() };
jest.unstable_mockModule('../../../src/security/commandSanitizer.js', () => ({
    CommandSanitizer: jest.fn().mockImplementation(() => mockSanitizer)
}));

const mockExec = jest.fn();
jest.unstable_mockModule('child_process', () => ({
    exec: mockExec
}));

const mockConfig = { getConfig: jest.fn() };
jest.unstable_mockModule('../../../src/config.js', () => mockConfig);

// Import the tool AFTER mocking
const { EnhancedBashTool } = await import('../../../src/tools/bashTool.js');

describe('EnhancedBashTool', () => {
    let bashTool;

    beforeEach(() => {
        jest.clearAllMocks();
        bashTool = new EnhancedBashTool();
        // Default mock implementations
        mockSanitizer.sanitizeCommand.mockReturnValue({ blocked: false, warnings: [] });
        mockConfig.getConfig.mockReturnValue('moderate');
    });

    test('should add command to history', async () => {
        mockExec.mockImplementation((cmd, opts, callback) => callback(null, { stdout: 'ok', stderr: '' }));

        await bashTool.execute({ command: 'ls -l' });

        expect(bashTool.commandHistory).toHaveLength(1);
        expect(bashTool.commandHistory[0].command).toBe('ls -l');
    });

    test('should use AbortController for timeouts', async () => {
        // Use fake timers to control setTimeout
        jest.useFakeTimers();

        const command = 'sleep 5';
        const timeout = 100; // 100ms

        // Mock exec to simulate a long-running process
        mockExec.mockImplementation((cmd, opts, callback) => {
            // We can check that the signal is passed
            expect(opts.signal).toBeInstanceOf(AbortSignal);

            // Simulate the command not finishing before the timeout
            opts.signal.onabort = () => {
                const error = new Error('Aborted');
                error.name = 'AbortError';
                callback(error, { stdout: '', stderr: '' });
            };
        });

        const promise = bashTool.execute({ command, timeout });

        // Fast-forward time
        jest.advanceTimersByTime(timeout);

        await expect(promise).rejects.toThrow(`Command timed out after ${timeout}ms and was cancelled`);

        jest.useRealTimers();
    });

    test('should clear timeout on successful execution', async () => {
        const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

        mockExec.mockImplementation((cmd, opts, callback) => callback(null, { stdout: 'ok', stderr: '' }));

        await bashTool.execute({ command: 'echo "hello"' });

        expect(clearTimeoutSpy).toHaveBeenCalled();
        clearTimeoutSpy.mockRestore();
    });
});
