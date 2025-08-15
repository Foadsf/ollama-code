import * as fs from 'fs/promises';
import path from 'path';
import { getConfig } from '../config.js';
import { ToolError } from '../utils/errors.js';
import { FileAccessController } from '../security/fileAccessController.js';

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

    // Validate file access
    const controller = new FileAccessController();
    const accessResult = controller.validateAccess('read', args.path);
    if (!accessResult.allowed) {
        throw new ToolError(`File access denied: ${accessResult.reason}`, toolName);
    }

    const filePath = path.resolve(process.cwd(), args.path);

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