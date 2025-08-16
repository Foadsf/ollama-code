import { jest } from '@jest/globals';

// Mock dependencies
jest.unstable_mockModule('inquirer', () => ({
    default: {
        prompt: jest.fn()
    }
}));
jest.unstable_mockModule('../../src/config.js', () => ({
    addToConfig: jest.fn()
}));
jest.unstable_mockModule('../../src/security/auditLogger.js', () => ({
    auditLogger: {
        logPermissionRequest: jest.fn()
    }
}));


describe('Permissions Module', () => {
    let checkPermission;
    let inquirer;

    beforeAll(async () => {
        const permissions = await import('../../src/permissions.js');
        checkPermission = permissions.checkPermission;
        inquirer = (await import('inquirer')).default;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should grant permission when user says yes', async () => {
        inquirer.prompt.mockResolvedValue({ permission: true, remember: 'none' });

        const granted = await checkPermission('TestTool', { arg: 'value' });

        expect(granted).toBe(true);
        expect(inquirer.prompt).toHaveBeenCalledTimes(1);
    });

    test('should deny permission when user says no', async () => {
        inquirer.prompt.mockResolvedValue({ permission: false });

        const granted = await checkPermission('TestTool', { arg: 'value' });

        expect(granted).toBe(false);
    });
});
