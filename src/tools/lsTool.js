import * as fs from 'fs/promises';
import path from 'path';
import { getConfig } from '../config.js';
import { ToolError } from '../utils/errors.js';
import { FileAccessController } from '../security/fileAccessController.js';

/**
 * Tool for listing directory contents
 * @param {Object} args - Tool arguments
 * @param {string} [args.path='.'] - Path to list
 * @param {boolean} [args.recursive=false] - Whether to list recursively
 * @param {boolean} [args.showHidden=false] - Whether to show hidden files
 * @returns {Promise<Array>} - Directory contents
 */
export async function lsTool(args) {
    const toolName = 'LSTool';
    const dirPath = args.path || '.';

    // Validate file access
    const controller = new FileAccessController();
    const accessResult = controller.validateAccess('read', dirPath);
    if (!accessResult.allowed) {
        throw new ToolError(`Directory access denied: ${accessResult.reason}`, toolName);
    }

    const resolvedPath = path.resolve(process.cwd(), dirPath);
    const recursive = args.recursive || false;
    const showHidden = args.showHidden || false;

    try {
        // Check if directory exists
        const stats = await fs.stat(resolvedPath);
        if (!stats.isDirectory()) {
            throw new ToolError(`Not a directory: ${args.path}`, toolName);
        }

        // Get ignore patterns
        const ignorePatterns = getConfig('ignorePatterns') || [];

        // List directory contents
        if (recursive) {
            return await listRecursive(resolvedPath, showHidden, ignorePatterns);
        } else {
            return await listDirectory(resolvedPath, showHidden, ignorePatterns);
        }
    } catch (error) {
        if (error instanceof ToolError) throw error;
        if (error.code === 'ENOENT') {
            throw new ToolError(`Directory not found: ${args.path}`, toolName);
        }
        throw new ToolError(`Failed to list directory: ${error.message}`, toolName);
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