import { exec } from 'child_process';
import { promisify } from 'util';
import { getConfig } from '../config.js';
import chalk from 'chalk';

// --- Embedded Security and Logging Classes ---

class CommandSanitizer {
    constructor(securityProfile = 'moderate') {
        this.profile = securityProfile;
        this.loadSecurityRules();
    }

    loadSecurityRules() {
        this.rules = {
            strict: {
                allowedCommands: ['ls', 'cat', 'grep', 'find', 'git', 'npm', 'node'],
                blockedPatterns: [/>\s*\/dev\//i, /`.*`/, /\$\(.*\)/, /&&|;|\|{2}/]
            },
            moderate: {
                allowedCommands: null,
                blockedPatterns: [/rm\s+-rf\s+\/[^\/]/i, /curl.*\|\s*(bash|sh)/i]
            },
            permissive: {
                allowedCommands: null,
                blockedPatterns: [/:\(\)\{\s*:\|\:&\s*\}:/]
            }
        };
    }

    sanitizeCommand(command) {
        const profile = this.rules[this.profile];
        if (!profile) {
            return { blocked: true, reason: 'Unknown security profile.' };
        }
        if (profile.allowedCommands && !profile.allowedCommands.includes(command.split(' ')[0])) {
            return { blocked: true, reason: `Command not in allowed list for ${this.profile} profile.` };
        }
        for (const pattern of profile.blockedPatterns) {
            if (pattern.test(command)) {
                return { blocked: true, reason: `Command matches blocked pattern: ${pattern}` };
            }
        }
        return { blocked: false, reason: null };
    }
}

class AuditLogger {
    constructor() {
        this.logs = [];
    }
    log(entry) {
        const logEntry = { timestamp: new Date().toISOString(), ...entry };
        this.logs.push(logEntry);
        // In this embedded version, we log to console instead of a file.
        console.log(chalk.grey(`[AUDIT]: ${JSON.stringify(logEntry)}`));
    }
}

const auditLogger = new AuditLogger();

// Promisify exec
const execAsync = promisify(exec);

class EnhancedBashTool {
    constructor() {
        this.commandHistory = [];
    }

    async execute(args) {
        const toolName = 'BashTool';
        if (!args.command) {
            throw new Error('Command is required');
        }

        const command = args.command.trim();
        const cwd = args.cwd ? args.cwd : process.cwd();
        const timeout = args.timeout || 30000;

        // 1. Integrate Sanitizer
        const securityProfile = getConfig('bashToolProfile', 'moderate');
        const sanitizer = new CommandSanitizer(securityProfile);
        const validationResult = sanitizer.sanitizeCommand(command);

        if (validationResult.blocked) {
            auditLogger.log({ event: 'blocked_command', command, reason: validationResult.reason });
            throw new Error(`Command blocked by security policy: ${validationResult.reason}`);
        }

        // 2. Integrate Logger (start) and Performance Monitoring
        const startTime = Date.now();
        auditLogger.log({ event: 'execute_command', command });
        this.commandHistory.push({ command, timestamp: new Date() });

        const maxRetries = 3;
        let lastError = null;

        for (let i = 0; i < maxRetries; i++) {
            try {
                const { stdout, stderr } = await execAsync(command, {
                    cwd,
                    timeout,
                    shell: true
                });

                const duration = Date.now() - startTime;
                if (stderr) {
                    auditLogger.log({ event: 'command_warning', command, stderr, duration });
                    return `Command executed with warnings:\n${stderr}\nOutput:\n${stdout}`;
                }

                auditLogger.log({ event: 'command_success', command, duration });
                return stdout;
            } catch (error) {
                lastError = error;
                // Only retry on timeouts or specific transient errors
                if (error.timedOut || error.code === 'ETIMEDOUT') {
                    auditLogger.log({ event: 'command_retry', command, attempt: i + 1, error: error.message });
                    await new Promise(res => setTimeout(res, 500 * (i + 1))); // wait longer each time
                } else {
                    // Don't retry on other errors
                    break;
                }
            }
        }

        const duration = Date.now() - startTime;
        auditLogger.log({ event: 'command_failure', command, error: lastError.message, duration });
        throw new Error(`Command execution failed after ${maxRetries} retries: ${lastError.message}`);
    }
    }
}

const bashToolInstance = new EnhancedBashTool();

export async function bashTool(args) {
    return bashToolInstance.execute(args);
}