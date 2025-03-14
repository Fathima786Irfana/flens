// Import necessary modules and dependencies
import { Command, Flags } from '@oclif/core';
import fs from 'fs';
import path from 'path';
import fetch, { RequestInit } from 'node-fetch';
import { execSync } from 'child_process';
import inquirer from 'inquirer';

// Define an interface for the project configuration
interface IprojectConfig {
  siteName: string; // Name of the site associated with the project (default variable name used in project)
  key: string; // Unique key for the project (default variable name used in project)
  repoName: string; // Repository name linked to the project (default variable name used in project)
}

// Fetch the variable details from the active project set in the cli.
function fnGetActiveProject(): IprojectConfig {
  // Determine the home directory path based on the OS environment variables
  // home/.<cli-name>/current_project.jsoon
  let lHomeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
  let lFlensDir = path.join(lHomeDir, '.flens');
  let lCurrentProjectFile = path.join(lFlensDir, 'current_project.json');

  // Check if the current project file exists
  if (!fs.existsSync(lCurrentProjectFile)) {
    throw new Error('❌ No active project set. Run "flens project use" first.');
  }
  // Read and parse the JSON file to return project configuration details
  return JSON.parse(fs.readFileSync(lCurrentProjectFile, 'utf-8')) as IprojectConfig;
}

