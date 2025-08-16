import fetch from 'node-fetch';
import { getConfig } from './config.js';

/**
 * Client for interacting with the Ollama API
 */
export class OllamaClient {
    /**
     * Creates a new Ollama client
     * @param {Object} options - Client options
     * @param {string} options.baseUrl - Base URL for the Ollama API
     * @param {string} options.model - Model name to use
     */
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || getConfig('ollamaBaseUrl') || 'http://localhost:11434';
        this.model = options.model || getConfig('ollamaModel') || 'codellama';
    }

    /**
     * Get available models from Ollama
     * @returns {Promise<Array>} - List of available models
     */
    async listModels() {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`);

            if (!response.ok) {
                throw new Error(`Failed to list models: ${response.statusText}`);
            }

            const data = await response.json();
            return data.models || [];
        } catch (error) {
            console.error('Error listing models:', error.message);
            throw error;
        }
    }

    /**
     * Send a request to the Ollama API for chat completion
     * @param {Object} params - Parameters for the completion
     * @param {Array} params.messages - Chat messages
     * @param {function} [params.onProgress] - Callback for streaming progress
     * @returns {Promise<Object>} - The completion response
     */
    async chatCompletion({ messages, onProgress }) {
        try {
            const response = await fetch(`${this.baseUrl}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    messages,
                    stream: !!onProgress,
                }),
            });

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.statusText}`);
            }

            // Handle streaming response
            if (onProgress && response.body) {
                const reader = response.body.getReader();
                let decoder = new TextDecoder();
                let partialChunk = '';

                let fullResponse = '';

                const processStream = async () => {
                    const { done, value } = await reader.read();

                    if (done) {
                        return fullResponse;
                    }

                    const chunk = decoder.decode(value, { stream: true });
                    partialChunk += chunk;

                    // Process complete JSON objects
                    let lastJsonEnd = 0;
                    let braceCount = 0;
                    let inString = false;
                    let escapeNext = false;

                    for (let i = 0; i < partialChunk.length; i++) {
                        const char = partialChunk[i];

                        if (escapeNext) {
                            escapeNext = false;
                            continue;
                        }

                        if (char === '\\' && inString) {
                            escapeNext = true;
                        } else if (char === '"' && !escapeNext) {
                            inString = !inString;
                        } else if (!inString) {
                            if (char === '{') braceCount++;
                            else if (char === '}') {
                                braceCount--;

                                if (braceCount === 0) {
                                    const jsonStr = partialChunk.substring(lastJsonEnd, i + 1);
                                    lastJsonEnd = i + 1;

                                    try {
                                        const json = JSON.parse(jsonStr);

                                        if (json.message && json.message.content) {
                                            fullResponse = json.message.content;
                                            onProgress(json.message.content);
                                        }
                                    } catch (e) {
                                        // Skip invalid JSON
                                    }
                                }
                            }
                        }
                    }

                    partialChunk = partialChunk.substring(lastJsonEnd);

                    return processStream();
                };

                return processStream();
            } else {
                // Non-streaming response
                const data = await response.json();
                return data;
            }
        } catch (error) {
            console.error('Error in chat completion:', error.message);
            throw error;
        }
    }

    /**
     * Generate embeddings for a given text
     * @param {string} text - Text to embed
     * @returns {Promise<Array<number>>} - The embedding vector
     */
    async generateEmbeddings(text) {
        try {
            const response = await fetch(`${this.baseUrl}/api/embeddings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    prompt: text,
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to generate embeddings: ${response.statusText}`);
            }

            const data = await response.json();
            return data.embedding;
        } catch (error) {
            console.error('Error generating embeddings:', error.message);
            throw error;
        }
    }
}

/**
 * Create a singleton Ollama client instance
 * @param {Object} options - Client options
 * @returns {OllamaClient} - Ollama client instance
 */
let client = null;
export function getOllamaClient(options = {}) {
    if (!client) {
        client = new OllamaClient(options);
    }
    return client;
}