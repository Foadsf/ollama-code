import { Command } from 'commander';
import chalk from 'chalk';
import { startREPL } from './repl.js';
import { getConfig, setConfig, listConfig } from './config.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf8'));
const { version } = pkg;

/**
 * Start the CLI with the provided arguments
 * @param {Array} args - Command line arguments
 */
export function startCLI(args) {
    const program = new Command();

    program
        .name('olc')
        .description('A FLOSS alternative to Claude Code using Ollama for local LLM inference')
        .version(version);

    // Main command - starts the REPL
    program
        .argument('[query]', 'Optional initial query to start with')
        .option('-p, --print', 'Print response and exit (non-interactive mode)')
        .option('-v, --verbose', 'Enable verbose logging')
        .action((query, options) => {
            if (query) {
                startREPL(query, options);
            } else {
                displayWelcomeMessage();
                startREPL(null, options);
            }
        });

    // Config subcommand
    const configCmd = program
        .command('config')
        .description('Manage configuration');

    configCmd
        .command('get <key>')
        .description('Get a configuration value')
        .option('-g, --global', 'Use global configuration')
        .action((key, options) => {
            const value = getConfig(key, options.global);
            console.log(`${key}: ${value}`);
        });

    configCmd
        .command('set <key> <value>')
        .description('Set a configuration value')
        .option('-g, --global', 'Use global configuration')
        .action((key, value, options) => {
            setConfig(key, value, options.global);
            console.log(`Set ${key} to ${value} in ${options.global ? 'global' : 'project'} config`);
        });

    configCmd
        .command('list')
        .description('List all configuration values')
        .option('-g, --global', 'List global configuration')
        .action((options) => {
            const config = listConfig(options.global);
            console.log(JSON.stringify(config, null, 2));
        });

    // Update command
    program
        .command('update')
        .description('Update to the latest version')
        .action(() => {
            console.log('To update Ollama Code, run: npm update -g olc');
        });

    // Parse arguments or show help
    program.parse(args);
}

/**
 * Display a welcome message when starting the REPL
 */
function displayWelcomeMessage() {
    console.log(chalk.bold.blue('\n🐑 Ollama Code - AI-powered coding assistant\n'));
    console.log(chalk.gray('Type your questions or commands, or use /help to see available commands'));
    console.log(chalk.gray('Press Ctrl+C to exit\n'));
}