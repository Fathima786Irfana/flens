import { Command } from '@oclif/core';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { execSync } from 'child_process';
import chalk from 'chalk';

export default class clTestSrt extends Command {
  // Built-in function of oclif that executes when the command is run
  async run() {
    // Display a warning message instructing the user to ensure the test project is in the HOME directory
    console.log(chalk.yellow('⚠️  Make sure the test project is in Home directory'));
   
    // Create a readline interface for user input
    const IreadLine = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Function to prompt user input and return the response as a promise
    const lQuestion = (lQuery: string) => new Promise<string>((lResolve) => IreadLine.question(lQuery, lResolve));
    
    // Prompt user for the Cypress project folder name (case-sensitive)
    const lFolderName = await lQuestion(chalk.cyan('\nEnter your test project name (case-sensitive): '));
    IreadLine.close();

    // Determine the user's home directory (compatible with different OS environments)
    const lHomeDir = process.env.HOME || process.env.USERPROFILE;
    // Construct the full path to the Cypress project folder
    const lProjectPath = path.join(lHomeDir!, lFolderName);
    // Define the expected path of the 'sites.js' file within the project where the sites names are stored.
    const lSitesFilePath = path.join(lProjectPath, 'cypress', 'e2e', 'env', 'sites.js');

    // Check if the provided Cypress project folder exists in the HOME directory
    if (!fs.existsSync(lProjectPath)) {
      this.error(chalk.red(`❌ Error: The folder '${lFolderName}' does not exist in the home directory.`));
      return;
    }

    // Check if the 'sites.js' file exists in the expected location
    if (!fs.existsSync(lSitesFilePath)) {
      this.error(chalk.red(`❌ Error: The file 'sites.js' was not found in the expected path.`));
      return;
    }

    // Read and parse the 'sites.js' file to extract the array of site URLs
    let laSites: string[] = [];
    try {
      const lSitesContent = fs.readFileSync(lSitesFilePath, 'utf-8');
      // Extract the array assigned to 'sites' using regex, then evaluate it safely
      laSites = eval(lSitesContent.match(/sites\s*=\s*(\[.*?\])/s)?.[1] || '[]');
    } catch (error) {
      this.error(chalk.red(`❌ Error: Could not read 'sites.js'.`));
      return;
    }

    console.log(chalk.blue('\n🔍 Checking site reachability...\n'));
    // Iterate over each site URL and perform a reachability check using curl
    laSites.forEach((lSite) => {
        // Remove '/login' and anything after it from the site URL to test base domain reachability
        const lCleanSite = lSite.replace(/\/login.*/, ''); // Remove '/login' and anything after it
      try {
        // Execute curl to check if the site responds with HTTP/2 200
        const lOutput = execSync(`curl -k -I ${lCleanSite}`, { encoding: 'utf-8', stdio: 'pipe' });
        if (/HTTP\/2\s+200/.test(lOutput)) {
          console.log(chalk.green(`✔️  ${lCleanSite} reached successfully`));
        } else {
          console.log(chalk.red(`❌  ${lCleanSite} unreachable`));
        }
      } catch (error) {
        // Handle cases where curl fails (e.g., unreachable site)
        console.log(chalk.red(`❌  ${lCleanSite} unreachable`));
      }
    });

    console.log(chalk.yellow('\n🚀 Running Cypress tests...\n'));
    try {
        // Execute Cypress tests using the provided project directory paths
        execSync(`npx cypress run --spec="${path.join(lProjectPath, 'cypress', 'e2e', '*.cy.js')}" --config-file="${path.join(lProjectPath, 'cypress.config.js')}"`, { stdio: 'inherit' });
      } catch (error) {
        // Handle Cypress test failures gracefully
        console.error(chalk.red('\n❌ Cypress tests failed. Please check the error logs above.'));
        process.exit(1);
      }
  }
}