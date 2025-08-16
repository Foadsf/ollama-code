import { jest } from '@jest/globals';

describe('lsTool', () => {
    let lsTool;
    let mockFs;
    let mockPath;
    let mockGetConfig;
    let mockFileAccessController;

    beforeAll(async () => {
        // This setup is more complex than the user's simplified example,
        // but it's required because the tool itself has dependencies that need mocking.
        // I will use a hybrid approach.

        // Mock dependencies
        mockFs = {
            stat: jest.fn(),
            readdir: jest.fn(),
        };
        jest.unstable_mockModule('fs/promises', () => mockFs);

        mockGetConfig = jest.fn(() => []);
        jest.unstable_mockModule('../../../src/config.js', () => ({
            getConfig: mockGetConfig
        }));

        mockFileAccessController = {
            validateAccess: jest.fn(() => ({ allowed: true }))
        };
        jest.unstable_mockModule('../../../src/security/fileAccessController.js', () => ({
            FileAccessController: jest.fn().mockImplementation(() => mockFileAccessController)
        }));

        // Import the module under test
        const lsToolModule = await import('../../../src/tools/lsTool.js');
        lsTool = lsToolModule.lsTool;
    });

    beforeEach(() => {
        // Reset mock implementations before each test
        mockFs.stat.mockReset();
        mockFs.readdir.mockReset();
        mockGetConfig.mockReturnValue([]);
        mockFileAccessController.validateAccess.mockReturnValue({ allowed: true });
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });

    test('should list directory contents', async () => {
        // Mock file system responses
        mockFs.stat.mockResolvedValue({
            isDirectory: () => true
        });

        mockFs.readdir.mockResolvedValue([
            { name: 'file1.js', isDirectory: () => false },
            { name: 'dir1', isDirectory: () => true }
        ]);

        const result = await lsTool({ path: './test' });

        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(2);
        expect(result[0]).toHaveProperty('name', 'file1.js');
        expect(result[0]).toHaveProperty('type', 'file');
        expect(result[1]).toHaveProperty('name', 'dir1');
        expect(result[1]).toHaveProperty('type', 'directory');
    });

    test('should handle non-existent directory', async () => {
        mockFs.stat.mockRejectedValue({ code: 'ENOENT' });

        await expect(lsTool({ path: './nonexistent' }))
            .rejects
            .toThrow('Directory not found');
    });

    test('should be blocked by FileAccessController', async () => {
        mockFileAccessController.validateAccess.mockReturnValue({
            allowed: false,
            reason: 'Blocked by policy'
        });

        await expect(lsTool({ path: './forbidden' }))
            .rejects
            .toThrow('Directory access denied: Blocked by policy');
    });
});
