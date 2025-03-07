import { Command, Flags } from '@oclif/core';
import fs from 'fs';
import path from 'path';
import fetch, { RequestInit } from 'node-fetch';
import { execSync } from 'child_process';
import inquirer from 'inquirer';

interface ldProjectConfig {
  lSiteName: string;
  lKey: string;
  lRepoName: string;
}

// Fetch the variable details from the active project set in the cli.
function fnGetActiveProject(): ldProjectConfig {
  // Read the Active Project details present at
  // home/.<cli-name>/current_project.jsoon
  let lHomeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
  let lFlensDir = path.join(lHomeDir, '.flens');
  let lCurrentProjectFile = path.join(lFlensDir, 'current_project.json');

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
  let ldResponse = await fetch(iUrl, idRequestOptions);
  if (!ldResponse.ok) {
    throw new Error(`❌ HTTP error! Status: ${ldResponse.status}`);
  }
  return ldResponse.json();
}

// This function manipulate the response got from the API request
async function fnProcessWrite(idData: any, iRepoPath: string, lSiteName: string, idRequestOptions: any, iResource: string): Promise<void> {
  // check whether the resource is Clinet or Server Script
  if (iResource === 'client_script' || iResource === 'server_script') {

    idData.data.forEach((ldDocumentDetails: any) => {
      if ( iResource === 'server_script' &&  ldDocumentDetails.script_type === 'API' ) {
        let lRootFolder = path.join(iRepoPath, 'api');
        fnEnsureDirectoryExists(lRootFolder);
        let lFolderName = ldDocumentDetails.name.toLowerCase().replace(/\s+/g, '_');
        let lFolderPath = path.join(lRootFolder, lFolderName);
        fnEnsureDirectoryExists(lFolderPath);

        let scriptFileName = path.join(lFolderPath, `${ldDocumentDetails.name}.py`);
        if (ldDocumentDetails.script) { 
          fs.writeFileSync(scriptFileName, ldDocumentDetails.script || '');
        }

        let llJsonFileNAme = path.join(lFolderPath, `${ldDocumentDetails.name}.json`);
        let ldJsonData = { ...ldDocumentDetails };
        fs.writeFileSync(llJsonFileNAme, JSON.stringify(ldJsonData, null, 2));
      }
      let doctype = ldDocumentDetails.reference_doctype || ldDocumentDetails.dt || ldDocumentDetails.ref_doctype;
      if (!doctype) return; // Skip if no doctype key is found

      let lRootFolder = path.join(iRepoPath, 'doctype', doctype.toLowerCase().replace(/\s+/g, '_'));
      fnEnsureDirectoryExists(lRootFolder);
      let lFolderName = ldDocumentDetails.name.toLowerCase().replace(/\s+/g, '_');
      let lFolderPath = path.join(lRootFolder, iResource, lFolderName);
      fnEnsureDirectoryExists(lFolderPath);

      let scriptFileName = path.join(lFolderPath, `${ldDocumentDetails.name}.${iResource === 'client_script' ? 'js' : 'py'}`);
      if (ldDocumentDetails.script) { 
        fs.writeFileSync(scriptFileName, ldDocumentDetails.script || '');
      }

      let lJsonFileNAme = path.join(lFolderPath, `${ldDocumentDetails.name}.json`);
      let ldJsonData = { ...ldDocumentDetails };
      fs.writeFileSync(lJsonFileNAme, JSON.stringify(ldJsonData, null, 2));
      });
  } else {
    for (let ldItem of idData.data) {
      try {
        let ldDetails = await fnFetchData(
          `${lSiteName}/api/resource/${iResource}/${ldItem.name}?fields=["*"]`,
          idRequestOptions
        );
        let lResourceName = iResource.toLowerCase().replace(/\s+/g, '_');
        if (iResource == 'Report') {
          await fnSaveReport(ldDetails.data, iRepoPath, lResourceName);
        } else {
          await fnSaveWrite(ldDetails, iRepoPath, lResourceName)
        }
      } catch (err) {
        console.error(`Error fetching details for ${iResource}: ${ldItem.name}`, err);
      }
    }
  }
}

