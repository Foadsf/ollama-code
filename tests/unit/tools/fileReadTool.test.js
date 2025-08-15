import { jest } from '@jest/globals';

const mockFs = {
  access: jest.fn(),
  readFile: jest.fn(),
};
jest.unstable_mockModule('fs/promises', () => mockFs);

const mockConfig = {
  getConfig: jest.fn(),
};
jest.unstable_mockModule('../../../src/config.js', () => mockConfig);

// The module under test must be imported AFTER mocking
const { fileReadTool } = await import('../../../src/tools/fileReadTool.js');
const { ToolError } = await import('../../../src/utils/errors.js');

describe('fileReadTool', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should read and return file content successfully', async () => {
    const fileContent = 'Hello, world!';
    mockFs.access.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue(fileContent);
    mockConfig.getConfig.mockReturnValue([]);

    const result = await fileReadTool({ path: './test.txt' });

    expect(mockFs.access).toHaveBeenCalledWith(expect.stringContaining('test.txt'));
    expect(mockFs.readFile).toHaveBeenCalledWith(expect.stringContaining('test.txt'), 'utf-8');
    expect(result).toBe(fileContent);
  });

  test('should throw a ToolError if path is not provided', async () => {
    await expect(fileReadTool({})).rejects.toThrow(new ToolError('Path is required', 'FileReadTool'));
  });

  test('should throw a ToolError if file is not found', async () => {
    const error = new Error('ENOENT');
    error.code = 'ENOENT';
    mockFs.access.mockRejectedValue(error);

    await expect(fileReadTool({ path: './nonexistent.txt' })).rejects.toThrow(
      new ToolError('File not found: ./nonexistent.txt', 'FileReadTool')
    );
  });

  test('should throw a ToolError if path is outside the project directory', async () => {
    // This test doesn't need fs mocks as it should fail before calling fs
    await expect(fileReadTool({ path: '../outside.txt' })).rejects.toThrow(
      new ToolError('Cannot read files outside the project directory', 'FileReadTool')
    );
  });

    test('should throw a ToolError if path matches an ignore pattern', async () => {
    mockConfig.getConfig.mockReturnValue(['node_modules']);

    await expect(fileReadTool({ path: './node_modules/some_package/file.js' })).rejects.toThrow(
      new ToolError('Path matches ignore pattern: node_modules', 'FileReadTool')
    );
  });
});