// Ensure the directory exists, create if not.
function fnEnsureDirectoryExists(iDirPath: string): void {
  // Check if the directory exists
  if (!fs.existsSync(iDirPath)) {
    // Create the directory along with any missing parent directories
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

function fnWriteMetaFile (iFolderPath: string, idDocDetails: any){
  let lJsonFileNAme = path.join(iFolderPath, `${idDocDetails.name}.json`);
  let ldJsonData = { ...idDocDetails };
  fs.writeFileSync(lJsonFileNAme, JSON.stringify(ldJsonData, null, 2));
}

// This function processes the response received from an API request 
// and writes the data to appropriate files based on the resource type.
async function fnProcessWrite(idData: any, iRepoPath: string, siteName: string, idRequestOptions: any, iResource: string): Promise<void> {
  // check whether the resource is Clinet or Server Script
  if (iResource === 'client_script' || iResource === 'server_script') {
    // Iterate over each document in the response data
    idData.data.forEach((ldDocumentDetails: any) => {
      // If the resource is a Server Script and the script type is "API", 
      // store the script inside an "api" directory.
      if ( iResource === 'server_script' &&  ldDocumentDetails.script_type === 'API' ) {
        let lRootFolder = path.join(iRepoPath, 'api'); // Define the root folder for API scripts
        fnEnsureDirectoryExists(lRootFolder);
        // Generate a folder name based on the script name (lowercased and spaces replaced with underscores)
        let lFolderName = ldDocumentDetails.name.toLowerCase().replace(/\s+/g, '_');
        let lFolderPath = path.join(lRootFolder, lFolderName);
        fnEnsureDirectoryExists(lFolderPath);
        // Define the script file path with a .py extension
        let lScriptFileName = path.join(lFolderPath, `${ldDocumentDetails.name}.py`);
        // If script content exists, write it to the file
        if (ldDocumentDetails.script) { 
          fs.writeFileSync(lScriptFileName, ldDocumentDetails.script || '');
        }
        // Write additional metadata related to the script
        fnWriteMetaFile(lFolderPath, ldDocumentDetails);
      }
      // Determine the document type (doctype) from the response
      let lDoctype = ldDocumentDetails.reference_doctype || ldDocumentDetails.dt || ldDocumentDetails.ref_doctype;
      if (!lDoctype) return; // Skip if no doctype key is found
      // Construct the root folder path based on the doctype
      let lRootFolder = path.join(iRepoPath, 'doctype', lDoctype.toLowerCase().replace(/\s+/g, '_'));
      fnEnsureDirectoryExists(lRootFolder);
      let lFolderName = ldDocumentDetails.name.toLowerCase().replace(/\s+/g, '_');
      let lFolderPath = path.join(lRootFolder, iResource, lFolderName);
      fnEnsureDirectoryExists(lFolderPath);
      // Define the script file name with appropriate extension (JavaScript for client scripts, Python for server scripts)
      let lScriptFileName = path.join(lFolderPath, `${ldDocumentDetails.name}.${iResource === 'client_script' ? 'js' : 'py'}`);
      if (ldDocumentDetails.script) { 
        fs.writeFileSync(lScriptFileName, ldDocumentDetails.script || '');
      }
      // Write additional metadata related to the script
      fnWriteMetaFile(lFolderPath, ldDocumentDetails);
      });
  } else {
    // If the resource is neither a Client Script nor a Server Script,
    for (let ldItem of idData.data) {
      try {
        // Fetch additional details for each resource item from the API
        let ldDetails = await fnFetchData(
          `${siteName}/api/resource/${iResource}/${ldItem.name}?fields=["*"]`,
          idRequestOptions
        );
        let lResourceName = iResource.toLowerCase().replace(/\s+/g, '_');
        // If the resource type is "Report", save it using a specialized function
        if (iResource == 'Report') {
          await fnSaveReport(ldDetails.data, iRepoPath, lResourceName);
        } else {
          // Save the resource data using the standard writing function
          await fnSaveWrite(ldDetails, iRepoPath, lResourceName)
        }
      } catch (err) {
        console.error(`Error fetching details for ${iResource}: ${ldItem.name}`, err);
      }
    }
  }
}

// This function is responsible for saving resource data into a structured folder format,  
// except for 'Report' resources. It ensures directories exist and writes metadata files  
// for different resource types. 
async function fnSaveWrite(idData: any, iRepoPath: string, lResourceName: string) {
  // Special case: If the resource is 'letter_head', store it directly in a named folder 
  if (lResourceName == 'letter_head') {
    let lRootFolder = path.join(iRepoPath, lResourceName);
    fnEnsureDirectoryExists(lRootFolder);
    // Format the folder name by converting it to lowercase and replacing spaces with underscores  
    let lFolderName = idData.data.name.toLowerCase().replace(/\s+/g, '_');
    let lFolderPath = path.join(lRootFolder, lFolderName);
    fnEnsureDirectoryExists(lFolderPath);
    // Write the metadata file for the letter head 
    fnWriteMetaFile(lFolderPath, idData.data);
  } else {
    // Check if the provided data is an array (multiple documents)  
      if (Array.isArray(idData.data)) {
        idData.data.forEach((ldDocumentDetails: any) => {
          // Determine the document type using different possible keys  
          let lDoctype = ldDocumentDetails.reference_doctype || ldDocumentDetails.dt || ldDocumentDetails.ref_doctype || ldDocumentDetails.doc_type;
          if (!lDoctype) return; // Skip if no doctype key is found
          let lRootFolder = path.join(iRepoPath, 'doctype', lDoctype.toLowerCase().replace(/\s+/g, '_'));
          fnEnsureDirectoryExists(lRootFolder);
          // Format and define the folder path for the resource  
          let lFolderName = ldDocumentDetails.name.toLowerCase().replace(/\s+/g, '_');
          let lFolderPath = path.join(lRootFolder, lResourceName.toLowerCase().replace(/\s+/g, '_'), lFolderName);
          fnEnsureDirectoryExists(lFolderPath);
          // Write the metadata file for the document 
          fnWriteMetaFile(lFolderPath, ldDocumentDetails);
        })
      } else {
        // Special case: If the resource is 'doctype', create an additional nested directory 
          if (lResourceName == 'doctype') {
            let lRootFolder = path.join(iRepoPath, 'doctype', idData.data.name.toLowerCase().replace(/\s+/g, '_'));
            fnEnsureDirectoryExists(lRootFolder);
            let lFolderName = idData.data.doctype.toLowerCase().replace(/\s+/g, '_');
            let lFolderPath = path.join(lRootFolder, lFolderName);
            fnEnsureDirectoryExists(lFolderPath);
            let lDirName = idData.data.name.toLowerCase().replace(/\s+/g, '_');
            let lDirPath = path.join(lFolderPath, lDirName);
            fnEnsureDirectoryExists(lDirPath);
            // Write the metadata file inside the final nested directory 
            fnWriteMetaFile(lDirPath, idData.data);
          }
          let lDoctype = idData.data.reference_doctype || idData.data.dt || idData.data.ref_doctype || idData.data.doc_type;
          if (!lDoctype) return; // Skip if no doctype key is found
          let lRootFolder = path.join(iRepoPath, 'doctype', lDoctype.toLowerCase().replace(/\s+/g, '_'));
          fnEnsureDirectoryExists(lRootFolder);
          let lFolderName = idData.data.name.toLowerCase().replace(/\s+/g, '_');
          let lFolderPath = path.join(lRootFolder, lResourceName.toLowerCase().replace(/\s+/g, '_'), lFolderName);
          fnEnsureDirectoryExists(lFolderPath);
          // Write the metadata file for the document 
          fnWriteMetaFile(lFolderPath, idData.data);
      }
  }
}

// This function saves the data of a Report resource by creating a structured  
// folder hierarchy and writing metadata along with related script files.
async function fnSaveReport(ldDocumentDetails: any, iRepoPath: string, iResource: string): Promise<void> {
  // Determine the document type using different possible keys  
  let lDoctype = ldDocumentDetails.reference_doctype || ldDocumentDetails.dt || ldDocumentDetails.ref_doctype;
      if (!lDoctype) return; // Skip if no doctype key is found
  // Define the root folder for the doctype  
  let lRootFolder = path.join(iRepoPath, 'doctype', lDoctype.toLowerCase().replace(/\s+/g, '_'));
  fnEnsureDirectoryExists(lRootFolder);
  let lFolderName = ldDocumentDetails.name.toLowerCase().replace(/\s+/g, '_');
  let lFolderPath = path.join(lRootFolder, iResource, lFolderName);
  fnEnsureDirectoryExists(lFolderPath);
  // Write the metadata file for the report 
  fnWriteMetaFile(lFolderPath, ldDocumentDetails);
  // If the report has a Python script, save it as a `.py` file  
  if (ldDocumentDetails.report_script) {
    fs.writeFileSync(path.join(lFolderPath, `${ldDocumentDetails.name}.py`), ldDocumentDetails.report_script);
  }
  // If the report has JavaScript code, save it as a `.js` file 
  if (ldDocumentDetails.javascript) {
    fs.writeFileSync(path.join(lFolderPath, `${ldDocumentDetails.name}.js`), ldDocumentDetails.javascript);
  }
  // If the report has a SQL query, save it as a `.sql` file  
  if (ldDocumentDetails.query) {
    fs.writeFileSync(path.join(lFolderPath, `${ldDocumentDetails.name}.sql`), ldDocumentDetails.query);
  }
}

// This function writes the metadata file in json
// in the desired folder
function fnWriteLogFile(iRepoPath: string, iaChangeLog: string[]){
  // Define the log directory and file path
  let lLogDir = path.join(iRepoPath, 'log');
  let lLogFile = path.join(lLogDir, 'changelog.txt');

  // Ensure the log directory exists
  if (!fs.existsSync(lLogDir)) {
    fs.mkdirSync(lLogDir, { recursive: true });
  }
  // Write the changelog file
  fs.writeFileSync(lLogFile, iaChangeLog.join('\n'), 'utf-8');
  return lLogFile;
}

export default class clRepoHygieneCommand extends Command {
  // description and flags are keywords
  static description = 'Check whether local IDE is in sync with the local LENS instance.';

  static flags = {
    help: Flags.help({ char: 'h' }),
  };
  // build in function run of oclif package
  async run(): Promise<void> {
    console.log('🚀 Running hygiene checks ...');
    let ldProject = fnGetActiveProject();
    let { siteName, key, repoName } = ldProject;
    let lHomeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
    let lRepoPath = path.join(lHomeDir, 'repositories', repoName);
    fnEnsureDirectoryExists(lRepoPath);
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    
    let headers = new Headers({ Authorization: key });
    let ldRequestOptions: RequestInit = { method: 'GET', headers, redirect: 'follow' };
    
    try {
      // Fetch data for each resource and write using suitable write function
      let ldClientScriptData = await fnFetchData(`${siteName}/api/resource/Client Script?fields=["*"]&limit_page_length=0`, ldRequestOptions);
      await fnProcessWrite(ldClientScriptData, lRepoPath, siteName, ldRequestOptions, 'client_script');

      let ldServerScriptData = await fnFetchData(`${siteName}/api/resource/Server Script?fields=["*"]&limit_page_length=0`, ldRequestOptions);
      await fnProcessWrite(ldServerScriptData, lRepoPath, siteName, ldRequestOptions, 'server_script');
      
      let ldReportData = await fnFetchData(`${siteName}/api/resource/Report?fields=["*"]&filters={\"is_standard\": \"No\", \"disabled\":0}&limit_page_length=0`, ldRequestOptions);
      await fnProcessWrite(ldReportData, lRepoPath, siteName, ldRequestOptions, 'Report');

      let ldLetterHeadData = await fnFetchData(`${siteName}/api/resource/Letter Head?fields=["*"]&filters={\"disabled\":0}&limit_page_length=0`, ldRequestOptions);
      await fnProcessWrite(ldLetterHeadData, lRepoPath, siteName, ldRequestOptions, 'Letter Head');

      let ldPrintFormatData = await fnFetchData(`${siteName}/api/resource/Print Format?fields=["*"]&filters={\"standard\": \"No\", \"disabled\":0}&limit_page_length=0`, ldRequestOptions);
      await fnProcessWrite(ldPrintFormatData, lRepoPath, siteName, ldRequestOptions, 'Print Format');

      let ldPropertySetterData = await fnFetchData(`${siteName}/api/resource/Property Setter?fields=["*"]&limit_page_length=0`, ldRequestOptions);
      await fnSaveWrite(ldPropertySetterData, lRepoPath, 'Property Setter');

      let ldCustomFieldData = await fnFetchData(`${siteName}/api/resource/Custom Field?fields=["*"]&limit_page_length=0`, ldRequestOptions);
      await fnSaveWrite(ldCustomFieldData, lRepoPath, 'Custom Field');

      let ldCustomDoctypeData = await fnFetchData(`${siteName}/api/resource/DocType?fields=["*"]&filters={\"module\": \"Custom\"}&limit_page_length=0`, ldRequestOptions);
      await fnProcessWrite(ldCustomDoctypeData, lRepoPath, siteName, ldRequestOptions, 'DocType');
    try {
      // Stage files first to get proper status
      execSync('git add .', { cwd: lRepoPath });
      // Get the changed files of working commit.
      let lGitStatus = execSync('git status --porcelain=v1', { cwd: lRepoPath }).toString().trim();
      var laChangeLog: string[] = [];
      var laStatusLines = lGitStatus.split('\n');
      if (lGitStatus) {
        // this create select action as used in other cli commands
        // This inquirer method will prompt the message to the user and
        // wait for the user input.
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
            laStatusLines.forEach((lLine) => {
              let lStatusCode = lLine.substring(0, 2).trim(); // Git status code
              let lFilePath = lLine.substring(3).trim(); // File path         
              if (lStatusCode === 'A') {
                laChangeLog.push(`${lFilePath.padEnd(50)} DELETE`);
              }
            });
            // Write the changeLog file
            let lLogFile = fnWriteLogFile(lRepoPath, laChangeLog);
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
             laStatusLines.forEach((lLine) => {
               let lStatusCode = lLine.substring(0, 2).trim(); // Git status code
               let lFilePath = lLine.substring(3).trim(); // File path
              // Map the status code with understandable format
               let lState = '';
               if (lStatusCode === 'A') lState = 'INSERT';
               else if (lStatusCode === 'M') lState = 'UPDATE';
               else if (lStatusCode === 'D') lState = 'DELETE';
               else if (lStatusCode === 'R') lState = 'RENAME';
               else if (lStatusCode === '??') lState = 'UNTRACKED';
               if (lState) {
                laChangeLog.push(`${lFilePath.padEnd(50)} ${lState}`);
               }
             });
             // Write the changeLog file
             fnWriteLogFile(lRepoPath, laChangeLog);
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