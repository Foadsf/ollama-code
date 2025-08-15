import * as fs from 'fs/promises';
import path from 'path';
import { getConfig } from '../config.js';

export class AuditLogger {
    constructor() {
        this.logPath = path.join(process.cwd(), '.olc-audit.log');
        this.isEnabled = getConfig('auditLogging', true);
        this.maxLogSize = 10 * 1024 * 1024; // 10MB
        this.rotateCount = 5;
    }

    async logToolExecution(toolName, args, result, user = 'system') {
        if (!this.isEnabled) return;

        const logEntry = {
            timestamp: new Date().toISOString(),
            type: 'tool_execution',
            tool: toolName,
            user,
            arguments: this.sanitizeArgs(args),
            success: result.success !== false,
            error: result.error || null,
            riskLevel: this.assessRiskLevel(toolName, args),
            sessionId: this.getSessionId()
        };

        await this.writeLogEntry(logEntry);
    }

    async logSecurityEvent(eventType, details, severity = 'medium') {
        if (!this.isEnabled) return;

        const logEntry = {
            timestamp: new Date().toISOString(),
            type: 'security_event',
            eventType,
            severity,
            details: this.sanitizeDetails(details),
            sessionId: this.getSessionId()
        };

        await this.writeLogEntry(logEntry);
    }

    async logPermissionRequest(toolName, args, granted, permanent = false) {
        if (!this.isEnabled) return;

        const logEntry = {
            timestamp: new Date().toISOString(),
            type: 'permission_request',
            tool: toolName,
            arguments: this.sanitizeArgs(args),
            granted,
            permanent,
            sessionId: this.getSessionId()
        };

        await this.writeLogEntry(logEntry);
    }

    async writeLogEntry(entry) {
        try {
            // Check log rotation
            await this.rotateLogIfNeeded();

            // Append log entry
            const logLine = JSON.stringify(entry) + '\n';
            await fs.appendFile(this.logPath, logLine);

        } catch (error) {
            console.error('Failed to write audit log:', error.message);
        }
    }

    async rotateLogIfNeeded() {
        try {
            const stats = await fs.stat(this.logPath);
            if (stats.size > this.maxLogSize) {
                await this.rotateLog();
            }
        } catch (error) {
            // Log file doesn't exist yet, which is fine
        }
    }

    async rotateLog() {
        try {
            // Rotate existing logs
            for (let i = this.rotateCount - 1; i > 0; i--) {
                const oldPath = `${this.logPath}.${i}`;
                const newPath = `${this.logPath}.${i + 1}`;

                try {
                    await fs.rename(oldPath, newPath);
                } catch (error) {
                    // File might not exist, which is fine
                }
            }

            // Move current log to .1
            await fs.rename(this.logPath, `${this.logPath}.1`);

        } catch (error) {
            console.error('Failed to rotate audit log:', error.message);
        }
    }

    sanitizeArgs(args) {
        // Remove sensitive information from arguments
        const sanitized = { ...args };

        // Remove or mask sensitive fields
        if (sanitized.content && sanitized.content.length > 500) {
            sanitized.content = sanitized.content.substring(0, 500) + '... [truncated]';
        }

        if (sanitized.command && /password|token|key|secret/i.test(sanitized.command)) {
            sanitized.command = sanitized.command.replace(/(-p|--password|--token|--key)\s+\S+/gi, '$1 [REDACTED]');
        }

        return sanitized;
    }

    sanitizeDetails(details) {
        // Sanitize sensitive details
        if (typeof details === 'string') {
            return details.length > 1000 ? details.substring(0, 1000) + '... [truncated]' : details;
        }
        return details;
    }

    assessRiskLevel(toolName, args) {
        // Simple risk assessment
        if (toolName === 'BashTool') {
            if (args.command?.includes('rm ') || args.command?.includes('sudo')) {
                return 'high';
            }
            return 'medium';
        }

        if (toolName === 'FileEditTool' || toolName === 'FileWriteTool') {
            if (args.path?.includes('package.json') || args.path?.includes('config')) {
                return 'medium';
            }
            return 'low';
        }

        return 'low';
    }

    getSessionId() {
        // Simple session tracking
        if (!this._sessionId) {
            this._sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
        }
        return this._sessionId;
    }

    async getAuditSummary(hours = 24) {
        try {
            const content = await fs.readFile(this.logPath, 'utf8');
            const lines = content.trim().split('\n');
            const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

            const recentEntries = lines
                .map(line => {
                    try {
                        return JSON.parse(line);
                    } catch {
                        return null;
                    }
                })
                .filter(entry => entry && new Date(entry.timestamp) > cutoff);

            return {
                totalEvents: recentEntries.length,
                toolExecutions: recentEntries.filter(e => e.type === 'tool_execution').length,
                securityEvents: recentEntries.filter(e => e.type === 'security_event').length,
                permissionRequests: recentEntries.filter(e => e.type === 'permission_request').length,
                riskDistribution: this.groupBy(recentEntries, 'riskLevel'),
                timeRange: { start: cutoff.toISOString(), end: new Date().toISOString() }
            };

        } catch (error) {
            return { error: error.message };
        }
    }

    groupBy(array, key) {
        return array.reduce((groups, item) => {
            const group = item[key] || 'unknown';
            groups[group] = (groups[group] || 0) + 1;
            return groups;
        }, {});
    }

    async clearLogs() {
        try {
            await fs.unlink(this.logPath);
            for (let i = 1; i <= this.rotateCount; i++) {
                await fs.unlink(`${this.logPath}.${i}`).catch(() => {});
            }
        } catch (error) {
            // Ignore if file doesn't exist
            if (error.code !== 'ENOENT') {
                console.error('Failed to clear audit logs:', error.message);
            }
        }
    }
}

// Singleton instance
export const auditLogger = new AuditLogger();
