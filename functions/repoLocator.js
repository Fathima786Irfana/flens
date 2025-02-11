import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Recursively search for a repository folder
function findRepoFolder(startPath, repoName, visitedPaths = new Set()) {
    if (!fs.existsSync(startPath)) return null;
  
    // Avoid re-checking the same path
    if (visitedPaths.has(startPath)) return null;
    visitedPaths.add(startPath);
  
    try {
        const topLevelDirs = fs.readdirSync(startPath)
          .filter(file => !file.startsWith('.')) // Ignore hidden directories
          .map(file => path.join(startPath, file))
          .filter(fullPath => fs.statSync(fullPath).isDirectory());
    
        // 🔹 **Prioritize direct match at the top level**
        for (const dir of topLevelDirs) {
          if (path.basename(dir) === repoName) {
            return dir; // ✅ Found repo at the top level
          }
        }
    
        // 🔹 **If not found, search recursively**
        for (const dir of topLevelDirs) {
          const found = findRepoFolder(dir, repoName);
          if (found) return found;
        }
        } catch (error) {
        console.warn(`⚠️ Error accessing ${startPath}: ${error.message}`);
        }
  
    return null;
  }

export function locateRepo(repoName) {
  const commonPaths = [
    process.cwd(),
    path.resolve(__dirname, '..'),
    os.homedir(),
    '/',
  ];

  for (const basePath of commonPaths) {
    console.log(`Searching for '${repoName}' in ${basePath}...`);
    const repoPath = findRepoFolder(basePath, repoName);
    if (repoPath) {
      console.log(`✅ Found '${repoName}' at: ${repoPath}`);
      return repoPath;
    }
  }

  console.error(`❌ Repository '${repoName}' not found.`);
  process.exit(1);
}
