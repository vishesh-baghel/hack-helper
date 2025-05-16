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
  .option("-n, --name <name>", "Project name (kebab-case)")
  .option("-o, --output <dir>", "Output directory", "./")
  .action(async (idea, options) => {
    // If project name is not provided, prompt for it
    if (!options.name) {
      const { projectName } = await inquirer.prompt([
        {
          type: "input",
          name: "projectName",
          message: "Enter a project name (kebab-case):",
          default: idea.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 30),
          validate: (input: string) => {
            if (!/^[a-z0-9-]+$/.test(input)) {
              return "Project name must be in kebab-case (lowercase letters, numbers, and hyphens only)";
            }
            return true;
          },
        },
      ]);
      options.name = projectName;
    }
    await checkApiKey();
    await checkServerAvailability();

    console.log(
      chalk.green("🚀 Initializing project from idea:"),
      chalk.italic(idea)
    );
    
    try {
      const client = createClient();
      
      // Create progress spinner
      const spinner = {
        frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
        interval: 80,
        currentFrame: 0
      };
      
      let spinnerInterval: NodeJS.Timeout | null = null;
      let currentText = "";
      let currentFiles: Array<{path: string; content: string}> = [];
      let lastDisplayLength = 0;
      let isCompleted = false;
      
      // Variables to track text changes
      let lastText = "";
      let textChanged = false;
      
      // Progress update handler
      const onProgress = (text: string, files?: Array<{path: string; content: string}>) => {
        // Check if text has actually changed
        if (text !== currentText) {
          currentText = text;
          textChanged = true;
        }
        
        if (files && files.length > 0) {
          currentFiles = files;
        }
      };
      
      // Display update handler - separate from data processing
      const updateDisplay = () => {
        // Only update display if text changed or it's the initial display
        if (textChanged || lastText === "") {
          // Only show the first 80 characters of text to keep console clean
          const displayText = currentText.length > 80 ? currentText.substring(0, 80) + "..." : currentText;
          
          // Clear previous output completely
          if (lastDisplayLength > 0) {
            process.stdout.write('\r' + ' '.repeat(lastDisplayLength) + '\r');
          }
          
          // Show progress with spinner
          const frame = spinner.frames[spinner.currentFrame];
          const output = `${frame} ${displayText}`;
          process.stdout.write(output);
          lastDisplayLength = output.length;
          
          // Remember what we displayed
          lastText = currentText;
          textChanged = false;
        } else {
          // Just update the spinner without redisplaying text
          const frame = spinner.frames[spinner.currentFrame];
          process.stdout.write('\r' + frame + ' ');
        }
        
        // Update spinner frame
        spinner.currentFrame = (spinner.currentFrame + 1) % spinner.frames.length;
      };
      
      // Start spinner animation
      spinnerInterval = setInterval(() => {
        if (!isCompleted) {
          updateDisplay();
        }
      }, spinner.interval);
      
      // Use the project name as the directory in the current location
      const projectPath = path.join(options.output, options.name);
      
      console.log(chalk.blue(`\nCreating project: ${chalk.bold(options.name)}\n`));
      
      // Run the streaming process
      const result = await client.streamInitializeProject(
        {
          idea,
          projectName: options.name,
          outputDir: projectPath,
        },
        onProgress
      );
      
      // Stop spinner animation
      isCompleted = true;
      if (spinnerInterval) {
        clearInterval(spinnerInterval);
      }
      
      // Clear the spinner line completely and move to a new line
      process.stdout.write('\r' + ' '.repeat(lastDisplayLength) + '\r\n');
      
      if (!result.success || !result.data) {
        throw new Error(result.error || "Unknown error");
      }
      
      console.log(chalk.green("✅ Project initialized successfully!"));
      
      // Display a cleaner agent response without newline characters
      const formattedResponse = result.data.messages[result.data.messages.length - 1].content
        .replace(/\\n/g, '\n')
        .replace(/\\"([^\\"]+)\\"/g, '"$1"'); // Clean up escaped quotes
      
      // Format the response in a more readable way
      console.log(chalk.cyan("\n📝 Agent plan:"));
      // Split by numbered list items and format them nicely
      const planParts = formattedResponse.split(/\d+\.\s+\*\*/);
      if (planParts.length > 1) {
        // Extract and display the introduction
        const intro = planParts[0].trim();
        console.log(chalk.white(intro));
        
        // Display numbered steps in a cleaner format
        for (let i = 1; i < planParts.length; i++) {
          const stepText = planParts[i];
          // Split at the first **: to separate title from description
          const [title, ...description] = stepText.split('**:');
          console.log(chalk.yellow(`${i}. ${title.trim()}`));
          if (description.length > 0) {
            console.log(`   ${description.join('**:').trim()}`);
          }
        }
      } else {
        // Fall back to regular display if we can't parse the format
        console.log(chalk.white(formattedResponse));
      }
      
      // Handle generated files if any
      if (result.data.generatedFiles && result.data.generatedFiles.length > 0) {
        console.log(chalk.blue("\n📁 Generated files:"));
        for (const file of result.data.generatedFiles) {
          console.log(`   ${chalk.yellow(file.path)}`);
        }
      } else {
        console.log(chalk.yellow("\n⚠️ No files generated yet. The agent is processing your request..."));
        console.log(chalk.gray("   The project structure is being created by the orchestratorAgent,"));
        console.log(chalk.gray("   which delegates to briefExtractorAgent and other specialized agents."));
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
