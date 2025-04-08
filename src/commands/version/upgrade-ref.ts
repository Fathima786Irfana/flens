import { Command, Args, Flags } from '@oclif/core';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import inquirer from 'inquirer';
import {fnExtractRequiredVersions, fnCompareVersions,
  fnGetClosestTag, fnEnsureRepoExists, fnReadAppsJson,
  fnCheckoutAndPullBranch, fnGetTagDate, fnDisplayAppTags, fnPromptUser
} from '../../functions/upgrade-functions-ref.js';

export default class clVersionUpgrade extends Command {
  static sDescription = 'Upgrade a Release Group';

  static args = {
    releaseGroup: Args.string({ sDescription: 'Release group name', required: true }),
  };

  static flags = {
    date: Flags.string({ char: 'd', sDescription: 'Upgrade date (YYYY-MM-DD)', required: true }),
  };

  async run() {
    let { args, flags } = await this.parse(clVersionUpgrade);
    let lReleaseGroup = args.releaseGroup;
    let lUpgradeDate = flags.date;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(lUpgradeDate)) {
      this.log('❌ Invalid date format. Use YYYY-MM-DD.');
      return;
    }

    let lHomeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
    let lRepositoriesPath = path.join(lHomeDir, 'repositories');
    let lLensdockerPath = path.join(lRepositoriesPath, 'lensdocker');
    let lFrappePath = path.join(lRepositoriesPath, 'frappe');
    // Mapping non -ind with its -ind release group
    let ldReleaseGroupMapping: Record<string, string[]> = {
      'lenscx': ['lenscx-ind'],
      'lenshxm': ['lenshxm-ind'],
      'lensedx': ['lensedx-ind'],
      'lensex': ['lenshxm-ind'],
      'lenscrm': ['lenshxm-ind'],
      'lensights': ['lenshxm-ind'],
    };

    // Ensure repositories directory exists
    if (!fs.existsSync(lRepositoriesPath)) {
      fs.mkdirSync(lRepositoriesPath, { recursive: true });
    }

    // Clone or update lensdocker repository
    if (!fs.existsSync(lLensdockerPath)) {
      execSync(`git clone https://github.com/lmnaslimited/lensdocker.git ${lLensdockerPath}`, { stdio: 'ignore' });
    } else {
      execSync(`git -C ${lLensdockerPath} pull`, { stdio: 'ignore' });
    }

    // Clone or update frappe repository
    if (!fs.existsSync(lFrappePath)) {
      execSync(`git clone https://github.com/frappe/frappe.git ${lFrappePath}`, { stdio: 'ignore' });
    } else {
      execSync(`git -C ${lFrappePath} pull`, { stdio: 'ignore' });
    }

