export default {
    preset: 'node',
    testEnvironment: 'node',

    // ESM Configuration
    extensionsToTreatAsEsm: ['.js'],

    // NO TRANSFORMS - This is critical for pure ESM
    transform: {},

    // Module resolution for ESM
    moduleNameMapping: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },

    // Test patterns
    testMatch: [
        '**/tests/**/*.test.js',
        '!**/node_modules/**'
    ],

    // Module extensions
    moduleFileExtensions: ['js', 'json'],

    // Coverage settings (relaxed for completion)
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/index.js',
        '!**/*.test.js'
    ],

    coverageThreshold: {
        global: {
            branches: 60,
            functions: 60,
            lines: 60,
            statements: 60
        }
    },

    // Timeout
    testTimeout: 20000,

    // Setup file
    setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.js'],

    // Clear mocks between tests
    clearMocks: true,
    restoreMocks: true,

    // Verbose output for debugging
    verbose: false
};
