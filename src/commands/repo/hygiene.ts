import { Command, Flags } from '@oclif/core';
import fs from 'fs';
import path from 'path';
import fetch, { RequestInit } from 'node-fetch';

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
    console.log(`📁 Created directory: ${dirPath}`);
  }
}

async function fetchData(url: string, requestOptions: RequestInit): Promise<any> {
  const response = await fetch(url, requestOptions);
  if (!response.ok) {
    throw new Error(`❌ HTTP error! Status: ${response.status}`);
  }
  return response.json();
}

async function processClientScript(data: any, repoPath: string): Promise<void> {
  data.data.forEach((documentDetails: any) => {
    const folderName = documentDetails.dt;
    const folderPath = path.join(repoPath, 'clientScript', folderName);
    ensureDirectoryExists(folderPath);
    
    const metaFileName = path.join(folderPath, `${documentDetails.name}.meta`);
    const scriptFileName = path.join(folderPath, `${documentDetails.name}.js`);

    fs.writeFileSync(metaFileName, JSON.stringify({ ...documentDetails, script: undefined }, null, 2));
    fs.writeFileSync(scriptFileName, documentDetails.script);
  });
}

async function processServerScript(data: any, repoPath: string): Promise<void> {
  data.data.forEach((documentDetails: any) => {
    const folderName = documentDetails.script_type;
    const folderPath = path.join(repoPath, 'serverScript', folderName);
    ensureDirectoryExists(folderPath);
    
    const metaFileName = path.join(folderPath, `${documentDetails.name}.meta`);
    const scriptFileName = path.join(folderPath, `${documentDetails.name}.py`);

    fs.writeFileSync(metaFileName, JSON.stringify({ ...documentDetails, script: undefined }, null, 2));
    fs.writeFileSync(scriptFileName, documentDetails.script);
  });
}

async function processPropertySetter(data: any, repoPath: string): Promise<void> {
  data.data.forEach((documentDetails: any) => {
    const folderName = documentDetails.doc_type;
    const folderPath = path.join(repoPath, 'propertySetter', folderName);
    ensureDirectoryExists(folderPath);
    
    const metaFileName = path.join(folderPath, `${documentDetails.name}.json`);
    const filteredData = { ...documentDetails };
    delete filteredData.owner;
    delete filteredData.creation;
    delete filteredData.modified;
    delete filteredData.modified_by;

    fs.writeFileSync(metaFileName, JSON.stringify(filteredData, null, 2));
  });
}

async function processCustomField(data: any, repoPath: string): Promise<void> {
  const groupedByDoctype: Record<string, any[]> = {};

  data.data.forEach((item: any) => {
    const doctype = item.dt;
    if (!groupedByDoctype[doctype]) groupedByDoctype[doctype] = [];
    const { modified, modified_by, owner, creation, ...filteredItem } = item;
    groupedByDoctype[doctype].push(filteredItem);
  });

  Object.keys(groupedByDoctype).forEach((doctype) => {
    const filePath = path.join(repoPath, 'customField', `${doctype}.json`);
    fs.writeFileSync(filePath, JSON.stringify(groupedByDoctype[doctype], null, 2));
  });
}

async function processLetterHead(letterHeads: any, repoPath: string, siteName: string, requestOptions: any) {
  for (const letterHead of letterHeads.data) {
    try {
      const letterHeadDetails = await fetchData(
        `${siteName}/api/resource/Letter Head/${letterHead.name}?fields=["*"]`,
        requestOptions
      );

      await saveletterHead(letterHeadDetails.data, repoPath);
    } catch (err) {
      console.error(`Error fetching details for Letter Head: ${letterHead.name}`, err);
    }
  }
}

async function saveletterHead(data: any, repoPath: string) {
  const folderPath = path.join(repoPath, 'letterHead');
  ensureDirectoryExists(folderPath);

  const metaFileName = path.join(folderPath, `${data.name}.meta`);
  const metaData = { ...data };

  try {
    await fs.promises.writeFile(metaFileName, JSON.stringify(metaData, null, 2));
  } catch (err) {
    console.error(`Error writing Letter Head file:`, err);
  }
}

async function processPrintFormat(printFormats: any, repoPath: string, siteName: string, requestOptions: any) {
  for (const printFormat of printFormats.data) {
    try {
      const printFormatDetails = await fetchData(
        `${siteName}/api/resource/Print Format/${printFormat.name}?fields=["*"]`,
        requestOptions
      );

      await savePrintFormat(printFormatDetails.data, repoPath);
    } catch (err) {
      console.error(`Error fetching details for Print Format: ${printFormat.name}`, err);
    }
  }
}

async function savePrintFormat(data: any, repoPath: string) {
  const folderName = data.doc_type || "Unknown";
  const folderPath = path.join(repoPath, 'printFormat', folderName);
  ensureDirectoryExists(folderPath);

  const metaFileName = path.join(folderPath, `${data.name}.meta`);
  const metaData = { ...data };

  try {
    await fs.promises.writeFile(metaFileName, JSON.stringify(metaData, null, 2));
  } catch (err) {
    console.error(`Error writing Print Format file:`, err);
  }
}

async function processReportData(data: any, repoPath: string, siteName: string, requestOptions: any) {
  for (const report of data.data) {
    try {
      const reportDetails = await fetchData(
        `${siteName}/api/resource/Report/${report.name}?fields=["*"]`,
        requestOptions
      );

      await saveReport(reportDetails.data, repoPath);
    } catch (err) {
      console.error(`Error fetching details for Print Format: ${report.name}`, err);
    }
  }
}

