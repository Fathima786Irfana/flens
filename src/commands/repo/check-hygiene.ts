import { Command, Flags } from '@oclif/core';
import fs from 'fs';
import path from 'path';
import fetch, { RequestInit } from 'node-fetch';
import { execSync } from 'child_process';
import inquirer from 'inquirer';

interface ProjectConfig {
  siteName: string;
  key: string;
  repoName: string;
}

function getActiveProject(): ProjectConfig {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
  const flensDir = path.join(homeDir, '.flens');
  const currentProjectFile = path.join(flensDir, 'current_project.json');

  if (!fs.existsSync(currentProjectFile)) {
    throw new Error('❌ No active project set. Run "flens project use" first.');
  }

  return JSON.parse(fs.readFileSync(currentProjectFile, 'utf-8')) as ProjectConfig;
}

function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function fetchData(url: string, requestOptions: RequestInit): Promise<any> {
  const response = await fetch(url, requestOptions);
  if (!response.ok) {
    throw new Error(`❌ HTTP error! Status: ${response.status}`);
  }
  return response.json();
}

async function processWrite(data: any, repoPath: string, siteName: string, requestOptions: any, resource: string): Promise<void> {
  if (resource === 'client_script' || resource === 'server_script') {

    data.data.forEach((documentDetails: any) => {
      if ( resource === 'server_script' &&  documentDetails.script_type === 'API' ) {
        const rootFolder = path.join(repoPath, 'api');
        ensureDirectoryExists(rootFolder);
        const folderName = documentDetails.name.toLowerCase().replace(/\s+/g, '_');
        const folderPath = path.join(rootFolder, folderName);
        ensureDirectoryExists(folderPath);

        const scriptFileName = path.join(folderPath, `${documentDetails.name}.py`);
        if (documentDetails.script) { 
          fs.writeFileSync(scriptFileName, documentDetails.script || '');
        }

        const jsonFileName = path.join(folderPath, `${documentDetails.name}.json`);
        const jsonData = { ...documentDetails };
        fs.writeFileSync(jsonFileName, JSON.stringify(jsonData, null, 2));
      }
      const doctype = documentDetails.reference_doctype || documentDetails.dt || documentDetails.ref_doctype;
      if (!doctype) return; // Skip if no doctype key is found

      const rootFolder = path.join(repoPath, 'doctype', doctype.toLowerCase().replace(/\s+/g, '_'));
      ensureDirectoryExists(rootFolder);
      const folderName = documentDetails.name.toLowerCase().replace(/\s+/g, '_');
      const folderPath = path.join(rootFolder, resource, folderName);
      ensureDirectoryExists(folderPath);

      const scriptFileName = path.join(folderPath, `${documentDetails.name}.${resource === 'client_script' ? 'js' : 'py'}`);
      if (documentDetails.script) { 
        fs.writeFileSync(scriptFileName, documentDetails.script || '');
      }

      const jsonFileName = path.join(folderPath, `${documentDetails.name}.json`);
      const jsonData = { ...documentDetails };
      fs.writeFileSync(jsonFileName, JSON.stringify(jsonData, null, 2));
      });
  } else {
    for (const item of data.data) {
      try {
        const details = await fetchData(
          `${siteName}/api/resource/${resource}/${item.name}?fields=["*"]`,
          requestOptions
        );
        const resourceName = resource.toLowerCase().replace(/\s+/g, '_');
        if (resource == 'Report') {
          await saveReport(details.data, repoPath, resourceName);
        } else {
          await saveWrite(details, repoPath, resourceName)
        }
      } catch (err) {
        console.error(`Error fetching details for ${resource}: ${item.name}`, err);
      }
    }
  }
}

