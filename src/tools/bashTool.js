import { exec } from 'child_process';
import { promisify } from 'util';
import { getConfig } from '../config.js';
import { ToolError } from '../utils/errors.js';

// Promisify exec
const execAsync = promisify(exec);

// List of potentially dangerous commands that should be blocked
const BLOCKED_COMMANDS = [
    'rm -rf /', 'rm -rf *', 'rm -rf ~',
    'wget', 'curl', 'nc', 'ncat', 'netcat',
    '>>', '>', '|', ';', '&&', '||', '&'
];

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
    const cwd = args.cwd ? args.cwd : process.cwd();
    const timeout = args.timeout || 30000; // Default 30s timeout

    // Security check
    if (isCommandDangerous(command)) {
        throw new ToolError('Command contains potentially dangerous operations and is blocked for security reasons', toolName);
    }

    try {
        const { stdout, stderr } = await execAsync(command, {
            cwd,
            timeout,
            shell: true
        });

        if (stderr) {
            return `Command executed with warnings:\n${stderr}\nOutput:\n${stdout}`;
        }

        return stdout;
    } catch (error) {
        throw new ToolError(`Command execution failed: ${error.message}`, toolName);
    }
}

/**
 * Check if a command contains potentially dangerous operations
 * @param {string} command - Command to check
 * @returns {boolean} - Whether the command is dangerous
 */
function isCommandDangerous(command) {
    // Check against the blocked command list
    for (const blocked of BLOCKED_COMMANDS) {
        if (command.includes(blocked)) {
            return true;
        }
    }

    // Restrict certain commands with arguments that might be dangerous
    if (command.match(/^rm\s+(-r|-rf|--recursive|--force|-f)/)) {
        // Allow rm -rf in specific directories only
        if (command.match(/^rm\s+(-r|-rf|--recursive|--force|-f).*\//)) {
            return true;
        }
    }

    // Check for curl/wget commands that might download and execute code
    if ((command.startsWith('curl') || command.startsWith('wget')) &&
        (command.includes('| bash') || command.includes('| sh'))) {
        return true;
    }

    return false;
}