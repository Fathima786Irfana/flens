import { Command } from '@oclif/core'
import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'

const homeDir = process.env.HOME || process.env.USERPROFILE || '/tmp' // Fallback to /tmp on Linux
const projectsDir = path.join(homeDir, '.flens', 'projects')

export default class Delete extends Command {
  static description = 'Deletes a project'

  async run() {
    if (!fs.existsSync(projectsDir)) {
      this.log('No projects exist.')
      return
    }

    const files = fs.readdirSync(projectsDir).filter(file => file.endsWith('.json'))

    if (files.length === 0) {
      this.log('No projects exist.')
      return
    }

    this.log('Existing projects:')
    files.forEach(file => this.log(`  - ${file.replace('.json', '')}`))

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

    const askQuestion = (query: string): Promise<string> => new Promise(resolve => rl.question(query, resolve))

    try {
      const repoName = await askQuestion('Enter the project name to delete: ')
      const projectFile = path.join(projectsDir, `${repoName}.json`)

      if (!fs.existsSync(projectFile)) {
        this.log(`Project '${repoName}' not found.`)
      } else {
        fs.unlinkSync(projectFile)
        this.log(`Project '${repoName}' deleted successfully.`)
      }
    } catch (error) {
        if (error instanceof Error) {
          this.error(`Error deleting project: ${error.message}`)
        } else {
          this.error('An unknown error occurred while deleting the project.')
        }
      } finally {
      rl.close()
    }
  }
}