// This function is used to save the data of all resource except
// Report in the current folder structure.
async function fnSaveWrite(idData: any, iRepoPath: string, lResourceName: string) {
  if (lResourceName == 'letter_head') {
    let lRootFolder = path.join(iRepoPath, lResourceName);
    fnEnsureDirectoryExists(lRootFolder);
    let lFolderName = idData.data.name.toLowerCase().replace(/\s+/g, '_');
    let lFolderPath = path.join(lRootFolder, lFolderName);
    fnEnsureDirectoryExists(lFolderPath);
    let lJsonFileNAme = path.join(lFolderPath, `${idData.data.name}.json`);
    fs.writeFileSync(lJsonFileNAme, JSON.stringify({ ...idData.data }, null, 2));
  } else {
      if (Array.isArray(idData.data)) {
        idData.data.forEach((ldDocumentDetails: any) => {
          let doctype = ldDocumentDetails.reference_doctype || ldDocumentDetails.dt || ldDocumentDetails.ref_doctype || ldDocumentDetails.doc_type;
          if (!doctype) return; // Skip if no doctype key is found

          let lRootFolder = path.join(iRepoPath, 'doctype', doctype.toLowerCase().replace(/\s+/g, '_'));
          fnEnsureDirectoryExists(lRootFolder);
          let lFolderName = ldDocumentDetails.name.toLowerCase().replace(/\s+/g, '_');
          let lFolderPath = path.join(lRootFolder, lResourceName.toLowerCase().replace(/\s+/g, '_'), lFolderName);
          fnEnsureDirectoryExists(lFolderPath);

          let lJsonFileNAme = path.join(lFolderPath, `${ldDocumentDetails.name}.json`);
          let ldJsonData = { ...ldDocumentDetails};
          fs.writeFileSync(lJsonFileNAme, JSON.stringify(ldJsonData, null, 2));
        })
      } else {
          if (lResourceName == 'doctype') {
            let lRootFolder = path.join(iRepoPath, 'doctype', idData.data.name.toLowerCase().replace(/\s+/g, '_'));
            fnEnsureDirectoryExists(lRootFolder);
            let lFolderName = idData.data.doctype.toLowerCase().replace(/\s+/g, '_');
            let lFolderPath = path.join(lRootFolder, lFolderName);
            fnEnsureDirectoryExists(lFolderPath);
            let dirName = idData.data.name.toLowerCase().replace(/\s+/g, '_');
            let dirPath = path.join(lFolderPath, dirName);
            fnEnsureDirectoryExists(dirPath);
            let lJsonFileNAme = path.join(dirPath, `${idData.data.name}.json`);
            let ldJsonData = { ...idData.data};
            fs.writeFileSync(lJsonFileNAme, JSON.stringify(ldJsonData, null, 2));
          }
          let doctype = idData.data.reference_doctype || idData.data.dt || idData.data.ref_doctype || idData.data.doc_type;
          if (!doctype) return; // Skip if no doctype key is found

          let lRootFolder = path.join(iRepoPath, 'doctype', doctype.toLowerCase().replace(/\s+/g, '_'));
          fnEnsureDirectoryExists(lRootFolder);
          let lFolderName = idData.data.name.toLowerCase().replace(/\s+/g, '_');
          let lFolderPath = path.join(lRootFolder, lResourceName.toLowerCase().replace(/\s+/g, '_'), lFolderName);
          fnEnsureDirectoryExists(lFolderPath);

          let lJsonFileNAme = path.join(lFolderPath, `${idData.data.name}.json`);
          let ldJsonData = { ...idData.data};
          fs.writeFileSync(lJsonFileNAme, JSON.stringify(ldJsonData, null, 2));
      }
  }
}

// This function write the data of only Report resource.
async function fnSaveReport(ldDocumentDetails: any, iRepoPath: string, iResource: string): Promise<void> {
  let doctype = ldDocumentDetails.reference_doctype || ldDocumentDetails.dt || ldDocumentDetails.ref_doctype;
      if (!doctype) return; // Skip if no doctype key is found

      let lRootFolder = path.join(iRepoPath, 'doctype', doctype.toLowerCase().replace(/\s+/g, '_'));
      fnEnsureDirectoryExists(lRootFolder);
      let lFolderName = ldDocumentDetails.name.toLowerCase().replace(/\s+/g, '_');
      let lFolderPath = path.join(lRootFolder, iResource, lFolderName);
      fnEnsureDirectoryExists(lFolderPath);

  let lJsonFileNAme = path.join(lFolderPath, `${ldDocumentDetails.name}.json`);
  fs.writeFileSync(lJsonFileNAme, JSON.stringify({ ...ldDocumentDetails }, null, 2));

  if (ldDocumentDetails.report_script) {
    fs.writeFileSync(path.join(lFolderPath, `${ldDocumentDetails.name}.py`), ldDocumentDetails.report_script);
  }
  if (ldDocumentDetails.javascript) {
    fs.writeFileSync(path.join(lFolderPath, `${ldDocumentDetails.name}.js`), ldDocumentDetails.javascript);
  }
  if (ldDocumentDetails.query) {
    fs.writeFileSync(path.join(lFolderPath, `${ldDocumentDetails.name}.sql`), ldDocumentDetails.query);
  }
}

export default class clRepoHygieneCommand extends Command {
  static description = 'Check whether local IDE is in sync with the local LENS instance.';

