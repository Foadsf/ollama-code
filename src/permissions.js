import inquirer from 'inquirer';
import chalk from 'chalk';
import { addToConfig } from './config.js';

// Track permissions granted for the current session
const sessionPermissions = new Set();

/**
 * Check if a tool has permission to run
 * @param {string} toolName - Name of the tool
 * @param {Object} args - Tool arguments
 * @returns {Promise<boolean>} - Whether permission is granted
 */
export async function checkPermission(toolName, args) {
    // Stringify the arguments for display
    const argsStr = JSON.stringify(args, null, 2);

    // Create a unique signature for this tool call
    const toolSignature = `${toolName}(${JSON.stringify(args)})`;

    // Check if permission was already granted in this session
    if (sessionPermissions.has(toolSignature)) {
        return true;
    }

    // Display warning based on tool type
    let message = '';
    let dangerLevel = '';

    switch (toolName) {
        case 'BashTool':
            message = `Allow executing shell command: ${chalk.cyan(args.command)}`;
            dangerLevel = chalk.red('⚠️  CAUTION: Shell commands can modify your system');
            break;
        case 'FileEditTool':
            message = `Allow editing file: ${chalk.cyan(args.path)}`;
            dangerLevel = chalk.yellow('⚠️  NOTE: This will modify an existing file');
            break;
        case 'FileWriteTool':
            message = `Allow writing to file: ${chalk.cyan(args.path)}`;
            dangerLevel = chalk.yellow('⚠️  NOTE: This will create or overwrite a file');
            break;
        case 'GitTool':
            message = `Allow Git operation: ${chalk.cyan(args.operation)} ${args.params ? chalk.gray(JSON.stringify(args.params)) : ''}`;
            dangerLevel = chalk.yellow('⚠️  NOTE: This will modify your Git repository');
            break;
        default:
            message = `Allow ${toolName} with args: ${chalk.gray(argsStr)}`;
            dangerLevel = chalk.yellow('⚠️  NOTE: This tool requires permission');
    }

    // Display formatted request
    console.log('\n' + chalk.bold('Permission Request:'));
    console.log(message);
    console.log(dangerLevel + '\n');

    // Prompt for permission
    const { permission, remember } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'permission',
            message: 'Grant permission?',
            default: false,
        },
        {
            type: 'list',
            name: 'remember',
            message: 'Remember this decision?',
            choices: [
                { name: 'Just for this session', value: 'session' },
                { name: 'Save to project config', value: 'project' },
                { name: 'Don\'t remember', value: 'none' },
            ],
            default: 'none',
            when: (answers) => answers.permission,
        },
    ]);

    if (permission) {
        // Handle remembering the permission
        switch (remember) {
            case 'session':
                sessionPermissions.add(toolSignature);
                console.log(chalk.green('Permission granted for this session'));
                break;
            case 'project':
                // Save to project config
                addToConfig('allowedTools', toolSignature);
                console.log(chalk.green('Permission saved to project config'));
                break;
            default:
                console.log(chalk.green('Permission granted once'));
        }
    } else {
        console.log(chalk.red('Permission denied'));
    }

    return permission;
}

/**
 * Clear all session permissions
 */
export function clearSessionPermissions() {
    sessionPermissions.clear();
}