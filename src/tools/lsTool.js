import fs from 'fs/promises';
import path from 'path';
import { getConfig } from '../config.js';

/**
 * Tool for listing directory contents
 * @param {Object} args - Tool arguments
 * @param {string} [args.path='.'] - Path to list
 * @param {boolean} [args.recursive=false] - Whether to list recursively
 * @param {boolean} [args.showHidden=false] - Whether to show hidden files
 * @returns {Promise<Array>} - Directory contents
 */
export async function lsTool(args) {
    const dirPath = args.path ? path.resolve(process.cwd(), args.path) : process.cwd();
    const recursive = args.recursive || false;
    const showHidden = args.showHidden || false;

    // Check if path is within the project directory
    if (!dirPath.startsWith(process.cwd())) {
        throw new Error('Cannot list directories outside the project directory');
    }

    try {
        // Check if directory exists
        const stats = await fs.stat(dirPath);
        if (!stats.isDirectory()) {
            throw new Error(`Not a directory: ${args.path}`);
        }

        // Get ignore patterns
        const ignorePatterns = getConfig('ignorePatterns') || [];

        // List directory contents
        if (recursive) {
            return await listRecursive(dirPath, showHidden, ignorePatterns);
        } else {
            return await listDirectory(dirPath, showHidden, ignorePatterns);
        }
    } catch (error) {
        if (error.code === 'ENOENT') {
            throw new Error(`Directory not found: ${args.path}`);
        }
        throw new Error(`Failed to list directory: ${error.message}`);
    }
}

/**
 * List contents of a directory
 * @param {string} dirPath - Directory path
 * @param {boolean} showHidden - Whether to show hidden files
 * @param {Array<string>} ignorePatterns - Patterns to ignore
 * @returns {Promise<Array>} - Directory contents
 */
async function listDirectory(dirPath, showHidden, ignorePatterns) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    const result = [];

    for (const entry of entries) {
        // Skip hidden files if not requested
        if (!showHidden && entry.name.startsWith('.')) {
            continue;
        }

        // Skip ignored patterns
        const relativePath = path.relative(process.cwd(), path.join(dirPath, entry.name));
        if (shouldIgnore(relativePath, ignorePatterns)) {
            continue;
        }

        result.push({
            name: entry.name,
            path: relativePath,
            type: entry.isDirectory() ? 'directory' : 'file',
            isDirectory: entry.isDirectory(),
        });
    }

    return result;
}

/**
 * List directory contents recursively
 * @param {string} dirPath - Directory path
 * @param {boolean} showHidden - Whether to show hidden files
 * @param {Array<string>} ignorePatterns - Patterns to ignore
 * @returns {Promise<Array>} - Directory contents
 */
async function listRecursive(dirPath, showHidden, ignorePatterns) {
    const root = await listDirectory(dirPath, showHidden, ignorePatterns);

    const result = [...root];

    for (const entry of root) {
        if (entry.isDirectory) {
            const children = await listRecursive(
                path.join(dirPath, entry.name),
                showHidden,
                ignorePatterns
            );

            // Add path prefix to children
            for (const child of children) {
                child.path = path.join(entry.name, child.path);
            }

            result.push(...children);
        }
    }

    return result;
}

/**
 * Check if a path should be ignored
 * @param {string} filePath - File path to check
 * @param {Array<string>} ignorePatterns - Patterns to ignore
 * @returns {boolean} - Whether the path should be ignored
 */
function shouldIgnore(filePath, ignorePatterns) {
    return ignorePatterns.some(pattern => {
        // Handle glob patterns
        if (pattern.includes('*')) {
            const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
            return regex.test(filePath);
        }

        // Handle directory patterns
        return filePath.includes(pattern);
    });
}