  static flags = {
    help: Flags.help({ char: 'h' }),
  };
  // build in function run of oclif package
  async run(): Promise<void> {
    console.log('🚀 Running hygiene checks ...');
    let ldProject = fnGetActiveProject();
    let { lSiteName, lKey, lRepoName } = ldProject;
    let lHomeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
    let lRepoPath = path.join(lHomeDir, 'repositories', lRepoName);
    fnEnsureDirectoryExists(lRepoPath);
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    
    let headers = new Headers({ Authorization: lKey });
    let ldRequestOptions: RequestInit = { method: 'GET', headers, redirect: 'follow' };
    
    try {

      // Fetch data for each resource and write using suitable write function
      let ldClientScriptData = await fnFetchData(`${lSiteName}/api/resource/Client Script?fields=["*"]&limit_page_length=0`, ldRequestOptions);
      await fnProcessWrite(ldClientScriptData, lRepoPath, lSiteName, ldRequestOptions, 'client_script');

      let ldServerScriptData = await fnFetchData(`${lSiteName}/api/resource/Server Script?fields=["*"]&limit_page_length=0`, ldRequestOptions);
      await fnProcessWrite(ldServerScriptData, lRepoPath, lSiteName, ldRequestOptions, 'server_script');
      
      let ldReportData = await fnFetchData(`${lSiteName}/api/resource/Report?fields=["*"]&filters={\"is_standard\": \"No\", \"disabled\":0}&limit_page_length=0`, ldRequestOptions);
      await fnProcessWrite(ldReportData, lRepoPath, lSiteName, ldRequestOptions, 'Report');

      let ldLetterHeadData = await fnFetchData(`${lSiteName}/api/resource/Letter Head?fields=["*"]&filters={\"disabled\":0}&limit_page_length=0`, ldRequestOptions);
      await fnProcessWrite(ldLetterHeadData, lRepoPath, lSiteName, ldRequestOptions, 'Letter Head');

      let ldPrintFormatData = await fnFetchData(`${lSiteName}/api/resource/Print Format?fields=["*"]&filters={\"standard\": \"No\", \"disabled\":0}&limit_page_length=0`, ldRequestOptions);
      await fnProcessWrite(ldPrintFormatData, lRepoPath, lSiteName, ldRequestOptions, 'Print Format');

      let ldPropertySetterData = await fnFetchData(`${lSiteName}/api/resource/Property Setter?fields=["*"]&limit_page_length=0`, ldRequestOptions);
      await fnSaveWrite(ldPropertySetterData, lRepoPath, 'Property Setter');

      let ldCustomFieldData = await fnFetchData(`${lSiteName}/api/resource/Custom Field?fields=["*"]&limit_page_length=0`, ldRequestOptions);
      await fnSaveWrite(ldCustomFieldData, lRepoPath, 'Custom Field');

      let ldCustomDoctypeData = await fnFetchData(`${lSiteName}/api/resource/DocType?fields=["*"]&filters={\"module\": \"Custom\"}&limit_page_length=0`, ldRequestOptions);
      await fnProcessWrite(ldCustomDoctypeData, lRepoPath, lSiteName, ldRequestOptions, 'DocType');
    try {
      // Stage files first to get proper status
      execSync('git add .', { cwd: lRepoPath });
      // Get the changed files of working commit.
      let lGitStatus = execSync('git status --porcelain=v1', { cwd: lRepoPath }).toString().trim();
      
      if (lGitStatus) {
        // this create select action as used in other cli commands
        let { lSync } = await inquirer.prompt([
          {
            type: 'list',
            name: 'lSync',
            message: `Your Host and Repo is not in sync. Do you want to sync ?.`,
            choices: ['Yes', 'No'],
          },
        ]);
        if (lSync === 'Yes') {
          let { lSyncOption } = await inquirer.prompt([
            {
              type: 'list',
              name: 'lSyncOption',
              message: `Choose any option for syncing.`,
              choices: ['Repo to Host', 'Host to Repo'],
            },
          ]);
          if (lSyncOption === 'Repo to Host') {
            // Process the git status output and create changelog.txt
            let laChangeLog: string[] = [];
            let laStatusLines = lGitStatus.split('\n');
          
            laStatusLines.forEach((lLine) => {
              let lStatusCode = lLine.substring(0, 2).trim(); // Git status code
              let lFilePath = lLine.substring(3).trim(); // File path
          
              if (lStatusCode === 'A') {
                laChangeLog.push(`${lFilePath.padEnd(50)} DELETE`);
              }
            });
          
            // Define the log directory and file path
            let lLogDir = path.join(lRepoPath, 'log');
            let lLogFile = path.join(lLogDir, 'changelog.txt');
          
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
             let laChangeLog: string[] = [];
             let laStatusLines = lGitStatus.split('\n');
 
             laStatusLines.forEach((lLine) => {
               let lStatusCode = lLine.substring(0, 2).trim(); // Git status code
               let lFilePath = lLine.substring(3).trim(); // File path
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
             let lLogDir = path.join(lRepoPath, 'log');
             let lLogFile = path.join(lLogDir, 'changelog.txt');
 
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
      this.log(`Error checking Git status for ${lSiteName}: ${(error as Error).message}`);
    }
    } catch (error) {
      console.error('❌ Error:', error);
    }
  }
}