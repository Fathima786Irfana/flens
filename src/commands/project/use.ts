import { Command } from '@oclif/core'
import * as fs from 'fs'
import * as path from 'path'
import inquirer from 'inquirer'

export default class Use extends Command {
  static description = 'Select and set an active project'

  async run() {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '/tmp' // Fallback to /tmp on Linux
    const projectsDir = path.join(homeDir, '.flens', 'projects')
    const currentProjectFile = path.join(homeDir, '.flens', 'current_project.json')

    if (!fs.existsSync(projectsDir) || fs.readdirSync(projectsDir).length === 0) {
      this.error('No projects found. Run "flens project create" to add a new project.')
    }

    const projectFiles = fs.readdirSync(projectsDir).filter(file => file.endsWith('.json'))
    if (projectFiles.length === 0) {
      this.error('No valid project files found.')
    }

    // Extract project names
    const projectNames = projectFiles.map(file => file.replace('.json', ''))

    // Use inquirer to let user select a project
    const { selectedProject } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedProject',
        message: 'Select a project to use:',
        choices: projectNames
      }
    ])

    const projectPath = path.join(projectsDir, `${selectedProject}.json`)
    const projectData = JSON.parse(fs.readFileSync(projectPath, 'utf-8'))

    // Save selected project as the current project
    fs.writeFileSync(currentProjectFile, JSON.stringify({ activeProject: selectedProject, ...projectData }, null, 2))

    this.log(`✅ Project "${selectedProject}" is now active.`)
    this.log(`You can now use its values in other "flens" commands.`)
  }
}
