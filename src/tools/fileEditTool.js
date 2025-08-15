import * as fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { ToolError } from '../utils/errors.js';
import { FileAccessController } from '../security/fileAccessController.js';
import { fileReadTool } from './fileReadTool.js';

export class EnhancedFileEditTool {
    async editFile(args) {
        const toolName = 'FileEditTool';
        if (!args.path) {
            throw new ToolError('Path is required', toolName);
        }

        // Validate access before doing anything
        const controller = new FileAccessController();
        const accessResult = controller.validateAccess('edit', args.path, { content: args.newContent });
        if (!accessResult.allowed) {
            throw new ToolError(`File access denied: ${accessResult.reason}`, toolName);
        }

        // 1. Create backup before editing
        const backup = await this.createBackup(args.path);

        try {
            // 2. Show diff preview (not fully implemented as per spec, needs a diff library)
            if (args.previewDiff) {
                const diff = await this.generateDiff(args);
                // In a real scenario, we might ask the user for confirmation here.
                // For now, we'll just return the diff.
                return { action: 'preview', diff };
            }

            // 3. Apply edit with atomic operation
            const result = await this.atomicEdit(args);

            return result;
        } catch (error) {
            // 5. Restore from backup on failure
            await this.restoreFromBackup(backup);
            throw error; // Re-throw the original error
        }
    }

    async createBackup(filePath) {
        try {
            const backupPath = `${filePath}.backup.${Date.now()}`;
            const content = await fileReadTool({ path: filePath });
            await fs.writeFile(backupPath, content);
            return { path: backupPath, timestamp: new Date() };
        } catch (error) {
            // If backup fails, we shouldn't proceed.
            throw new ToolError(`Failed to create backup for ${filePath}: ${error.message}`, 'FileEditTool');
        }
    }

    async restoreFromBackup(backup) {
        try {
            const content = await fileReadTool({ path: backup.path });
            await fs.writeFile(backup.path.replace(/.backup.*$/, ''), content);
            await fs.unlink(backup.path); // Clean up backup file
        } catch (error) {
            console.warn(chalk.yellow(`Failed to restore from backup ${backup.path}: ${error.message}`));
        }
    }

    async generateDiff(args) {
        // Generate and format diff for preview
        const originalContent = await fileReadTool({ path: args.path });
        // This is a simplified replacement. A real diff would be more complex.
        const newContent = originalContent.replace(args.oldContent, args.newContent);

        return `--- ${args.path}\n+++ ${args.path}\n- ${args.oldContent}\n+ ${args.newContent}`;
    }

    async atomicEdit(args) {
        const tempPath = `${args.path}.tmp.${process.pid}`;

        try {
            const content = await fileReadTool({ path: args.path });
            // This simplified logic replaces only the first occurrence.
            // The original fileEditTool had more complex logic for line-based edits.
            // For now, we'll stick to simple content replacement.
            if (!content.includes(args.oldContent)) {
                throw new Error('Old content not found in file');
            }
            const newContent = content.replace(args.oldContent, args.newContent);

            await fs.writeFile(tempPath, newContent, 'utf-8');
            await fs.rename(tempPath, args.path);

            return { success: true, message: `File ${args.path} updated successfully` };
        } catch (error) {
            // Clean up temp file
            try { await fs.unlink(tempPath); } catch (e) { /* ignore */ }
            throw new ToolError(`Atomic edit failed: ${error.message}`, 'FileEditTool');
        }
    }
}

const fileEditToolInstance = new EnhancedFileEditTool();

export async function fileEditTool(args) {
    return fileEditToolInstance.editFile(args);
}