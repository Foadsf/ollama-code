import chalk from 'chalk';
import { NetworkError, PermissionError, ToolError, UserInputError } from './errors.js';

/**
 * Centralized error handler for the OLC application.
 *
 * @param {Error} error - The error object to handle.
 * @param {object} [context={}] - Additional context for handling the error.
 * @param {import('ora').Ora} [context.spinner] - The ora spinner instance to update.
 * @param {boolean} [context.verbose=false] - Whether to log verbose output.
 */
export function handleError(error, context = {}) {
    const { spinner, verbose } = context;
    let userMessage = `An unexpected error occurred: ${error.message}`;

    // Set user-friendly messages based on custom error types
    if (error instanceof NetworkError) {
        userMessage = `Network Error: ${error.message}. Please ensure Ollama is running and accessible.`;
    } else if (error instanceof ToolError) {
        userMessage = `Tool Error (${error.toolName}): ${error.message}`;
    } else if (error instanceof PermissionError) {
        userMessage = `Permission Denied: ${error.message}. You may need to grant permission for this command.`;
    } else if (error instanceof UserInputError) {
        userMessage = `Invalid Input: ${error.message}`;
    } else if (error.code === 'ECONNREFUSED') { // Fallback for generic network errors
        userMessage = 'Connection to Ollama failed. Please ensure Ollama is running and accessible.';
    }


    // Update spinner if provided
    if (spinner) {
        spinner.fail(chalk.red(userMessage));
    } else {
        console.error(chalk.red(userMessage));
    }

    // Log verbose details if enabled
    if (verbose) {
        console.error('\n--- Verbose Error Details ---');
        console.error(error.stack);
        if (error.cause) {
            console.error('Caused by:');
            console.error(error.cause);
        }
        console.error('---------------------------\n');
    }
}
