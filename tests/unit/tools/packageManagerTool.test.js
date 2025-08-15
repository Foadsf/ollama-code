import { jest } from '@jest/globals';

// Mock dependencies
const mockGlobTool = jest.fn();
const mockBashTool = jest.fn().mockResolvedValue('Success');

jest.unstable_mockModule('../../../src/tools/globTool.js', () => ({
    globTool: mockGlobTool
}));
jest.unstable_mockModule('../../../src/tools/bashTool.js', () => ({
    bashTool: mockBashTool
}));

// Import the tool AFTER mocking
const { PackageManagerTool } = await import('../../../src/tools/packageManagerTool.js');

describe('PackageManagerTool', () => {
    let pmTool;

    beforeEach(() => {
        jest.clearAllMocks();
        pmTool = new PackageManagerTool();
    });

    describe('Manager Detection', () => {
        it('should detect npm from package-lock.json', async () => {
            mockGlobTool.mockResolvedValue(['package-lock.json']);
            await pmTool.executePackageCommand({ command: 'install', packages: ['express'] });
            expect(mockBashTool).toHaveBeenCalledWith(expect.objectContaining({
                command: 'npm install express'
            }));
        });

        it('should detect yarn from yarn.lock', async () => {
            mockGlobTool.mockResolvedValue(['yarn.lock']);
            await pmTool.executePackageCommand({ command: 'install', packages: ['express'] });
            expect(mockBashTool).toHaveBeenCalledWith(expect.objectContaining({
                command: 'yarn add express'
            }));
        });

        it('should detect pnpm from pnpm-lock.yaml', async () => {
            mockGlobTool.mockResolvedValue(['pnpm-lock.yaml']);
            await pmTool.executePackageCommand({ command: 'install', packages: ['express'] });
            expect(mockBashTool).toHaveBeenCalledWith(expect.objectContaining({
                command: 'pnpm add express'
            }));
        });

        it('should default to npm if no lockfile is found', async () => {
            mockGlobTool.mockResolvedValue([]);
            await pmTool.executePackageCommand({ command: 'install', packages: ['express'] });
            expect(mockBashTool).toHaveBeenCalledWith(expect.objectContaining({
                command: 'npm install express'
            }));
        });
    });

    describe('Command Building', () => {
        it('should build the correct install command for npm', async () => {
            mockGlobTool.mockResolvedValue(['package-lock.json']);
            await pmTool.executePackageCommand({ command: 'install', packages: ['jest', 'eslint'] });
            expect(mockBashTool).toHaveBeenCalledWith(expect.objectContaining({
                command: 'npm install jest eslint'
            }));
        });

        it('should build the correct uninstall command for yarn', async () => {
            mockGlobTool.mockResolvedValue(['yarn.lock']);
            await pmTool.executePackageCommand({ command: 'uninstall', packages: ['moment'] });
            expect(mockBashTool).toHaveBeenCalledWith(expect.objectContaining({
                command: 'yarn remove moment'
            }));
        });

        it('should build the correct update command for pnpm', async () => {
            mockGlobTool.mockResolvedValue(['pnpm-lock.yaml']);
            await pmTool.executePackageCommand({ command: 'update', packages: ['lodash'] });
            expect(mockBashTool).toHaveBeenCalledWith(expect.objectContaining({
                command: 'pnpm update lodash'
            }));
        });
    });
});
