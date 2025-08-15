import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';
import { getConfig } from '../config.js';
import { ToolError } from '../utils/errors.js';
import { CommandSanitizer } from '../security/commandSanitizer.js';

// Promisify exec
const execAsync = promisify(exec);

/**
 * Tool for executing shell commands
 * @param {Object} args - Tool arguments
 * @param {string} args.command - Command to execute
 * @param {string} [args.cwd] - Working directory (defaults to current)
 * @param {number} [args.timeout=30000] - Timeout in milliseconds
 * @returns {Promise<string>} - Command output
 */
export async function bashTool(args) {
    const toolName = 'BashTool';
    if (!args.command) {
        throw new ToolError('Command is required', toolName);
    }

    const command = args.command.trim();

    // Sanitize the command using the new security controller
    const securityProfile = getConfig('bashToolProfile', 'moderate');
    const sanitizer = new CommandSanitizer(securityProfile);
    const validationResult = sanitizer.sanitizeCommand(command);

    if (validationResult.blocked) {
        throw new ToolError(`Command blocked by security policy: ${validationResult.reason}`, toolName);
    }

    // For now, we will just warn about approval. The permission system will handle it later.
    if (validationResult.warnings.length > 0) {
        console.warn(chalk.yellow(`Security warnings for command "${command}":`));
        validationResult.warnings.forEach(w => console.warn(chalk.yellow(`- ${w}`)));
    }

    const cwd = args.cwd ? args.cwd : process.cwd();
    const timeout = args.timeout || 30000; // Default 30s timeout

    try {
        const { stdout, stderr } = await execAsync(command, {
            cwd,
            timeout,
            shell: true // Be aware, shell:true can be a security risk if not sanitized.
        });

        if (stderr) {
            return `Command executed with warnings:\n${stderr}\nOutput:\n${stdout}`;
        }

        return stdout;
    } catch (error) {
        throw new ToolError(`Command execution failed: ${error.message}`, toolName);
    }
}