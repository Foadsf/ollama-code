import fs from 'fs/promises';
import path from 'path';
import { fileReadTool } from './fileReadTool.js';
import chalk from 'chalk';

class EnhancedFileEditTool {
    async execute(args) {
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

        const backup = await this.createBackup(filePath);

        try {
            await this.atomicEdit(filePath, args);

            // Clean up successful backup
            await fs.unlink(backup.path);

            return `File ${args.path} updated successfully`;
        } catch (error) {
            console.error(chalk.red(`Edit failed. Restoring from backup: ${backup.path}`));
            await this.restoreFromBackup(backup);
            if (error.code === 'ENOENT') {
                throw new Error(`File not found: ${args.path}`);
            }
            throw new Error(`Failed to edit file: ${error.message}`);
        }
    }

    async createBackup(filePath) {
        try {
            const backupPath = `${filePath}.backup.${Date.now()}`;
            const content = await fileReadTool({ path: filePath });
            await fs.writeFile(backupPath, content);
            return { path: backupPath };
        } catch (error) {
            // If backup fails, we shouldn't proceed.
            throw new Error(`Failed to create backup for ${filePath}: ${error.message}`);
        }
    }

    async restoreFromBackup(backup) {
        try {
            const content = await fileReadTool({ path: backup.path });
            await fs.writeFile(backup.path.replace(/\.backup\.\d+$/, ''), content);
            await fs.unlink(backup.path); // Clean up backup file
        } catch (error) {
            // This is a critical error, the user needs to know the restore failed.
            console.error(chalk.bgRed.bold(`CRITICAL: FAILED TO RESTORE FROM BACKUP. Your file may be in a bad state. Backup is at: ${backup.path}`));
        }
    }

    async atomicEdit(filePath, args) {
        const tempPath = `${filePath}.tmp.${process.pid}`;
        let originalContent = '';
        try {
            originalContent = await fs.readFile(filePath, 'utf-8');
            let newContent;

            if (args.startLine !== undefined && args.endLine !== undefined) {
                const lines = originalContent.split('\n');
                if (args.startLine < 0 || args.startLine >= lines.length ||
                    args.endLine < args.startLine || args.endLine >= lines.length) {
                    throw new Error('Invalid line range');
                }
                const newLines = [
                    ...lines.slice(0, args.startLine),
                    ...(args.newContent ? args.newContent.split('\n') : []),
                    ...lines.slice(args.endLine + 1)
                ];
                newContent = newLines.join('\n');
            } else {
                if (!originalContent.includes(args.oldContent)) {
                    throw new Error('Old content not found in file');
                }
                newContent = originalContent.replace(args.oldContent, args.newContent);
            }

            await fs.writeFile(tempPath, newContent, 'utf-8');
            await fs.rename(tempPath, filePath);
        } catch (error) {
            // Clean up temp file
            try { await fs.unlink(tempPath); } catch (e) { /* ignore */ }
            throw new Error(`Atomic edit failed: ${error.message}`);
        }
    }
}

const fileEditToolInstance = new EnhancedFileEditTool();

export async function fileEditTool(args) {
    return fileEditToolInstance.execute(args);
}