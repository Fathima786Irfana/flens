import { Command, Flags } from '@oclif/core';
import fs from 'fs';
import path from 'path';
import fetch, { RequestInit } from 'node-fetch';
import { execSync } from 'child_process';
import inquirer from 'inquirer';

interface ldProjectConfig {
  siteName: string;
  key: string;
  repoName: string;
}

// Fetch the variable details from the active project set in the cli.
function fnGetActiveProject(): ldProjectConfig {
  // Read the Active Project details present at
  // home/.<cli-name>/current_project.jsoon
  const lHomeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
  const lFlensDir = path.join(lHomeDir, '.flens');
  const lCurrentProjectFile = path.join(lFlensDir, 'current_project.json');

  if (!fs.existsSync(lCurrentProjectFile)) {
    throw new Error('❌ No active project set. Run "flens project use" first.');
  }

  return JSON.parse(fs.readFileSync(lCurrentProjectFile, 'utf-8')) as ldProjectConfig;
}

// Ensure the directory exists, create if not.
function fnEnsureDirectoryExists(iDirPath: string): void {
  if (!fs.existsSync(iDirPath)) {
    fs.mkdirSync(iDirPath, { recursive: true });
  }
}

// This function initialte an API Request.
async function fnFetchData(iUrl: string, idRequestOptions: RequestInit): Promise<any> {
  const ldResponse = await fetch(iUrl, idRequestOptions);
  if (!ldResponse.ok) {
    throw new Error(`❌ HTTP error! Status: ${ldResponse.status}`);
  }
  return ldResponse.json();
}

