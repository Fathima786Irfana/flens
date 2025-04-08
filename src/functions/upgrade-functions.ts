import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';

/**
 * Prompt the user to confirm using the closest available tag when an exact or in-range tag isn't found.
 * 
 * @param iAppName - Name of the app for which the tag is being determined.
 * @param iOriginalDate - Original expected release date of the tag.
 * @param iEndDate - End of the acceptable date range (used when tag falls after the range).
 * @param iClosestTag - Closest available tag to the expected date.
 * @param iClosestDate - Date associated with the closest tag.
 * @param iBasedApp - (Optional) Reference app name that this app's tag is based on.
 */
async function fnPromptClosestTagConfirmation(
  iAppName: string,
  iOriginalDate: Date | string,
  iEndDate: Date | string,
  iClosestTag: string,
  iClosestDate: string,
  iBasedApp?: string
): Promise<void> {
  // Convert input dates to Date objects for comparison
  const LBaseDate = new Date(iOriginalDate);
  const LFallbackDate = new Date(iClosestDate);
  // Calculate absolute difference in days between original date and fallback tag date
  const LAbsDays = Math.ceil(
    Math.abs(LFallbackDate.getTime() - LBaseDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  // Determine if the fallback tag is before or after the original date
  const LBeforeOrAfter = LFallbackDate > LBaseDate ? 'after' : 'before';

  let lMessage = '';

  // Construct the confirmation message
  if (iBasedApp) {
    if (LBeforeOrAfter === 'before') {
      lMessage = `Since ${iAppName} has no tag greater than ${iBasedApp} tag date (${iOriginalDate
        .toString()
        .slice(0, 10)}). Found closest tag '${iClosestTag}' at ${iClosestDate}, which is ${LAbsDays} day(s) ${LBeforeOrAfter} ${iBasedApp}.`;
    } else {
      lMessage = `Since ${iAppName} tag is found after the range of ${iOriginalDate
        .toString()
        .slice(0, 10)} to ${iEndDate.toString().slice(0, 10)}. Found closest tag '${iClosestTag}' at ${iClosestDate}, which is ${LAbsDays} day(s) after ${iBasedApp}.`;
    }
  } else {
    lMessage = `Since ${iAppName} tag is not found at ${iOriginalDate
      .toString()
      .slice(0, 10)} or within the range of ${iOriginalDate
      .toString()
      .slice(0, 10)} to ${iEndDate.toString().slice(0, 10)}. Found closest tag '${iClosestTag}' at ${iClosestDate}, which is ${LAbsDays} day(s) ${LBeforeOrAfter} ${iOriginalDate
      .toString()
      .slice(0, 10)}.`;
  }
  // Prompt the user to confirm whether to proceed with the fallback tag
  const LAnswer = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'useFallback',
      message: `${lMessage} Do you want to go with this?\n`,
      default: false
    }
  ]);
  // Exit if user chooses not to proceed
  if (!LAnswer.useFallback) {
    console.log('❌ Exiting as per user choice.');
    process.exit(1);
  }
}

/**
 * Fetches the list of app names defined in a release group's `apps.json` file from the lensdocker repo.
 * 
 * @param iReleaseGroupName - Name of the release group branch to fetch app names from.
 * @returns List of app names as strings.
 */
export function fnFetchAppNamesFromReleaseGroup(iReleaseGroupName: string): string[] {
  // Define the GitHub repo URL
  const LRepoUrl = 'https://github.com/lmnaslimited/lensdocker.git';
  // Determine user's home directory, fallback to '/tmp' if not available
  const LHomeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
  // Set up local path to clone or update the repository
  const LRepositoriesPath = path.join(LHomeDir, 'repositories');
  const LLocalPath = path.join(LRepositoriesPath, 'lensdocker');

  // Clone the repository if it doesn't exist locally, else fetch latest changes
  if (!fs.existsSync(LLocalPath)) {
    execSync(`git clone ${LRepoUrl} ${LLocalPath}`, { stdio: 'ignore' });
  } else {
    execSync(`git -C ${LLocalPath} fetch`, { stdio: 'ignore' });
  }

  // Checkout the specified release group branch
  execSync(`git -C ${LLocalPath} checkout ${iReleaseGroupName}`, { stdio: 'ignore' });

  // Read apps.json
  const LAppsJsonPath = path.join(LLocalPath, 'ci', 'apps.json');
  if (!fs.existsSync(LAppsJsonPath)) {
    throw new Error(`❌ apps.json not found at ${LAppsJsonPath}`);
  }
  // Read and parse the apps.json file
  const LAppsContent = fs.readFileSync(LAppsJsonPath, 'utf-8');
  const LApps = JSON.parse(LAppsContent);

  // Extract app names from the Url field in apps.json
  const LaAppNames = LApps
    .map((lApp: { url: string }) => {
      const LParts = lApp.url.split('/');
      return LParts[LParts.length - 1]?.replace('.git', '');
    })
    .filter(Boolean); // Remove any undefined or empty entries

  // Ensure 'frappe' is included in the app list (prepend if missing)
  if (!LaAppNames.includes('frappe')) {
    LaAppNames.unshift('frappe');
  }

  return LaAppNames;
}

