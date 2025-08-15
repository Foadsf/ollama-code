import { globTool } from './globTool.js';
import { bashTool } from './bashTool.js';
import { ToolError } from '../utils/errors.js';

export class PackageManagerTool {
    async executePackageCommand(args) {
        const { manager = 'auto', command, packages = [], options = {} } = args;

        // Detect package manager if not specified
        const detectedManager = await this.detectPackageManager();
        const actualManager = manager === 'auto' ? detectedManager : manager;

        // Build command
        const fullCommand = this.buildCommand(actualManager, command, packages, options);

        // Execute with proper error handling
        return await bashTool({
            command: fullCommand,
            timeout: options.timeout || 300000 // 5 minutes default
        });
    }

    async detectPackageManager() {
        try {
            const files = await globTool({ pattern: '{package-lock.json,yarn.lock,pnpm-lock.yaml}' });

            if (files.includes('pnpm-lock.yaml')) return 'pnpm';
            if (files.includes('yarn.lock')) return 'yarn';
            return 'npm';
        } catch (error) {
            // Default to npm if globbing fails for some reason
            console.warn('Could not detect package manager, defaulting to npm.');
            return 'npm';
        }
    }

    buildCommand(manager, command, packages, options) {
        // Build appropriate command for each package manager
        const commands = {
            npm: {
                install: `npm install ${packages.join(' ')}`,
                uninstall: `npm uninstall ${packages.join(' ')}`,
                update: `npm update ${packages.join(' ')}`,
                audit: 'npm audit',
                test: 'npm test'
            },
            yarn: {
                install: `yarn add ${packages.join(' ')}`,
                uninstall: `yarn remove ${packages.join(' ')}`,
                update: `yarn upgrade ${packages.join(' ')}`,
                audit: 'yarn audit',
                test: 'yarn test'
            },
            pnpm: {
                install: `pnpm add ${packages.join(' ')}`,
                uninstall: `pnpm remove ${packages.join(' ')}`,
                update: `pnpm update ${packages.join(' ')}`,
                audit: 'pnpm audit',
                test: 'pnpm test'
            }
        };

        const commandMap = commands[manager];
        if (commandMap && commandMap[command]) {
            return commandMap[command];
        }

        // Fallback for generic commands
        return `${manager} ${command} ${packages.join(' ')}`;
    }
}

const packageManagerToolInstance = new PackageManagerTool();

export async function packageManagerTool(args) {
    return packageManagerToolInstance.executePackageCommand(args);
}
