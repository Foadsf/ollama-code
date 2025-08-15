import path from 'path';
import { getConfig } from '../config.js';

export class FileAccessController {
    constructor() {
        this.securityProfile = getConfig('securityProfile', 'moderate');
        this.loadAccessRules();
    }

    loadAccessRules() {
        this.rules = {
            strict: {
                allowedDirectories: ['src', 'tests', 'docs'],
                blockedDirectories: ['node_modules', '.git', 'bin', '/', '/etc', '/var'],
                allowedExtensions: ['.js', '.json', '.md', '.txt', '.yml', '.yaml'],
                maxFileSize: 1024 * 1024, // 1MB
                requiresApproval: {
                    write: ['package.json', 'package-lock.json'],
                    delete: ['*']
                }
            },
            moderate: {
                allowedDirectories: null, // null means project root and subdirs
                blockedDirectories: ['node_modules', '.git', '/', '/etc', '/var', '/usr', '/bin'],
                allowedExtensions: null, // null means all extensions allowed
                maxFileSize: 10 * 1024 * 1024, // 10MB
                requiresApproval: {
                    write: ['package.json'],
                    delete: ['src/**', 'package.json']
                }
            },
            permissive: {
                allowedDirectories: null,
                blockedDirectories: ['/', '/etc', '/var', '/usr/bin', '/bin'],
                allowedExtensions: null,
                maxFileSize: 50 * 1024 * 1024, // 50MB
                requiresApproval: {
                    write: [],
                    delete: ['package.json', 'src/index.js']
                }
            }
        };
    }

    validateAccess(operation, filePath, options = {}) {
        const profile = this.rules[this.securityProfile];
        const result = {
            allowed: false,
            requiresApproval: false,
            warnings: [],
            reason: null
        };

        try {
            // Normalize and resolve path
            const resolvedPath = path.resolve(process.cwd(), filePath);
            const relativePath = path.relative(process.cwd(), resolvedPath);

            // Path traversal check
            if (resolvedPath.includes('..') || !resolvedPath.startsWith(process.cwd())) {
                result.reason = 'Path traversal attempt detected';
                return result;
            }

            // Directory whitelist check
            if (profile.allowedDirectories) {
                const dirAllowed = profile.allowedDirectories.some(allowedDir =>
                    relativePath.startsWith(allowedDir)
                );
                if (!dirAllowed) {
                    result.reason = `Directory not in allowed list: ${path.dirname(relativePath)}`;
                    return result;
                }
            }

            // Directory blacklist check
            for (const blockedDir of profile.blockedDirectories) {
                const resolvedBlockedDir = path.resolve(blockedDir);
                if (resolvedBlockedDir === '/') {
                    // Special case for root directory to prevent blocking the entire project
                    if (resolvedPath === resolvedBlockedDir) {
                        result.reason = `Access to blocked directory: ${blockedDir}`;
                        return result;
                    }
                } else if (resolvedPath.startsWith(resolvedBlockedDir)) {
                     result.reason = `Access to blocked directory: ${blockedDir}`;
                    return result;
                }
            }

            // Extension check
            if (profile.allowedExtensions) {
                const extension = path.extname(filePath);
                if (!profile.allowedExtensions.includes(extension)) {
                    result.reason = `File extension not allowed: ${extension}`;
                    return result;
                }
            }

            // File size check (for write operations)
            if ((operation === 'write' || operation === 'edit') && options.content) {
                const size = Buffer.byteLength(options.content, 'utf8');
                if (size > profile.maxFileSize) {
                    result.reason = `File size exceeds limit: ${size} > ${profile.maxFileSize}`;
                    return result;
                }
            }

            // Approval requirements
            const approvalRules = profile.requiresApproval[operation] || [];
            for (const rule of approvalRules) {
                if (this.matchesPattern(relativePath, rule)) {
                    result.requiresApproval = true;
                    result.warnings.push(`Operation requires approval: ${operation} on ${relativePath}`);
                }
            }

            // Additional security checks
            result.warnings.push(...this.performSecurityChecks(operation, filePath, options));

            result.allowed = true;
            return result;

        } catch (error) {
            result.reason = `Access validation error: ${error.message}`;
            return result;
        }
    }

    matchesPattern(filePath, pattern) {
        if (pattern === '*') return true;
        if (pattern.includes('**')) {
            const regex = new RegExp('^' + pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*') + '$');
            return regex.test(filePath);
        }
        return filePath === pattern || filePath.endsWith(pattern);
    }

    performSecurityChecks(operation, filePath, options) {
        const warnings = [];

        // Check for suspicious file names
        if (/\.(exe|bat|cmd|sh|ps1)$/i.test(filePath)) {
            warnings.push('Executable file detected');
        }

        // Check for hidden files
        if (path.basename(filePath).startsWith('.') && !filePath.includes('.gitignore')) {
            warnings.push('Hidden file access');
        }

        // Check for content-based threats (basic)
        if (options.content && operation === 'write') {
            if (/eval\s*\(|Function\s*\(|setTimeout\s*\(.*string/i.test(options.content)) {
                warnings.push('Potentially dangerous code detected in content');
            }
        }

        return warnings;
    }
}
