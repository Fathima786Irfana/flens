import { Command, Flags } from '@oclif/core';
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
    const LDefaultDir = path.join(LHomeDir, 'lens_ai_test_pilot');
    const LIsWindows = os.platform() === 'win32';

    // Step 1: Ask for directory confirmation
    let lCloneDir = LDefaultDir;
    if (!flags.dir) {
      const { lConfirmHome } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'lConfirmHome',
          message: `Do you want to clone lens_ai_test_pilot in ${LDefaultDir}?`,
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

    // Step 6, 7 & 8: Ask for API secret and key
    const { lApiSecret, lApiKey } = await inquirer.prompt([
      { type: 'password', name: 'lApiSecret', message: 'Enter your API Secret:' },
      { type: 'password', name: 'lApiKey', message: 'Enter your API Key:' },
    ]);

    // Step 9: Create basic auth (base64)
    const lAuth = Buffer.from(`${lApiSecret}:${lApiKey}`).toString('base64');

    // Step 10: Replace HOST_KEY and TARGET_KEY
    fs.appendFileSync(lEnvFile, `\nHOST_URL=${lHostUrl}`);
    fs.appendFileSync(lEnvFile, `\nTARGET_URL=${lHostUrl}`);
    fs.appendFileSync(lEnvFile, `\nHOST_KEY=Basic ${lAuth}`);
    fs.appendFileSync(lEnvFile, `\nTARGET_KEY=Basic ${lAuth}`);

    this.log('[INFO] .env updated with keys');

    // Step 11: nvm use v20 (Linux/macOS) or nvm use 20 (Windows)
    try {
      if (LIsWindows) {
        execSync('nvm use 20', { stdio: 'inherit', shell: 'cmd.exe' });
      } else {
        execSync('bash -c "source $HOME/.nvm/nvm.sh && nvm use v20"', { stdio: 'inherit' });
      }
    } catch {
      this.error('Failed to switch to Node v20. Ensure nvm (or nvm-windows) is installed.');
    }

    // Step 12: npm install
    try {
      execSync('npm install', { stdio: 'inherit' });
    } catch {
      this.error('npm install failed.');
    }

    // Step 13: npm run setup
    try {
      execSync('npm run setup', { stdio: 'inherit' });
    } catch {
      this.error('npm run setup failed.');
    }

    this.log('✅ Setup completed successfully!');
  }
}
