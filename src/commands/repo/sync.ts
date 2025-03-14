import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { Command, Flags } from '@oclif/core';

export default class SyncCommand extends Command {
  static description = 'Syncs Repo with Host';
  static flags = {
    help: Flags.help({ char: 'h' }),
  };
  async run() {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
    const flensDir = path.join(homeDir, '.flens');
    const currentProjectFile = path.join(flensDir, 'current_project.json');

    if (!fs.existsSync(currentProjectFile)) {
      this.error('current_project.json not found.');
    }

    const { siteName, repoName, key } = JSON.parse(fs.readFileSync(currentProjectFile, 'utf-8'));
    const myHeaders = new Headers({
      Authorization: key,
      'Content-Type': 'application/json',
    });

    const requestOptionsPUT: RequestInit = { method: 'PUT', headers: myHeaders, redirect: 'follow' };
    const requestOptionsPOST: RequestInit = { method: 'POST', headers: myHeaders, redirect: 'follow' };
    const requestOptionsDELETE: RequestInit = { method: 'DELETE', headers: myHeaders, redirect: 'follow' };

    const lRepoPath = path.join(homeDir, 'repositories', repoName);
    const rootDirs = ['api', 'letter_head', 'doctype'];
    for (const root of rootDirs) {
      const folderPath = path.join(lRepoPath, root);
      if (fs.existsSync(folderPath)) {
        processDirectory(folderPath, requestOptionsPUT, requestOptionsPOST, siteName, root, 1);
      }
    }
    // Process changelog for DELETE requests
    const changelogPath = path.join(lRepoPath, 'log', 'changelog.txt');
    if (fs.existsSync(changelogPath) && fs.statSync(changelogPath).size > 0) {
      processChangelog(changelogPath, siteName, requestOptionsDELETE);
    }
  }
}

async function processDirectory(folderPath: string, putOptions: RequestInit, postOptions: RequestInit, siteName: string, parentDir: string, depth: number) {
  const entries = fs.readdirSync(folderPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(folderPath, entry.name);
    if (entry.isDirectory()) {
      await processDirectory(fullPath, putOptions, postOptions, siteName, parentDir, depth + 1);
    } else if (entry.name.endsWith('.json')) {
      // If we find a JSON file, process it as a leaf node
      await processSubdirectory(folderPath, putOptions, postOptions, siteName, parentDir, depth);
    }
  }
}

async function processSubdirectory(subDir: string, putOptions: RequestInit, postOptions: RequestInit, siteName: string, parentDir: string, depth: number) {
  const files = fs.readdirSync(subDir);
  const jsonFile = files.find(f => f.endsWith('.json'));
  // const scriptFile = files.find(f => f.endsWith('.py') || f.endsWith('.js'));
  if (!jsonFile) return;

  let data = JSON.parse(fs.readFileSync(path.join(subDir, jsonFile), 'utf-8'));
  ['creation', 'modified', 'modified_by', 'owner', 'roles'].forEach(key => delete data[key]);

  // if (scriptFile) {
  //   data.script = fs.readFileSync(path.join(subDir, scriptFile), 'utf-8');
  // }
  const jsFile = files.find(f => f.endsWith('.js'));
  const pyFile = files.find(f => f.endsWith('.py'));
  const sqlFile = files.find(f => f.endsWith('.sql'));

  const resourceMap: Record<string, string | Record<string, string>> = {
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

  const parentFolder = path.basename((path.dirname(subDir))); // 2nd-level dir
  // console.log(parentFolder)
  const grandParentDir = path.basename(path.dirname(path.dirname(path.dirname(subDir)))); // 3rd-level dir
  let resourceName: string | any;
  // const subDirName = path.basename(subDir); // Current dir name
  if (parentDir !== 'doctype') {
    resourceName = resourceMap[parentDir];
  } else if (parentDir === 'doctype' && depth >= 4) {
    resourceName = (resourceMap.doctype as Record<string, string>)[parentFolder];
  }
  // console.log(resourceName)
  if (!resourceName) return;

  // Handle `report` inside `doctype` (third-level folder)
  if (parentFolder === 'report' && grandParentDir === 'doctype') {
    resourceName = 'Report';
    data.javascript = jsFile ? fs.readFileSync(path.join(subDir, jsFile), 'utf-8') : "";
    data.report_script = pyFile ? fs.readFileSync(path.join(subDir, pyFile), 'utf-8') : "";
    data.query = sqlFile ? fs.readFileSync(path.join(subDir, sqlFile), 'utf-8') : "";
    
  }
  // Handle `client_script` and `server_script` inside `doctype` (third-level)
  if (parentFolder !== 'report') {
    data.script = jsFile || pyFile ? fs.readFileSync(path.join(subDir, jsFile || pyFile || ''), 'utf-8') : "";
  }
  // Get the file name without the extension
  const fileName = path.basename(jsonFile, path.extname(jsonFile));

  const url = `${siteName}/api/resource/${resourceName}/${fileName}`;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  await fetch(url, { ...putOptions, body: JSON.stringify(data) })
    .then(response => {
      if (response.status === 404) {
        let url = `${siteName}/api/resource/${resourceName}`;
        return fetch(url, { ...postOptions, body: JSON.stringify(data) });
      }
      return response;
    })
    .then(response => response.text())
    // .then(result => console.log(`${resourceName} synced:`))
    .catch(error => console.error(`Error syncing ${resourceName}:`, error));
}
async function processChangelog(changelogPath: string, siteName: string, deleteOptions: any) {
  const logEntries = fs.readFileSync(changelogPath, 'utf-8').split('\n').filter(line => line.trim().endsWith('DELETE') && !line.startsWith('log/')); // Ignore lines starting with "log/"
  const processedEntries = new Set();
  
  for (const line of logEntries) {
    const match = line.match(/^"(.+?)"\s+DELETE$/);
    if (!match) continue;

    const fullPath = match[1];
    const parts = fullPath.split('/');
    if (parts.length < 3) continue;

    const parentDir = parts[0];
    const fileNameWithExt = parts[parts.length - 1];
    const fileName = fileNameWithExt.replace(/\.[^/.]+$/, '');
    const resourceType = parts[parts.length - 2];

    const resourceMap: Record<string, string | Record<string, string>> = {
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

    let resourceName;
    if (parentDir !== 'doctype') {
      resourceName = resourceMap[parentDir];
    } else if (parentDir === 'doctype' ) {
      const doctypeMap = resourceMap.doctype as Record<string, string>;
      resourceName = doctypeMap[parentDir];
    }
    if (!resourceName) continue;

    const entryKey = `${resourceName}/${fileName}`;
    if (processedEntries.has(entryKey)) continue;
    processedEntries.add(entryKey);

    const url = `${siteName}/api/resource/${resourceName}/${fileName}`;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    await fetch(url, deleteOptions)
      .then(response => response.text())
      .then(() => console.log(`Deleted: ${resourceName}/${fileName}`))
      .catch(error => console.error(`Error deleting ${resourceName}/${fileName}:`, error));
  }
}