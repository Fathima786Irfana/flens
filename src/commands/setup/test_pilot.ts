import { Command, Flags } from '@oclif/core';
import ora from 'ora';
import inquirer from 'inquirer';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

/**
 * Command: lenscloud setup test_pilot
 *
 * Automates setup of the Lens AI Test Pilot project.
 * Workflow:
 *  1. Prompt for clone directory
 *  2. Clone repository
 *  3. Configure .env with host URL, API secret, and key
 *  4. Generate basic auth key
 *  5. Install dependencies and run initial setup
 *
 * Cross-platform: works on Linux, macOS, and Windows.
 * Exits gracefully with error logs on failure.
 */
export default class clSetupTestPilot extends Command {
  static description = 'Setup the Lens AI Test Pilot project in your environment';

  static examples = [
    '$ lenscloud setup test_pilot',
    '$ lenscloud setup test_pilot --dir custom_pilot',
  ];

  static flags = {
    dir: Flags.string({
      char: 'd',
      description: 'Optional directory name (defaults to ~/lens_ai_test_pilot)',
    }),
  };

  async run() {
    const { flags } = await this.parse(clSetupTestPilot);

    const LHomeDir = os.homedir();
    const LIsWindows = os.platform() === 'win32';

    // Step 1: Ask for directory confirmation
    let lCloneDir = LHomeDir;
    if (!flags.dir) {
      const { lConfirmHome } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'lConfirmHome',
          message: `Do you want to clone lens_ai_test_pilot in ${LHomeDir}?`,
          default: true,
        },
      ]);

      if (!lConfirmHome) {
        const { lFolder } = await inquirer.prompt([
          {
            type: 'input',
            name: 'lFolder',
            message: 'Enter folder name (will be created in home dir):',
            validate: (input: string) =>
              input.trim().length > 0 || 'Folder name cannot be empty',
          },
        ]);
        lCloneDir = path.join(LHomeDir, lFolder.trim());
      }
    } else {
      lCloneDir = path.join(LHomeDir, flags.dir);
    }

    const lCloneInto = path.join(lCloneDir, 'lens_ai_test_pilot');

    // Step 2: Clone repo
    if (fs.existsSync(lCloneInto)) {
        this.log(`[INFO] Found existing lens_ai_test_pilot at ${lCloneInto}, skipping clone.`);
      } else {
        this.log(`[INFO] Cloning into ${lCloneInto} ...`);
        try {
          execSync(`git clone https://github.com/lmnaslimited/lens_ai_test_pilot.git "${lCloneInto}"`, {
            stdio: 'inherit',
          });
        } catch (err) {
          this.error('Git clone failed. Exiting.');
        }
      }
      

    // Step 3: cd into folder
    process.chdir(lCloneInto);

    // Step 4: Copy sample_env to .env
    const lEnvFile = path.join(lCloneInto, '.env');
    const lSampleEnvFile = path.join(lCloneInto, 'sample_env');
    if (!fs.existsSync(lSampleEnvFile)) {
      this.error('sample_env file missing in repo.');
    }
    fs.copyFileSync(lSampleEnvFile, lEnvFile);
    this.log('[INFO] .env created from sample_env');

    // Step 5: Ask for host URL
    const { lHostUrl } = await inquirer.prompt([
      {
        type: 'input',
        name: 'lHostUrl',
        message: 'Enter your HOST URL (without trailing /):',
        validate: (input: string) =>
          input.endsWith('/') ? 'Host URL must not end with "/"' : true,
      },
    ]);

    // Step 6: Ask if user already has a Basic Key
    const { lHasBasicKey } = await inquirer.prompt([
      { type: 'confirm', name: 'lHasBasicKey', message: 'Do you already have a Basic Key?', default: false },
    ]);

    let lAuth: string;
    let lFinalAuth: string;

    if (lHasBasicKey) {
      // If they already have it, just ask for it
      const { lBasicKey } = await inquirer.prompt([
        { type: 'password', name: 'lBasicKey', message: 'Enter your Basic Key:', mask: '*' },
      ]);
      lAuth = lBasicKey.trim();
    } else {
      // Otherwise ask for Secret + Key and generate Basic Key
      const { lApiSecret, lApiKey } = await inquirer.prompt([
        { type: 'password', name: 'lApiSecret', message: 'Enter your API Secret:', mask: '*' },
        { type: 'password', name: 'lApiKey', message: 'Enter your API Key:', mask: '*' },
      ]);

      // 🚨 Trim whitespace before encoding
      const lCleanedSecret = lApiSecret.trim();
      const lCleanedKey = lApiKey.trim();

      const lFinalAuth = Buffer.from(`${lCleanedKey}:${lCleanedSecret}`).toString('base64');
      lAuth = `Basic ${lFinalAuth}`;
      console.log(lAuth);
    }

    // Step 10: Replace HOST_KEY and TARGET_KEY
    fs.appendFileSync(lEnvFile, `\nHOST_URL=${lHostUrl}`);
    fs.appendFileSync(lEnvFile, `\nTARGET_URL=${lHostUrl}`);
    fs.appendFileSync(lEnvFile, `\nHOST_KEY=${lAuth}`);
    fs.appendFileSync(lEnvFile, `\nTARGET_KEY=${lAuth}`);

    this.log('[INFO] .env updated with keys');

    // Step 11: nvm use v20 (Linux/macOS) or nvm use 20 (Windows)
    try {
      if (LIsWindows) {
        execSync('nvm use 20', { stdio: 'ignore', shell: 'cmd.exe' });
      } else {
        execSync('bash -c "source $HOME/.nvm/nvm.sh && nvm use v20"', { stdio: 'ignore' });
      }
    } catch {
      this.error('Failed to switch to Node v20. Ensure nvm (or nvm-windows) is installed.');
    }

    // Step 12: npm install
    const lSpinnerInstall = ora('Installing dependencies with npm...').start();
    try {
      execSync('npm install', { stdio: 'ignore' });
      lSpinnerInstall.succeed('Dependencies installed successfully');
    } catch (err) {
      lSpinnerInstall.fail('npm install failed');
      this.error('Exiting due to error during npm install.');
      return;
    }

    // Step 13: npm run setup
    execSync('npm run setup', { stdio: 'inherit' });

    this.log('✅ Setup completed successfully!');
  }
}