/**
 * Fetches the closest matching India Compliance tag and its commit date based on a target date,
 * and extracts required app versions from the check_version_compatibility.py file.
 *
 * @param iDate - The base date to start checking from (usually ERPNext tag date).
 * @param iSelectedVersion - Version string (e.g., v15).
 * @param iReleaseName - Release group name to determine prompt tone.
 * @returns Object with selected tag, tag date, and required versions from the Python file.
 */
export async function fnFetchIndiaComplianceTagAndDate(iDate: string, iSelectedVersion: string, iReleaseName: string) {
  const LRepoUrl = 'https://github.com/resilient-tech/india-compliance.git';
  const LStartDate = new Date(iDate);
  const LEndDate = new Date(LStartDate);
  LEndDate.setDate(LStartDate.getDate() + 20); // Define end of search window (20 days ahead)
  let lHomeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
  let lRepositoriesPath = path.join(lHomeDir, 'repositories');
  // Ensure repositories directory exists
  if (!fs.existsSync(lRepositoriesPath)) {
    fs.mkdirSync(lRepositoriesPath, { recursive: true });
  }
  const LTempDir = path.join(lRepositoriesPath, 'india-compliance');

  try {
   // 🔹 1. Clone or pull latest from india-compliance repo
    if (!fs.existsSync(LTempDir)) {
      execSync(`git clone ${LRepoUrl} ${LTempDir}`, { stdio: 'ignore' });
    } else {
      execSync(`git -C ${LTempDir} pull`, { stdio: 'ignore' });
    }

    // 🔹 2. Get all available tags
    const LaTagsOutput = execSync(`git -C ${LTempDir} tag`, { encoding: 'utf-8' });

    // 🔹 3. Filter tags that match the selected major version (e.g., v15.x.x)
    const LVersionRegex = new RegExp(`^v${iSelectedVersion.replace('v', '')}\\.\\d+\\.\\d+$`);
    const LaIndiaComplianceTags = LaTagsOutput
      .split('\n')
      .map(tag => tag.trim())
      .filter(tag => LVersionRegex.test(tag));

    if (LaIndiaComplianceTags.length === 0) {
      console.log(`❌ No india_compliance tags found for ${iSelectedVersion}.`);
      return;
    }

    // 🔹 4. Try to find a tag within the desired date range
    let lSelectedTag: string | null = null;
    let lSelectedDate: string | null = null;
    let lClosestTag: string | null = null;
    let lClosestDate: string | null = null;
    for (let lTag of LaIndiaComplianceTags) {
      try {
        // Get commit date for tag
        const LCommitDateOutput = execSync(`git -C ${LTempDir} log -1 --format=%ci ${lTag}`, { encoding: 'utf-8' }).trim().split(' ')[0];
        const LCommitDate = new Date(LCommitDateOutput);

        if (LCommitDate >= LStartDate && LCommitDate <= LEndDate) {
          lSelectedTag = lTag;
          lSelectedDate = LCommitDateOutput;
          break;
        }
        // Track the closest tag before start date as fallback
        if (LCommitDate < LStartDate) {
          if (!lClosestDate || LCommitDate > new Date(lClosestDate)) {
            lClosestTag = lTag;
            lClosestDate = LCommitDateOutput.slice(0, 10); // Format: YYYY-MM-DD
          }
        }
      } catch (error) {
        console.warn(`⚠️ Warning: Could not fetch commit date for tag ${lTag}. Skipping...`);
      }
    }
    // 🔹 5. If no tag in range, prompt user for fallback with the closest tag
    if (!lSelectedTag && lClosestTag) {
      const lDaysDiff = Math.floor((new Date(lClosestDate!).getTime() - LStartDate.getTime()) / (1000 * 60 * 60 * 24));
      const lBeforeOrAfter = lDaysDiff < 0 ? 'before' : 'after';
      const lAbsDays = Math.abs(lDaysDiff);

      // Prompt message varies if release is ending with '-ind'
      let lPromptMessage = '';

      if (iReleaseName.endsWith('-ind')) {
        console.log(`⚠️ India Compliance app has no tag at ${iDate} or within the range of ${iDate} to ${LEndDate.toISOString().slice(0, 10)}.`);
        console.log(`👉 Found closest tag '${lClosestTag}' at ${lClosestDate}, which is ${lAbsDays} day(s) ${lBeforeOrAfter} ${iDate}.`);
        lPromptMessage = `Do you want to proceed with the closest tag '${lClosestTag}'?`;
      } else {
        lPromptMessage = `Since Deciding app India Compliance is not found at ${iDate} or within the range of ${iDate} to ${LEndDate.toISOString().slice(0, 10)}.
          \nFound closest tag '${lClosestTag}' at ${lClosestDate}, which is ${lAbsDays} day(s) ${lBeforeOrAfter} ${iDate}.
          \nDo you want to go with this?`;
      }
      // Ask user for confirmation to use closest tag
      const { LProceedWithClosest } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'LProceedWithClosest',
          message: lPromptMessage,
          default: false,
        },
      ]);

      if (!LProceedWithClosest) {
        console.log('🚫 Exiting without selecting a tag.');
        process.exit(1);
      }
      // Assign fallback values
      lSelectedTag = lClosestTag;
      lSelectedDate = lClosestDate;
    }
    // Final safety check: if still no tag selected, exit
    if (!lSelectedTag) {
      console.log(`❌ No matching india_compliance tag found for ${iSelectedVersion} within the given date or after 20 days.`);
      return;
    }

    // 🔹 6. Parse check_version_compatibility.py file for required versions
    let lPyFilePath = path.join(LTempDir, 'india_compliance/patches/check_version_compatibility.py');
    let lContent = fs.readFileSync(lPyFilePath, 'utf-8');
  
    // Remove "v" from selectedMajor if present
    let lMajorVersion = iSelectedVersion.replace(/^v/, '');
  
    // Regex to match the app details part present in the
    // check_version_compatibility.py file
    let lVersionRegex = /"app_name":\s*"([^"]+)",\s*"current_version":[^}]+?"required_versions":\s*({[^}]+})/gs;
    let LdRequiredVersions: Record<string, string> = {};
  
    let laMatch;
    while ((laMatch = lVersionRegex.exec(lContent)) !== null) {
        let lAppName = laMatch[1]; // Extract app name
        let laVersionsDict = JSON.parse(laMatch[2].replace(/'/g, '"')); // Fix single quotes
  
        let lRequiredVersionKey = `version-${lMajorVersion}`;
  
        // Ensure the required_version starts with majorVersion
        if (laVersionsDict[lRequiredVersionKey] && laVersionsDict[lRequiredVersionKey].startsWith(lMajorVersion)) {
            LdRequiredVersions[lAppName] = laVersionsDict[lRequiredVersionKey];
        }
    }
    // 🔹 Return final tag info and version mapping
    return { lSelectedTag, lSelectedDate, LdRequiredVersions };
  } catch (error: unknown) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    return null;
  }
}

