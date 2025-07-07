// src/commands/gitflow/reminder.ts
import {Command} from '@oclif/core'
import {spawn} from 'child_process'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default class GitflowReminder extends Command {
  static description = 'Run GitFlow reminder job in background'

  static flags = {}

  async run() {
    this.log('Starting GitFlow reminder in background mode...')

    // Spawn background job (detached)
    const subprocess = spawn('node', [`${__dirname}/../../dist/utils/reminder-agent.js`], {
      detached: true,
      stdio: 'ignore',
    })

    subprocess.unref()

    this.log('✅ GitFlow reminder is now running in the background.')
    this.log('You can continue using the terminal as usual.')
  }
}
