import { fileEditTool } from '../tools/fileEditTool.js';
import { fileWriteTool } from '../tools/fileWriteTool.js';
import { fileReadTool } from '../tools/fileReadTool.js';
import { bashTool } from '../tools/bashTool.js';
// import { gitTool } from '../tools/gitTool.js'; // For later

export class ImprovementExecutor {
    constructor() {
        this.executionLog = [];
    }

    async executeImprovement(improvement, validation) {
        const execution = {
            success: false,
            appliedChanges: [],
            errors: [],
            rollbackData: [],
        };

        const checkpoint = await this.createCheckpoint(improvement);
        execution.rollbackData.push(checkpoint);

        try {
            // Apply changes
            for (const change of improvement.changes) {
                const applied = await this.applyChange(change);
                execution.appliedChanges.push(applied);
            }

            // Verify the changes
            const verification = await this.verifyChanges(improvement);
            if (!verification.success) {
                throw new Error(`Post-change verification failed: ${verification.message}`);
            }

            // Commit changes (to be implemented later)
            // await this.commitChanges(improvement);

            execution.success = true;

        } catch (error) {
            execution.success = false;
            execution.errors.push({
                type: 'execution-failure',
                message: error.message
            });
            // Rollback on error
            await this.rollback(execution.rollbackData);
        }

        this.executionLog.push(execution);
        return execution;
    }

    async createCheckpoint(improvement) {
        const checkpoint = {
            timestamp: new Date(),
            affectedFiles: [],
        };

        for (const change of improvement.changes) {
            if (change.action === 'edit' || change.action === 'delete') {
                try {
                    const originalContent = await fileReadTool({ path: change.file });
                    checkpoint.affectedFiles.push({
                        path: change.file,
                        content: originalContent,
                        action: 'restore' // We need to restore this content
                    });
                } catch (error) {
                    // If the file doesn't exist, it's fine for a 'delete' action.
                    // For 'edit', it's an issue, but we'll let applyChange handle it.
                    if (error.message.includes('not found')) {
                         checkpoint.affectedFiles.push({
                            path: change.file,
                            content: null,
                            action: 'delete' // To roll back, we must delete this file if it was created
                        });
                    }
                }
            } else if (change.action === 'create') {
                 checkpoint.affectedFiles.push({
                    path: change.file,
                    content: null,
                    action: 'delete'
                });
            }
        }
        return checkpoint;
    }

    async applyChange(change) {
        switch (change.action) {
            case 'edit':
                // A simple replace is needed here, fileEditTool is for search/replace.
                // We'll use fileWriteTool to overwrite the file completely.
                await fileWriteTool({
                    path: change.file,
                    content: change.newCode
                });
                break;
            case 'create':
                await fileWriteTool({
                    path: change.file,
                    content: change.newCode
                });
                break;
            case 'delete':
                await bashTool({ command: `rm "${change.file}"` });
                break;
            default:
                throw new Error(`Unknown action in executor: ${change.action}`);
        }
        return { file: change.file, action: change.action, success: true };
    }

    async verifyChanges(improvement) {
        for (const change of improvement.changes) {
            if (change.action === 'edit' || change.action === 'create') {
                try {
                    await bashTool({ command: `node --check "${change.file}"` });
                } catch (error) {
                    return { success: false, message: `Syntax error in ${change.file}: ${error.message}` };
                }
            }
        }
        // A more robust verification would run the test suite here.
        // That is deferred for a later implementation.
        return { success: true, message: 'Basic syntax verification passed.' };
    }

    async rollback(rollbackData) {
        console.log('Rolling back changes...');
        for (const checkpoint of rollbackData.reverse()) {
            for (const backup of checkpoint.affectedFiles) {
                try {
                    if (backup.action === 'restore') {
                        await fileWriteTool({
                            path: backup.path,
                            content: backup.content
                        });
                    } else if (backup.action === 'delete') {
                        await bashTool({ command: `rm "${backup.path}"` });
                    }
                } catch (error) {
                    console.error(`Error during rollback of ${backup.path}: ${error.message}`);
                }
            }
        }
    }
}
