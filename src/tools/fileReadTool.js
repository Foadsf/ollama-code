import * as fs from 'fs/promises';
import path from 'path';
import { ToolError } from '../utils/errors.js';
import { FileAccessController } from '../security/fileAccessController.js';
import { FileCache } from '../performance/fileCache.js';

// Create a singleton cache instance for the file read tool
const fileCache = new FileCache();

/**
 * Tool for reading file contents, with caching.
 * @param {Object} args - Tool arguments
 * @param {string} args.path - Path to the file
 * @param {boolean} [args.noCache=false] - Whether to bypass the cache
 * @returns {Promise<string>} - File contents
 */
export async function fileReadTool(args) {
    const toolName = 'FileReadTool';
    if (!args.path) {
        throw new ToolError('Path is required', toolName);
    }

    // Validate file access first
    const controller = new FileAccessController();
    const accessResult = controller.validateAccess('read', args.path);
    if (!accessResult.allowed) {
        throw new ToolError(`File access denied: ${accessResult.reason}`, toolName);
    }

    const filePath = path.resolve(process.cwd(), args.path);

    // Try cache first
    if (!args.noCache) {
        const cachedContent = await fileCache.get(filePath);
        if (cachedContent !== null) {
            return cachedContent;
        }
    }

    try {
        const content = await fs.readFile(filePath, 'utf-8');

        // Cache the content for future reads
        if (!args.noCache) {
            await fileCache.set(filePath, content);
        }

        return content;
    } catch (error) {
        if (error.code === 'ENOENT') {
            throw new ToolError(`File not found: ${args.path}`, toolName);
        }
        throw new ToolError(`Failed to read file: ${error.message}`, toolName);
    }
}