async function saveReport(data: any, repoPath: string) {
  const folderName = data.name;
  const folderPath = path.join(repoPath, 'reports', folderName); //configure folderPath
  const reportScriptContent = data.report_script;
  const javascriptContent = data.javascript;
  const queryContent = data.query;
  const reportScriptName = data.name;
  const javaScriptName = data.name;
  const queryName = data.name;
  const javaScriptFileName = path.join(folderPath, `${javaScriptName}.js`);
  const reportScriptFileName = path.join(folderPath, `${reportScriptName}.py`);
  const queryFileName = path.join(folderPath, `${queryName}.sql`);
  const metaFileName = path.join(folderPath, `${folderName}.meta`);
  ensureDirectoryExists(folderPath);

  if (reportScriptContent) {
    fs.writeFile(reportScriptFileName, reportScriptContent, { flag: 'w' }, (err) => {
      if (err) {
        console.error('Error writing report script file:', err);
      }
    });
  }
  if (javascriptContent) {
    fs.writeFile(javaScriptFileName, javascriptContent, { flag: 'w' }, (err) => {
      if (err) {
        console.error('Error writing JavaScript file:', err);
      }
    });
  }

  if (queryContent) {
    fs.writeFile(queryFileName, queryContent, { flag: 'w' }, (err) => {
      if (err) {
        console.error('Error writing query file:', err);
      }
    });
  }
  // Adjusted metadata
  const metadata = { ...data };
  delete metadata.report_script;
  delete metadata.javascript;
  delete metadata.query;
  fs.writeFile(metaFileName, JSON.stringify(metadata), { flag: 'w' }, (err) => {
    if (err) {
      console.error('Error writing meta file:', err);
    }
  });
}

async function processCustomDoctype(
  data: any,
  repoPath: string,
  siteName: string,
  requestOptions: any
): Promise<void> {
  const documentDetails = data?.data;

  if (!Array.isArray(documentDetails)) {
    console.error("Invalid response structure: Expected an array in 'data'.");
    return;
  }

  for (const item of documentDetails) {
    try {
      // Fetch full details for each DocType
      const doctypeDetailsUrl = `${siteName}/api/resource/DocType/${encodeURIComponent(item.name)}?fields=["*"]&filters={\"module\": \"Custom\"}&limit_page_length=0`;
      const response = await fetch(doctypeDetailsUrl, requestOptions);

      if (!response.ok) {
        console.error(`Failed to fetch ${item.name}: ${response.statusText}`);
        continue;
      }

      const doctypeData: any = await response.json();

      if (!doctypeData?.data) {
        console.warn(`Skipping ${item.name}, missing 'data' field.`);
        continue;
      }

      // Determine the correct folder based on type
      const folderName =
        item.istable === 1
          ? "customChildDoctype"
          : item.issingle === 1
          ? "customSingleDoctype"
          : "parent";

      const folderPath = path.join(repoPath, "customDoctype", folderName);
      ensureDirectoryExists(folderPath);

      // Save full DocType details to JSON
      const jsonFileName = path.join(folderPath, `${item.name}.json`);
      fs.writeFileSync(jsonFileName, JSON.stringify(doctypeData.data, null, 2));

    } catch (error) {
      console.error(`Error processing ${item.name}:`, error);
    }
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
    
    const headers = new Headers({ Authorization: key });
    const requestOptions: RequestInit = { method: 'GET', headers, redirect: 'follow' };
    
    try {
      const clientScriptData = await fetchData(`${siteName}/api/resource/Client Script?fields=["*"]&limit_page_length=0`, requestOptions);
      await processClientScript(clientScriptData, repoPath);
      
      const serverScriptData = await fetchData(`${siteName}/api/resource/Server Script?fields=["*"]&limit_page_length=0`, requestOptions);
      await processServerScript(serverScriptData, repoPath);

      const reportData = await fetchData(`${siteName}/api/resource/Report?fields=["*"]&filters={\"is_standard\": \"No\", \"disabled\":0}&limit_page_length=0`, requestOptions);
      await processReportData(reportData, repoPath, siteName, requestOptions);

      const letterHeadData = await fetchData(`${siteName}/api/resource/Letter Head?fields=["*"]&filters={\"disabled\":0}&limit_page_length=0`, requestOptions);
      await processLetterHead(letterHeadData, repoPath, siteName, requestOptions);
      
      const printFormatData = await fetchData(`${siteName}/api/resource/Print Format?fields=["*"]&filters={\"standard\": \"No\", \"disabled\":0}&limit_page_length=0`, requestOptions);
      await processPrintFormat(printFormatData, repoPath, siteName, requestOptions);
      
      const propertySetterData = await fetchData(`${siteName}/api/resource/Property Setter?fields=["*"]&limit_page_length=0`, requestOptions);
      await processPropertySetter(propertySetterData, repoPath);
      
      const customFieldData = await fetchData(`${siteName}/api/resource/Custom Field?fields=["*"]&limit_page_length=0`, requestOptions);
      await processCustomField(customFieldData, repoPath);
      
      const customDoctypeData = await fetchData(`${siteName}/api/resource/DocType?fields=["*"]&filters={\"module\": \"Custom\"}&limit_page_length=0`, requestOptions);
      await processCustomDoctype(customDoctypeData, repoPath, siteName, requestOptions);
    } catch (error) {
      console.error('❌ Error:', error);
    }

    console.log('🎉 Repo hygiene completed successfully!');
  }
}
