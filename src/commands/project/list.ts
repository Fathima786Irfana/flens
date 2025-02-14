import { Command } from '@oclif/core'
import * as fs from 'fs'
import * as path from 'path'

const homeDir = process.env.HOME || process.env.USERPROFILE || '/tmp' // Fallback to /tmp on Linux
const projectsDir = path.join(homeDir, '.flens', 'projects')

export default class List extends Command {
  static description = 'Lists all projects stored in the projects folder'

  async run() {
    if (!fs.existsSync(projectsDir)) {
      this.log('No project is set. To set a project, run:')
      this.log('  flens project create')
      return
    }

    const files = fs.readdirSync(projectsDir).filter(file => file.endsWith('.json'))

    if (files.length === 0) {
      this.log('No project is set. To set a project, run:')
      this.log('  flens project create')
    } else {
      this.log('Existing projects:')
      files.forEach(file => this.log(`  - ${file.replace('.json', '')}`))
    }
  }
}
