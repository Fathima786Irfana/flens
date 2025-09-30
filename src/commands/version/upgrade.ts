import { Command, Flags, Args } from '@oclif/core';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import inquirer from 'inquirer';
import { fnFetchIndiaComplianceTagAndDate, fnFindERPNextTagBetweenDates,
  fnFetchAppNamesFromReleaseGroup, fnFindFrappeTagBeforeERPNextDate, fnFindAppTagAfterERPNextDate,
  fnFindFrappeBasedAppTag
 } from '../../functions/upgrade-functions.js';

 // Define the CLI command class
export default class clUpgrade extends Command {
  // description, flags, args are keywords of @oclif/core
  static description = 'Upgrade a release group';

  // Usage examples for the command
  static usage = [ '[RELEASEGROUPNAME] -d=2025-06-14 --> upgrade a release group',
    '-r --> list the release groups available in the lensdocker repo' ];

  // Define CLI flags
  static flags = {
    help: Flags.help({ char: 'h' }),
    releasegroup: Flags.boolean({ char: 'r', description: 'List Release Groups available' }),
    date: Flags.string({ char: 'd', description: 'Upgrade date (YYYY-MM-DD)', helpValue: '2025-06-14', }),
  };

  // Define CLI arguments
  static args = {
    releaseGroupName: Args.string({ description: 'Release group name', required: false }),
  };

  // This function validate the date flag values
  // eg: date should be yyyy-mm-dd format.
  fnValidateDate(iDate: string): boolean {
    const LDateRegex = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD format
    if (!LDateRegex.test(iDate)) {
      return false;
    }
    // Check if it's a valid date
    const LParsedDate = new Date(iDate);
    return !isNaN(LParsedDate.getTime());
  }

  // Main function
  async run() {

    const { flags, args } = await this.parse(clUpgrade);

    let lHomeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
    let lRepositoriesPath = path.join(lHomeDir, 'repositories');
    // Ensure repositories directory exists
    if (!fs.existsSync(lRepositoriesPath)) {
      fs.mkdirSync(lRepositoriesPath, { recursive: true });
    }

    // If --date flag is provided, proceed to upgrade logic
    if (flags.date) {
      // If --date is used, ensure releasegroupName is provided
      if (!args.releaseGroupName) {
        this.error('You must provide a releasegroup-name before using --date.');
      }
      if (!this.fnValidateDate(flags.date)) {
        this.error('Invalid date format. Please use YYYY-MM-DD.');
      }
      // Get the apps for the specified releasegroup.
      const LaAppList = fnFetchAppNamesFromReleaseGroup(args.releaseGroupName);
      var ldAppTagMap: { [lApp: string]: { lTag: string; lDate: string } } = {};
      // Use inquirer to select version with arrow keys
      const { LSelectedVersion } = await inquirer.prompt([
        {
          type: 'list',
          name: 'LSelectedVersion',
          message: 'Select the major version you plan to upgrade to:',
          choices: ['v14', 'v15'],
        },
      ]);
      // Initialize variables for different app versions and tag dates
      var lFrappeVersion, lERPNextVersion, lIndiaComplianceDate, lErpnextDate, lFrappeDate;

      // Get tag/date info for india-compliance and determine required versions
      const LdResult = await fnFetchIndiaComplianceTagAndDate(flags.date, LSelectedVersion, args.releaseGroupName);
      if (LdResult) {
        lFrappeVersion = LdResult.LdRequiredVersions['Frappe'];
        lERPNextVersion = LdResult.LdRequiredVersions['ERPNext'];
        lIndiaComplianceDate = LdResult.lSelectedDate;
      }

      // Save india-compliance tag info if available
      if (LdResult?.lSelectedTag && LdResult.lSelectedDate !== null) {
        ldAppTagMap['india-compliance'] = {
          lTag: LdResult.lSelectedTag,
          lDate: LdResult.lSelectedDate,
        };
      }
      // Find ERPNext tag between selected upgrade date and india-compliance tag date
      if (flags.date && LSelectedVersion && lERPNextVersion && lIndiaComplianceDate) {
        const LdResult = await fnFindERPNextTagBetweenDates(flags.date, LSelectedVersion, lERPNextVersion, lIndiaComplianceDate);
        if (LdResult) {
          lErpnextDate = LdResult.lDate;
          ldAppTagMap['erpnext'] = {
            lTag: LdResult.lTag,
            lDate: LdResult.lDate,
          };
        }
      }
      // Find Frappe tag before ERPNext release date
      if (LSelectedVersion && lFrappeVersion && lErpnextDate) {
        const LdResult = await fnFindFrappeTagBeforeERPNextDate(lErpnextDate, LSelectedVersion, lFrappeVersion);
        if (LdResult) {
          lFrappeDate = LdResult.lDate
          ldAppTagMap['frappe'] = {
            lTag: LdResult.lTag,
            lDate: LdResult.lDate,
          };
        }
     }
     
      // Loop through all apps (excluding core ones) and find appropriate tags
      if (lErpnextDate && lFrappeDate && LSelectedVersion && LaAppList?.length) {
        for (let lApp of LaAppList) {
          if (lApp === 'frappe' || lApp === 'erpnext' || lApp === 'india-compliance') continue; // Skip frappe
          const LaFrappeBasedApps = ['crm', 'insights', 'frappe_whatsapp', 'helpdesk', 'raven'];
          let ldTagInfo: { lTag: string; lDate: string } | null = null;
          if (LaFrappeBasedApps.includes(lApp)) {
            ldTagInfo = await fnFindFrappeBasedAppTag(lApp, lFrappeDate);
          } else {
            ldTagInfo = await fnFindAppTagAfterERPNextDate(lApp, lErpnextDate, LSelectedVersion);
            }
          if (ldTagInfo) {
            ldAppTagMap[lApp] = {
              lTag: ldTagInfo.lTag,
              lDate: ldTagInfo.lDate,
            };
          }
        }
      }
      // Display the tags and its date for the respective apps
      console.log("\nUpgrade App Tags : \n")
      for (let lApp of LaAppList) {
        const LdInfo = ldAppTagMap[lApp];
        if (LdInfo) {
          console.log(`📦 ${lApp} ➜ tag: ${LdInfo.lTag} (Date: ${LdInfo.lDate})`);
        } else {
          console.log(`📦 ${lApp} ➜ ❌ No tag found`);
        }
      }  
    }

    // If --releasegroup flag is provided, fetch branches (Release Group)
    if (flags.releasegroup) {
      let lRepoUrl = 'https://github.com/lmnaslimited/lensdocker';

      try {
        // Fetch remote branch names
        let laOutput = execSync(`git ls-remote --heads ${lRepoUrl}`, { encoding: 'utf-8' });

        // Filter branches that start with "lens"
        let laBranches = laOutput
          .split('\n')
          .map(lLine => lLine.split('\t')[1]) // Extract branch names
          .filter((lBranch): lBranch is string => !!lBranch && lBranch.startsWith('refs/heads/lens')) // Ensure filtering works
          .map(lBranch => lBranch.replace('refs/heads/', '')); // Remove refs/heads/ prefix

        if (laBranches.length === 0) {
          this.log('No Release Groups found.');
        } else {
          this.log('\nRelease Groups:\n');
          laBranches.forEach(lBranch => this.log(`\t- ${lBranch}`));
        }
      } catch (error: unknown) {
        let lErrorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        this.error(`Error fetching branches: ${lErrorMessage}`);
      }
    }
  }
}