/**
 * Finds the closest ERPNext tag within a valid date range based on:
 * - selectedVersion: major version (e.g., v15)
 * - requiredERPNextVersion: Found from India Compliance repo
 * - indiaComplianceDate: to ensure compatibility window
 *
 * @returns The closest valid ERPNext tag and its date, or null if none found
 */
export async function fnFindERPNextTagBetweenDates(
  iFlagsDate: string,
  iSelectedVersion: string,
  iRequiredERPNextVersion: string,
  iIndiaComplianceDate: string,
): Promise<{ lTag: string; lDate: string } | null>  {
  const LRepoUrl = 'https://github.com/frappe/erpnext.git';
  const LHomeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
  const LRepositoriesPath = path.join(LHomeDir, 'repositories');
  const LLocalPath = path.join(LRepositoriesPath, 'erpnext');
  const LUserDate = new Date(iFlagsDate);
  const LComplianceDate = new Date(iIndiaComplianceDate);

  // Define date range for selecting a valid ERPNext tag
  let lStartDate: Date;
  let lEndDate: Date;

  if (LUserDate < LComplianceDate) {
    // Case 1: ERPNext tag must be from any point in time up to compliance date
    lStartDate = new Date(0); // epoch
    lEndDate = LComplianceDate;
  } else {
    // Case 2: ERPNext tag must be from [complianceDate - 7 days] to complianceDate
    lEndDate = LComplianceDate;
    lStartDate = new Date(LComplianceDate);
    lStartDate.setDate(lEndDate.getDate() - 7);
  }

  // 🔹 Clone or update the erpnext repo
  if (!fs.existsSync(LLocalPath)) {
    execSync(`git clone ${LRepoUrl} ${LLocalPath}`, { stdio: 'ignore' });
  } else {
    execSync(`git -C ${LLocalPath} fetch --tags`, { stdio: 'ignore' });
  }

  // 🔹 Extract all tags matching the selected major version (e.g., v15.x.x)
  const LaTagListOutput = execSync(`git -C ${LLocalPath} tag`, { encoding: 'utf-8' });
  const LaAllTags = LaTagListOutput
    .split('\n')
    .map(lTag => lTag.trim())
    .filter(lTag => new RegExp(`^${iSelectedVersion.replace('v', 'v')}\\.\\d+\\.\\d+$`).test(lTag));

  // Track closest valid tag within range
  let lClosestTag: string | null = null;
  let lClosestDate: string | null = null;
  let lSmallestDiff = Infinity;

  // Fallback: latest tag before compliance date (if no tag found in range)
  let lClosestBeforeComplianceTag: string | null = null;
  let lClosestBeforeComplianceDate: string | null = null;
  let lLatestTimeBeforeCompliance = 0;

  // 🔹 Iterate through matching tags to find the best one
  for (let lTag of LaAllTags) {
    // Skip tags that are not greater than current ERPNext version
    if (!fnIsVersionGreater(lTag, iRequiredERPNextVersion)) continue;

    try {
      // Get the commit date of the tag
      const LTagDateStr = execSync(`git -C ${LLocalPath} log -1 --format=%ci ${lTag}`, {
        encoding: 'utf-8'
      }).trim();
      const LTagDate = new Date(LTagDateStr);

      // Tag is within valid range: prefer closest to complianceDate
      if (LTagDate >= lStartDate && LTagDate <= lEndDate) {
        const LDiff = Math.abs(LTagDate.getTime() - LComplianceDate.getTime());
        if (LDiff < lSmallestDiff) {
          lClosestTag = lTag;
          lClosestDate = LTagDateStr.slice(0, 10); // Format: YYYY-MM-DD
          lSmallestDiff = LDiff;
        }
      }
      // Fallback: latest tag before compliance date
      if (LTagDate < LComplianceDate && LTagDate.getTime() > lLatestTimeBeforeCompliance) {
        lClosestBeforeComplianceTag = lTag;
        lClosestBeforeComplianceDate = LTagDateStr.slice(0, 10);
        lLatestTimeBeforeCompliance = LTagDate.getTime();
      }
    } catch (err) {
      console.warn(`⚠️ Failed to get date for tag ${lTag}. Skipping...`);
    }
  }

  // Primary condition: return tag found within preferred range
  if (lClosestTag && lClosestDate) {
    return { lTag: lClosestTag, lDate: lClosestDate };
  } else {
    // Fallback: confirm with user before using tag before compliance date
    if (lClosestBeforeComplianceTag && lClosestBeforeComplianceDate) {
        await fnPromptClosestTagConfirmation('ERPNext', lStartDate, lEndDate,
          lClosestBeforeComplianceTag, lClosestBeforeComplianceDate
        );
      return { lTag: lClosestBeforeComplianceTag, lDate: lClosestBeforeComplianceDate };
    }
    return null;
  }
}

