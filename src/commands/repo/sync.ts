import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { Command, Flags } from '@oclif/core';
import ora from 'ora';

export default class clSyncCommand extends Command {

  // description and flags are keywords of Command class
  static description = 'Syncs Repo with Host'; // Command description for help output
  static flags = {
    help: Flags.help({ char: 'h' }), // Define a help flag (-h) for the command
  };

  // built-in function of Oclif
  async run() {

    // Determine the user's home directory based on OS
    let lHomeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
    let lFlensDir = path.join(lHomeDir, '.flens');
    let lCurrentProjectFile = path.join(lFlensDir, 'current_project.json'); // Path to the current project metadata file

    // Check if the current project file exists
    if (!fs.existsSync(lCurrentProjectFile)) {
      throw new Error('❌ No active project set. Run "flens project use" first.');
    }

    // Read and parse the current project JSON file
    let { siteName, repoName, key } = JSON.parse(fs.readFileSync(lCurrentProjectFile, 'utf-8'));

    // Define HTTP headers for API requests
    let ldMyHeaders = new Headers({
      Authorization: key,
      'Content-Type': 'application/json',
    });

     // Define request options for different HTTP methods
    let ldRequestOptionsPUT: RequestInit = { method: 'PUT', headers: ldMyHeaders, redirect: 'follow' };
    let ldRequestOptionsPOST: RequestInit = { method: 'POST', headers: ldMyHeaders, redirect: 'follow' };
    let ldRequestOptionsDELETE: RequestInit = { method: 'DELETE', headers: ldMyHeaders, redirect: 'follow' };

    let lRepoPath = path.join(lHomeDir, 'repositories', repoName);
    let laRootDirs = ['api', 'letter_head', 'doctype']; // Directories to be synced
    let ldSpinner = ora({ text: 'Syncing...\n', spinner: 'dots' }).start();
    // Process each root directory in the repository
    for (let lRoot of laRootDirs) {
      let lFolderPath = path.join(lRepoPath, lRoot);
      if (fs.existsSync(lFolderPath)) {
        await fnProcessDirectory(lFolderPath, ldRequestOptionsPUT, ldRequestOptionsPOST, siteName, lRoot, 1);
      }
    }

    // Process the changelog file to handle deletions of resource in the Host
    // that are not maintained in the Repo.
    let lChangelogPath = path.join(lRepoPath, 'log', 'changelog.txt');
    if (fs.existsSync(lChangelogPath) && fs.statSync(lChangelogPath).size > 0) {
      await fnProcessChangelog(lChangelogPath, siteName, ldRequestOptionsDELETE);
    }
    ldSpinner.succeed('Sync Completed Successfully!\n');
  }
}

// Recursively process a directory and sync JSON files
async function fnProcessDirectory(iFolderPath: string, iPutOptions: RequestInit, iPostOptions: RequestInit, iSiteName: string, iParentDir: string, iDepth: number) {
  let ldEntries = fs.readdirSync(iFolderPath, { withFileTypes: true });
  for (let ldEntry of ldEntries) {
    let lFullPath = path.join(iFolderPath, ldEntry.name);
    if (ldEntry.isDirectory()) {
      // Recursively process subdirectories
      await fnProcessDirectory(lFullPath, iPutOptions, iPostOptions, iSiteName, iParentDir, iDepth + 1);
    } else if (ldEntry.name.endsWith('.json')) {
      // If we find a JSON file, process it as a leaf node
      await fnProcessSubdirectory(iFolderPath, iPutOptions, iPostOptions, iSiteName, iParentDir, iDepth);
    }
  }
}

