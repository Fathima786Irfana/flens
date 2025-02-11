import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

export async function fetchAndSaveData(doctype, repoFolder, endpoint, key) {
  if (!endpoint) {
    console.error(`No endpoint found for doctype: ${doctype}`);
    return;
  }

  const fetchUrl = `${endpoint}?fields=["*"]&limit_page_length=0`;
  console.log(`Fetching data from: ${fetchUrl}`);

  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const response = await fetch(fetchUrl, {
      headers: { Authorization: `${key}` }
    });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

    const data = await response.json();
    if (!data || !data.data || !Array.isArray(data.data)) {
      console.error(`Invalid or empty data received for ${doctype}.`);
      return;
    }

    data.data.forEach(documentDetails => {
      let folderPath, scriptFileName, metaFileName;

      switch (doctype) {
        case 'Client Script':
          folderPath = path.join(repoFolder, 'clientScript', documentDetails.dt);
          scriptFileName = path.join(folderPath, `${documentDetails.name}.js`);
          metaFileName = path.join(folderPath, `${documentDetails.name}.meta`);
          break;
        
        case 'Server Script':
          folderPath = path.join(repoFolder, 'serverScript', documentDetails.script_type);
          scriptFileName = path.join(folderPath, `${documentDetails.name}.py`);
          metaFileName = path.join(folderPath, `${documentDetails.name}.meta`);
          break;

        default:
          folderPath = path.join(repoFolder, doctype.replace(/\s+/g, '_'));
          scriptFileName = path.join(folderPath, `${documentDetails.name}.json`);
          break;
      }

      fs.mkdirSync(folderPath, { recursive: true });

      // Save metadata
      const metaData = { ...documentDetails };
      delete metaData.script;
      fs.writeFileSync(metaFileName, JSON.stringify(metaData, null, 2));

      // Save script
      if (documentDetails.script) {
        fs.writeFileSync(scriptFileName, documentDetails.script);
      }

      console.log(`Saved ${doctype} data at ${folderPath}`);
    });

  } catch (error) {
    console.error(`Error fetching ${doctype}:`, error.message);
  }
}
