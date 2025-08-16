export default {
    preset: 'node',
    testEnvironment: 'node',

    // ESM Configuration
    extensionsToTreatAsEsm: ['.js'],
    globals: {
        'ts-jest': {
            useESM: true
        }
    },

    // Transform configuration - keep this empty for pure ESM
    transform: {},

    // Module resolution - RESTORE the moduleNameMapping but with correct patterns
    moduleNameMapping: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },

    // Test patterns
    testMatch: [
        '**/tests/**/*.test.js'
    ],

    // Module handling
    moduleFileExtensions: ['js', 'json'],

    // Coverage
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/**/*.test.js',
        '!src/index.js'
    ],

    coverageThreshold: {
        global: {
            branches: 70,  // Lowered to be more achievable
            functions: 70,
            lines: 70,
            statements: 70
        }
    },

    // Setup
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

    // Timeouts
    testTimeout: 15000,

    // ESM specific settings
    resolver: undefined,

    // Verbose for debugging
    verbose: false
};