async function saveWrite(data: any, repoPath: string, resourceName: string) {
  if (resourceName == 'letter_head') {
    const rootFolder = path.join(repoPath, resourceName);
    ensureDirectoryExists(rootFolder);
    const folderName = data.data.name.toLowerCase().replace(/\s+/g, '_');
    const folderPath = path.join(rootFolder, folderName);
    ensureDirectoryExists(folderPath);
    const jsonFileName = path.join(folderPath, `${data.data.name}.json`);
    fs.writeFileSync(jsonFileName, JSON.stringify({ ...data.data }, null, 2));
  } else {
      if (Array.isArray(data.data)) {
        data.data.forEach((documentDetails: any) => {
          const doctype = documentDetails.reference_doctype || documentDetails.dt || documentDetails.ref_doctype || documentDetails.doc_type;
          if (!doctype) return; // Skip if no doctype key is found

          const rootFolder = path.join(repoPath, 'doctype', doctype.toLowerCase().replace(/\s+/g, '_'));
          ensureDirectoryExists(rootFolder);
          const folderName = documentDetails.name.toLowerCase().replace(/\s+/g, '_');
          const folderPath = path.join(rootFolder, resourceName.toLowerCase().replace(/\s+/g, '_'), folderName);
          ensureDirectoryExists(folderPath);

          const jsonFileName = path.join(folderPath, `${documentDetails.name}.json`);
          const jsonData = { ...documentDetails};
          fs.writeFileSync(jsonFileName, JSON.stringify(jsonData, null, 2));
        })
      } else {
          if (resourceName == 'doctype') {
            const rootFolder = path.join(repoPath, 'doctype', data.data.name.toLowerCase().replace(/\s+/g, '_'));
            ensureDirectoryExists(rootFolder);
            const folderName = data.data.doctype.toLowerCase().replace(/\s+/g, '_');
            const folderPath = path.join(rootFolder, folderName);
            ensureDirectoryExists(folderPath);

            const jsonFileName = path.join(folderPath, `${data.data.name}.json`);
            const jsonData = { ...data.data};
            fs.writeFileSync(jsonFileName, JSON.stringify(jsonData, null, 2));
          }
          const doctype = data.data.reference_doctype || data.data.dt || data.data.ref_doctype || data.data.doc_type;
          if (!doctype) return; // Skip if no doctype key is found

          const rootFolder = path.join(repoPath, 'doctype', doctype.toLowerCase().replace(/\s+/g, '_'));
          ensureDirectoryExists(rootFolder);
          const folderName = data.data.name.toLowerCase().replace(/\s+/g, '_');
          const folderPath = path.join(rootFolder, resourceName.toLowerCase().replace(/\s+/g, '_'), folderName);
          ensureDirectoryExists(folderPath);

          const jsonFileName = path.join(folderPath, `${data.data.name}.json`);
          const jsonData = { ...data.data};
          fs.writeFileSync(jsonFileName, JSON.stringify(jsonData, null, 2));
      }
  }
}

async function saveReport(documentDetails: any, repoPath: string, resource: string): Promise<void> {
  const doctype = documentDetails.reference_doctype || documentDetails.dt || documentDetails.ref_doctype;
      if (!doctype) return; // Skip if no doctype key is found

      const rootFolder = path.join(repoPath, 'doctype', doctype.toLowerCase().replace(/\s+/g, '_'));
      ensureDirectoryExists(rootFolder);
      const folderName = documentDetails.name.toLowerCase().replace(/\s+/g, '_');
      const folderPath = path.join(rootFolder, resource, folderName);
      ensureDirectoryExists(folderPath);

  const jsonFileName = path.join(folderPath, `${documentDetails.name}.json`);
  fs.writeFileSync(jsonFileName, JSON.stringify({ ...documentDetails }, null, 2));

  if (documentDetails.report_script) {
    fs.writeFileSync(path.join(folderPath, `${documentDetails.name}.py`), documentDetails.report_script);
  }
  if (documentDetails.javascript) {
    fs.writeFileSync(path.join(folderPath, `${documentDetails.name}.js`), documentDetails.javascript);
  }
  if (documentDetails.query) {
    fs.writeFileSync(path.join(folderPath, `${documentDetails.name}.sql`), documentDetails.query);
  }
}

export default class RepoHygieneCommand extends Command {
  static description = 'Check whether local IDE is in sync with the local LENS instance.';

  static flags = {
    help: Flags.help({ char: 'h' }),
  };

