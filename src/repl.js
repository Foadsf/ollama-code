import readline from 'readline';
import chalk from 'chalk';
import ora from 'ora';
import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import { getOllamaClient } from './ollama.js';
import { getConfig } from './config.js';
import { executeToolCommand } from './tools/index.js';
import { parseToolCalls } from './utils/parsing.js';
import { handleError } from './utils/errorHandler.js';

// --- Embedded Performance Classes ---

class ConversationManager {
    constructor(options = {}) {
        this.maxTokens = options.maxTokens || 4000;
        this.compressionThreshold = options.compressionThreshold || 0.8;
        this.minRetainedMessages = options.minRetainedMessages || 4;
    }

    async manageConversation(conversation, ollama) {
        const tokenCount = this.estimateTokenCount(conversation);
        if (tokenCount > this.maxTokens * this.compressionThreshold) {
            return await this.optimizeConversation(conversation, ollama);
        }
        return conversation;
    }

    estimateTokenCount(messages) {
        return messages.reduce((total, msg) => total + Math.ceil(msg.content.length / 4), 0);
    }

    async optimizeConversation(conversation, ollama) {
        if (conversation.length <= this.minRetainedMessages) {
            return conversation;
        }
        const systemMessage = conversation[0];
        const recentMessages = conversation.slice(-this.minRetainedMessages);
        const middleMessages = conversation.slice(1, -this.minRetainedMessages);

        if (middleMessages.length === 0) return conversation;

        try {
            const summary = await this.summarizeMessages(middleMessages, ollama);
            return [systemMessage, { role: 'assistant', content: `[Conversation Summary: ${summary}]` }, ...recentMessages];
        } catch (error) {
            console.error(chalk.yellow('Failed to summarize conversation, truncating instead.'), error);
            return [systemMessage, ...recentMessages];
        }
    }

    async summarizeMessages(messages, ollama) {
        const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
        const response = await ollama.chatCompletion({
            messages: [
                { role: 'system', content: 'Summarize the following conversation concisely, focusing on key decisions and important context.' },
                { role: 'user', content: conversationText }
            ]
        });
        return response.message?.content || 'Previous conversation context';
    }
}


// Configure marked to render markdown in the terminal
marked.use(markedTerminal());

/**
 * Start the REPL with an optional initial query
 * @param {string|null} initialQuery - Optional initial query
 * @param {Object} options - REPL options
 */
