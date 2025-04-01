import inquirer from "inquirer";
import { Command } from "@oclif/core";
import fetch from 'node-fetch';

export default class clOpenProject extends Command {
  static description = "Get all open projects from nectar and display them as a select list";

  async run() {
    try {
      // Define the API endpoint and authentication
      const apiUrl = "https://sgbin.docker.localhost/api/resource/Project";
      const authHeader = "Basic YjRlYWY3NmMyYzE4YjJhOjkwZTJjYmZhZTI1NDVhOQ==";
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
      // Fetch the projects from the API using fetch
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();
      const projects = data?.data ?? [];

      if (projects.length === 0) {
        this.log("No open projects found.");
        return;
      }

      // Convert projects to a choice list for inquirer
      const choices = projects.map((proj: any) => ({
        name: proj.name, // Display name
        value: proj, // Store full project object
      }));

      // Prompt the user to select a project
      const { selectedProject } = await inquirer.prompt([
        {
          type: "list",
          name: "selectedProject",
          message: "Select a project:",
          choices,
        },
      ]);

      // Display selected project details
      this.log("Selected Project:", selectedProject);

    } catch (error: any) {
      this.error(`Failed to fetch projects: ${error.message}`);
    }
  }
}
