import { getConfig } from './config.js';
import { NetworkError } from './utils/errors.js';
import { AIResponseCache } from './performance/aiCache.js';

export class OllamaClient {
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || getConfig('ollamaBaseUrl') || 'http://localhost:11434';
        this.model = options.model || getConfig('ollamaModel') || 'codellama';
        this.verbose = options.verbose || getConfig('verbose') || false;

        // Initialize cache
        this.cache = new AIResponseCache({
            maxSize: options.cacheSize || 500,
            ttl: options.cacheTTL || 1800000 // 30 minutes
        });

        this.requestQueue = [];
        this.isProcessingQueue = false;
    }

    async listModels() {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`);
            if (!response.ok) {
                throw new NetworkError(`Failed to list models: ${response.statusText}`);
            }
            const data = await response.json();
            return data.models || [];
        } catch (error) {
            if (error instanceof NetworkError) throw error;
            throw new NetworkError(`Error listing models: ${error.message}`, { cause: error });
        }
    }

    async chatCompletion({ messages, onProgress, useCache = true }) {
        // Generate cache key
        const cacheKey = this.cache.generateKey(messages, this.model);

        // Check cache first (only for non-streaming requests)
        if (useCache && !onProgress) {
            const cached = this.cache.get(cacheKey);
            if (cached) {
                if (this.verbose) console.log('Cache hit for AI response');
                return cached;
            }
        }

        try {
            const response = await fetch(`${this.baseUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.model,
                    messages,
                    stream: !!onProgress,
                }),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new NetworkError(`Ollama API error: ${response.statusText} - ${errorBody}`);
            }

            if (onProgress && response.body) {
                return await this.handleStreamingResponse(response, onProgress);
            } else {
                const data = await response.json();
                if (useCache) {
                    this.cache.set(cacheKey, data);
                }
                return data;
            }
        } catch (error) {
            if (error instanceof NetworkError) throw error;
            throw new NetworkError(`Error in chat completion: ${error.message}`, { cause: error });
        }
    }

    async handleStreamingResponse(response, onProgress) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let partialChunk = '';
        let fullResponse = '';

        const processStream = async () => {
            const { done, value } = await reader.read();

            if (done) {
                if (partialChunk.trim()) {
                    if (this.verbose) {
                        console.warn('[OllamaClient] Stream ended with incomplete data:', partialChunk);
                    }
                }
                return fullResponse;
            }

            const chunk = decoder.decode(value, { stream: true });
            partialChunk += chunk;

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
                                if (this.verbose) {
                                    console.warn(`[OllamaClient] Failed to parse JSON chunk from stream: ${e.message}`);
                                    console.warn(`[OllamaClient] Chunk content:`, jsonStr);
                                }
                            }
                        }
                    }
                }
            }

            partialChunk = partialChunk.substring(lastJsonEnd);
            return processStream();
        };

        return processStream();
    }

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
                throw new NetworkError(`Failed to generate embeddings: ${response.statusText}`);
            }

            const data = await response.json();
            return data.embedding;
        } catch (error) {
            if (error instanceof NetworkError) throw error;
            throw new NetworkError(`Error generating embeddings: ${error.message}`, { cause: error });
        }
    }

    getCacheStats() {
        return this.cache.getStats();
    }

    clearCache() {
        this.cache.clear();
    }
}

let client = null;
export function getOllamaClient(options = {}) {
    if (!client) {
        client = new OllamaClient(options);
    }
    return client;
}