import fs from 'fs/promises';
import path from 'path';
import ora from 'ora';
import chalk from 'chalk';

/**
 * Generate a project guide with the structure and overview
 * @param {Object} options - Initialization options
 * @param {string} [options.outputPath='OLLAMA_CODE.md'] - Output path for the guide
 * @param {string} [options.projectName='Ollama Code (olc)'] - Name of the project
 * @param {boolean} [options.includeStructure=true] - Whether to include directory structure
 * @returns {Promise<string>} - Path to the generated guide
 */
export async function generateProjectGuide(options = {}) {
    const {
        outputPath = 'OLLAMA_CODE.md',
        projectName = 'Ollama Code (olc)',
        includeStructure = true
    } = options;

    const spinner = ora('Generating project guide...').start();

    try {
        // Get directory structure using a more Windows-friendly approach
        let dirStructure = '';
        if (includeStructure) {
            try {
                // Import the file system module for sync operations
                const fsSync = await import('fs');
                const { globSync } = await import('glob');

                // Use glob pattern to find JavaScript files
                const jsFiles = globSync('./**/*.js', {
                    ignore: ['**/node_modules/**'],
                    windowsPathsNoEscape: true
                });

                // Format the file list
                dirStructure = jsFiles.join('\n');
            } catch (error) {
                dirStructure = 'Unable to automatically detect project structure.';
                console.error('Error getting directory structure:', error.message);
            }
        }

        // Try to import the ollama module from different possible locations
        let ollama;
        try {
            // First, try importing from the project root
            const ollamaModule = await import('../ollama.js');
            ollama = ollamaModule.default;
        } catch (importError1) {
            try {
                // Next, try importing from the src directory
                const ollamaModule = await import('../src/ollama.js');
                ollama = ollamaModule.default;
            } catch (importError2) {
                try {
                    // Try importing relative to the current file location
                    const ollamaModule = await import('./ollama.js');
                    ollama = ollamaModule.default;
                } catch (importError3) {
                    // If all imports fail, create a simpler version of the guide
                    spinner.text = 'Could not import Ollama module. Generating a basic guide...';

                    // Create a basic guide content
                    const basicGuideContent = generateBasicGuideContent(projectName, dirStructure);

                    // Ensure the directory exists
                    const dir = path.dirname(outputPath);
                    await fs.mkdir(dir, { recursive: true });

                    // Write the guide to the file
                    await fs.writeFile(outputPath, basicGuideContent);

                    spinner.succeed(`Generated basic project guide at ${outputPath}`);
                    return outputPath;
                }
            }
        }

        // Use Ollama to generate the guide content if available
        const response = await ollama.chatCompletion({
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert in code analysis. Create a detailed markdown guide for this project.'
                },
                {
                    role: 'user',
                    content: `Analyze the current project and create a markdown guide that explains the project structure, main components, and provides guidance for contributors. The project name is "${projectName}".

Here is the directory structure of JavaScript files in the project:

${dirStructure}`
                }
            ]
        });

        // Extract the guide content from the response
        const guideContent = response.message.content;

        // Ensure the directory exists
        const dir = path.dirname(outputPath);
        await fs.mkdir(dir, { recursive: true });

        // Write the guide to the file
        await fs.writeFile(outputPath, guideContent);

        spinner.succeed(`Generated project guide at ${outputPath}`);
        return outputPath;
    } catch (error) {
        spinner.fail(`Failed to generate guide: ${error.message}`);
        throw error;
    }
}

/**
 * Generate a basic content for the project guide when Ollama is not available
 * @param {string} projectName - Name of the project
 * @param {string} dirStructure - Directory structure string
 * @returns {string} - Guide content
 */
function generateBasicGuideContent(projectName, dirStructure) {
    return `# ${projectName}

## Project Overview

${projectName} is a terminal-based AI coding assistant that helps developers understand, modify, and navigate their codebases through natural language commands.

## Project Structure

${dirStructure ? `The project includes the following files:

\`\`\`
${dirStructure}
\`\`\`` : 'Project structure information not available.'}

## Getting Started

To get started with ${projectName}:

1. Install the required dependencies using \`npm install\`
2. Run the CLI using \`npm start\` or \`node bin/ollama-code.js\`

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Write tests if applicable.
5. Submit a pull request.

## License

This project is licensed under the MIT License.
`;
}

/**
 * Initialize a project with a guide and other setup
 * @param {Object} options - Initialization options
 * @returns {Promise<Object>} - Result of initialization
 */
export async function initializeProject(options = {}) {
    console.log(chalk.blue('Initializing project...'));

    try {
        // Generate the project guide
        const guidePath = await generateProjectGuide(options);

        // Return the results
        return {
            success: true,
            files: [guidePath]
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

// Can be run directly
if (import.meta.url === new URL(import.meta.url).href) {
    initializeProject()
        .then(result => {
            if (result.success) {
                console.log(chalk.green('Project initialized successfully!'));
            } else {
                console.error(chalk.red(`Initialization failed: ${result.error}`));
            }
        });
}