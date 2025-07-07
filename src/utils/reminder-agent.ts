import { execSync } from 'child_process'
import chokidar from 'chokidar'
import * as path from 'path'
import notifier from 'node-notifier'

let currentGitRoot: string | null = null
let currentBranch: string | null = null
let lastModifiedTime = Date.now()

function notify(title: string, message: string) {
  notifier.notify({
    title,
    message,
    timeout: 5, // seconds
    sound: true,
  })
}

function getGitRoot(): string | null {
  try {
    return execSync('git rev-parse --show-toplevel').toString().trim()
  } catch {
    return null
  }
}

function getCurrentBranch(): string | null {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD').toString().trim()
  } catch {
    return null
  }
}

function monitorGitRepo(): void {
  setInterval(() => {
    const gitRoot = getGitRoot()
    const branch = getCurrentBranch()

    if (!gitRoot || !branch) return

    if (gitRoot !== currentGitRoot || branch !== currentBranch) {
      notify('GitFlow Reminder', `Tracking branch: ${branch} in ${path.basename(gitRoot)}`)
      currentGitRoot = gitRoot
      currentBranch = branch
    }

    try {
      const status = execSync('git status --porcelain').toString()
      const idleTime = Date.now() - lastModifiedTime

      if (status && idleTime > 1 * 60 * 1000) {
        notify('GitFlow Reminder', `You have uncommitted changes on '${branch}' for over 10 minutes.`)
      }

      const rel = execSync(`git rev-list --left-right --count origin/main...${branch}`).toString().trim()
      const [behind, ahead] = rel.split('\t').map(num => parseInt(num, 10))

      if (ahead > 0) {
        notify('GitFlow Reminder', `You are ahead of origin/main by ${ahead} commit(s). Push recommended.`)
      }

      if (behind > 0) {
        notify('GitFlow Reminder', `You are behind origin/main by ${behind} commit(s). Rebase recommended.`)
      }
    } catch (err) {
      // Ignore errors silently (e.g., no upstream)
    }
  }, 10 * 1000)
}

function setupWatch(): void {
  chokidar.watch('.', {
    ignored: /node_modules|\.git/,
    ignoreInitial: true,
    persistent: true,
  }).on('all', () => {
    lastModifiedTime = Date.now()
  })
}

monitorGitRepo()
setupWatch()
