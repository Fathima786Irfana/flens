import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import inquirer from 'inquirer';

// This is a function to extract the required versions of
// Frappe and Erpnext from the India Compliance app for
// their compactibility
export function fnExtractRequiredVersions(lPyFilePath: string, lSelectedMajor: string) {
    if (!fs.existsSync(lPyFilePath)) {
        console.log(`❌ File not found: ${lPyFilePath}`);
        return {};
    }
    let lContent = fs.readFileSync(lPyFilePath, 'utf-8');
  
    // Remove "v" from selectedMajor if present
    let lMajorVersion = lSelectedMajor.replace(/^v/, '');
  
    // Regex to match the app details part present in the
    // check_version_compatibility.py file
    let lVersionRegex = /"app_name":\s*"([^"]+)",\s*"current_version":[^}]+?"required_versions":\s*({[^}]+})/gs;
    let ldVersions: Record<string, string> = {};
  
    let laMatch;
    while ((laMatch = lVersionRegex.exec(lContent)) !== null) {
        let lAppName = laMatch[1]; // Extract app name
        let laVersionsDict = JSON.parse(laMatch[2].replace(/'/g, '"')); // Fix single quotes
  
        let lRequiredVersionKey = `version-${lMajorVersion}`;
  
        // Ensure the required_version starts with majorVersion
        if (laVersionsDict[lRequiredVersionKey] && laVersionsDict[lRequiredVersionKey].startsWith(lMajorVersion)) {
          ldVersions[lAppName] = laVersionsDict[lRequiredVersionKey];
        }
    }
    return ldVersions;
  }
  
  // Compare the tags selected for identifing the closer one
export function fnCompareVersions(v1: string, v2: string): number {
    let lParseVersion = (v: string) => v.replace(/^v/, '').split('.').map(Number);
    let [a1, a2, a3] = lParseVersion(v1);
    let [b1, b2, b3] = lParseVersion(v2);
    return a1 - b1 || a2 - b2 || a3 - b3; // Compare major, minor, patch
  }
  
  // Filter the tags based on the Date of ERPNExt or Frappe
export function fnGetClosestTag(lAppPath: string, lReferenceDate: Date): string | null {
    try {
      let lAllTags = execSync(`git -C ${lAppPath} tag --sort=-v:refname`, { encoding: 'utf-8' })
        .trim()
        .split('\n')
        .filter(tag => tag);
      let lClosestTag: string | null = null;
      let lClosestDateDiff = Infinity;
      for (let lTag of lAllTags) {
        let lTagDateStr = execSync(`git -C ${lAppPath} log -1 --format=%ai ${lTag}`, { encoding: 'utf-8' })
          .trim()
          .split(' ')[0];
        let lTagDate = new Date(lTagDateStr);
        let lDateDiff = lTagDate.getTime() - lReferenceDate.getTime();
  
        if (lDateDiff >= 0 && lDateDiff < lClosestDateDiff) { // Only future tags
          lClosestTag = lTag;
          lClosestDateDiff = lDateDiff;
        }
      }
      return lClosestTag;
    } catch (error: any) {
      console.error(`❌ Failed to get tags for ${lAppPath}: ${error.message}`);
      return null;
    }
  }
  // Ensure whether Apps repo exist in Locally or else clone it
export let fnEnsureRepoExists = (lAppUrl: string, lRepositoriesPath: string): { lAppName: string, lAppPath: string } => {
    let lAppName = path.basename(lAppUrl, '.git');
    let lAppPath = path.join(lRepositoriesPath, lAppName);
    if (!fs.existsSync(lAppPath)) {
      execSync(`git clone ${lAppUrl} ${lAppPath}`, { stdio: 'ignore' });
    } else {
      execSync(`git -C ${lAppPath} pull`, { stdio: 'ignore' });
    }
    return { lAppName, lAppPath }; // Return both appName and appPath
  };
  // Reead the apps present in the apps.json file
export let fnReadAppsJson = (lLensdockerPath: string): { url: string; branch: string }[] | null => {
    let lAppsJsonPath = path.join(lLensdockerPath, 'ci', 'apps.json');
    if (!fs.existsSync(lAppsJsonPath)) {
      console.log('❌ apps.json file not found.');
      return null;
    }
    return JSON.parse(fs.readFileSync(lAppsJsonPath, 'utf-8'));
  };
  // It checkout the lensdocker repo to the correct release brach we asked
export let fnCheckoutAndPullBranch = (lRepoPath: string, lBranch: string): void => {
    try {
      execSync(`git -C ${lRepoPath} checkout ${lBranch}`, { stdio: 'ignore' });
      execSync(`git -C ${lRepoPath} pull`, { stdio: 'ignore' });
    } catch (error: any) {
      console.error(`❌ Failed to checkout and pull branch "${lBranch}" in ${lRepoPath}: ${error.message}`);
    }
  };
  // It gets the date of the tag selected
export function fnGetTagDate(lRepoPath: string, lVersion: string): Date | null {
    try {
      let lTagDateStr = execSync(
        `git -C ${lRepoPath} log -1 --format=%ai ${lVersion}`,
        { encoding: 'utf-8' }
      )
        .trim()
        .split(' ')[0];
  
      return new Date(lTagDateStr);
    } catch (error: any) {
      console.error(`❌ Failed to get date for Frappe version ${lVersion}: ${error.message}`);
      return null;
    }
  }
  // Display the apps and its tag in the terminal.
export function fnDisplayAppTags(appTags: Record<string, string>): void {
    if (Object.keys(appTags).length > 0) {
      Object.entries(appTags).forEach(([app, tag]) => {
        console.log(`🔹 ${app}: ${tag}`);
      });
    }
  }

export async function fnPromptUser(lUpgradeDate: string, lDayLimit: number, lAppPath: string, lMajorVersion: string, lAppName: string) {
    let lSelectedTag = '';
    let lSelectedDate = '';
    let lDiffDays = 0;
    let lDirection = "";
    let lAnswer: any ;
    
    if (lAppName === 'frappe') {
      // Prompt user for confirmation
      lAnswer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'lUseLatestTag',
          message: `⚠️ No tag found for Frappe for the exact date of ERPNext. Do you want to proceed with the latest available tag to the date as Possible?`,
          default: false,
        },
      ]);
    }
    else {
      // Prompt user for confirmation
      lAnswer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'lUseLatestTag',
          message: `⚠️ No tag found for date ${lUpgradeDate} or within ${lDayLimit} days for major version ${lMajorVersion} of app ${lAppName}. Do you want to proceed with the latest available tag to the date as Possible?`,
          default: false,
        },
      ]);
    }
  
    if (!lAnswer.lUseLatestTag) {
      console.log('❌ Exiting the process. No version is selected');
      process.exit(1);
    }
  
    // Fetch all tags matching the major version pattern
    let lLastTags = execSync(`git -C ${lAppPath} tag --list "${lMajorVersion}.*"`, { encoding: 'utf-8' })
      .trim()
      .split('\n');
  
    if (lLastTags.length === 0) {
      console.log('❌ No tags found in repository.');
      process.exit(1);
    }
  
    // Find the closest tag AFTER the upgrade date
    for (let lTag of lLastTags) {
      let lTagDateStr = execSync(`git -C ${lAppPath} log -1 --format=%ai ${lTag}`, { encoding: 'utf-8' })
        .trim()
        .split(' ')[0];
      let lTagDate = new Date(lTagDateStr);
      // Calculate the difference in days
      let lTimeDiff = lTagDate.getTime() - new Date(lUpgradeDate).getTime();
      let tempDiffDays = Math.ceil(Math.abs(lTimeDiff) / (1000 * 60 * 60 * 24)); // Convert ms to days
      let tempDirection = lTimeDiff > 0 ? "after" : "before"; // Determine if it's before or after
      // Check if this tag is the closest one AFTER the upgrade date
      if (!lSelectedTag || Math.abs(lTagDate.getTime() - new Date(lUpgradeDate).getTime()) < Math.abs(new Date(lSelectedDate!).getTime() - new Date(lUpgradeDate).getTime())) {
        lSelectedTag = lTag;
        lSelectedDate = lTagDateStr;
        lDiffDays = tempDiffDays;
        lDirection = tempDirection;
      }
    }
  
    // If no tag is selected, exit
    if (!lSelectedTag) {
      console.log('❌ No valid tag found.');
      process.exit(1);
    }
    
    // Store the selected tag in the object
    let ldTagData: { [lKey: string]: { lTag: string, lDate: string } } = {};
    ldTagData[lAppName] = { lTag: `${lSelectedTag} - This tag is ${lDiffDays} day(s) ${lDirection} the asked update date ${lUpgradeDate}`, lDate: lSelectedDate };
  
    return ldTagData[lAppName];
  }