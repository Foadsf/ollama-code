import { jest } from '@jest/globals';

describe('Config Module', () => {
    let config;

    beforeAll(async () => {
        // Since config has its own dependencies, we need to let them be mocked or real
        jest.unstable_mockModule('conf', () => {
            const mockStore = new Map();
            return {
                default: jest.fn().mockImplementation(() => ({
                    get: jest.fn((key, defaultValue) => mockStore.get(key) ?? defaultValue),
                    set: jest.fn((key, value) => mockStore.set(key, value)),
                    store: mockStore,
                })),
            };
        });

        config = await import('../../src/config.js');
    });

    test('should import config functions', () => {
        expect(typeof config.getConfig).toBe('function');
        expect(typeof config.setConfig).toBe('function');
        expect(typeof config.listConfig).toBe('function');
    });

    test('should set and get a value', () => {
        config.setConfig('testKey', 'testValue');
        expect(config.getConfig('testKey')).toBe('testValue');
    });
});
