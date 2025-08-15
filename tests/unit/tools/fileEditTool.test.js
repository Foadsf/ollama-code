import { jest } from '@jest/globals';

// Mock dependencies
const mockFs = {
    writeFile: jest.fn().mockResolvedValue(undefined),
    rename: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined),
};
jest.unstable_mockModule('fs/promises', () => mockFs);

const mockFileReadTool = jest.fn();
jest.unstable_mockModule('../../../src/tools/fileReadTool.js', () => ({
    fileReadTool: mockFileReadTool
}));

const mockAccessController = { validateAccess: jest.fn() };
jest.unstable_mockModule('../../../src/security/fileAccessController.js', () => ({
    FileAccessController: jest.fn().mockImplementation(() => mockAccessController)
}));


// Import the tool AFTER mocking
const { EnhancedFileEditTool } = await import('../../../src/tools/fileEditTool.js');

describe('EnhancedFileEditTool', () => {
    let fileEditTool;

    beforeEach(() => {
        jest.clearAllMocks();
        fileEditTool = new EnhancedFileEditTool();
        mockAccessController.validateAccess.mockReturnValue({ allowed: true, warnings: [] });
    });

    test('should create a backup before editing', async () => {
        const filePath = 'src/app.js';
        const originalContent = 'console.log("hello")';

        mockFileReadTool.mockResolvedValue(originalContent);

        await fileEditTool.editFile({ path: filePath, oldContent: 'hello', newContent: 'world' });

        expect(mockFileReadTool).toHaveBeenCalledWith({ path: filePath });
        expect(mockFs.writeFile).toHaveBeenCalledWith(
            expect.stringContaining(`${filePath}.backup.`),
            originalContent
        );
    });

    test('should perform an atomic write', async () => {
        const filePath = 'src/app.js';
        const originalContent = 'old content';
        const newContent = 'new content';
        const tempPath = expect.stringContaining(`${filePath}.tmp.`);

        mockFileReadTool.mockResolvedValue(originalContent);

        await fileEditTool.editFile({ path: filePath, oldContent: 'old', newContent: 'new' });

        // 1. Wrote new content to a temp file
        expect(mockFs.writeFile).toHaveBeenCalledWith(tempPath, expect.any(String), 'utf-8');
        // 2. Renamed temp file to original file path
        expect(mockFs.rename).toHaveBeenCalledWith(tempPath, filePath);
    });

    test('should restore from backup on failure', async () => {
        const filePath = 'src/app.js';
        const backupContent = 'backup content';

        // Arrange: Backup succeeds, but atomic edit fails
        mockFileReadTool
            .mockResolvedValueOnce(backupContent) // For creating the backup
            .mockResolvedValueOnce(backupContent) // For the atomicEdit reading the original file
            .mockResolvedValueOnce(backupContent); // For the restoreFromBackup reading the backup file
        mockFs.rename.mockRejectedValue(new Error('rename failed')); // Make rename fail

        await expect(fileEditTool.editFile({ path: filePath, oldContent: 'backup', newContent: 'new' }))
            .rejects.toThrow('Atomic edit failed: rename failed');

        // Assert: Restore was attempted
        expect(mockFileReadTool).toHaveBeenCalledWith({ path: expect.stringContaining('.backup.') });
        expect(mockFs.writeFile).toHaveBeenCalledWith(filePath, backupContent); // Restoring
        expect(mockFs.unlink).toHaveBeenCalledWith(expect.stringContaining('.backup.')); // Cleaning up backup
    });
});