export async function startREPL(initialQuery, options = {}) {
    const conversation = [];
    const verbose = options.verbose || getConfig('verbose');
    const print = options.print || false;

    // Create readline interface
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: chalk.bold.blue('🐑> '),
        historySize: 100,
    });

    // Create Ollama client
    const ollama = getOllamaClient();

    // Track token usage
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    // Setup basic system message
    const systemMessage = {
        role: 'system',
        content: `You are Ollama Code, a helpful AI coding assistant.
You have access to the following tools:
- FileReadTool: Reads file contents
- FileEditTool: Edits files
- FileWriteTool: Creates or overwrites files
- LSTool: Lists directory contents
- GrepTool: Searches for patterns in files
- GlobTool: Finds files matching patterns
- BashTool: Executes shell commands
- GitTool: Performs git operations

When you need to perform actions, use JSON function calling with this format:
\`\`\`json
{"name": "toolName", "arguments": {"arg1": "value1", "arg2": "value2"}}
\`\`\`

The user is currently in the directory: ${process.cwd()}

Respond in markdown format. Be concise and helpful.`
    };

    // Process a user query and get response
    const processQuery = async (query) => {
        if (!query.trim()) {
            return;
        }

        // Handle slash commands
        if (query.startsWith('/')) {
            await handleSlashCommand(query, { rl, conversation, ollama });
            return;
        }

        // Add user message to conversation
        conversation.push({ role: 'user', content: query });

        // Prepare messages for the API (including system message)
        const messages = [systemMessage, ...conversation];

        // Create a spinner for loading indication
        const spinner = ora('Thinking...').start();

        try {
            let response = '';

            await ollama.chatCompletion({
                messages,
                onProgress: (content) => {
                    response = content;
                    spinner.text = 'Receiving response...';
                },
            });

            spinner.succeed('Response received');
            console.log('\n' + marked(response) + '\n');

            // Add assistant response to conversation
            conversation.push({ role: 'assistant', content: response });

            // Parse and execute tool calls
            const toolCalls = parseToolCalls(response);
            if (toolCalls.length > 0) {
                for (const toolCall of toolCalls) {
                    const toolSpinner = ora(`Executing tool: ${toolCall.name}`).start();
                    try {
                        const result = await executeToolCommand(toolCall);
                        toolSpinner.succeed(`Tool ${toolCall.name} executed`);

                        // Add tool result to conversation
                        conversation.push({
                            role: 'user',
                            content: `Tool result for ${toolCall.name}:\n\`\`\`\n${typeof result === 'object' ? JSON.stringify(result, null, 2) : result
                                }\n\`\`\``
                        });

                        console.log(chalk.dim(`\nTool result received. Continuing conversation...\n`));

                        // Get further instructions from the model
                        await processFollowup();
                    } catch (error) {
                        handleError(error, { spinner: toolSpinner, verbose });
                        conversation.push({
                            role: 'user',
                            content: `Tool ${error.toolName || toolCall.name} failed with error: ${error.message}`
                        });

                        // Get further instructions from the model
                        await processFollowup();
                    }
                }
            }
        } catch (error) {
            handleError(error, { spinner, verbose });
        }

        // Exit if in print mode
        if (print) {
            process.exit(0);
        } else {
            rl.prompt();
        }
    };

    // Process a follow-up after tool execution
    const processFollowup = async () => {
        const spinner = ora('Getting next steps...').start();

        try {
            let response = '';

            await ollama.chatCompletion({
                messages: [systemMessage, ...conversation],
                onProgress: (content) => {
                    response = content;
                    spinner.text = 'Receiving response...';
                },
            });

            spinner.succeed('Response received');
            console.log('\n' + marked(response) + '\n');

            // Add assistant response to conversation
            conversation.push({ role: 'assistant', content: response });

            // Parse and execute any additional tool calls
            const toolCalls = parseToolCalls(response);
            if (toolCalls.length > 0) {
                for (const toolCall of toolCalls) {
                    const toolSpinner = ora(`Executing tool: ${toolCall.name}`).start();
                    try {
                        const result = await executeToolCommand(toolCall);
                        toolSpinner.succeed(`Tool ${toolCall.name} executed`);

                        // Add tool result to conversation
                        conversation.push({
                            role: 'user',
                            content: `Tool result for ${toolCall.name}:\n\`\`\`\n${typeof result === 'object' ? JSON.stringify(result, null, 2) : result
                                }\n\`\`\``
                        });

                        console.log(chalk.dim(`\nTool result received. Continuing conversation...\n`));

                        // Recursive call to get further instructions
                        await processFollowup();
                    } catch (error) {
                        handleError(error, { spinner: toolSpinner, verbose });
                        conversation.push({
                            role: 'user',
                            content: `Tool ${error.toolName || toolCall.name} failed with error: ${error.message}`
                        });

                        // Recursive call to get further instructions
                        await processFollowup();
                    }
                }
            }
        } catch (error) {
            handleError(error, { spinner, verbose });
        }
    };

    // Process initial query if provided
    if (initialQuery) {
        await processQuery(initialQuery);
    }

    // Start the REPL if not in print mode
    if (!print) {
        rl.prompt();

        rl.on('line', async (line) => {
            await processQuery(line.trim());
        });

        rl.on('close', () => {
            console.log(chalk.blue('\nGoodbye! Thanks for using Ollama Code.\n'));
            // Display token usage stats
            console.log(chalk.dim(`Session stats:
- Messages: ${conversation.length / 2} exchanges
- Input tokens (estimate): ${totalInputTokens}
- Output tokens (estimate): ${totalOutputTokens}
`));
            process.exit(0);
        });
    }
}

