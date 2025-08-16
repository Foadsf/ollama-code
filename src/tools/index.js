import { getConfig } from '../config.js';
import { checkPermission } from '../permissions.js';

// Import tool implementations
import { fileReadTool } from './fileReadTool.js';
import { fileEditTool } from './fileEditTool.js';
import { fileWriteTool } from './fileWriteTool.js';
import { lsTool } from './lsTool.js';
import { grepTool } from './grepTool.js';
import { globTool } from './globTool.js';
import { bashTool } from './bashTool.js';
import { gitTool } from './gitTool.js';

// Register all tools and their handlers
const toolRegistry = {
    'FileReadTool': {
        handler: fileReadTool,
        requiresPermission: false,
        description: 'Reads the contents of files'
    },
    'FileEditTool': {
        handler: fileEditTool,
        requiresPermission: true,
        description: 'Edits existing files'
    },
    'FileWriteTool': {
        handler: fileWriteTool,
        requiresPermission: true,
        description: 'Creates or overwrites files'
    },
    'LSTool': {
        handler: lsTool,
        requiresPermission: false,
        description: 'Lists directory contents'
    },
    'GrepTool': {
        handler: grepTool,
        requiresPermission: false,
        description: 'Searches file contents for patterns'
    },
    'GlobTool': {
        handler: globTool,
        requiresPermission: false,
        description: 'Finds files matching patterns'
    },
    'BashTool': {
        handler: bashTool,
        requiresPermission: true,
        description: 'Executes shell commands'
    },
    'GitTool': {
        handler: gitTool,
        requiresPermission: true,
        description: 'Performs Git operations'
    }
};

/**
 * Execute a tool command with permission checks
 * @param {Object} toolCall - Tool call object with name and arguments
 * @returns {Promise<any>} - Result of the tool execution
 */
export async function executeToolCommand(toolCall) {
    const { name, arguments: args } = toolCall;

    // Check if tool exists
    if (!toolRegistry[name]) {
        throw new Error(`Unknown tool: ${name}`);
    }

    const tool = toolRegistry[name];

    // Check if tool requires permission
    if (tool.requiresPermission) {
        // Get allowed tools from config
        const allowedTools = getConfig('allowedTools') || [];

        // Check if this specific tool call is already allowed
        const toolSignature = `${name}(${JSON.stringify(args)})`;
        const isAlreadyAllowed = allowedTools.some(allowed => {
            // Handle wildcard patterns (e.g., "BashTool(npm test:*)")
            if (allowed.includes('*')) {
                const pattern = allowed.replace(/\*/g, '.*');
                return new RegExp(`^${pattern}$`).test(toolSignature);
            }
            return allowed === toolSignature;
        });

        if (!isAlreadyAllowed) {
            // Request permission from user
            const granted = await checkPermission(name, args);
            if (!granted) {
                throw new Error(`Permission denied for ${name}`);
            }
        }
    }

    // Execute the tool
    try {
        return await tool.handler(args);
    } catch (error) {
        throw new Error(`Error executing ${name}: ${error.message}`);
    }
}

/**
 * Get all available tools with their descriptions
 * @returns {Object} - Map of tool names to descriptions
 */
export function listTools() {
    return Object.entries(toolRegistry).reduce((acc, [name, tool]) => {
        acc[name] = tool.description;
        return acc;
    }, {});
}