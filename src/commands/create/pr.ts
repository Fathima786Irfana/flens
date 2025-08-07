import { Command } from '@oclif/core';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

export default class CreatePR extends Command {
  async run(): Promise<void> {
    const cwd = process.cwd();

    // 1. Check if this is a Git repo
    try {
      execSync('git rev-parse --is-inside-work-tree', { cwd });
    } catch {
      this.error('Not a Git repository.');
    }

    // 2. Get current branch
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd,
    }).toString().trim();

    // 3. Ask for target branch
    const { targetBranch } = await inquirer.prompt<{ targetBranch: string }>([
      {
        type: 'input',
        name: 'targetBranch',
        message: 'Enter the branch to compare with (e.g., release):',
        validate: (input: string) =>
          input.trim().length > 0 || 'Branch name cannot be empty',
      },
    ]);

    // 4. Confirm direction
    const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Confirm: ${currentBranch} -> ${targetBranch}?`,
      },
    ]);
    if (!confirm) this.exit(1);

    // 5. Get diff files
    let changedFiles: string[];
    try {
      const raw = execSync(
        `git diff --name-only ${targetBranch}...${currentBranch}`,
        { cwd }
      ).toString();
      changedFiles = raw
        .split('\n')
        .map(f => f.trim())
        .filter(f => f.length > 0);
    } catch {
      this.error('Failed to get git diff.');
      return;
    }

    // 6. Determine migration tags
    const migrateSet = new Set<string>();
    for (const file of changedFiles) {
      const normalizedPath = file.replace(/\\/g, '/');

      if (
        normalizedPath.includes('clientScript/') ||
        normalizedPath.includes('serverScript/') ||
        normalizedPath.includes('report/')
      ) {
        migrateSet.add('files');
      }
      if (normalizedPath.includes('document/')) migrateSet.add('documents');
      if (normalizedPath.includes('customField/'))
        migrateSet.add('custom_fields');
      if (normalizedPath.includes('propertySetter/'))
        migrateSet.add('property_setter');
      if (
        normalizedPath.includes('letterHead/') ||
        normalizedPath.includes('printFormat/')
      ) {
        migrateSet.add('print_format');
      }
      if (normalizedPath.includes('customDoctype/'))
        migrateSet.add('custom_doctype');
    }

    // 7. Write to ci/migrate.txt
    const migrateFile = path.join(cwd, 'ci', 'migrate.txt');
    await fs.ensureFile(migrateFile);
    await fs.writeFile(migrateFile, [...migrateSet].join('\n') + '\n');
    this.log(`ci/migrate.txt updated with:\n${[...migrateSet].join('\n')}`);

    // 8. Prepare text entries
    const txtDir = path.join(cwd, 'files', 'txt');
    await fs.ensureDir(txtDir);

    const entries = {
      customFieldMigrate: new Set<string>(),
      documentList: new Set<string>(),
      doctypeList: new Set<string>(),
      customRole: new Set<string>(),
      propertySetter: new Set<string>(),
      userPermission: new Set<string>(),
    };

    for (const file of changedFiles) {
      const normalizedPath = file.replace(/\\/g, '/');

      if (
        normalizedPath.startsWith('customField/') &&
        normalizedPath.endsWith('.json')
      ) {
        entries.customFieldMigrate.add(path.basename(normalizedPath));
      }

      if (normalizedPath.startsWith('document/')) {
        entries.documentList.add(normalizedPath);
      }

      if (
        normalizedPath.startsWith('customDoctype/') &&
        normalizedPath.endsWith('.json')
      ) {
        const name = path.basename(normalizedPath, '.json');
        entries.doctypeList.add(name);
      }

      if (
        normalizedPath.startsWith('customRole/') &&
        normalizedPath.endsWith('.json')
      ) {
        entries.customRole.add(path.basename(normalizedPath));
      }

      if (
        normalizedPath.startsWith('propertySetter/') &&
        normalizedPath.endsWith('.json')
      ) {
        const segments = normalizedPath.split('/');
        if (segments.length >= 2) {
          const filename = segments.slice(-1)[0];
          const doctype = segments.slice(-2, -1)[0];
          entries.propertySetter.add(`${doctype}/${filename}`);
        }
      }

      if (
        normalizedPath.startsWith('userPermission/') &&
        normalizedPath.endsWith('.json')
      ) {
        const relPath = normalizedPath.replace(/^userPermission\//, '');
        if (relPath.includes('/deleted')) {
          entries.userPermission.add(`${relPath} DELETE`);
        } else {
          entries.userPermission.add(relPath);
        }
      }
    }

    // 9. Write .txt files while preserving comments
    const writeTextFile = async (
      filename: string,
      newEntries: Set<string>
    ) => {
      const filePath = path.join(txtDir, `${filename}.txt`);

      let existingComments: string[] = [];
      let existingData: Set<string> = new Set();

      if (await fs.pathExists(filePath)) {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('#')) {
            existingComments.push(line);
          } else if (trimmed) {
            existingData.add(trimmed);
          }
        }
      }

      const combined = new Set([...existingData, ...newEntries]);
      const sortedData = [...combined].sort();

      const finalContent = [...existingComments, ...sortedData].join('\n') + '\n';
      await fs.writeFile(filePath, finalContent);

      this.log(
        `${filename}.txt updated with ${newEntries.size} new entr${
          newEntries.size === 1 ? 'y' : 'ies'
        }`
      );
    };

    // 10. Write all entries
    for (const [filename, dataSet] of Object.entries(entries)) {
      if (dataSet.size > 0) {
        await writeTextFile(filename, dataSet);
      }
    }
  }
}
