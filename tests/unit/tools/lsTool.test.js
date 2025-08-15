import { jest } from '@jest/globals';

const mockFs = {
  stat: jest.fn(),
  readdir: jest.fn(),
};
jest.unstable_mockModule('fs/promises', () => mockFs);

const mockConfig = {
  getConfig: jest.fn(),
};
jest.unstable_mockModule('../../../src/config.js', () => mockConfig);

// The module under test must be imported AFTER mocking
const { lsTool } = await import('../../../src/tools/lsTool.js');

describe('lsTool', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should list directory contents successfully', async () => {
    // Mock implementations
    mockFs.stat.mockResolvedValue({ isDirectory: () => true });
    mockFs.readdir.mockResolvedValue([
      { name: 'file1.js', isDirectory: () => false },
      { name: 'dir1', isDirectory: () => true },
    ]);
    mockConfig.getConfig.mockReturnValue([]); // No ignore patterns

    const result = await lsTool({ path: './test' });

    expect(mockFs.stat).toHaveBeenCalledWith(expect.stringContaining('test'));
    expect(mockFs.readdir).toHaveBeenCalledWith(expect.stringContaining('test'), { withFileTypes: true });
    expect(result).toEqual([
      { name: 'file1.js', path: expect.stringContaining('file1.js'), type: 'file', isDirectory: false },
      { name: 'dir1', path: expect.stringContaining('dir1'), type: 'directory', isDirectory: true },
    ]);
  });

  test('should throw an error if path is not a directory', async () => {
    mockFs.stat.mockResolvedValue({ isDirectory: () => false });

    await expect(lsTool({ path: './test/file.txt' })).rejects.toThrow(
      "Not a directory: ./test/file.txt"
    );
  });

  test('should throw an error if stat fails', async () => {
    const error = new Error('ENOENT');
    error.code = 'ENOENT';
    mockFs.stat.mockRejectedValue(error);

    await expect(lsTool({ path: './nonexistent' })).rejects.toThrow(
        'Directory not found: ./nonexistent'
    );
  });
});
