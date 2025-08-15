import { getOllamaClient } from '../ollama.js';

export class ImprovementProposer {
    constructor() {
        this.ollama = getOllamaClient();
    }

    async proposeImprovements(analysis) {
        const improvements = [];

        // The user spec includes generating recommendations in the analyzer,
        // but that part is not implemented yet. I'll create a dummy recommendation
        // for now if none exist, to ensure the proposer logic can be tested.
        let recommendations = analysis.recommendations || [];
        if (recommendations.length === 0 && analysis.quality?.averageComplexity > 5) {
             recommendations.push({
                type: 'quality',
                priority: 'medium',
                action: 'reduce-complexity',
                description: 'Code complexity is high, consider refactoring.'
            });
        }


        // Process each recommendation from the analyzer
        for (const recommendation of recommendations) {
            const improvement = await this.generateImprovement(recommendation, analysis);
            if (improvement) {
                improvements.push(improvement);
            }
        }

        return improvements;
    }

    async generateImprovement(recommendation, fullAnalysis) {
        const prompt = this.buildImprovementPrompt(recommendation, fullAnalysis);

        try {
            const response = await this.ollama.chatCompletion({
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert software engineer specializing in code improvement and refactoring.
                        Generate specific, actionable code improvements with the following format as a single JSON object:

                        {
                            "type": "improvement_type",
                            "description": "clear description",
                            "files": ["file1.js", "file2.js"],
                            "changes": [
                                {
                                    "file": "path/to/file.js",
                                    "action": "edit|create|delete",
                                    "startLine": 10,
                                    "endLine": 20,
                                    "oldCode": "original code",
                                    "newCode": "improved code",
                                    "reasoning": "why this change improves the code"
                                }
                            ],
                            "tests": [
                                {
                                    "file": "tests/path/to/test.js",
                                    "action": "create|edit",
                                    "content": "test code to verify the improvement"
                                }
                            ],
                            "impact": {
                                "performance": "positive|negative|neutral",
                                "maintainability": "positive|negative|neutral",
                                "security": "positive|negative|neutral",
                                "riskLevel": "low|medium|high"
                            }
                        }`
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            });

            return this.parseImprovementResponse(response);
        } catch (error) {
            console.error('Failed to generate improvement:', error);
            return null;
        }
    }

    buildImprovementPrompt(recommendation, analysis) {
        return `
        Based on the following code analysis, generate a specific improvement:

        **Recommendation:**
        Type: ${recommendation.type}
        Priority: ${recommendation.priority}
        Action: ${recommendation.action}
        Description: ${recommendation.description}

        **Project Context:**
        - Total files: ${analysis.structure?.fileCount || 'unknown'}
        - Average complexity: ${analysis.quality?.averageComplexity || 'unknown'}
        - Security vulnerabilities: ${analysis.security?.vulnerabilities?.length || 0}

        **Specific Issues:**
        ${JSON.stringify(recommendation.details || recommendation.vulnerabilities || {}, null, 2)}

        Generate a concrete improvement that addresses this recommendation. Include:
        1. Specific file changes with exact code modifications.
        2. Any new tests needed to verify the improvement.
        3. An impact assessment of the proposed changes.

        Focus on making incremental, safe improvements that can be easily validated. Respond with only the JSON object.
        `;
    }

    parseImprovementResponse(response) {
        try {
            // Extract the JSON part of the response
            const responseContent = response.message.content;
            const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.warn('Proposer: No valid JSON object found in the LLM response.');
                return null;
            }
            return JSON.parse(jsonMatch[0]);
        } catch (error) {
            console.error('Proposer: Failed to parse JSON from LLM response', error);
            return null;
        }
    }
}