// Process a subdirectory and sync its contents
async function fnProcessSubdirectory(iSubDir: string, iPutOptions: RequestInit, iPostOptions: RequestInit, iSiteName: string, iParentDir: string, iDepth: number) {
  
  // Read all files in the given subdirectory
  let lFiles = fs.readdirSync(iSubDir);
  let lJsonFile = lFiles.find(f => f.endsWith('.json'));
  if (!lJsonFile) return; // Skip if no JSON file is found

  // Read and parse the JSON file
  let ldData = JSON.parse(fs.readFileSync(path.join(iSubDir, lJsonFile), 'utf-8'));
  // Remove unnecessary metadata fields from the JSON data
  ['creation', 'modified', 'modified_by', 'owner', 'roles'].forEach(lKey => delete ldData[lKey]);

  // Identify additional script files
  let lJsFile = lFiles.find(f => f.endsWith('.js'));
  let lPyFile = lFiles.find(f => f.endsWith('.py'));
  let lSqlFile = lFiles.find(f => f.endsWith('.sql'));

  // Define mapping of resource types
  let ldResourceMap: Record<string, string | Record<string, string>> = {
    api: 'Server Script',
    letter_head: 'Letter Head',
    doctype: {
      print_format: 'Print Format',
      custom_field: 'Custom Field',
      doctype: 'DocType',
      client_script: 'Client Script',
      server_script: 'Server Script',
      property_setter: 'Property Setter',
      report: 'Report',
    },
  };

  // Determine the resource type based on folder structure
  let lParentFolder = path.basename((path.dirname(iSubDir))); // 2nd-level dir
  let lGrandParentDir = path.basename(path.dirname(path.dirname(path.dirname(iSubDir)))); // 3rd-level dir
  let lResourceName: string | any;
  // Assign resource name based on the parent directory
  if (iParentDir !== 'doctype') {
    lResourceName = ldResourceMap[iParentDir];
  } else if (iParentDir === 'doctype' && iDepth >= 4) {
    lResourceName = (ldResourceMap.doctype as Record<string, string>)[lParentFolder];
  }
  if (!lResourceName) return; // If no valid resource type is found, exit the function

  // Special handling for "report" resources inside root "doctype" directory
  if (lParentFolder === 'report' && lGrandParentDir === 'doctype') {
    lResourceName = 'Report';
    // Read script files and attach them to the JSON data
    ldData.javascript = lJsFile ? fs.readFileSync(path.join(iSubDir, lJsFile), 'utf-8') : "";
    ldData.report_script = lPyFile ? fs.readFileSync(path.join(iSubDir, lPyFile), 'utf-8') : "";
    ldData.query = lSqlFile ? fs.readFileSync(path.join(iSubDir, lSqlFile), 'utf-8') : "";
  }
  // Handle `client_script` and `server_script` inside `doctype` directory
  if (lParentFolder !== 'report') {
    ldData.script = lJsFile || lPyFile ? fs.readFileSync(path.join(iSubDir, lJsFile || lPyFile || ''), 'utf-8') : "";
  }
  // Extract the resource name (without extension) from the JSON filename
  let lFileName = path.basename(lJsonFile, path.extname(lJsonFile));

  // Construct API URL for updating the resource
  let lUrl = `${iSiteName}/api/resource/${lResourceName}/${lFileName}`;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // Disable SSL certificate verification

  // Construct API URL and send a PUT request; if it fails, send a POST request
  await fetch(lUrl, { ...iPutOptions, body: JSON.stringify(ldData) })
    .then(ldResponse => {
      if (ldResponse.status === 404) {
        // If the resource does not exist, send a POST request to create it
        let lUrl = `${iSiteName}/api/resource/${lResourceName}`;
        return fetch(lUrl, { ...iPostOptions, body: JSON.stringify(ldData) });
      }
      return ldResponse;
    })
    .then(ldResponse => ldResponse.text())
    .catch(error => console.error(`Error syncing ${lResourceName}:`, error));
}

// Process a changelog file and delete corresponding resources not in REPO from HOST
async function fnProcessChangelog(iChangelogPath: string, iSiteName: string, iDeleteOptions: any) {
  // Read the changelog file and filter lines that contain "DELETE"
  let lLogEntries = fs.readFileSync(iChangelogPath, 'utf-8').split('\n').filter(ldLine => ldLine.trim().endsWith('DELETE'));
  let ldProcessedEntries = new Set(); // Track processed entries to avoid duplicates
  
  for (let ldLine of lLogEntries) {
    // Extract the file path from the changelog entry
    let lMatch = ldLine.match(/^"?(.+?)"?\s+DELETE$/);
    if (!lMatch) continue;
    let lFullPath = lMatch[1]; // Full path of the resource to delete
    let lParts = lFullPath.split('/');
    if (lParts.length < 3) continue; // Ignore malformed paths
    let lParentDir = lParts[0]; // Root-level directory (e.g., "doctype")
    let lResourceDir = lParts[lParts.length - 3]; // Resource category (e.g., "print_format")
    let lFileNameWithExt = lParts[lParts.length - 1]; // Filename with extension
    let lFileName = lFileNameWithExt.replace(/\.[^/.]+$/, ''); // Remove file extension

    // Define mapping of resource types
    let ldResourceMap: Record<string, string | Record<string, string>> = {
      api: 'Server Script',
      letter_head: 'Letter Head',
      doctype: {
        print_format: 'Print Format',
        custom_field: 'Custom Field',
        doctype: 'DocType',
        client_script: 'Client Script',
        server_script: 'Server Script',
        property_setter: 'Property Setter',
        report: 'Report',
      },
    };
    let lResourceName;
    if (lParentDir !== 'doctype') {
      lResourceName = ldResourceMap[lParentDir]; // Direct lookup
    } else if (lParentDir === 'doctype' ) {
      let lDoctypeMap = ldResourceMap.doctype as Record<string, string>;
      lResourceName = lDoctypeMap[lResourceDir]; // Lookup in doctype-specific mappings
    }
    if (!lResourceName) continue; // Skip if resource type is not recognized
    // Construct a unique key to prevent duplicate deletion requests
    let lEntryKey = `${lResourceName}/${lFileName}`;
    if (ldProcessedEntries.has(lEntryKey)) continue; // Skip if already processed
    ldProcessedEntries.add(lEntryKey);
    // Construct the API URL for the DELETE request
    let lUrl = `${iSiteName}/api/resource/${lResourceName}/${lFileName}`;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Disable SSL verification

    // Send DELETE request to remove the resource
    await fetch(lUrl, iDeleteOptions)
      .then(ldResponse => ldResponse.text())
      .catch(error => console.error(`\nError deleting ${lResourceName}/${lFileName}:`, error));
  }
}