import { Command } from '@oclif/core';
import fs from 'fs';
import path from 'path';
import fetch, { RequestInit } from 'node-fetch';

export default class RepoSync extends Command {
  async run() {
    try {
      // Load current project details
      const homeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
      const flensDir = path.join(homeDir, '.flens');
      const currentProjectFile = path.join(flensDir, 'current_project.json');
      if (!fs.existsSync(currentProjectFile)) {
        throw new Error('❌ No active project set. Run "flens project use" first.');
      }
      const projectData = JSON.parse(fs.readFileSync(currentProjectFile, 'utf-8'));
      const { siteName, repoName, key } = projectData;

      if (!siteName || !repoName || !key) {
        this.error('Missing required fields in current_project.json');
      }

      // Load changelog.txt
      const logFilePath = path.join(homeDir, 'repositories', repoName, 'log', 'changelog.txt');
      if (!fs.existsSync(logFilePath)) {
        this.error(`changelog.txt not found in ${logFilePath}`);
      }
      const logData = fs.readFileSync(logFilePath, 'utf-8').trim().split('\n');

      // Define resource mappings
      const mappings: Record<string, string> = {
        letter_head: 'Letter Head',
        print_format: 'Print Format',
        custom_fields: 'Custom Field',
        property_setter: 'Property Setter',
        doctype: 'DocType'
      };

      // Process each line in changelog.txt
      for (const line of logData) {
        const parts = line.trim().split(' ');
        const action = parts.pop() || ''; // Last word is the action (UPDATE, INSERT, DELETE)
        const filePath = parts.join(' ').replace(/['"]+/g, "");
        
        if (!['UPDATE', 'INSERT', 'DELETE'].includes(action)) {
          this.warn(`Skipping invalid action in log file: ${line}`);
          continue;
        }

        const fileFullPath = path.join(homeDir, 'repositories', repoName, filePath);
        if (!fs.existsSync(fileFullPath)) {
          this.warn(`File not found: ${fileFullPath}`);
          continue;
        }

        const fileContent = JSON.parse(fs.readFileSync(fileFullPath, 'utf-8'));
        const segments = filePath.split('/');
        const category = segments[0]; // Extract category from path
        const fileName = path.basename(fileFullPath, '.json'); // Remove .json extension

        if (!mappings[category]) {
          this.warn(`Unknown category: ${category}, skipping file: ${fileFullPath}`);
          continue;
        }

        const resourceType = mappings[category];
        const apiUrl = `${siteName}/api/resource/${encodeURIComponent(resourceType)}/${encodeURIComponent(fileName)}`;
        
        // Set up request options
        const requestOptions: RequestInit = {
          method: action === 'UPDATE' ? 'PUT' : action === 'INSERT' ? 'POST' : 'DELETE',
          headers: {
            'Authorization': `${key}`,
            'Content-Type': 'application/json'
          },
          body: action === 'DELETE' ? undefined : JSON.stringify(fileContent),
          redirect: 'follow'
        };

        // Perform API request
        try {
          process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
          const response = await fetch(apiUrl, requestOptions);
          if (!response.ok) {
            throw new Error(`Failed to ${action} ${apiUrl}: ${response.statusText}`);
          }
          this.log(`${action} successful for ${fileName}`);
        } catch (error: any) {
          this.error(`Error processing ${fileName}: ${error.message}`);
        }
      }
    } catch (error: any) {
      this.error(`Error: ${error.message}`);
    }
  }
}
