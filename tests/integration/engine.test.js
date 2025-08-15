import { jest } from '@jest/globals';
import path from 'path';

// Mock all the tools and clients used by the engine
const mockFileReadTool = jest.fn();
const mockGlobTool = jest.fn();
const mockFileWriteTool = jest.fn();
const mockOllama = { chatCompletion: jest.fn() };

jest.unstable_mockModule('../../src/tools/fileReadTool.js', () => ({ fileReadTool: mockFileReadTool }));
jest.unstable_mockModule('../../src/tools/globTool.js', () => ({ globTool: mockGlobTool }));
jest.unstable_mockModule('../../src/tools/fileWriteTool.js', () => ({ fileWriteTool: mockFileWriteTool }));
jest.unstable_mockModule('../../src/ollama.js', () => ({ getOllamaClient: () => mockOllama }));

// Import the engine AFTER mocks are set up
const { SelfImprovementEngine } = await import('../../src/self-improvement/engine.js');

describe('SelfImprovementEngine Integration Test', () => {
    let engine;

    beforeEach(() => {
        jest.clearAllMocks();
        engine = new SelfImprovementEngine({
            // Run in a test mode that doesn't require user interaction
            autoApprove: true,
            riskThreshold: 'high',
        });

        // Mock process.cwd to point to our fixture directory
        const fixturePath = path.resolve(process.cwd(), 'tests/fixtures/sample-project');
        jest.spyOn(process, 'cwd').mockReturnValue(fixturePath);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('should run a full improvement cycle successfully', async () => {
        // --- MOCK SETUP ---

        // 1. Analyzer Mocks
        const fixtureFilePath = 'index.js'; // Relative to the mocked cwd
        const fixtureFileContent = `
function highComplexityFunction(a, b, c) {
    if (a > 0) { if (b > 0) { if (c > 0) { return 1; } else { return 2; } } else { if (c > 5) { return 3; } } } else { if (b < 0) { return 4; } }
    return 0;
}`;
        mockGlobTool.mockResolvedValue([fixtureFilePath]);
        mockFileReadTool.mockResolvedValue(fixtureFileContent);

        // 2. Proposer Mock (Ollama)
        const mockImprovement = {
            type: 'refactor',
            description: 'Refactor high-complexity function',
            changes: [{
                file: fixtureFilePath,
                action: 'edit',
                oldCode: '...', // In a real scenario, this would be populated
                newCode: 'function refactoredFunction() { return 0; }',
            }],
            tests: [],
            impact: { riskLevel: 'low' }
        };
        mockOllama.chatCompletion.mockResolvedValue({
            message: { content: JSON.stringify(mockImprovement) }
        });

        // 3. Executor Mock
        mockFileWriteTool.mockResolvedValue('File written successfully');


        // --- EXECUTION ---
        const result = await engine.runImprovementCycle();


        // --- ASSERTIONS ---
        expect(result.improvements).toBe(1);
        expect(result.results[0].execution.success).toBe(true);

        // Analyzer assertions
        expect(mockGlobTool).toHaveBeenCalledWith({ pattern: '**/*.js' });
        expect(mockFileReadTool).toHaveBeenCalledWith({ path: fixtureFilePath });

        // Proposer assertions
        expect(mockOllama.chatCompletion).toHaveBeenCalled();
        const prompt = mockOllama.chatCompletion.mock.calls[0][0].messages[1].content;
        expect(prompt).toContain('Code complexity is high');

        // Validator assertions
        // (Validator uses espree internally, we can't easily spy on it, but a successful run implies it passed)

        // Executor assertions
        expect(mockFileWriteTool).toHaveBeenCalledWith({
            path: expect.stringContaining(fixtureFilePath),
            content: mockImprovement.changes[0].newCode,
        });
    });
});
