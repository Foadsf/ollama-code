import { globby } from 'globby';
import path from 'path';
import { getConfig } from '../config.js';

/**
 * Tool for finding files matching a glob pattern
 * @param {Object} args - Tool arguments
 * @param {string} args.pattern - Glob pattern to match
 * @param {boolean} [args.includeHidden=false] - Whether to include hidden files
 * @param {boolean} [args.onlyDirectories=false] - Whether to only return directories
 * @returns {Promise<Array<string>>} - Matching file paths
 */
export async function globTool(args) {
    if (!args.pattern) {
        throw new Error('Pattern is required');
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

        // Convert absolute paths to relative
        return files.map(file => path.normalize(file));
    } catch (error) {
        throw new Error(`Failed to find files: ${error.message}`);
    }
}