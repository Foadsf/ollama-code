import { jest } from '@jest/globals';

describe('UpdateManager', () => {
    let UpdateManager;
    let updateManager;
    let mockFileReadTool;
    let mockGetConfig;
    let mockSetConfig;
    let mockFetch;
    let mockUpdateNotifier;

    beforeEach(async () => {
        // Reset modules
        jest.resetModules();

        // Create mocks
        mockFileReadTool = jest.fn();
        mockGetConfig = jest.fn();
        mockSetConfig = jest.fn();
        mockFetch = jest.fn();

        // Mock global fetch
        global.fetch = mockFetch;

        // Mock modules
        jest.doMock('../../../src/tools/fileReadTool.js', () => ({
            fileReadTool: mockFileReadTool
        }));

        jest.doMock('../../../src/config.js', () => ({
            getConfig: mockGetConfig,
            setConfig: mockSetConfig
        }));

        // Mock update-notifier
        mockUpdateNotifier = jest.fn(() => ({
            update: null,
            notify: jest.fn()
        }));
        jest.doMock('update-notifier', () => ({
            __esModule: true,
            default: mockUpdateNotifier
        }));

        // Import after mocking
        const updateModule = await import('../../../src/updates/updateNotifier.js');
        UpdateManager = updateModule.UpdateManager;
        updateManager = new UpdateManager();
    });

    afterEach(() => {
        jest.resetAllMocks();
        jest.resetModules();
        delete global.fetch;
    });

    describe('initialize', () => {
        test('should initialize with package info', async () => {
            const packageJson = JSON.stringify({
                name: 'olc',
                version: '1.0.0'
            });

            mockFileReadTool.mockResolvedValue(packageJson);
            mockGetConfig.mockReturnValue(true);

            await updateManager.initialize();

            expect(mockFileReadTool).toHaveBeenCalledWith({ path: 'package.json', noCache: true });
            expect(updateManager.packageInfo).toEqual({
                name: 'olc',
                version: '1.0.0'
            });
        });

        test('should handle package.json read failure', async () => {
            mockFileReadTool.mockRejectedValue(new Error('File not found'));
            mockGetConfig.mockReturnValue(true);

            // Should not throw
            await expect(updateManager.initialize()).resolves.toBeUndefined();
        });
    });

    describe('getLatestVersion', () => {
        test('should fetch latest version from npm registry', async () => {
            const mockResponse = {
                version: '1.2.0'
            };

            mockFetch.mockResolvedValue({
                json: jest.fn().mockResolvedValue(mockResponse)
            });

            const version = await updateManager.getLatestVersion();

            expect(version).toBe('1.2.0');
            expect(mockFetch).toHaveBeenCalledWith('https://registry.npmjs.org/olc/latest');
        });

        test('should handle fetch failure', async () => {
            mockFetch.mockRejectedValue(new Error('Network error'));

            const version = await updateManager.getLatestVersion();

            expect(version).toBeNull();
        });
    });

    describe('showUpdateInfo', () => {
        test('should show current and latest version info', async () => {
            updateManager.packageInfo = { version: '1.0.0' };
            mockFetch.mockResolvedValue({
                json: jest.fn().mockResolvedValue({ version: '1.1.0' })
            });

            await updateManager.showUpdateInfo();

            // Verify console output (mocked in setup)
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Version Information'));
        });
    });

    describe('enable/disable', () => {
        test('should enable update notifications', () => {
            updateManager.enable();

            expect(updateManager.isEnabled).toBe(true);
            expect(mockSetConfig).toHaveBeenCalledWith('updateNotifications', true);
        });

        test('should disable update notifications', () => {
            updateManager.disable();

            expect(updateManager.isEnabled).toBe(false);
            expect(mockSetConfig).toHaveBeenCalledWith('updateNotifications', false);
        });
    });
});
