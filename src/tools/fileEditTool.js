import fs from 'fs/promises';
import path from 'path';

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
    if (!args.path) {
        throw new Error('Path is required');
    }

    if ((!args.oldContent && args.startLine === undefined) ||
        (!args.newContent && args.startLine === undefined)) {
        throw new Error('Either oldContent/newContent pair or startLine/endLine pair is required');
    }

    // Normalize and resolve the path
    const filePath = path.resolve(process.cwd(), args.path);

    // Check if path is within the project directory
    if (!filePath.startsWith(process.cwd())) {
        throw new Error('Cannot edit files outside the project directory');
    }

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
                throw new Error('Invalid line range');
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
                throw new Error('Old content not found in file');
            }

            content = content.replace(args.oldContent, args.newContent);
        }

        // Write updated content
        await fs.writeFile(filePath, content, 'utf-8');

        return `File ${args.path} updated successfully`;
    } catch (error) {
        if (error.code === 'ENOENT') {
            throw new Error(`File not found: ${args.path}`);
        }
        throw new Error(`Failed to edit file: ${error.message}`);
    }
}