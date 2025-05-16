#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import inquirer from "inquirer";
import figlet from "figlet";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { ApiClient } from "./api-client.js";
import { config } from "./config.js";

// Load environment variables
dotenv.config();

// Create the CLI program
const program = new Command();

// ASCII art banner
console.log(
  chalk.cyan(figlet.textSync("hack-helper", { horizontalLayout: "full" }))
);
console.log(chalk.yellow("AI-powered hackathon project generator"));
console.log();

/**
 * Checks if API key exists and prompts for it if not
 * @returns {Promise<void>}
 */
const checkApiKey = async (): Promise<void> => {
  if (!process.env.API_KEY) {
    const { apiKey } = await inquirer.prompt([
      {
        type: "password",
        name: "apiKey",
        message: "Enter your API key:",
        validate: (input) => (input.length > 0 ? true : "API key is required"),
      },
    ]);

    // Save API key to .env file
    const envPath = path.join(process.cwd(), ".env");
    const envContent = fs.existsSync(envPath)
      ? `${fs.readFileSync(envPath, "utf-8")}\nAPI_KEY=${apiKey}`
      : `API_KEY=${apiKey}`;

    fs.writeFileSync(envPath, envContent);
    process.env.API_KEY = apiKey;
  }
};

/**
 * Creates an API client with the current configuration
 * @returns ApiClient instance
 */
const createClient = (): ApiClient => {
  return new ApiClient({
    baseUrl: process.env.API_URL || config.apiUrl,
    apiKey: process.env.API_KEY,
  });
};

/**
 * Checks if the API server is available
 */
const checkServerAvailability = async (): Promise<void> => {
  const client = createClient();
  const isAvailable = await client.isAvailable();

  if (!isAvailable) {
    console.error(
      chalk.red("❌ Cannot connect to the API server at:"),
      chalk.bold(config.apiUrl)
    );
    console.error(
      chalk.yellow("Make sure the server is running and try again.")
    );
    process.exit(1);
  }
};

// Initialize command
program
  .command("init")
  .description("Initialize a new project from an idea prompt")
  .argument("<idea>", "Your project idea")
  .option("-o, --output <dir>", "Output directory", "./output")
  .action(async (idea, options) => {
    await checkApiKey();
    await checkServerAvailability();

    console.log(
      chalk.green("🚀 Initializing project from idea:"),
      chalk.italic(idea)
    );

    try {
      const client = createClient();
      const result = await client.initializeProject({
        idea,
        outputDir: options.output,
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || "Unknown error");
      }

      console.log(chalk.green("✅ Project initialized successfully!"));

      // Handle generated files if any
      if (result.data.generatedFiles && result.data.generatedFiles.length > 0) {
        console.log(chalk.blue("📁 Generated files:"));
        for (const file of result.data.generatedFiles) {
          console.log(`   ${file.path}`);
        }
      }
    } catch (error) {
      console.error(chalk.red("❌ Error initializing project:"), error);
    }
  });

// Add feature command
program
  .command("add")
  .description("Add a new feature to an existing project")
  .argument("<feature>", "Feature description")
  .option("-p, --path <path>", "Project path", ".")
  .action(async (feature, options) => {
    await checkApiKey();
    await checkServerAvailability();

    console.log(chalk.green("🔧 Adding feature:"), chalk.italic(feature));

    try {
      const client = createClient();
      const result = await client.addFeature({
        feature,
        projectPath: options.path,
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || "Unknown error");
      }

      console.log(chalk.green("✅ Feature added successfully!"));

      // Handle generated files if any
      if (result.data.generatedFiles && result.data.generatedFiles.length > 0) {
        console.log(chalk.blue("📁 Modified/Created files:"));
        for (const file of result.data.generatedFiles) {
          console.log(`   ${file.path}`);
        }
      }
    } catch (error) {
      console.error(chalk.red("❌ Error adding feature:"), error);
    }
  });

// Deploy command
program
  .command("deploy")
  .description("Deploy the project")
  .option("-p, --path <path>", "Project path", ".")
  .option("--platform <platform>", "Platform to deploy to", "vercel")
  .action(async (options) => {
    await checkApiKey();
    await checkServerAvailability();

    console.log(
      chalk.green("🚀 Deploying project to:"),
      chalk.bold(options.platform)
    );

    try {
      const client = createClient();
      const result = await client.deployProject({
        platform: options.platform,
        projectPath: options.path,
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || "Unknown error");
      }

      console.log(chalk.green("✅ Project deployed successfully!"));

      // Print any deployment information from the response
      const lastMessage = result.data.messages[result.data.messages.length - 1];
      if (lastMessage && lastMessage.role === "assistant") {
        console.log(chalk.blue("📊 Deployment information:"));
        console.log(lastMessage.content);
      }
    } catch (error) {
      console.error(chalk.red("❌ Error deploying project:"), error);
    }
  });

// Server status command
program
  .command("status")
  .description("Check the status of the API server")
  .action(async () => {
    try {
      const client = createClient();
      const isAvailable = await client.isAvailable();

      if (isAvailable) {
        console.log(
          chalk.green("✅ API server is available at:"),
          chalk.bold(config.apiUrl)
        );
      } else {
        console.log(
          chalk.red("❌ API server is not available at:"),
          chalk.bold(config.apiUrl)
        );
      }
    } catch (error) {
      console.error(chalk.red("❌ Error checking server status:"), error);
    }
  });

// Parse command line arguments
program.parse(process.argv);

// Show help if no command is provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
