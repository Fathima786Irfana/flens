import { Command } from '@oclif/core'
import * as fs from 'fs'
import * as path from 'path'
import inquirer from 'inquirer'

export default class Edit extends Command {
  static description = 'Edit an existing project'

  async run() {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '/tmp' // Fallback to /tmp on Linux
    const projectsDir = path.join(homeDir, '.flens', 'projects')

    // Get list of project files
    if (!fs.existsSync(projectsDir)) {
      this.log('No projects found. To create one, run: flens project create')
      return
    }
    
    const files = fs.readdirSync(projectsDir)
    if (files.length === 0) {
      this.log('No projects found. To create one, run: flens project create')
      return
    }

    // Select a project to edit
    const { selectedProject } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedProject',
        message: 'Select a project to edit:',
        choices: files.map(file => file.replace('.json', ''))
      }
    ])

    const projectPath = path.join(projectsDir, `${selectedProject}.json`)
    
    if (!fs.existsSync(projectPath)) {
      this.error(`Project ${selectedProject} does not exist.`)
    }

    // Load existing project data
    const projectData = JSON.parse(fs.readFileSync(projectPath, 'utf-8'))

    // Prompt for new values (keeping existing values as defaults)
    const updatedData = await inquirer.prompt([
      {
        type: 'input',
        name: 'repoName',
        message: 'Repo Name:',
        default: projectData.repoName
      },
      {
        type: 'input',
        name: 'siteName',
        message: 'Site Name:',
        default: projectData.siteName
      },
      {
        type: 'input',
        name: 'key',
        message: 'Key:',
        default: projectData.key
      },
      {
        type: 'input',
        name: 'repoUrl',
        message: 'Repo URL:',
        default: projectData.repoUrl
      },
      {
        type: 'input',
        name: 'gitUsername',
        message: 'Git Username:',
        default: projectData.gitUsername
      },
      {
        type: 'input',
        name: 'gitToken',
        message: 'Git Token:',
        default: projectData.gitToken
      }
    ])

    // Save the updated data
    fs.writeFileSync(projectPath, JSON.stringify(updatedData, null, 2))
    this.log(`Project ${selectedProject} updated successfully!`)
  }
}
