import fs from 'fs/promises';
import path from 'path';
import { getConfig } from '../config.js';
import { ToolError } from '../utils/errors.js';
import { FileAccessController } from '../security/fileAccessController.js';

/**
 * Tool for creating or overwriting files
 * @param {Object} args - Tool arguments
 * @param {string} args.path - Path to the file
 * @param {string} args.content - Content to write
 * @param {boolean} [args.append=false] - Whether to append to the file
 * @returns {Promise<string>} - Success message
 */
export async function fileWriteTool(args) {
    const toolName = 'FileWriteTool';
    if (!args.path) {
        throw new ToolError('Path is required', toolName);
    }

    if (args.content === undefined) {
        throw new ToolError('Content is required', toolName);
    }

    // Validate file access
    const controller = new FileAccessController();
    const accessResult = controller.validateAccess('write', args.path, { content: args.content });
    if (!accessResult.allowed) {
        throw new ToolError(`File access denied: ${accessResult.reason}`, toolName);
    }

    const filePath = path.resolve(process.cwd(), args.path);

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
        throw new ToolError(`Failed to write file: ${error.message}`, toolName);
    }
}