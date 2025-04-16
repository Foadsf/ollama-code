#!/usr/bin/env node

import { startCLI } from '../src/cli.js';

// Make sure the process exits properly on SIGINT
process.on('SIGINT', () => {
    console.log('\nExiting Ollama Code...');
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    process.exit(1);
});

// Start the CLI
startCLI(process.argv);