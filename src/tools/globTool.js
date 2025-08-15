import { globby } from 'globby';
import path from 'path';
import { getConfig } from '../config.js';
import { ToolError } from '../utils/errors.js';
import { FileAccessController } from '../security/fileAccessController.js';

/**
 * Tool for finding files matching a glob pattern
 * @param {Object} args - Tool arguments
 * @param {string} args.pattern - Glob pattern to match
 * @param {boolean} [args.includeHidden=false] - Whether to include hidden files
 * @param {boolean} [args.onlyDirectories=false] - Whether to only return directories
 * @returns {Promise<Array<string>>} - Matching file paths
 */
export async function globTool(args) {
    const toolName = 'GlobTool';
    if (!args.pattern) {
        throw new ToolError('Pattern is required', toolName);
    }

    const includeHidden = args.includeHidden || false;
    const onlyDirectories = args.onlyDirectories || false;

    // Get ignore patterns from config
    const ignorePatterns = getConfig('ignorePatterns') || [];

    try {
        const options = {
            cwd: process.cwd(),
            absolute: false,
            onlyDirectories,
            ignore: ignorePatterns,
            dot: includeHidden, // Include hidden files if requested
        };

        // Find matching files
        const files = await globby(args.pattern, options);

        // Post-filter results based on security policy
        const controller = new FileAccessController();
        const allowedFiles = [];
        for (const file of files) {
            const normalizedPath = path.normalize(file);
            const accessResult = controller.validateAccess('read', normalizedPath);
            if (accessResult.allowed) {
                allowedFiles.push(normalizedPath);
            }
        }

        return allowedFiles;
    } catch (error) {
        throw new ToolError(`Failed to find files: ${error.message}`, toolName);
    }
}