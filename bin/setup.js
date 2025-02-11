#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs';
import { execSync } from 'child_process';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import open from 'open';
import { fileURLToPath } from 'url';
import { locateRepo } from '../functions/repoLocator.js';
import { fetchAndSaveData } from '../functions/fetchAndSave.js';
import { doctypes, getEndPointForDoctype } from '../functions/function.js';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const parentDir = path.resolve(__dirname, '../../'); // Move up to parent folder

const program = new Command();

// Define Help Command for CLI
program
  .name('flens')
  .version('1.0.0')
  .description('Flens CLI - A tool to automate repository setup and management for your projects.')
  .usage('<command> [options]')
  .helpOption('-h, --help', 'Display help for the flens CLI');

// Define "setup" command
program
  .command('setup')
  .description('Fetch repository details from configured sites, clone or update repositories, and checkout to the specified commit.')
  .option('--env <path>', 'Path to the .env file')
  .action(async (options) => {
    const envPath = options.env || path.resolve(process.cwd(), '.env'); // Use absolute path

    if (!fs.existsSync(envPath)) {
      console.error('Error: .env file not found at', envPath);
      process.exit(1);
    }

    dotenv.config({ path: envPath });

    const { GITHUB_USER, GITHUB_TOKEN, ...siteData } = process.env;

    if (!GITHUB_USER || !GITHUB_TOKEN) {
      console.error('Error: GITHUB_USER and GITHUB_TOKEN must be set in the .env file');
      process.exit(1);
    }

    // Process sites from .env
    const sites = Object.keys(siteData).filter((key) => key.startsWith("SITE_") && key.endsWith('_URL'));

    for (const siteKey of sites) {
      const siteName = siteKey.replace('_URL', '');
      const siteUrl = process.env[siteKey];
      const siteKeyAuth = process.env[`${siteName}_KEY`];

      if (!siteUrl || !siteKeyAuth) {
        console.warn(`Skipping ${siteName} due to missing API key`);
        continue;
      }

      try {
        console.log(`Fetching repository details from: ${siteUrl}`);
        const response = await fetch(`${siteUrl}/api/resource/Repository Details/Repository Details`, {
          method: 'GET',
          headers: { Authorization: `${siteKeyAuth}` },
        });

        if (!response.ok) {
          console.error(`Failed to fetch repo details from ${siteUrl}`);
          continue;
        }

        const ldData = await response.json();
        const { repo_name: lRepoName, branch_name: lBranchName, commit_id: lCommitId } = ldData.data;

        const repoBasename = path.basename(lRepoName, ".git");
        const repoPath = path.join(parentDir, repoBasename); // Repo is placed outside 'flens'

        if (fs.existsSync(repoPath)) {
          console.log(`Updating existing repo: ${repoBasename}`);
        //   execSync(`cd ${repoPath}`, { stdio: 'inherit' });
          process.chdir(repoPath);
        } else {
          console.log(`Cloning new repo: ${repoBasename}`);
          execSync(`git clone https://${process.env.GITHUB_USER}:${process.env.GITHUB_TOKEN}@github.com/Fathima786Irfana/${repoBasename}.git ${repoPath}`, { stdio: 'inherit' });
          process.chdir(repoPath);
        }
        execSync(`git fetch origin ${lBranchName}`, { stdio: "inherit" });
        execSync(`git checkout ${lBranchName}`, { stdio: "inherit" });
        execSync(`git pull origin ${lBranchName}`, { stdio: "inherit" });
        try {
           execSync(`git rev-parse --verify ${lCommitId}`, { stdio: "ignore" });
        } catch {
           throw new Error(`Invalid commit ID: ${lCommitId}`);
          }
      
        execSync(`git checkout ${lCommitId}`, { stdio: "inherit" });

        // Open repo in code editor
        open(repoPath, { app: { name: 'code' } });
      } catch (error) {
        console.error(`Error processing ${siteName}:`, error.message);
      }
    }
  });

// Define the Intial GET for hygiene check
program
.command('fetchData') // ✅ Correct subcommand definition
.description('Fetches data from an API and stores it in a repository')
.option('-r, --repo <reponame>', 'Repository name')
.option('-u, --url <apiurl>', 'API URL')
.option('-k, --key <apiKey>', 'API Key')
.action(async (options) => { // ✅ Only "options" should be received
  const { repo, url, key } = options; // ✅ Extract options properly
    if (!repo || !url || !key) {
      console.error('❌ Missing required options. Use --repo, --url, and --key.');
      process.exit(1);
    }

    console.log(`🔍 Searching for repository: ${repo}`);

    // Locate repository
    const repoFolder = locateRepo(repo);

    // Process all doctypes
    for (const doctype of doctypes) {
      const endpoint = getEndPointForDoctype(doctype, url);
      await fetchAndSaveData(doctype, repoFolder, endpoint, options.key);
    }

    console.log('✅ Fetching process completed.');
  });

program.parse(process.argv);