    // If releaseGroup does not end with "-ind", prompt the user
    var lMappedGroups = ldReleaseGroupMapping[lReleaseGroup];
    if (!lReleaseGroup.endsWith('-ind')) {
      if (!(lReleaseGroup in ldReleaseGroupMapping)) {
        this.log(`❌ Release group "${lReleaseGroup}" is not mapped. Exiting.`);
        return;
      }
      // If the give non -ind release group ask if the mapped -ind group is already upgraded
      let { lProceed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'lProceed',
          message: `The release group "${lReleaseGroup}" maps to "${lMappedGroups}". Whether "${lMappedGroups}" is upgraded?`,
          default: false,
        },
      ]);

      if (!lProceed) {
        this.log(`ℹ️ Run: flens version upgrade ${lMappedGroups.join(', ')} --date ${lUpgradeDate} to proceed.`);
        return;
      } else {
          // // Checkout the lensdocker local repository with the release group branch
          fnCheckoutAndPullBranch(lLensdockerPath, lMappedGroups[0]);
          // Read build.env and get the version tag
          let lBuildEnvPath = path.join(lLensdockerPath, 'ci', 'build.env');
          let lFrappeVersion = 'Unknown';
          if (fs.existsSync(lBuildEnvPath)) {
            let lBuildEnvContent = fs.readFileSync(lBuildEnvPath, 'utf-8');
            var lFrappeVersionMatch = lBuildEnvContent.match(/^FRAPPE_VERSION=(.+)$/m);
            if (!lFrappeVersionMatch) {
              console.error('❌ Frappe version not found in build.env.');
              return;
            }
            let lMatch = lBuildEnvContent.match(/^FRAPPE_VERSION=(.+)$/m);
            if (lMatch) {
              lFrappeVersion = lMatch[1];
            }
          } else {
            this.log('❌ build.env file not found.');
            return;
          }
          // Read the apps from the Apps.json
          let laAppsData = fnReadAppsJson(lLensdockerPath);
          if (!laAppsData) return; // Handle the case when the file is missing
          // Get Frappe tag date
          let lFrappeRepoPath = path.join(lRepositoriesPath, 'frappe');
          let lFrappeVer = lFrappeVersionMatch[1];
          let lFrappeTagDate = fnGetTagDate(lFrappeRepoPath, lFrappeVer);
          if (!lFrappeTagDate) {
            return; // Handle the failure case
          }

          // Get ERPNext branch
          let ldErpnextApp = laAppsData.find(lApp => lApp.url.includes('erpnext'));
          if (!ldErpnextApp) {
            this.log('❌ ERPNext repository not found in appsData.');
            return;
          }
          let lErpnextBranch = ldErpnextApp.branch;

          // Get ERPNext tag date
          let lErpnextPath = path.join(lRepositoriesPath, 'erpnext'); // Assuming it's cloned here
          let lErpnextTagDate = fnGetTagDate(lErpnextPath, lErpnextBranch);
          if (!lErpnextTagDate) {
            return; // Handle the failure case
          }
          // Checkout the lensdocker local repository
          fnCheckoutAndPullBranch(lLensdockerPath, lReleaseGroup);

          let ldReleaseAppsData = fnReadAppsJson(lLensdockerPath);
          if (!ldReleaseAppsData) return; // Handle the case when the file is missing

          // Identify extra apps
          let laAppsSet = new Set(laAppsData.map(lApp => lApp.url));
          let ldExtraApps = ldReleaseAppsData.filter(lApp => !laAppsSet.has(lApp.url)).map(lApp => lApp.url);
          // Filter out excluded apps
          let laExcludedApps = ['crm', 'insight', 'builder', 'frappe_whatsapp'];
          let laFilteredExtraApps = ldExtraApps.filter(lAppUrl => !laExcludedApps.some(lExclude => lAppUrl.includes(lExclude)));

          // Find closest valid tags
          let ldExtraAppTags: Record<string, string> = {}; // Moved outside try block
          // Get the version of the apps (dependent of ERPNext) that are not in the -ind release but
          // in the release group asked using ERPNext tag and its version
          laFilteredExtraApps.forEach(lAppUrl => {
            let { lAppName, lAppPath } = fnEnsureRepoExists(lAppUrl, lRepositoriesPath);
            let lClosestTag = fnGetClosestTag(lAppPath, lErpnextTagDate);
            if (lClosestTag) {
              ldExtraAppTags[lAppName] = lClosestTag;
            }
          });

          let laExcludedExtraApps = ldExtraApps.filter(lAppUrl => 
            laExcludedApps.some(lExcluded => lAppUrl.includes(lExcluded))
          );
          // Store selected tags for excluded extra apps
          let ldExcludedAppTags: Record<string, string> = {};
          // Get the version of the apps (dependent of Frappe) that are not in the -ind release but
          // in the release group asked using Frappe tag and its version
          laExcludedExtraApps.forEach(lAppUrl => {
            let { lAppName, lAppPath } = fnEnsureRepoExists(lAppUrl, lRepositoriesPath);
            let lClosestTag = fnGetClosestTag(lAppPath, lFrappeTagDate);
            if (lClosestTag) {
              ldExcludedAppTags[lAppName] = lClosestTag;
            }
          });

          // Display applications and its versions
          this.log(`\n📢 Apps for release group "${lReleaseGroup}" based on "${lMappedGroups}":\n`);
          let ldReleaseAppsSet = new Set(ldReleaseAppsData.map(lApp => lApp.url));
          laAppsData.forEach(lApp => {
            let lAppName = path.basename(lApp.url, '.git');
            if (lAppName !== 'india-compliance' && ldReleaseAppsSet.has(lApp.url)) {
              this.log(`🔹 ${lAppName}: ${lApp.branch}`);
            }
          });
          this.log(`\n🔹 Frappe Version: ${lFrappeVersion}\n`);

          // Display extra apps with selected tags
          fnDisplayAppTags(ldExtraAppTags);
          fnDisplayAppTags(ldExcludedAppTags);
      }
    } else {
        // Checkout the lensdocker local repository
        fnCheckoutAndPullBranch(lLensdockerPath, lReleaseGroup);
        // Get the apps stored in the apps.json
        let laAppsData = fnReadAppsJson(lLensdockerPath);
        if (!laAppsData) return; // Handle the case when the file is missing
        let laAppsSet = new Set(laAppsData.map(lApp => path.basename(lApp.url, '.git')));
        // Get major version from version.txt
        let lVersionPath = path.join(lLensdockerPath, 'ci', 'version.txt');
        let lMajorVersion = 'v15';
        // If the version.txt of -ind release has v14 prefixask the user whether they want to upgarde to v14 or v15
        if (fs.existsSync(lVersionPath)) {
          let lVersionContent = fs.readFileSync(lVersionPath, 'utf-8');
          lMajorVersion = lVersionContent.startsWith('v14')
            ? (await inquirer.prompt([{ name: 'major', type: 'list', choices: ['v14', 'v15'], message: 'Select major version:' }])).major
            : 'v15';
          }
        // Exclude 'lms' and 'payments' apps but explicitly include 'frappe'
        let laExcludedApps = new Set(['lms', 'payments', 'lens_pdf-on-submit']);
        let laAppNames = laAppsData
          .map(lApp => path.basename(lApp.url, '.git'))
          .filter(lAppName => !laExcludedApps.has(lAppName));
        
        // Ensure 'frappe' is explicitly included in the applist
        if (!laAppNames.includes('frappe')) {
          laAppNames.push('frappe');
        }
        
        // Sort apps in dependency order [india-compliance, erpnext, frappe, ....]
        let laOrderedApps = laAppNames.sort((a, b) => {
          if (a === 'india-compliance') return -1;
          if (b === 'india-compliance') return 1;
          if (a === 'erpnext') return -1;
          if (b === 'erpnext') return 1;
          if (a === 'frappe') return -1;
          if (b === 'frappe') return 1;
          return 0;
        });
        let ldAppDayLimits: Record<string, number> = {
          "india-compliance": 20,
          "erpnext": 7,
          "frappe": 7,
          "lms": 20,
          "hrms": 15,
          "education": 31,
          "insights": 20,
          "crm": 12,
          "frappe_whatsapp": 25,
          "helpdesk": 31,
        };
        let ldTagData: { [lKey: string]: { lTag: string, lDate: string } } = {};
        let ldRequiredVersions: Record<string, string> = {};
        let lLastErpnextDate = ''; // Store the latest allowed date of ERPNext for other apps
        
        for (let lAppName of laOrderedApps) {
          let lAppUrl = laAppsData.find(lApp => path.basename(lApp.url, '.git') === lAppName)?.url;
          if (!lAppUrl && lAppName !== 'frappe') continue; // Skip if no URL and not 'frappe'
        
          // Handle 'frappe' separately if not in apps.json
          let lAppPath = path.join(lRepositoriesPath, lAppName);
          if (!fs.existsSync(lAppPath)) {
            let lCloneUrl = lAppUrl || 'https://github.com/frappe/frappe.git';
            execSync(`git clone ${lCloneUrl} ${lAppPath}`, { stdio: 'ignore' });
          } else {
            execSync(`git -C ${lAppPath} pull`, { stdio: 'ignore' });
          }
        
          // Get all tags sorted by creation date
          let laTags = execSync(`git -C ${lAppPath} tag --sort=-creatordate`, { encoding: 'utf-8' }).trim().split('\n');
          let laFilteredTags = laTags.filter(lTag => lTag.startsWith(lMajorVersion));
          // Convert upgradeDate got in the command line (eg: 2024-09-15) to Date object
          let ldUpgradeDateObj = new Date(lUpgradeDate);
          let lUpgradeYear = ldUpgradeDateObj.getFullYear(); // 2024
          let lUpgradeMonth = ldUpgradeDateObj.getMonth() + 1; // 9 (September)

          // Filter tags based on the year
          let laFilteredTagsByYear = laFilteredTags.filter(lTag => {
            let lTagDateStr = execSync(`git -C ${lAppPath} log -1 --format=%ai ${lTag}`, { encoding: 'utf-8' }).trim().split(' ')[0];
            let lTagDate = new Date(lTagDateStr);
            return lTagDate.getFullYear() === lUpgradeYear;
          });

          // Further filter tags based on the month conditions eg: September
          let laFinalFilteredTags = laFilteredTagsByYear.filter(lTag => {
            let lTagDateStr = execSync(`git -C ${lAppPath} log -1 --format=%ai ${lTag}`, { encoding: 'utf-8' }).trim().split(' ')[0];
            let lTagDate = new Date(lTagDateStr);
            let lTagMonth = lTagDate.getMonth() + 1; // JavaScript months are 0-based
            // Include all tags from September and October (Month & Month+1)
            if (lTagMonth === lUpgradeMonth) {
              return true;
            } else if (lTagMonth === lUpgradeMonth + 1) {
              return true;
            }
            return false; // Ignore tags from other months
          });

          // Sorting to ensure proper order: eg: August → September (before 15) → September (after 15) → October
          laFinalFilteredTags.sort((a, b) => {
            let lDateA = new Date(execSync(`git -C ${lAppPath} log -1 --format=%ai ${a}`, { encoding: 'utf-8' }).trim().split(' ')[0]);
            let lDateB = new Date(execSync(`git -C ${lAppPath} log -1 --format=%ai ${b}`, { encoding: 'utf-8' }).trim().split(' ')[0]);
            return lDateA.getTime() - lDateB.getTime();
          });
          // Initiate variables for storing Tags and its date
          let lSelectedTag = '';
          let lSelectedDate = '';
            if (lAppName === 'india-compliance') { // Logic for India Compliance
              let lDayLimit = ldAppDayLimits[lAppName];
              for (let lTag of laFinalFilteredTags) {
                let lTagDate = execSync(`git -C ${lAppPath} log -1 --format=%ai ${lTag}`, { encoding: 'utf-8' }).trim().split(' ')[0];
                if (new Date(lTagDate) >= new Date(lUpgradeDate) && new Date(lTagDate) <= new Date(new Date(lUpgradeDate).getTime() + lDayLimit * 24 * 60 * 60 * 1000)) {
                  // Select the closest tag to the given upgrade date
                  if (!lSelectedTag || Math.abs(new Date(lTagDate).getTime() - new Date(lUpgradeDate).getTime()) < Math.abs(new Date(lSelectedDate).getTime() - new Date(lUpgradeDate).getTime())) {
                    lSelectedTag = lTag;
                    lSelectedDate = lTagDate;
                  }
               }
              }
                // If tag is selected add it to the ldTagData dict for future access in the code
                if (lSelectedTag) {
                  ldTagData[lAppName] = { lTag: lSelectedTag, lDate: lSelectedDate };
              
                  if (lAppName === 'india-compliance') {
                    execSync(`git -C ${lAppPath} checkout ${lSelectedTag}`, { stdio: 'ignore' });
              
                    // Read required_versions of Frappe and ERPNext
                    let lPyFilePath = path.join(lAppPath, 'india_compliance/patches/check_version_compatibility.py');
                    ldRequiredVersions = fnExtractRequiredVersions(lPyFilePath, lMajorVersion);
                    execSync(`git -C ${lAppPath} checkout develop`, { stdio: 'ignore' });
                  }
                } else {
                  // Call function to prompt user for action
                  let selectedTagData = await fnPromptUser(lUpgradeDate, lDayLimit, lAppPath, lMajorVersion, lAppName);
                  // Store the selected tag
                  ldTagData[lAppName] = selectedTagData;
                }
            } else if (lAppName === 'erpnext') { // Logic for ERPNext
              let lDayLimit = ldAppDayLimits[lAppName];
              for (let lTag of laFinalFilteredTags) {
                let lTagDate = execSync(`git -C ${lAppPath} log -1 --format=%ai ${lTag}`, { encoding: 'utf-8' }).trim().split(' ')[0];
            
                if (ldTagData["india-compliance"] && lTagDate > ldTagData["india-compliance"].lDate) continue; // Must be before India Compliance
                if (ldRequiredVersions['ERPNext'] && fnCompareVersions(lTag, ldRequiredVersions['ERPNext']) < 0) continue; // Must be >= required version mentioned in the India Compliance
                if (new Date(lTagDate) >= new Date(lUpgradeDate) && new Date(lTagDate) <= new Date(new Date(lUpgradeDate).getTime() + lDayLimit * 24 * 60 * 60 * 1000)) {
                  // Select the closest tag to the given upgrade date
                  if (!lSelectedTag || Math.abs(new Date(lTagDate).getTime() - new Date(lUpgradeDate).getTime()) < Math.abs(new Date(lSelectedDate).getTime() - new Date(lUpgradeDate).getTime())) {
                    lSelectedTag = lTag;
                    lSelectedDate = lTagDate;
                  }
                }
              }
              // If tag is selected add it to the ldTagData dict for future access in the code
              if (lSelectedTag) {
                lLastErpnextDate = lSelectedDate; // Store ERPNext date for Frappe selection
                ldTagData[lAppName] = { lTag: lSelectedTag, lDate: lSelectedDate };
              } else {
                // Call function to prompt user for action
                let lSelectedTagData = await fnPromptUser(lUpgradeDate, lDayLimit, lAppPath, lMajorVersion, lAppName);
                // Store the selected tag
                ldTagData[lAppName] = lSelectedTagData;
              }
            }  else if (lAppName === 'frappe') { // Logic for Frappe
              let lDayLimit = ldAppDayLimits[lAppName];
              for (let lTag of laFinalFilteredTags) {
                let lTagDate = execSync(`git -C ${lAppPath} log -1 --format=%ai ${lTag}`, { encoding: 'utf-8' }).trim().split(' ')[0];
            
                if (lLastErpnextDate && lTagDate > lLastErpnextDate) continue; // Must be before ERPNext
            
                if (ldRequiredVersions['Frappe'] && fnCompareVersions(lTag, ldRequiredVersions['Frappe']) < 0) continue; //  Must be >= required version mentioned in the India Compliance
                if (new Date(lTagDate) >= new Date(lUpgradeDate) && new Date(lTagDate) <= new Date(new Date(lUpgradeDate).getTime() + lDayLimit * 24 * 60 * 60 * 1000)) {
                  // Select the closest tag to the given upgrade date
                  if (!lSelectedTag || Math.abs(new Date(lTagDate).getTime() - new Date(lUpgradeDate).getTime()) < Math.abs(new Date(lSelectedDate).getTime() - new Date(lUpgradeDate).getTime())) {
                    lSelectedTag = lTag;
                    lSelectedDate = lTagDate;
                  }
                }
              }
              // If tag is selected add it to the ldTagData dict for future access in the code
              if (lSelectedTag) {
                ldTagData[lAppName] = { lTag: lSelectedTag, lDate: lSelectedDate };
              } else {
                // Call function to prompt user for action
                let lSelectedTagData = await fnPromptUser(lUpgradeDate, lDayLimit, lAppPath, lMajorVersion, lAppName);
                // Store the selected tag
                ldTagData[lAppName] = lSelectedTagData;
              }
            } else { // Logic for other Apps except lms, payments and lens-pdf-on-submit
                let lDayLimit = ldAppDayLimits[lAppName];
                for (let lTag of laFinalFilteredTags) {
                  let lTagDate = execSync(`git -C ${lAppPath} log -1 --format=%ai ${lTag}`, { encoding: 'utf-8' }).trim().split(' ')[0];
                  // Select a tag after erpnext but within the first 15 days of next month if needed
                  if (lLastErpnextDate && lTagDate < lLastErpnextDate) continue;
                  if (!lTagDate.startsWith(lUpgradeDate.slice(0, 7))) {
                    let lNextMonth = new Date(new Date(lUpgradeDate).setMonth(new Date(lUpgradeDate).getMonth() + 1));
                    if (new Date(lTagDate) > lNextMonth || new Date(lTagDate).getDate() > 15) continue;
                  }
                  if (new Date(lTagDate) >= new Date(lUpgradeDate) && new Date(lTagDate) <= new Date(new Date(lUpgradeDate).getTime() + lDayLimit * 24 * 60 * 60 * 1000)) {
                    // Select the closest tag to the given upgrade date
                    if (!lSelectedTag || Math.abs(new Date(lTagDate).getTime() - new Date(lUpgradeDate).getTime()) < Math.abs(new Date(lSelectedDate).getTime() - new Date(lUpgradeDate).getTime())) {
                      lSelectedTag = lTag;
                      lSelectedDate = lTagDate;
                    }
                  }
                }
                // If no tag is selected based on the condition then the latest version of that major is selected
                if (!lSelectedTag){
                  // Call function to prompt user for action
                  let lSelectedTagData = await fnPromptUser(lUpgradeDate, lDayLimit, lAppPath, lMajorVersion, lAppName);
                  // Store the selected tag
                  ldTagData[lAppName] = lSelectedTagData;
                }else {
                  ldTagData[lAppName] = { lTag: lSelectedTag, lDate: lSelectedDate };
                }
            }
        }
        for (let lAppName of laExcludedApps) {
          // Since lens-pdf-on-submit is our custom app use the default branch
          if (lAppName === 'lens_pdf-on-submit') {
            ldTagData[lAppName] = { lTag: "workflow-v1", lDate: "" };
          }
          // Logic for Payments -> Since it has no tags, Use version-15 for
          // Frappe v-15 and version-14 for Frappe v14.
          if (lAppName === 'payments') {
            let lSelectedTag = lMajorVersion === 'v15' ? 'version-15' : 'version-14';
        
            if (lSelectedTag) {
              ldTagData[lAppName] = { lTag: lSelectedTag, lDate: "" };
            }
          }
          // Logic for lms App -> the tag date should be equal to/greater than the ERPNext tag date
          if (lAppName === 'lms') {
            let lAppUrl = laAppsData.find(lApp => path.basename(lApp.url, '.git') === lAppName)?.url;
            let lAppPath = path.join(lRepositoriesPath, lAppName);
        
            // Clone or pull the repository
            if (!fs.existsSync(lAppPath)) {
                execSync(`git clone ${lAppUrl} ${lAppPath}`, { stdio: 'ignore' });
            } else {
                execSync(`git -C ${lAppPath} pull`, { stdio: 'ignore' });
            }
        
            // Get the ERPNext tag's date
            let ldErpnextTagData = ldTagData['erpnext'];
            if (!ldErpnextTagData) {
                console.error("ERPNext tag data not found");
                return;
            }
            let lErpnextDate = new Date(ldErpnextTagData.lDate);
            // Get all tags sorted by creation date (newest first)
            let laTags = execSync(`git -C ${lAppPath} tag --sort=-creatordate`, { encoding: 'utf-8' }).trim().split('\n');
            let lDayLimit = ldAppDayLimits[lAppName];
            // Fetch creation date for each tag
            let laLmsTagsWithDates = laTags
                .map(lTag => {
                    let lTagDateStr = execSync(`git -C ${lAppPath} log -1 --format=%aI ${lTag}`, { encoding: 'utf-8' }).trim().split(' ')[0]
                    return { lTag, lDate: new Date(lTagDateStr) };
                })
                .filter(({ lDate }) => lDate > lErpnextDate && new Date(lDate) >= new Date(lUpgradeDate) && new Date(lDate) <= new Date(new Date(lUpgradeDate).getTime() + lDayLimit * 24 * 60 * 60 * 1000)); // Filter to only include tags whose date is greater than ERPNext's tag date
            // Select the closest newer tag
            if (laLmsTagsWithDates.length > 0) {
              laLmsTagsWithDates.sort((a, b) => a.lDate.getTime() - b.lDate.getTime()); // Sort ascending by date
                let { lTag: lSelectedTag, lDate: lSelectedDate } = laLmsTagsWithDates[0]; 
                ldTagData[lAppName] = { lTag: lSelectedTag, lDate: lSelectedDate.toISOString() };
            } else {
              // Call function to prompt user for action
              let lSelectedTagData = await fnPromptUser(lUpgradeDate, lDayLimit, lAppPath, lMajorVersion, lAppName);
              // Store the selected tag
              ldTagData[lAppName] = lSelectedTagData;
            }
          }
        }
        // Display the Apps, its version and Date for the -ind release group asked
        this.log(`\n📢 Selected Tags for Release Group "${lReleaseGroup}":\n`);
        for (let [lAapp, lData] of Object.entries(ldTagData)) {
          if (laAppsSet.has(lAapp) || lAapp === 'frappe') {
            let lFormattedDate = lData.lDate.split('T')[0]; // Extract only the date part
            this.log(`🔹 ${lAapp}: ${lData.lTag} (Date: ${lFormattedDate})`);
          }
        }
    }
  }
}