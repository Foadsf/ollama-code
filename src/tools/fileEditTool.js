import fs from 'fs/promises';
import path from 'path';
import { ToolError } from '../utils/errors.js';
import { FileAccessController } from '../security/fileAccessController.js';

/**
 * Tool for editing existing files
 * @param {Object} args - Tool arguments
 * @param {string} args.path - Path to the file
 * @param {string} args.oldContent - Content to replace
 * @param {string} args.newContent - New content to insert
 * @param {number} [args.startLine] - Start line for replacement (optional)
 * @param {number} [args.endLine] - End line for replacement (optional)
 * @returns {Promise<string>} - Success message
 */
export async function fileEditTool(args) {
    const toolName = 'FileEditTool';
    if (!args.path) {
        throw new ToolError('Path is required', toolName);
    }

    if ((!args.oldContent && args.startLine === undefined) ||
        (!args.newContent && args.startLine === undefined)) {
        throw new ToolError('Either oldContent/newContent pair or startLine/endLine pair is required', toolName);
    }

    // Validate file access
    const controller = new FileAccessController();
    const accessResult = controller.validateAccess('edit', args.path, { content: args.newContent });
     if (!accessResult.allowed) {
        throw new ToolError(`File access denied: ${accessResult.reason}`, toolName);
    }

    const filePath = path.resolve(process.cwd(), args.path);

    try {
        // Check if file exists
        await fs.access(filePath);

        // Read file
        let content = await fs.readFile(filePath, 'utf-8');

        // Edit by line numbers if provided
        if (args.startLine !== undefined && args.endLine !== undefined) {
            const lines = content.split('\n');

            if (args.startLine < 0 || args.startLine >= lines.length ||
                args.endLine < args.startLine || args.endLine >= lines.length) {
                throw new ToolError('Invalid line range', toolName);
            }

            // Replace lines
            const newLines = [
                ...lines.slice(0, args.startLine),
                ...(args.newContent ? args.newContent.split('\n') : []),
                ...lines.slice(args.endLine + 1)
            ];
            content = newLines.join('\n');
        } else {
            // Edit by content replacement
            if (!content.includes(args.oldContent)) {
                throw new ToolError('Old content not found in file', toolName);
            }

            content = content.replace(args.oldContent, args.newContent);
        }

        // Write updated content
        await fs.writeFile(filePath, content, 'utf-8');

        return `File ${args.path} updated successfully`;
    } catch (error) {
        if (error instanceof ToolError) throw error;
        if (error.code === 'ENOENT') {
            throw new ToolError(`File not found: ${args.path}`, toolName);
        }
        throw new ToolError(`Failed to edit file: ${error.message}`, toolName);
    }
}