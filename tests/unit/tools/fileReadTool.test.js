import { jest } from '@jest/globals';

// Mock the dependencies of fileReadTool
const mockFileCache = {
    get: jest.fn(),
    set: jest.fn(),
};
jest.unstable_mockModule('../../../src/performance/fileCache.js', () => ({
    FileCache: jest.fn().mockImplementation(() => mockFileCache)
}));

const mockFs = { readFile: jest.fn() };
jest.unstable_mockModule('fs/promises', () => mockFs);

const mockAccessController = { validateAccess: jest.fn() };
jest.unstable_mockModule('../../../src/security/fileAccessController.js', () => ({
    FileAccessController: jest.fn().mockImplementation(() => mockAccessController)
}));

// Import the tool AFTER mocking
const { fileReadTool } = await import('../../../src/tools/fileReadTool.js');
const { ToolError } = await import('../../../src/utils/errors.js');


describe('fileReadTool with Caching', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Default to access being allowed
        mockAccessController.validateAccess.mockReturnValue({ allowed: true });
    });

    test('should return content from cache if available', async () => {
        const filePath = 'src/cached.txt';
        const cachedContent = 'this is from the cache';
        mockFileCache.get.mockResolvedValue(cachedContent);

        const result = await fileReadTool({ path: filePath });

        expect(result).toBe(cachedContent);
        expect(mockFileCache.get).toHaveBeenCalledWith(expect.stringContaining(filePath));
        // fs.readFile should NOT be called if cache hits
        expect(mockFs.readFile).not.toHaveBeenCalled();
    });

    test('should read from file and set cache if not in cache', async () => {
        const filePath = 'src/not-cached.txt';
        const fileContent = 'this is from the file';

        // Arrange: cache miss, then successful file read
        mockFileCache.get.mockResolvedValue(null);
        mockFs.readFile.mockResolvedValue(fileContent);

        const result = await fileReadTool({ path: filePath });

        expect(result).toBe(fileContent);
        expect(mockFileCache.get).toHaveBeenCalledWith(expect.stringContaining(filePath));
        expect(mockFs.readFile).toHaveBeenCalledWith(expect.stringContaining(filePath), 'utf-8');
        // Cache should be populated after reading
        expect(mockFileCache.set).toHaveBeenCalledWith(expect.stringContaining(filePath), fileContent);
    });

    test('should throw ToolError if file access is denied', async () => {
        const filePath = 'etc/passwd';
        mockAccessController.validateAccess.mockReturnValue({
            allowed: false,
            reason: 'Access denied'
        });

        await expect(fileReadTool({ path: filePath })).rejects.toThrow(
            new ToolError('File access denied: Access denied', 'FileReadTool')
        );
    });

    test('should bypass cache if noCache option is true', async () => {
        const filePath = 'src/no-cache.txt';
        const fileContent = 'live content';

        mockFs.readFile.mockResolvedValue(fileContent);

        const result = await fileReadTool({ path: filePath, noCache: true });

        expect(result).toBe(fileContent);
        // get and set should not be called
        expect(mockFileCache.get).not.toHaveBeenCalled();
        expect(mockFileCache.set).not.toHaveBeenCalled();
        expect(mockFs.readFile).toHaveBeenCalled();
    });
});
