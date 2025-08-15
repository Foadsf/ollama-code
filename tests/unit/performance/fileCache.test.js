import { jest } from '@jest/globals';

// Mock fs/promises
const mockFs = {
    stat: jest.fn(),
};
jest.unstable_mockModule('fs/promises', () => mockFs);

// Import the cache AFTER mocking fs
const { FileCache } = await import('../../../src/performance/fileCache.js');

describe('FileCache', () => {
    let fileCache;

    beforeEach(() => {
        jest.useFakeTimers();
        fileCache = new FileCache({ ttl: 10000 });
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('should cache and retrieve file content', async () => {
        const filePath = 'src/test.js';
        const content = 'test content';

        mockFs.stat.mockResolvedValue({ mtime: { getTime: () => Date.now() } });

        await fileCache.set(filePath, content);
        const cachedContent = await fileCache.get(filePath);

        expect(cachedContent).toBe(content);
        expect(fileCache.getStats().hits).toBe(1);
        // fs.stat is called once on set and once on get
        expect(mockFs.stat).toHaveBeenCalledTimes(2);
    });

    test('should invalidate cache if file modification time changes', async () => {
        const filePath = 'src/test.js';
        const oldContent = 'old content';
        const newTime = Date.now() + 5000;

        // 1. Set initial cache entry
        mockFs.stat.mockResolvedValue({ mtime: { getTime: () => Date.now() } });
        await fileCache.set(filePath, oldContent);

        // 2. Get the cached content successfully
        const firstGet = await fileCache.get(filePath);
        expect(firstGet).toBe(oldContent);
        expect(fileCache.getStats().hits).toBe(1);

        // 3. Simulate file being modified
        mockFs.stat.mockResolvedValue({ mtime: { getTime: () => newTime } });

        // 4. Try to get again, should be a miss due to invalidation
        const secondGet = await fileCache.get(filePath);
        expect(secondGet).toBeNull();
        expect(fileCache.getStats().misses).toBe(1);
        expect(fileCache.getStats().invalidations).toBe(1);
    });

    test('should return null if file no longer exists', async () => {
        const filePath = 'src/test.js';

        mockFs.stat.mockResolvedValue({ mtime: { getTime: () => Date.now() } });
        await fileCache.set(filePath, 'content');

        // Simulate file being deleted
        mockFs.stat.mockRejectedValue(new Error('ENOENT'));

        const result = await fileCache.get(filePath);
        expect(result).toBeNull();
    });
});