// Frappe logic
export async function fnFindFrappeTagBeforeERPNextDate(
  iErpnextDate: string,
  iSelectedVersion: string,
  iRequiredFrappeVersion: string
): Promise<{ lTag: string; lDate: string } | null>  {
  const LRepoUrl = 'https://github.com/frappe/frappe.git';
  const LHomeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
  const LRepositoriesPath = path.join(LHomeDir, 'repositories');
  const LLocalPath = path.join(LRepositoriesPath, 'frappe');

  const LTargetDate = new Date(iErpnextDate);
  const LStartDate = new Date(LTargetDate);
  LStartDate.setDate(LTargetDate.getDate() - 7);

  // Clone or update the repo
  if (!fs.existsSync(LLocalPath)) {
    execSync(`git clone ${LRepoUrl} ${LLocalPath}`, { stdio: 'ignore' });
  } else {
    execSync(`git -C ${LLocalPath} fetch --tags`, { stdio: 'ignore' });
  }

  // Get all matching tags
  const LaTagListOutput = execSync(`git -C ${LLocalPath} tag`, { encoding: 'utf-8' });
  const LaAllTags = LaTagListOutput
    .split('\n')
    .map(lTag => lTag.trim())
    .filter(lTag => new RegExp(`^${iSelectedVersion.replace('v', 'v')}\\.\\d+\\.\\d+$`).test(lTag));

  let lSelectedTag: string | null = null;
  let lSelectedDate: string | null = null;
  let lClosestDiff = Infinity;

  let lClosestBeforeErpnextTag: string | null = null;
  let lClosestBeforeErpnextDate: string | null = null;
  let lLatestTimeBeforeErpnext = 0;

  for (let lTag of LaAllTags) {
    if (!fnIsVersionGreater(lTag, iRequiredFrappeVersion)) continue;

    try {
      const LTagDateStr = execSync(`git -C ${LLocalPath} log -1 --format=%ci ${lTag}`, {
        encoding: 'utf-8'
      }).trim();
      const LTagDate = new Date(LTagDateStr);

      if (LTagDate <= LTargetDate && LTagDate >= LStartDate) {
        const diff = Math.abs(LTagDate.getTime() - LTargetDate.getTime());
        if (diff < lClosestDiff) {
          lSelectedTag = lTag;
          lSelectedDate = LTagDateStr.slice(0, 10);
          lClosestDiff = diff;
        }
      }
      // Keep track of latest tag before Erpnext (fallback)
      if (LTagDate < LTargetDate && LTagDate.getTime() > lLatestTimeBeforeErpnext) {
        lClosestBeforeErpnextTag = lTag;
        lClosestBeforeErpnextDate = LTagDateStr.slice(0, 10);
        lLatestTimeBeforeErpnext = LTagDate.getTime();
      }
    } catch (err) {
      console.warn(`⚠️ Failed to get date for tag ${lTag}. Skipping...`);
    }
  }

  if (lSelectedTag && lSelectedDate) {
    return { lTag: lSelectedTag, lDate: lSelectedDate };
  } else {
    if (lClosestBeforeErpnextTag && lClosestBeforeErpnextDate) {
      await fnPromptClosestTagConfirmation('Frappe', LStartDate, LTargetDate,
        lClosestBeforeErpnextTag, lClosestBeforeErpnextDate
      );
      return { lTag: lClosestBeforeErpnextTag, lDate: lClosestBeforeErpnextDate };
    }
    return null;
  }
}


