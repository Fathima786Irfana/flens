import { Command } from '@oclif/core'
import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'
import * as crypto from 'crypto'

const homeDir = process.env.HOME || process.env.USERPROFILE || '/tmp' // Fallback to /tmp on Linux
const projectsDir = path.join(homeDir, '.flens', 'projects')
// const encryptionKey = crypto.scryptSync('my-secret-key', 'salt', 32) // Change this key securely
// const algorithm = 'aes-256-cbc'

export default class Create extends Command {
  static description = 'Creates a new project by storing repo details securely in JSON'

  async run() {
    if (!fs.existsSync(projectsDir)) {
      fs.mkdirSync(projectsDir, { recursive: true })
    }

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

    const askQuestion = (query: string): Promise<string> => new Promise(resolve => rl.question(query, resolve))

    try {
      const repoName = await askQuestion('Enter repository name: ')
      const siteName = await askQuestion('Enter site name: ')
      const key = await askQuestion('Enter API key: ')
      const repoUrl = await askQuestion('Enter repository URL: ')
      const gitUsername = await askQuestion('Enter Git username: ')
      const gitToken = await askQuestion('Enter Git token: ')

      const projectData = {
        repoName,
        siteName,
        key,
        repoUrl,
        gitUsername,
        gitToken
        // gitToken: this.encryptData(gitToken),
      }

      fs.writeFileSync(path.join(projectsDir, `${repoName}.json`), JSON.stringify(projectData, null, 2), 'utf-8')
      this.log(`Project '${repoName}' created successfully!`)
    } catch (error) {
        if (error instanceof Error) {
          this.error(`Error creating project: ${error.message}`)
        } else {
          this.error('An unknown error occurred while creating the project.')
        }
      } finally {
      rl.close()
    }
  }

//   private encryptData(data: string): string {
//     const iv = crypto.randomBytes(16)
//     const cipher = crypto.createCipheriv(algorithm, encryptionKey, iv)
//     const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()])
//     return `${iv.toString('hex')}:${encrypted.toString('hex')}`
//   }
}
