import { Command } from '@oclif/core'
import * as fs from 'fs'
import * as path from 'path'
import inquirer from 'inquirer'

export default class ClearUse extends Command {
  static description = 'Clear the currently active project with confirmation'

  async run() {
    const currentProjectFile = path.join(process.env.HOME || process.env.USERPROFILE || '/tmp', '.flens', 'current_project.json')

    if (!fs.existsSync(currentProjectFile)) {
      this.log('No active project is set.')
      return
    }

    // Read the current project data
    const projectData = JSON.parse(fs.readFileSync(currentProjectFile, 'utf-8'))
    const projectName = projectData.activeProject

    this.log(`🔹 Current active project: ${projectName}`)
    this.log('Project Details:')
    console.log(JSON.stringify(projectData, null, 2)) // Pretty print project details

    // Ask for confirmation before deleting
    const { confirmDelete } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmDelete',
        message: `Are you sure you want to clear the active project "${projectName}"?`,
        default: false
      }
    ])

    if (!confirmDelete) {
      this.log('❌ Operation cancelled. Active project remains unchanged.')
      return
    }

    // Remove the current project file
    fs.unlinkSync(currentProjectFile)

    this.log(`✅ Active project "${projectName}" has been cleared.`)
    this.log('Run "flens project use" to select a new project.')
  }
}