/**
 * Compare two semantic version strings (e.g., v15.4.2 > v15.2.9)
 *
 * @param v1 - First version (e.g., "v15.4.2")
 * @param v2 - Second version (e.g., "v15.2.9")
 * @returns true if v1 is greater than v2, otherwise false
 */
function fnIsVersionGreater(v1: string, v2: string): boolean {
  // Remove "v" prefix and split version into parts [major, minor, patch]
  const parse = (v: string) => v.replace(/^v/, '').split('.').map(n => parseInt(n, 10));
  const [a1, a2, a3] = parse(v1); // Parsed components of v1
  const [b1, b2, b3] = parse(v2); // Parsed components of v2
  // Compare major version
  if (a1 !== b1) return a1 > b1;
  // Compare minor version
  if (a2 !== b2) return a2 > b2;
  // Compare patch version
  return a3 > b3;
}

export async function fnFindAppTagAfterERPNextDate(
  iAppName: string,
  iErpnextDate: string,
  iSelectedVersion: string
): Promise<{ lTag: string; lDate: string } | null> {
  const LRepoUrl = 'https://github.com/frappe/lms.git';
  const LHomeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
  const LRepositoriesPath = path.join(LHomeDir, 'repositories');
  const LLocalPath = path.join(LRepositoriesPath, 'lms');

  const LBaseDate = new Date(iErpnextDate);
  const LBaseDateStr = iErpnextDate; // 'YYYY-MM-DD' format
  const LEndDate = new Date(LBaseDate);
  LEndDate.setDate(LBaseDate.getDate() + 20);

  // Clone or update
  if (!fs.existsSync(LLocalPath)) {
    execSync(`git clone ${LRepoUrl} ${LLocalPath}`, { stdio: 'ignore' });
  } else {
    execSync(`git -C ${LLocalPath} fetch --tags`, { stdio: 'ignore' });
  }

  // Handle special case for "payments" app
  if (iAppName === 'payments') {
    let lTag = iSelectedVersion === 'v14' ? 'version-14' : 'version-15';
    return { lTag, lDate: '' };
  }

  // Handle special case for "lens_pdf-on-submit" app
  if (iAppName === 'lens_pdf-on-submit') {
    let lTag = 'workflow-v1';
    return { lTag, lDate: '' };
  }

  // Main logic for LMS app
  if (iAppName === 'lms') {
    // Get list of all tags
    const LaTagListOutput = execSync(`git -C ${LLocalPath} tag`, { encoding: 'utf-8' });
    const LaAllTags = LaTagListOutput.split('\n').map(lTag => lTag.trim()).filter(Boolean);
  
    // Initialize containers for tag candidates
    let ldWithinRange: { lTag: string; lDate: string; lDiff: number } | null = null;
    let ldClosestAfter: { lTag: string; lDate: string; lDiff: number } | null = null;
    let ldClosestBefore: { lTag: string; lDate: string; lDiff: number } | null = null;
  
    for (let lTag of LaAllTags) {
      try {
        // Get tag date
        const LTagDateStr = execSync(`git -C ${LLocalPath} log -1 --format=%ci ${lTag}`, {
          encoding: 'utf-8',
        }).trim();
        const LTagDate = new Date(LTagDateStr);
        const LTagDateOnly = LTagDateStr.slice(0, 10); // just 'YYYY-MM-DD'
        const LTimeDiff = LTagDate.getTime() - LBaseDate.getTime();
  
        // Check if tag is within +20 day range
        if (LTagDateOnly > LBaseDateStr && LTagDateOnly <= LEndDate.toISOString().slice(0, 10)) {
          // Strictly after baseDate and within +20 days
          if (!ldWithinRange || LTimeDiff < ldWithinRange.lDiff) {
            ldWithinRange = { lTag, lDate: LTagDateStr.slice(0, 10), lDiff: LTimeDiff };
          }
        } else if (LTagDateOnly > LEndDate.toISOString().slice(0, 10)) {
          // Save closest tag after +20 day window
          if (!ldClosestAfter || LTimeDiff < ldClosestAfter.lDiff) {
            ldClosestAfter = { lTag, lDate: LTagDateStr.slice(0, 10), lDiff: LTimeDiff };
          }
        } else if (LTagDateOnly < LBaseDateStr) {
          // Save closest tag before ERPNext date
          const LBeforeDiff = LBaseDate.getTime() - LTagDate.getTime();
          if (!ldClosestBefore || LBeforeDiff < ldClosestBefore.lDiff) {
            ldClosestBefore = { lTag, lDate: LTagDateStr.slice(0, 10), lDiff: LBeforeDiff };
          }
        }
      } catch (err) {
        console.warn(`⚠️ Failed to get date for tag ${lTag}. Skipping...`);
      }
    }
  
    // Prioritize tag in range, then closest after, then closest before
    if (ldWithinRange) return { lTag: ldWithinRange.lTag, lDate: ldWithinRange.lDate };
    if (ldClosestAfter) {
      await fnPromptClosestTagConfirmation(iAppName, LBaseDateStr, LEndDate,
        ldClosestAfter.lTag, ldClosestAfter.lDate, 'ERPNext'
      );
      return { lTag: ldClosestAfter.lTag, lDate: ldClosestAfter.lDate };
    } 
    if (ldClosestBefore) {
      await fnPromptClosestTagConfirmation(iAppName, LBaseDateStr, LEndDate,
        ldClosestBefore.lTag, ldClosestBefore.lDate, 'ERPNext'
      );
      return { lTag: ldClosestBefore.lTag, lDate: ldClosestBefore.lDate };
    }
  } 
  // Logic for HRMS and Education
  else if(iAppName === 'hrms' || iAppName === 'education') {
    const LRepoUrl = `https://github.com/frappe/${iAppName}.git`;
    const LHomeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
    const LRepositoriesPath = path.join(LHomeDir, 'repositories');
    const LLocalPath = path.join(LRepositoriesPath, iAppName);

    const LBaseDate = new Date(iErpnextDate);
    const LEndDate = new Date(LBaseDate);

    // App-specific date ranges
    if (iAppName === 'hrms') {
      LEndDate.setDate(LBaseDate.getDate() + 15);
    } else if (iAppName === 'education') {
      LEndDate.setDate(LBaseDate.getDate() + 31);
    } else {
      LEndDate.setDate(LBaseDate.getDate() + 20); // default range
    }

    // Clone or update repo
    if (!fs.existsSync(LLocalPath)) {
      execSync(`git clone ${LRepoUrl} ${LLocalPath}`, { stdio: 'ignore' });
    } else {
      execSync(`git -C ${LLocalPath} fetch --tags`, { stdio: 'ignore' });
    }

    // Filter tags by version
    const LaTagListOutput = execSync(`git -C ${LLocalPath} tag`, { encoding: 'utf-8' });
    const LaAllTags = LaTagListOutput
      .split('\n')
      .map(lTag => lTag.trim())
      .filter(tag => tag.startsWith(iSelectedVersion));

    let ldWithinRange: { lTag: string; lDate: string; lDiff: number } | null = null;
    let ldClosestAfter: { lTag: string; lDate: string; lDiff: number } | null = null;
    let ldClosestBefore: { lTag: string; lDate: string; lDiff: number } | null = null;

    for (let lTag of LaAllTags) {
      try {
        const LTagDateStr = execSync(`git -C ${LLocalPath} log -1 --format=%ci ${lTag}`, {
          encoding: 'utf-8',
        }).trim();
        const LTagDate = new Date(LTagDateStr);
        const LTimeDiff = LTagDate.getTime() - LBaseDate.getTime();

        // Categorize tag
        if (LTagDate > LBaseDate && LTagDate <= LEndDate) {
          if (!ldWithinRange || LTimeDiff < ldWithinRange.lDiff) {
            ldWithinRange = { lTag, lDate: LTagDateStr.slice(0, 10), lDiff: LTimeDiff };
          }
        } else if (LTagDate > LBaseDate) {
          if (!ldClosestAfter || LTimeDiff < ldClosestAfter.lDiff) {
            ldClosestAfter = { lTag, lDate: LTagDateStr.slice(0, 10), lDiff: LTimeDiff };
          }
        } else if (LTagDate < LBaseDate) {
          const LBeforeDiff = LBaseDate.getTime() - LTagDate.getTime();
          if (!ldClosestBefore || LBeforeDiff < ldClosestBefore.lDiff) {
            ldClosestBefore = { lTag, lDate: LTagDateStr.slice(0, 10), lDiff: LBeforeDiff };
          }
        }
      } catch (err) {
        console.warn(`⚠️ Failed to get date for tag ${lTag}. Skipping...`);
      }
    }

    // Prioritize best match
    if (ldWithinRange) return { lTag: ldWithinRange.lTag, lDate: ldWithinRange.lDate };
    if (ldClosestAfter) {
      await fnPromptClosestTagConfirmation(iAppName, LBaseDateStr, LEndDate,
        ldClosestAfter.lTag, ldClosestAfter.lDate, 'ERPNext'
      );
      return { lTag: ldClosestAfter.lTag, lDate: ldClosestAfter.lDate };
    } 
    if (ldClosestBefore) {
      await fnPromptClosestTagConfirmation(iAppName, LBaseDateStr, LEndDate,
        ldClosestBefore.lTag, ldClosestBefore.lDate, 'ERPNext'
      );
      return { lTag: ldClosestBefore.lTag, lDate: ldClosestBefore.lDate };
    }
    }
  return null;
}

