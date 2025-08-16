import { jest } from '@jest/globals';

// Global test timeout
jest.setTimeout(20000);

// Mock console methods to reduce noise in tests
const originalError = console.error;
const originalWarn = console.warn;

global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: originalError // Keep errors for debugging
};

// Clean up after each test
afterEach(() => {
    jest.clearAllMocks();
});

// Global teardown
afterAll(() => {
    jest.restoreAllMocks();
});

// Mock process.cwd() to be consistent
Object.defineProperty(process, 'cwd', {
    value: jest.fn(() => '/mock/project/path')
});
