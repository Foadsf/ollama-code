import fs from 'fs/promises';
import path from 'path';
import { getConfig } from '../config.js';

/**
 * Tool for creating or overwriting files
 * @param {Object} args - Tool arguments
 * @param {string} args.path - Path to the file
 * @param {string} args.content - Content to write
 * @param {boolean} [args.append=false] - Whether to append to the file
 * @returns {Promise<string>} - Success message
 */
export async function fileWriteTool(args) {
    if (!args.path) {
        throw new Error('Path is required');
    }

    if (args.content === undefined) {
        throw new Error('Content is required');
    }

    // Normalize and resolve the path
    const filePath = path.resolve(process.cwd(), args.path);

    // Check if path is within the project directory
    if (!filePath.startsWith(process.cwd())) {
        throw new Error('Cannot write files outside the project directory');
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
        // Create directory if it doesn't exist
        const dirname = path.dirname(filePath);
        await fs.mkdir(dirname, { recursive: true });

        // Write or append to file
        if (args.append) {
            await fs.appendFile(filePath, args.content, 'utf-8');
            return `Content appended to ${args.path}`;
        } else {
            await fs.writeFile(filePath, args.content, 'utf-8');
            return `File ${args.path} created successfully`;
        }
    } catch (error) {
        throw new Error(`Failed to write file: ${error.message}`);
    }
}