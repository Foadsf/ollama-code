import { getOllamaClient } from '../ollama.js';

export class ConversationManager {
    constructor(options = {}) {
        this.maxTokens = options.maxTokens || 4000;
        this.compressionThreshold = options.compressionThreshold || 0.8; // Compress at 80% capacity
        this.minRetainedMessages = options.minRetainedMessages || 4;
        this.ollama = getOllamaClient();
    }

    async manageConversation(conversation) {
        const tokenCount = this.estimateTokenCount(conversation);

        if (tokenCount > this.maxTokens * this.compressionThreshold) {
            console.log('Conversation approaching token limit, optimizing...');
            return await this.optimizeConversation(conversation);
        }

        return conversation;
    }

    estimateTokenCount(messages) {
        // Rough token estimation (1 token ≈ 4 characters)
        return messages.reduce((total, message) => {
            return total + Math.ceil(message.content.length / 4);
        }, 0);
    }

    async optimizeConversation(conversation) {
        if (conversation.length <= this.minRetainedMessages) {
            return conversation;
        }

        // Keep system message, recent messages, and summarize the middle
        const systemMessage = conversation[0];
        const recentMessages = conversation.slice(-this.minRetainedMessages);
        const middleMessages = conversation.slice(1, -this.minRetainedMessages);

        if (middleMessages.length === 0) {
            return conversation;
        }

        try {
            // Summarize the middle portion
            const summary = await this.summarizeMessages(middleMessages);

            return [
                systemMessage,
                {
                    role: 'assistant',
                    content: `[Conversation Summary: ${summary}]`
                },
                ...recentMessages
            ];
        } catch (error) {
            console.error('Failed to summarize conversation:', error);
            // Fallback: just truncate
            return [systemMessage, ...recentMessages];
        }
    }

    async summarizeMessages(messages) {
        const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');

        const response = await this.ollama.chatCompletion({
            messages: [
                {
                    role: 'system',
                    content: 'Summarize the following conversation concisely, focusing on key decisions, actions taken, and important context.'
                },
                {
                    role: 'user',
                    content: conversationText
                }
            ],
            useCache: false // Don't cache summary requests
        });

        return response.message?.content || 'Previous conversation context';
    }

    async smartTruncate(conversation, targetLength) {
        // More sophisticated truncation that preserves important context
        if (conversation.length <= targetLength) {
            return conversation;
        }

        // Always keep system message
        const systemMessage = conversation[0];
        const otherMessages = conversation.slice(1);

        // Score messages by importance
        const scoredMessages = await this.scoreMessages(otherMessages);

        // Sort by importance and take top messages
        scoredMessages.sort((a, b) => b.score - a.score);
        const selectedMessages = scoredMessages
            .slice(0, targetLength - 1)
            .sort((a, b) => a.index - b.index) // Restore chronological order
            .map(item => item.message);

        return [systemMessage, ...selectedMessages];
    }

    async scoreMessages(messages) {
        // Score messages based on various factors
        return messages.map((message, index) => {
            let score = 0;

            // Recency bonus (recent messages are more important)
            score += (messages.length - index) * 0.1;

            // Length penalty (very long messages might be less important)
            if (message.content.length > 2000) {
                score -= 0.2;
            }

            // Tool usage bonus (messages with tool calls are important)
            if (message.content.includes('```json') || message.role === 'assistant') {
                score += 0.3;
            }

            // Error messages are important to keep
            if (message.content.toLowerCase().includes('error')) {
                score += 0.2;
            }

            return { message, index, score };
        });
    }
}
