import updateNotifier from 'update-notifier';
import { fileReadTool } from '../tools/fileReadTool.js';
import { getConfig, setConfig } from '../config.js';
import chalk from 'chalk';

export class UpdateManager {
    constructor() {
        this.packageInfo = null;
        this.notifier = null;
        this.isEnabled = getConfig('updateNotifications', true);
    }

    async initialize() {
        try {
            const packageJson = await fileReadTool({ path: 'package.json', noCache: true });
            this.packageInfo = JSON.parse(packageJson);

            if (this.isEnabled) {
                this.notifier = updateNotifier({
                    pkg: this.packageInfo,
                    updateCheckInterval: 1000 * 60 * 60 * 24, // 24 hours
                });
            }
        } catch (error) {
            console.error('Failed to initialize update manager:', error);
        }
    }

    checkForUpdates() {
        if (!this.isEnabled || !this.notifier) {
            return;
        }

        if (this.notifier.update && this.notifier.update.latest !== this.notifier.update.current) {
            this.displayUpdateNotification();
        }
    }

    displayUpdateNotification() {
        const { current, latest } = this.notifier.update;

        console.log(chalk.yellow('\n┌────────────────────────────────────────────────┐'));
        console.log(chalk.yellow('│') + chalk.bold('  🚀 OLC Update Available!') + chalk.yellow('                  │'));
        console.log(chalk.yellow('│') + `  Current: ${current}` + ' '.repeat(30 - current.length) + chalk.yellow('│'));
        console.log(chalk.yellow('│') + `  Latest:  ${chalk.green(latest)}` + ' '.repeat(30 - latest.length) + chalk.yellow('│'));
        console.log(chalk.yellow('│') + '                                              ' + chalk.yellow('│'));
        console.log(chalk.yellow('│') + chalk.cyan('  Run: npm update -g olc') + ' '.repeat(20) + chalk.yellow('│'));
        console.log(chalk.yellow('└────────────────────────────────────────────────┘\n'));
    }

    async getLatestVersion() {
        try {
            const response = await fetch('https://registry.npmjs.org/olc/latest');
            const data = await response.json();
            return data.version;
        } catch (error) {
            console.error('Failed to fetch latest version:', error);
            return null;
        }
    }

    async showUpdateInfo() {
        if (!this.packageInfo) await this.initialize();
        const current = this.packageInfo?.version || 'unknown';
        const latest = await this.getLatestVersion();

        console.log(chalk.bold('\n📦 Version Information:'));
        console.log(`Current: ${current}`);
        console.log(`Latest:  ${latest || 'Unable to fetch'}`);

        if (latest && latest !== current) {
            console.log(chalk.yellow('\n⚠️  Update available!'));
            console.log(chalk.cyan('Run: npm update -g olc'));
        } else {
            console.log(chalk.green('\n✅ You are using the latest version!'));
        }
    }

    disable() {
        this.isEnabled = false;
        setConfig('updateNotifications', false);
        console.log('Update notifications disabled');
    }

    enable() {
        this.isEnabled = true;
        setConfig('updateNotifications', true);
        console.log('Update notifications enabled');
    }
}

// Export singleton instance
export const updateManager = new UpdateManager();