export async function fnFindFrappeBasedAppTag(
  iAppName: string,
  iFrappeDate: string,
): Promise<{ lTag: string; lDate: string } | null> {
  // Allow only supported Frappe-based apps
  const LaAllowedApps = ['crm', 'frappe_whatsapp', 'insights', 'helpdesk'];
  if (!LaAllowedApps.includes(iAppName)) return null;

  // Determine Git repo URL based on app
  const LRepoUrl =
    iAppName === 'frappe_whatsapp'
      ? 'https://github.com/shridarpatil/frappe_whatsapp.git'
      : `https://github.com/frappe/${iAppName}.git`;

  // Setup local path to clone or pull the repo
  const LHomeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
  const LRepositoriesPath = path.join(LHomeDir, 'repositories');
  const LLocalPath = path.join(LRepositoriesPath, iAppName);

  // Define date range: Frappe date to +N days (N depends on app)
  const LBaseDate = new Date(iFrappeDate);
  const LBaseDateStr = iFrappeDate;
  const LEndDate = new Date(LBaseDate);

  // Each app has its own number of buffer days to find the tag
  const ldDayMap: { [key: string]: number } = {
    crm: 12,
    insights: 20,
    frappe_whatsapp: 30,
    helpdesk: 31,
  };
  const LDaysToAdd = ldDayMap[iAppName];
  LEndDate.setDate(LBaseDate.getDate() + LDaysToAdd);

  // Clone the repo if it doesn't exist, else just fetch latest tags
  if (!fs.existsSync(LLocalPath)) {
    execSync(`git clone ${LRepoUrl} ${LLocalPath}`, { stdio: 'ignore' });
  } else {
    execSync(`git -C ${LLocalPath} fetch --tags`, { stdio: 'ignore' });
  }

  // Fetch all available tags in the repo
  const LaTagListOutput = execSync(`git -C ${LLocalPath} tag`, { encoding: 'utf-8' });
  const LaAllTags = LaTagListOutput
    .split('\n')
    .map(lTag => lTag.trim())
    .filter(Boolean);

  // Initialize placeholders for tag candidates
  let ldWithinRange: { lTag: string; lDate: string; lDiff: number } | null = null;
  let ldClosestAfter: { lTag: string; lDate: string; lDiff: number } | null = null;
  let ldClosestBefore: { lTag: string; lDate: string; lDiff: number } | null = null;

  // Loop through tags to find the most appropriate one
  for (let lTag of LaAllTags) {
    try {
      // Get date of tag creation
      const LTagDateStr = execSync(`git -C ${LLocalPath} log -1 --format=%ci ${lTag}`, {
        encoding: 'utf-8',
      }).trim();
      const LTagDate = new Date(LTagDateStr);
      const LTagDateOnly = LTagDateStr.slice(0, 10);
      const LTimeDiff = LTagDate.getTime() - LBaseDate.getTime();

      // Tag is within acceptable range (between base and end dates)
      if (LTagDateOnly > LBaseDateStr && LTagDate <= LEndDate) {
        if (!ldWithinRange || LTimeDiff < ldWithinRange.lDiff) {
          ldWithinRange = { lTag, lDate: LTagDateOnly, lDiff: LTimeDiff };
        }
      } 
      // Tag is after the range end date
      else if (LTagDateOnly > LEndDate.toISOString().slice(0, 10)) {
        if (!ldClosestAfter || LTimeDiff < ldClosestAfter.lDiff) {
          ldClosestAfter = { lTag, lDate: LTagDateOnly, lDiff: LTimeDiff };
        }
      } 
      // Tag is before the base Frappe date
      else if (LTagDateOnly < LBaseDateStr) {
        const LBeforeDiff = LBaseDate.getTime() - LTagDate.getTime();
        if (!ldClosestBefore || LBeforeDiff < ldClosestBefore.lDiff) {
          ldClosestBefore = { lTag, lDate: LTagDateOnly, lDiff: LBeforeDiff };
        }
      }
    } catch (err) {
      console.warn(`⚠️ Failed to get date for tag ${lTag}. Skipping...`);
    }
  }

  // Prefer tag within range, else prompt user for closest after/before fallback
  if (ldWithinRange) return { lTag: ldWithinRange.lTag, lDate: ldWithinRange.lDate };
  if (ldClosestAfter) {
    const LEndDateStr = LEndDate.toISOString().slice(0, 10);
    await fnPromptClosestTagConfirmation(iAppName, LBaseDateStr, LEndDateStr,
      ldClosestAfter.lTag, ldClosestAfter.lDate, 'Frappe'
    );
    return { lTag: ldClosestAfter.lTag, lDate: ldClosestAfter.lDate };
  } 
  if (ldClosestBefore) {
    const LEndDateStr = LEndDate.toISOString().slice(0, 10);
    await fnPromptClosestTagConfirmation(iAppName, LBaseDateStr, LEndDateStr,
      ldClosestBefore.lTag, ldClosestBefore.lDate, 'Frappe'
    );
    return { lTag: ldClosestBefore.lTag, lDate: ldClosestBefore.lDate };
  }
  return null;
}
