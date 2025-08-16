#!/usr/bin/env node

console.log('🐑 Welcome to Ollama Code');
console.log('Trying to connect to Ollama...');

const http = require('http');

// Simple function to check if Ollama is running
function checkOllama() {
    return new Promise((resolve) => {
        const req = http.request({
            hostname: 'localhost',
            port: 11434,
            path: '/api/tags',
            method: 'GET',
            timeout: 2000
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const models = JSON.parse(data);
                    console.log('Connected to Ollama successfully!');
                    console.log('\nAvailable models:');
                    if (models.models && models.models.length) {
                        models.models.forEach(model => {
                            console.log(`- ${model.name}`);
                        });
                    } else {
                        console.log('No models found');
                    }
                    resolve(true);
                } catch (e) {
                    console.error('Error parsing Ollama response:', e.message);
                    resolve(false);
                }
            });
        });

        req.on('error', (e) => {
            console.error('Error connecting to Ollama:', e.message);
            console.log('Make sure Ollama is running on http://localhost:11434');
            resolve(false);
        });

        req.on('timeout', () => {
            req.destroy();
            console.error('Connection to Ollama timed out');
            console.log('Make sure Ollama is running on http://localhost:11434');
            resolve(false);
        });

        req.end();
    });
}

// Run the check
checkOllama().then(() => {
    console.log('\nThis is a test script to verify Ollama connectivity.');
    console.log('To use the full CLI, we need to fix the ESM import issues.');
});