/**
 * Handle slash commands in the REPL
 * @param {string} command - The slash command
 * @param {Object} context - REPL context
 */
async function handleSlashCommand(command, { rl, conversation, ollama, verbose }) {
    const parts = command.slice(1).split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);

    switch (cmd) {
        case 'help':
            console.log(chalk.bold('\nAvailable commands:'));
            console.log(`
  ${chalk.blue('/help')} - Show this help message
  ${chalk.blue('/clear')} - Clear conversation history
  ${chalk.blue('/compact')} - Compact conversation to save context space
  ${chalk.blue('/cost')} - Show token usage statistics
  ${chalk.blue('/config')} - Manage configuration
  ${chalk.blue('/init')} - Initialize project with a OLLAMA_CODE.md guide
  ${chalk.blue('/models')} - List available Ollama models
  ${chalk.blue('/exit')} - Exit Ollama Code
  `);
            break;

        case 'clear':
            conversation.length = 0;
            console.log(chalk.green('Conversation history cleared'));
            break;

        case 'compact':
            // Keep only the last 5 exchanges (10 messages) plus the most recent query
            if (conversation.length > 10) {
                conversation.splice(0, conversation.length - 10);
            }
            console.log(chalk.green('Conversation compacted'));
            break;

        case 'cost':
            // Calculate approximate tokens (very rough estimate)
            const inputTokens = conversation
                .filter(msg => msg.role === 'user')
                .reduce((acc, msg) => acc + Math.ceil(msg.content.length / 4), 0);

            const outputTokens = conversation
                .filter(msg => msg.role === 'assistant')
                .reduce((acc, msg) => acc + Math.ceil(msg.content.length / 4), 0);

            console.log(chalk.bold('\nEstimated token usage:'));
            console.log(`
  Input tokens: ~${inputTokens}
  Output tokens: ~${outputTokens}
  Total tokens: ~${inputTokens + outputTokens}
  `);
            break;

        case 'init':
            console.log(chalk.blue('Initializing project with OLLAMA_CODE.md...'));
            // Generate a project guide
            const initSpinner = ora('Generating project guide...').start();
            try {
                const response = await ollama.chatCompletion({
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an expert in code analysis. Create a detailed markdown guide for this project.'
                        },
                        {
                            role: 'user',
                            content: 'Analyze the current project directory and create a OLLAMA_CODE.md guide that explains the project structure, main components, and provides guidance for contributors.'
                        }
                    ]
                });

                const guideContent = response.message.content;

                // Write the guide to a file
                const fs = await import('fs/promises');
                await fs.writeFile('OLLAMA_CODE.md', guideContent);

                initSpinner.succeed('Generated OLLAMA_CODE.md guide');
            } catch (error) {
                handleError(error, { spinner: initSpinner, verbose });
            }
            break;

        case 'models':
            const modelsSpinner = ora('Fetching available models...').start();
            try {
                const models = await ollama.listModels();
                modelsSpinner.succeed('Available models:');

                if (models.length === 0) {
                    console.log(chalk.yellow('\nNo models found. Make sure Ollama is running.'));
                    console.log(chalk.gray('You can download models with: ollama pull codellama'));
                } else {
                    console.log('\nAvailable models:');
                    models.forEach(model => {
                        console.log(`- ${chalk.blue(model.name)} (${model.size})`);
                    });
                }
            } catch (error) {
                handleError(error, { spinner: modelsSpinner, verbose });
            }
            break;

        case 'exit':
            rl.close();
            break;

        default:
            console.log(chalk.yellow(`Unknown command: ${cmd}`));
            console.log(chalk.gray('Type /help to see available commands'));
    }
}