export class CommandSanitizer {
    constructor(securityProfile = 'moderate') {
        this.profile = securityProfile;
        this.loadSecurityRules();
    }

    loadSecurityRules() {
        this.rules = {
            strict: {
                allowedCommands: ['ls', 'cat', 'grep', 'find', 'git', 'npm', 'node'],
                blockedPatterns: [
                    /rm\s+-rf/i,
                    />\s*\/dev\//i,
                    /curl.*\|.*sh/i,
                    /wget.*\|.*sh/i,
                    /eval\s*\(/i,
                    /exec\s*\(/i,
                    /system\s*\(/i,
                    /`.*`/,  // backticks
                    /\$\(.*\)/, // command substitution
                    /&&|;|\|{2}/,  // command chaining
                    />\s*&/,  // redirection to processes
                    /nc\s+/i,  // netcat
                    /telnet\s+/i,
                    /ssh\s+.*@/i
                ],
                maxLength: 200,
                requiresApproval: ['rm', 'mv', 'cp', 'chmod', 'chown']
            },
            moderate: {
                allowedCommands: null, // null means no whitelist
                blockedPatterns: [
                    /rm\s+-rf\s+\/[^\/]/i,  // rm -rf /something (but not subdirs)
                    />\s*\/dev\/null.*&&.*rm/i,
                    /curl.*\|\s*(bash|sh)/i,
                    /wget.*\|\s*(bash|sh)/i,
                    /fork\s*\(/i,
                    /\$\(curl/i,
                    /nc\s+-.*-e/i  // netcat with execute
                ],
                maxLength: 500,
                requiresApproval: ['rm -rf', 'sudo', 'su']
            },
            permissive: {
                allowedCommands: null,
                blockedPatterns: [
                    /rm\s+-rf\s+\/$/i,  // only block rm -rf /
                    /:\(\)\{\s*:\|\:&\s*\}:/  // fork bomb
                ],
                maxLength: 1000,
                requiresApproval: ['sudo rm -rf /']
            }
        };
    }

    sanitizeCommand(command) {
        const profile = this.rules[this.profile];
        const result = {
            sanitized: command,
            blocked: false,
            warnings: [],
            requiresApproval: false,
            reason: null
        };

        // Length check
        if (command.length > profile.maxLength) {
            result.blocked = true;
            result.reason = `Command exceeds maximum length (${profile.maxLength})`;
            return result;
        }

        // Whitelist check (if applicable)
        if (profile.allowedCommands) {
            const baseCommand = command.split(' ')[0];
            if (!profile.allowedCommands.includes(baseCommand)) {
                result.blocked = true;
                result.reason = `Command '${baseCommand}' not in allowed list`;
                return result;
            }
        }

        // Pattern blocking
        for (const pattern of profile.blockedPatterns) {
            if (pattern.test(command)) {
                result.blocked = true;
                result.reason = `Command matches blocked pattern: ${pattern}`;
                return result;
            }
        }

        // Approval requirements
        for (const approvalPattern of profile.requiresApproval) {
            if (command.includes(approvalPattern)) {
                result.requiresApproval = true;
                result.warnings.push(`Command contains '${approvalPattern}' - requires approval`);
            }
        }

        // Additional safety checks
        result.warnings.push(...this.detectSuspiciousPatterns(command));

        return result;
    }

    detectSuspiciousPatterns(command) {
        const warnings = [];

        if (/\$\{.*\}/.test(command)) {
            warnings.push('Variable expansion detected');
        }

        if (/\*/.test(command) && !/\*\.(js|json|md|txt)/.test(command)) {
            warnings.push('Wildcard usage detected');
        }

        if (/sudo/.test(command)) {
            warnings.push('Elevated privileges requested');
        }

        return warnings;
    }
}
