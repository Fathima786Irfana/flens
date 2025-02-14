import { Command } from '@oclif/core'
import * as fs from 'fs'
import * as path from 'path'
import fetch from 'node-fetch'
import open from 'open'
import { execSync } from 'child_process'

export default class RepoInit extends Command {
  static description = 'Initialize a repository based on details from the Instance using API call'

  async run() {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '/tmp'
    const flensDir = path.join(homeDir, '.flens')
    const reposDir = path.join(homeDir, 'repositories')
    const currentProjectFile = path.join(flensDir, 'current_project.json')

    // Ensure necessary directories exist
    if (!fs.existsSync(reposDir)) {
      fs.mkdirSync(reposDir, { recursive: true })
    }

    // Check if a project is active
    if (!fs.existsSync(currentProjectFile)) {
      this.error('❌ No active project set. Run "flens project use" first.')
      return
    }

    // Read active project details
    const projectData = JSON.parse(fs.readFileSync(currentProjectFile, 'utf-8'))
    const { repoName, siteName, key, repoUrl, gitUsername, gitToken } = projectData

    if (!siteName || !key) {
      this.error('❌ Missing siteName or APIKey in active project.')
      return
    }

    this.log(`🔄 Fetching repository details from ${siteName}...`)
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    try {
      // Fetch repo details from API
      const response = await fetch(`${siteName}/api/resource/Repository Details/Repository Details`, {
        method: 'GET',
        headers: { Authorization: `${key}` }
      })

      if (!response.ok) {
        this.error(`❌ Failed to fetch repository details: ${response.statusText}`)
        return
      }

      const jsonData = await response.json(); // No inline type here
      const ldData = jsonData as { data?: { repo_name: string, branch_name: string, commit_id: string } };

      if (!ldData || !ldData.data) {
        this.error("❌ API response is invalid or missing 'data' field.");
        return;
      }

      const { repo_name: lRepoName, branch_name: lBranchName, commit_id: lCommitId } = ldData.data;

      if (!lRepoName || !lBranchName || !lCommitId) {
        this.error('❌ Missing repository details in API response.')
        return
      }

      const repoPath = path.join(reposDir, repoName)
      if (fs.existsSync(repoPath)) {
        console.log(`🔄 Updating existing repo: ${repoName}`)
        process.chdir(repoPath) // Change directory to the repo
      } else {
        console.log(`🆕 Cloning new repo: ${repoName}`)
        const cleanRepoUrl = repoUrl.replace(/^https?:\/\//, ''); // Remove http:// or https://
        execSync(`git clone https://${gitUsername}:${gitToken}@${cleanRepoUrl} ${repoPath}`, { stdio: 'inherit' });
        process.chdir(repoPath) // Change to cloned repo
      }

      console.log('📡 Fetching latest updates...')
      execSync(`git fetch origin ${lBranchName}`, { stdio: 'inherit' })

      console.log(`🔄 Checking out branch: ${lBranchName}`)
      execSync(`git checkout ${lBranchName}`, { stdio: 'inherit' })

      console.log('⬇️ Pulling latest changes...')
      execSync(`git pull origin ${lBranchName}`, { stdio: 'inherit' })

      console.log(`🔍 Validating commit ID: ${lCommitId}`)
      try {
        execSync(`git rev-parse --verify ${lCommitId}`, { stdio: 'ignore' })
      } catch {
        throw new Error(`❌ Invalid commit ID: ${lCommitId}`)
      }

      console.log(`🚀 Checking out commit: ${lCommitId}`)
      execSync(`git checkout ${lCommitId}`, { stdio: 'inherit' })

      console.log('💻 Opening repository in VS Code...')
      await open(repoPath, { app: { name: 'code' } })

      console.log('✅ Repository setup complete!')
    } catch (error) {
        if (error instanceof Error) {
          this.error(`Error initiating a repo: ${error.message}`)
        } else {
          this.error('An unknown error occurred while setting up the repo.')
        }
      }

    } 
  }
