import Conf from 'conf';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default configuration
const defaultConfig = {
    // Ollama settings
    ollamaBaseUrl: 'http://localhost:11434',
    ollamaModel: 'codellama', // Default model

    // UI settings
    theme: 'dark', // 'dark' or 'light'
    verbose: false,

    // Tool settings
    allowedTools: [], // Tools that can run without permission
    ignorePatterns: ['node_modules', '.git', 'node_modules/**', '.git/**'], // Patterns to ignore

    // Performance settings
    maxTokens: 4096, // Max tokens for responses
};

// Create configuration store for global settings
const globalConfig = new Conf({
    projectName: 'ollama-code',
    defaults: defaultConfig,
});

// Create configuration store for project-specific settings
let projectConfig = null;

/**
 * Get the project configuration
 * @returns {Conf} Project configuration
 */
function getProjectConfig() {
    if (!projectConfig) {
        // Initialize project config in the current directory
        projectConfig = new Conf({
            projectName: 'ollama-code',
            cwd: process.cwd(),
            configName: 'config',
            defaults: {},
        });
    }
    return projectConfig;
}

/**
 * Get a configuration value
 * @param {string} key - Configuration key
 * @param {boolean} global - Whether to use global config
 * @returns {any} Configuration value
 */
export function getConfig(key, global = false) {
    if (global) {
        return globalConfig.get(key);
    }

    // Try project config first, fall back to global
    const projectValue = getProjectConfig().get(key);
    return projectValue !== undefined ? projectValue : globalConfig.get(key);
}

/**
 * Set a configuration value
 * @param {string} key - Configuration key
 * @param {any} value - Configuration value
 * @param {boolean} global - Whether to set global config
 */
export function setConfig(key, value, global = false) {
    if (global) {
        globalConfig.set(key, value);
    } else {
        getProjectConfig().set(key, value);
    }
}

/**
 * Add a value to a list configuration
 * @param {string} key - Configuration key
 * @param {any} value - Value to add
 * @param {boolean} global - Whether to use global config
 */
export function addToConfig(key, value, global = false) {
    const config = global ? globalConfig : getProjectConfig();
    const currentValue = config.get(key) || [];

    if (!Array.isArray(currentValue)) {
        throw new Error(`Config key ${key} is not an array`);
    }

    if (!currentValue.includes(value)) {
        config.set(key, [...currentValue, value]);
    }
}

/**
 * Remove a value from a list configuration
 * @param {string} key - Configuration key
 * @param {any} value - Value to remove
 * @param {boolean} global - Whether to use global config
 */
export function removeFromConfig(key, value, global = false) {
    const config = global ? globalConfig : getProjectConfig();
    const currentValue = config.get(key) || [];

    if (!Array.isArray(currentValue)) {
        throw new Error(`Config key ${key} is not an array`);
    }

    config.set(key, currentValue.filter(item => item !== value));
}

/**
 * Get the entire configuration
 * @param {boolean} global - Whether to get global config
 * @returns {Object} Configuration object
 */
export function listConfig(global = false) {
    if (global) {
        return globalConfig.store;
    }

    // Merge project and global configs
    return {
        ...globalConfig.store,
        ...getProjectConfig().store,
    };
}