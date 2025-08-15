import * as fs from 'fs/promises';
import path from 'path';
import { getConfig } from '../config.js';
import { ToolError } from '../utils/errors.js';

/**
 * Tool for reading file contents
 * @param {Object} args - Tool arguments
 * @param {string} args.path - Path to the file
 * @returns {Promise<string>} - File contents
 */
export async function fileReadTool(args) {
    const toolName = 'FileReadTool';
    if (!args.path) {
        throw new ToolError('Path is required', toolName);
    }

    // Normalize and resolve the path
    const filePath = path.resolve(process.cwd(), args.path);

    // Check if path is within the project directory
    if (!filePath.startsWith(process.cwd())) {
        throw new ToolError('Cannot read files outside the project directory', toolName);
    }

    // Check ignore patterns
    const ignorePatterns = getConfig('ignorePatterns') || [];
    for (const pattern of ignorePatterns) {
        // Simple glob matching for ignored paths
        if (filePath.includes(pattern.replace(/\*/g, ''))) {
            throw new ToolError(`Path matches ignore pattern: ${pattern}`, toolName);
        }
    }

    try {
        // Check if file exists
        await fs.access(filePath);

        // Read file
        const content = await fs.readFile(filePath, 'utf-8');

        return content;
    } catch (error) {
        if (error instanceof ToolError) throw error;
        if (error.code === 'ENOENT') {
            throw new ToolError(`File not found: ${args.path}`, toolName);
        }
        throw new ToolError(`Failed to read file: ${error.message}`, toolName);
    }
}