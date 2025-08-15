import { jest } from '@jest/globals';

// Mock dependencies before any other imports
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
  beforeEach(() => {
    // Provide a default mock for the security profile and other configs
    mockConfig.getConfig.mockImplementation((key, defaultValue) => {
        if (key === 'securityProfile') return 'moderate';
        return defaultValue || [];
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should read and return file content successfully', async () => {
    const fileContent = 'Hello, world!';
    mockFs.access.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue(fileContent);

    // Test a path that is allowed in moderate mode
    const result = await fileReadTool({ path: 'src/test.txt' });

    expect(mockFs.access).toHaveBeenCalledWith(expect.stringContaining('src/test.txt'));
    expect(mockFs.readFile).toHaveBeenCalledWith(expect.stringContaining('src/test.txt'), 'utf-8');
    expect(result).toBe(fileContent);
  });

  test('should throw a ToolError if path is not provided', async () => {
    await expect(fileReadTool({})).rejects.toThrow(new ToolError('Path is required', 'FileReadTool'));
  });

  test('should throw a ToolError if file is not found', async () => {
    const error = new Error('ENOENT');
    error.code = 'ENOENT';
    mockFs.access.mockRejectedValue(error);

    await expect(fileReadTool({ path: 'src/nonexistent.txt' })).rejects.toThrow(
      new ToolError('File not found: src/nonexistent.txt', 'FileReadTool')
    );
  });

  test('should throw a ToolError for path traversal', async () => {
    await expect(fileReadTool({ path: '../outside.txt' })).rejects.toThrow(
      'File access denied: Path traversal attempt detected'
    );
  });

  test('should throw a ToolError for accessing a blocked directory', async () => {
    await expect(fileReadTool({ path: './node_modules/some_package/file.js' })).rejects.toThrow(
      'File access denied: Access to blocked directory: node_modules'
    );
  });
});
