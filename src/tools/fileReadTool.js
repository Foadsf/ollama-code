import fs from 'fs/promises';
import path from 'path';
import { getConfig } from '../config.js';

/**
 * Tool for reading file contents
 * @param {Object} args - Tool arguments
 * @param {string} args.path - Path to the file
 * @returns {Promise<string>} - File contents
 */
export async function fileReadTool(args) {
    if (!args.path) {
        throw new Error('Path is required');
    }

    // Normalize and resolve the path
    const filePath = path.resolve(process.cwd(), args.path);

    // Check if path is within the project directory
    if (!filePath.startsWith(process.cwd())) {
        throw new Error('Cannot read files outside the project directory');
    }

    // Check ignore patterns
    const ignorePatterns = getConfig('ignorePatterns') || [];
    for (const pattern of ignorePatterns) {
        // Simple glob matching for ignored paths
        if (filePath.includes(pattern.replace(/\*/g, ''))) {
            throw new Error(`Path matches ignore pattern: ${pattern}`);
        }
    }

    try {
        // Check if file exists
        await fs.access(filePath);

        // Read file
        const content = await fs.readFile(filePath, 'utf-8');

        return content;
    } catch (error) {
        if (error.code === 'ENOENT') {
            throw new Error(`File not found: ${args.path}`);
        }
        throw new Error(`Failed to read file: ${error.message}`);
    }
}