  async run(): Promise<void> {
    console.log('🚀 Running hygiene checks ...');
    const project = getActiveProject();
    const { siteName, key, repoName } = project;
    const homeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
    const repoPath = path.join(homeDir, 'repositories', repoName);
    ensureDirectoryExists(repoPath);
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    
    const headers = new Headers({ Authorization: key });
    const requestOptions: RequestInit = { method: 'GET', headers, redirect: 'follow' };
    
    try {
      const clientScriptData = await fetchData(`${siteName}/api/resource/Client Script?fields=["*"]&limit_page_length=0`, requestOptions);
      await processWrite(clientScriptData, repoPath, siteName, requestOptions, 'client_script');

      const serverScriptData = await fetchData(`${siteName}/api/resource/Server Script?fields=["*"]&limit_page_length=0`, requestOptions);
      await processWrite(serverScriptData, repoPath, siteName, requestOptions, 'server_script');
      
      const reportData = await fetchData(`${siteName}/api/resource/Report?fields=["*"]&filters={\"is_standard\": \"No\", \"disabled\":0}&limit_page_length=0`, requestOptions);
      await processWrite(reportData, repoPath, siteName, requestOptions, 'Report');

      const letterHeadData = await fetchData(`${siteName}/api/resource/Letter Head?fields=["*"]&filters={\"disabled\":0}&limit_page_length=0`, requestOptions);
      await processWrite(letterHeadData, repoPath, siteName, requestOptions, 'Letter Head');

      const printFormatData = await fetchData(`${siteName}/api/resource/Print Format?fields=["*"]&filters={\"standard\": \"No\", \"disabled\":0}&limit_page_length=0`, requestOptions);
      await processWrite(printFormatData, repoPath, siteName, requestOptions, 'Print Format');

      const propertySetterData = await fetchData(`${siteName}/api/resource/Property Setter?fields=["*"]&limit_page_length=0`, requestOptions);
      await saveWrite(propertySetterData, repoPath, 'Property Setter');

      const customFieldData = await fetchData(`${siteName}/api/resource/Custom Field?fields=["*"]&limit_page_length=0`, requestOptions);
      await saveWrite(customFieldData, repoPath, 'Custom Field');

      const customDoctypeData = await fetchData(`${siteName}/api/resource/DocType?fields=["*"]&filters={\"module\": \"Custom\"}&limit_page_length=0`, requestOptions);
      await processWrite(customDoctypeData, repoPath, siteName, requestOptions, 'DocType');
    } catch (error) {
      console.error('❌ Error:', error);
    }
    try {
      // Stage files first to get proper status
      execSync('git add .', { cwd: repoPath });
      const gitStatus = execSync('git status --porcelain=v1', { cwd: repoPath }).toString().trim();
      
      if (gitStatus) {
        const { sync } = await inquirer.prompt([
          {
            type: 'list',
            name: 'sync',
            message: `Your Host and Repo is not in sync. Do you want to sync ?.`,
            choices: ['Yes', 'No'],
          },
        ]);
        if (sync === 'Yes') {
          const { syncOption } = await inquirer.prompt([
            {
              type: 'list',
              name: 'syncOption',
              message: `Choose any option for syncing.`,
              choices: ['Repo to Host', 'Host to Repo'],
            },
          ]);
          if (syncOption === 'Repo to Host') {
            // Process the git status output and create changelog.txt
            const changeLog: string[] = [];
            const statusLines = gitStatus.split('\n');
          
            statusLines.forEach((line) => {
              const statusCode = line.substring(0, 2).trim(); // Git status code
              const filePath = line.substring(3).trim(); // File path
          
              if (statusCode === 'A') {
                changeLog.push(`${filePath.padEnd(50)} DELETE`);
              }
            });
          
            // Define the log directory and file path
            const logDir = path.join(repoPath, 'log');
            const logFile = path.join(logDir, 'changelog.txt');
          
            // Ensure the log directory exists
            if (!fs.existsSync(logDir)) {
              fs.mkdirSync(logDir, { recursive: true });
            }
          
            // Write the changelog file
            fs.writeFileSync(logFile, changeLog.join('\n'), 'utf-8');
          
            this.log(`Use flens repo sync command to proceed.`);
          
            // Remove all staged changes except changelog.txt
            try {
              execSync(`git reset HEAD .`, { cwd: repoPath, stdio: 'ignore' });
              execSync(`git restore --staged .`, { cwd: repoPath, stdio: 'inherit' }); // Unstage everything
              execSync(`git restore .`, { cwd: repoPath, stdio: 'inherit' }); // Discard modifications
              // Re-add only changelog.txt
              execSync(`git add ${logFile}`, { cwd: repoPath, stdio: 'inherit' });
              execSync(`git clean -df`, { cwd: repoPath, stdio: 'ignore' }); // Remove untracked files

            } catch (error) {
              console.error('❌ Error while resetting staged changes:', error);
            }
          } else {
             // Process the git status output and create changelog.txt
             const changeLog: string[] = [];
             const statusLines = gitStatus.split('\n');
 
             statusLines.forEach((line) => {
               const statusCode = line.substring(0, 2).trim(); // Git status code
               const filePath = line.substring(3).trim(); // File path
 
               let state = '';
               if (statusCode === 'A') state = 'INSERT';
               else if (statusCode === 'M') state = 'UPDATE';
               else if (statusCode === 'D') state = 'DELETE';
               else if (statusCode === 'R') state = 'RENAME';
               else if (statusCode === '??') state = 'UNTRACKED';
 
               if (state) {
                 changeLog.push(`${filePath.padEnd(50)} ${state}`);
               }
             });
 
             // Define the log directory and file path
             const logDir = path.join(repoPath, 'log');
             const logFile = path.join(logDir, 'changelog.txt');
 
             // Ensure the log directory exists
             if (!fs.existsSync(logDir)) {
               fs.mkdirSync(logDir, { recursive: true });
             }
 
             // Write the changelog file
             fs.writeFileSync(logFile, changeLog.join('\n'), 'utf-8');
             execSync('git add .', { cwd: repoPath });
             this.log(`The changes are staged in the repo. Create a new commit to proceed.`)
          }
        } else {
          this.log('No sync is done. Discarding all changes...');
          // Discard all changes
          execSync('git restore --staged .', { cwd: repoPath }); // Unstage
          execSync('git checkout -- .', { cwd: repoPath }); // Revert modified files
          execSync('git clean -df', { cwd: repoPath }); // Remove untracked files

          this.log('All changes discarded.');
        }
      } else {
        this.log(`No change is detected. Your Instance is in sync with IDE.`);
      } 
    } catch (error) {
      this.log(`Error checking Git status for ${siteName}: ${(error as Error).message}`);
    }
  }
}