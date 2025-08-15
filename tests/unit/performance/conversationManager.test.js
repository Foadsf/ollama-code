import { jest } from '@jest/globals';

// Mock the OllamaClient
const mockOllama = { chatCompletion: jest.fn() };
jest.unstable_mockModule('../../../src/ollama.js', () => ({
    getOllamaClient: () => mockOllama
}));

// Import the manager AFTER mocking
const { ConversationManager } = await import('../../../src/performance/conversationManager.js');

describe('ConversationManager', () => {
    let convoManager;

    beforeEach(() => {
        jest.clearAllMocks();
        // Use a small token limit for easy testing
        convoManager = new ConversationManager({ maxTokens: 100, compressionThreshold: 0.8 });
    });

    test('should not modify a short conversation', async () => {
        const shortConvo = [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'Hello there.' }
        ];

        const result = await convoManager.manageConversation(shortConvo);
        expect(result).toEqual(shortConvo);
    });

    test('should optimize a long conversation by summarizing', async () => {
        const longContent = 'This is a very long message that is designed to exceed the token threshold all by itself. '.repeat(20);
        const longConvo = [
            { role: 'system', content: 'System prompt.' }, // Stays
            { role: 'user', content: longContent }, // Summarized
            { role: 'assistant', content: longContent }, // Summarized
            { role: 'user', content: longContent }, // Summarized
            { role: 'assistant', content: longContent }, // Summarized
            { role: 'user', content: 'Recent message 1' }, // Stays
            { role: 'assistant', content: 'Recent response 1' }, // Stays
            { role: 'user', content: 'Recent message 2' }, // Stays
            { role: 'assistant', content: 'Recent response 2' }, // Stays
        ];

        // Mock the summarization result
        const summaryText = 'User and assistant had a long discussion.';
        mockOllama.chatCompletion.mockResolvedValue({
            message: { content: summaryText }
        });

        const result = await convoManager.manageConversation(longConvo);

        // Expected structure: [system, summary, ...last 4 messages]
        expect(result).toHaveLength(6);
        expect(result[0].role).toBe('system');
        expect(result[1].role).toBe('assistant');
        expect(result[1].content).toBe(`[Conversation Summary: ${summaryText}]`);
        expect(result[5].content).toBe('Recent response 2');

        const summarizerCall = mockOllama.chatCompletion.mock.calls[0][0];
        const textToSummarize = summarizerCall.messages[1].content;
        expect(textToSummarize).toContain(longContent);
        expect(textToSummarize).not.toContain('Recent message 1');
    });

    test('should just truncate if summarization fails', async () => {
        const longContent = 'This is a very long message that is designed to exceed the token threshold all by itself. '.repeat(20);
        const longConvo = [
            { role: 'system', content: 'System prompt.' },
            { role: 'user', content: longContent },
            { role: 'assistant', content: longContent },
            { role: 'user', content: longContent },
            { role: 'assistant', content: longContent },
            { role: 'user', content: 'Recent message 1' },
            { role: 'assistant', content: 'Recent response 1' },
            { role: 'user', content: 'Recent message 2' },
            { role: 'assistant', content: 'Recent response 2' },
        ];

        // Mock a failure
        mockOllama.chatCompletion.mockRejectedValue(new Error('API failed'));

        const result = await convoManager.manageConversation(longConvo);

        // Expected structure: [system, ...last 4 messages]
        expect(result).toHaveLength(5);
        expect(result[0].role).toBe('system');
        expect(result[1].content).toBe('Recent message 1');
    });
});
