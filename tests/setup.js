import { jest } from '@jest/globals';

// Global test timeout
jest.setTimeout(15000);

// Mock console methods to reduce noise in tests
global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: console.error  // Keep error for debugging
};

// Clean up after each test
afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
});