// This function manipulate the response got from the API request
async function fnProcessWrite(data: any, repoPath: string, siteName: string, requestOptions: any, resource: string): Promise<void> {
  // check whether the resource is Clinet or Server Script
  if (resource === 'client_script' || resource === 'server_script') {

    data.data.forEach((documentDetails: any) => {
      if ( resource === 'server_script' &&  documentDetails.script_type === 'API' ) {
        const rootFolder = path.join(repoPath, 'api');
        fnEnsureDirectoryExists(rootFolder);
        const folderName = documentDetails.name.toLowerCase().replace(/\s+/g, '_');
        const folderPath = path.join(rootFolder, folderName);
        fnEnsureDirectoryExists(folderPath);

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
      fnEnsureDirectoryExists(rootFolder);
      const folderName = documentDetails.name.toLowerCase().replace(/\s+/g, '_');
      const folderPath = path.join(rootFolder, resource, folderName);
      fnEnsureDirectoryExists(folderPath);

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
        const details = await fnFetchData(
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

// This function is used to save the data of all resource except
// Report in the current folder structure.
async function saveWrite(data: any, repoPath: string, resourceName: string) {
  if (resourceName == 'letter_head') {
    const rootFolder = path.join(repoPath, resourceName);
    fnEnsureDirectoryExists(rootFolder);
    const folderName = data.data.name.toLowerCase().replace(/\s+/g, '_');
    const folderPath = path.join(rootFolder, folderName);
    fnEnsureDirectoryExists(folderPath);
    const jsonFileName = path.join(folderPath, `${data.data.name}.json`);
    fs.writeFileSync(jsonFileName, JSON.stringify({ ...data.data }, null, 2));
  } else {
      if (Array.isArray(data.data)) {
        data.data.forEach((documentDetails: any) => {
          const doctype = documentDetails.reference_doctype || documentDetails.dt || documentDetails.ref_doctype || documentDetails.doc_type;
          if (!doctype) return; // Skip if no doctype key is found

          const rootFolder = path.join(repoPath, 'doctype', doctype.toLowerCase().replace(/\s+/g, '_'));
          fnEnsureDirectoryExists(rootFolder);
          const folderName = documentDetails.name.toLowerCase().replace(/\s+/g, '_');
          const folderPath = path.join(rootFolder, resourceName.toLowerCase().replace(/\s+/g, '_'), folderName);
          fnEnsureDirectoryExists(folderPath);

          const jsonFileName = path.join(folderPath, `${documentDetails.name}.json`);
          const jsonData = { ...documentDetails};
          fs.writeFileSync(jsonFileName, JSON.stringify(jsonData, null, 2));
        })
      } else {
          if (resourceName == 'doctype') {
            const rootFolder = path.join(repoPath, 'doctype', data.data.name.toLowerCase().replace(/\s+/g, '_'));
            fnEnsureDirectoryExists(rootFolder);
            const folderName = data.data.doctype.toLowerCase().replace(/\s+/g, '_');
            const folderPath = path.join(rootFolder, folderName);
            fnEnsureDirectoryExists(folderPath);

            const jsonFileName = path.join(folderPath, `${data.data.name}.json`);
            const jsonData = { ...data.data};
            fs.writeFileSync(jsonFileName, JSON.stringify(jsonData, null, 2));
          }
          const doctype = data.data.reference_doctype || data.data.dt || data.data.ref_doctype || data.data.doc_type;
          if (!doctype) return; // Skip if no doctype key is found

          const rootFolder = path.join(repoPath, 'doctype', doctype.toLowerCase().replace(/\s+/g, '_'));
          fnEnsureDirectoryExists(rootFolder);
          const folderName = data.data.name.toLowerCase().replace(/\s+/g, '_');
          const folderPath = path.join(rootFolder, resourceName.toLowerCase().replace(/\s+/g, '_'), folderName);
          fnEnsureDirectoryExists(folderPath);

          const jsonFileName = path.join(folderPath, `${data.data.name}.json`);
          const jsonData = { ...data.data};
          fs.writeFileSync(jsonFileName, JSON.stringify(jsonData, null, 2));
      }
  }
}

// This function write the data of only Report resource.
async function saveReport(documentDetails: any, repoPath: string, resource: string): Promise<void> {
  const doctype = documentDetails.reference_doctype || documentDetails.dt || documentDetails.ref_doctype;
      if (!doctype) return; // Skip if no doctype key is found

      const rootFolder = path.join(repoPath, 'doctype', doctype.toLowerCase().replace(/\s+/g, '_'));
      fnEnsureDirectoryExists(rootFolder);
      const folderName = documentDetails.name.toLowerCase().replace(/\s+/g, '_');
      const folderPath = path.join(rootFolder, resource, folderName);
      fnEnsureDirectoryExists(folderPath);

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

export default class clRepoHygieneCommand extends Command {
  static description = 'Check whether local IDE is in sync with the local LENS instance.';

  static flags = {
    help: Flags.help({ char: 'h' }),
  };

  async run(): Promise<void> {
    console.log('🚀 Running hygiene checks ...');
    const project = fnGetActiveProject();
    const { siteName, key, repoName } = project;
    const lHomeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
    const lRepoPath = path.join(lHomeDir, 'repositories', repoName);
    fnEnsureDirectoryExists(lRepoPath);
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    
    const headers = new Headers({ Authorization: key });
    const ldRequestOptions: RequestInit = { method: 'GET', headers, redirect: 'follow' };
    
    try {

      // Fetch data for each resource and write using suitable write function
      const ldClientScriptData = await fnFetchData(`${siteName}/api/resource/Client Script?fields=["*"]&limit_page_length=0`, ldRequestOptions);
      await fnProcessWrite(ldClientScriptData, lRepoPath, siteName, ldRequestOptions, 'client_script');

      const ldServerScriptData = await fnFetchData(`${siteName}/api/resource/Server Script?fields=["*"]&limit_page_length=0`, ldRequestOptions);
      await fnProcessWrite(ldServerScriptData, lRepoPath, siteName, ldRequestOptions, 'server_script');
      
      const ldReportData = await fnFetchData(`${siteName}/api/resource/Report?fields=["*"]&filters={\"is_standard\": \"No\", \"disabled\":0}&limit_page_length=0`, ldRequestOptions);
      await fnProcessWrite(ldReportData, lRepoPath, siteName, ldRequestOptions, 'Report');

      const ldLetterHeadData = await fnFetchData(`${siteName}/api/resource/Letter Head?fields=["*"]&filters={\"disabled\":0}&limit_page_length=0`, ldRequestOptions);
      await fnProcessWrite(ldLetterHeadData, lRepoPath, siteName, ldRequestOptions, 'Letter Head');

      const ldPrintFormatData = await fnFetchData(`${siteName}/api/resource/Print Format?fields=["*"]&filters={\"standard\": \"No\", \"disabled\":0}&limit_page_length=0`, ldRequestOptions);
      await fnProcessWrite(ldPrintFormatData, lRepoPath, siteName, ldRequestOptions, 'Print Format');

      const ldPropertySetterData = await fnFetchData(`${siteName}/api/resource/Property Setter?fields=["*"]&limit_page_length=0`, ldRequestOptions);
      await saveWrite(ldPropertySetterData, lRepoPath, 'Property Setter');

      const ldCustomFieldData = await fnFetchData(`${siteName}/api/resource/Custom Field?fields=["*"]&limit_page_length=0`, ldRequestOptions);
      await saveWrite(ldCustomFieldData, lRepoPath, 'Custom Field');

      const ldCustomDoctypeData = await fnFetchData(`${siteName}/api/resource/DocType?fields=["*"]&filters={\"module\": \"Custom\"}&limit_page_length=0`, ldRequestOptions);
      await fnProcessWrite(ldCustomDoctypeData, lRepoPath, siteName, ldRequestOptions, 'DocType');
    try {
      // Stage files first to get proper status
      execSync('git add .', { cwd: lRepoPath });
      // Get the changed files of working commit.
      const lGitStatus = execSync('git status --porcelain=v1', { cwd: lRepoPath }).toString().trim();
      
      if (lGitStatus) {
        // this create select action as used in other cli commands
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
            const laChangeLog: string[] = [];
            const laStatusLines = lGitStatus.split('\n');
          
            laStatusLines.forEach((lLine) => {
              const lStatusCode = lLine.substring(0, 2).trim(); // Git status code
              const lFilePath = lLine.substring(3).trim(); // File path
          
              if (lStatusCode === 'A') {
                laChangeLog.push(`${lFilePath.padEnd(50)} DELETE`);
              }
            });
          
            // Define the log directory and file path
            const lLogDir = path.join(lRepoPath, 'log');
            const lLogFile = path.join(lLogDir, 'changelog.txt');
          
            // Ensure the log directory exists
            if (!fs.existsSync(lLogDir)) {
              fs.mkdirSync(lLogDir, { recursive: true });
            }
          
            // Write the changelog file
            fs.writeFileSync(lLogFile, laChangeLog.join('\n'), 'utf-8');
          
            this.log(`Use flens repo sync command to proceed.`);
          
            // Remove all staged changes except changelog.txt
            try {
              execSync(`git reset HEAD .`, { cwd: lRepoPath, stdio: 'ignore' });
              execSync(`git restore --staged .`, { cwd: lRepoPath, stdio: 'inherit' }); // Unstage everything
              execSync(`git restore .`, { cwd: lRepoPath, stdio: 'inherit' }); // Discard modifications
              // Re-add only changelog.txt
              execSync(`git add ${lLogFile}`, { cwd: lRepoPath, stdio: 'inherit' });
              execSync(`git clean -df`, { cwd: lRepoPath, stdio: 'ignore' }); // Remove untracked files

            } catch (error) {
              console.error('❌ Error while resetting staged changes:', error);
            }
          } else {
             // Process the git status output and create changelog.txt
             const laChangeLog: string[] = [];
             const laStatusLines = lGitStatus.split('\n');
 
             laStatusLines.forEach((lLine) => {
               const lStatusCode = lLine.substring(0, 2).trim(); // Git status code
               const lFilePath = lLine.substring(3).trim(); // File path
              // Map the status code with understandable format
               let state = '';
               if (lStatusCode === 'A') state = 'INSERT';
               else if (lStatusCode === 'M') state = 'UPDATE';
               else if (lStatusCode === 'D') state = 'DELETE';
               else if (lStatusCode === 'R') state = 'RENAME';
               else if (lStatusCode === '??') state = 'UNTRACKED';
 
               if (state) {
                laChangeLog.push(`${lFilePath.padEnd(50)} ${state}`);
               }
             });
 
             // Define the log directory and file path
             const lLogDir = path.join(lRepoPath, 'log');
             const lLogFile = path.join(lLogDir, 'changelog.txt');
 
             // Ensure the log directory exists
             if (!fs.existsSync(lLogDir)) {
               fs.mkdirSync(lLogDir, { recursive: true });
             }
 
             // Write the changelog file
             fs.writeFileSync(lLogFile, laChangeLog.join('\n'), 'utf-8');
             execSync('git add .', { cwd: lRepoPath });
             this.log(`The changes are staged in the repo. Create a new commit to proceed.`)
          }
        } else {
          this.log('No sync is done. Discarding all changes...');
          // Discard all changes
          execSync('git restore --staged .', { cwd: lRepoPath }); // Unstage
          execSync('git checkout -- .', { cwd: lRepoPath }); // Revert modified files
          execSync('git clean -df', { cwd: lRepoPath }); // Remove untracked files

          this.log('All changes discarded.');
        }
      } else {
        this.log(`No change is detected. Your Instance is in sync with IDE.`);
      } 
    } catch (error) {
      this.log(`Error checking Git status for ${siteName}: ${(error as Error).message}`);
    }
    } catch (error) {
      console.error('❌ Error:', error);
    }
  }
}