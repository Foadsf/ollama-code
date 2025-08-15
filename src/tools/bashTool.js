import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';
import { getConfig } from '../config.js';
import { ToolError } from '../utils/errors.js';
import { CommandSanitizer } from '../security/commandSanitizer.js';

// Promisify exec
const execAsync = promisify(exec);

export class EnhancedBashTool {
    constructor() {
        this.commandHistory = [];
        this.aliases = new Map();
    }

    async execute(args) {
        const toolName = 'BashTool';
        if (!args.command) {
            throw new ToolError('Command is required', toolName);
        }

        const command = args.command.trim();

        // Add to command history
        this.commandHistory.push({
            command: command,
            timestamp: new Date(),
            cwd: args.cwd || process.cwd()
        });

        const securityProfile = getConfig('bashToolProfile', 'moderate');
        const sanitizer = new CommandSanitizer(securityProfile);
        const validationResult = sanitizer.sanitizeCommand(command);

        if (validationResult.blocked) {
            throw new ToolError(`Command blocked by security policy: ${validationResult.reason}`, toolName);
        }

        if (validationResult.warnings.length > 0) {
            console.warn(chalk.yellow(`Security warnings for command "${command}":`));
            validationResult.warnings.forEach(w => console.warn(chalk.yellow(`- ${w}`)));
        }

        const cwd = args.cwd ? args.cwd : process.cwd();
        const timeout = args.timeout || 30000;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const { stdout, stderr } = await execAsync(command, {
                cwd,
                signal: controller.signal,
                shell: true
            });

            if (stderr) {
                return `Command executed with warnings:\n${stderr}\nOutput:\n${stdout}`;
            }

            return stdout;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new ToolError(`Command timed out after ${timeout}ms and was cancelled`, toolName);
            }
            throw new ToolError(`Command execution failed: ${error.message}`, toolName);
        } finally {
            clearTimeout(timeoutId);
        }
    }
}

// Maintain a singleton instance for history and aliases
const bashToolInstance = new EnhancedBashTool();

// The exported tool function that the system calls, ensuring backward compatibility.
export async function bashTool(args) {
    return bashToolInstance.execute(args);
}