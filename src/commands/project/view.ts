import { Command } from '@oclif/core';
import * as fs from 'fs';
import * as path from 'path';
import inquirer from 'inquirer';

export default class ProjectView extends Command {
  static description = 'View details of a selected project. Sensitive data (Git token, API key) will be masked.';

  async run() {
    try {
      const projectsDir = path.join(process.env.HOME || process.env.USERPROFILE || '', '.flens', 'projects');

      if (!fs.existsSync(projectsDir)) {
        this.log('No projects found. Create one using "flens project create".');
        return;
      }

      const projectFiles = fs.readdirSync(projectsDir).filter(file => file.endsWith('.json'));

      if (projectFiles.length === 0) {
        this.log('No projects found. Create one using "flens project create".');
        return;
      }

      // Prompt user to select a project
      const { selectedProject } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedProject',
          message: 'Select a project to view:',
          choices: projectFiles.map(file => file.replace('.json', '')),
        },
      ]);

      // Read and parse the selected project file
      const projectFilePath = path.join(projectsDir, `${selectedProject}.json`);
      const projectData = JSON.parse(fs.readFileSync(projectFilePath, 'utf-8'));

      // Mask sensitive data
      if (projectData.gitToken) {
        projectData.gitToken = '*************************';
      }
      if (projectData.key) {
        projectData.key = '*************************';
      }

      // Display project details
      this.log(`\nProject Details: ${selectedProject}\n`);
      this.log(JSON.stringify(projectData, null, 2));
    } catch (error) {
      this.log(`Error fetching project details: ${(error as Error).message}`);
    }
  }
}
