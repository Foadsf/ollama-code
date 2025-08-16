import { jest } from '@jest/globals';

describe('UpdateManager', () => {
    let UpdateManager;
    let updateManager;
    let mockFileReadTool;
    let mockGetConfig;
    let mockSetConfig;
    let mockUpdateNotifier;

    beforeEach(async () => {
        // Reset modules to ensure clean mocks
        jest.resetModules();

        // Create mocks
        mockFileReadTool = jest.fn();
        mockGetConfig = jest.fn();
        mockSetConfig = jest.fn();
        mockUpdateNotifier = jest.fn(() => ({ notify: jest.fn() }));

        // Mock modules using jest.doMock for better ESM compatibility
        jest.doMock('../../../src/tools/fileReadTool.js', () => ({
            fileReadTool: mockFileReadTool
        }));
        jest.doMock('../../../src/config.js', () => ({
            getConfig: mockGetConfig,
            setConfig: mockSetConfig
        }));
        jest.doMock('update-notifier', () => ({
            __esModule: true,
            default: mockUpdateNotifier
        }));

        // Import the class under test AFTER mocks are set up
        const { UpdateManager: UM } = await import('../../../src/updates/updateNotifier.js');
        UpdateManager = UM;
        updateManager = new UpdateManager();
    });

    test('should create UpdateManager instance', () => {
        expect(updateManager).toBeInstanceOf(UpdateManager);
        expect(updateManager.isEnabled).toBe(true); // Default
    });

    test('initialize should read package.json and setup notifier if enabled', async () => {
        mockGetConfig.mockReturnValue(true); // enabled
        mockFileReadTool.mockResolvedValue(JSON.stringify({ name: 'olc', version: '1.0.0' }));

        await updateManager.initialize();

        expect(mockFileReadTool).toHaveBeenCalledWith({ path: 'package.json', noCache: true });
        expect(mockUpdateNotifier).toHaveBeenCalled();
    });

    test('initialize should not setup notifier if disabled', async () => {
        mockGetConfig.mockReturnValue(false); // disabled
        mockFileReadTool.mockResolvedValue(JSON.stringify({ name: 'olc', version: '1.0.0' }));

        await updateManager.initialize();

        expect(mockUpdateNotifier).not.toHaveBeenCalled();
    });

    test('disable should set config and isEnabled flag to false', () => {
        updateManager.disable();
        expect(updateManager.isEnabled).toBe(false);
        expect(mockSetConfig).toHaveBeenCalledWith('updateNotifications', false);
    });
});
