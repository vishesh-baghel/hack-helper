#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import figlet from 'figlet';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { mastra, getAgents } from './mastra';

// Load environment variables
dotenv.config();

// Create the CLI program
const program = new Command();

// ASCII art banner
console.log(chalk.cyan(figlet.textSync('hack-helper', { horizontalLayout: 'full' })));
console.log(chalk.yellow('AI-powered project scaffolder and enhancer'));
console.log();

/**
 * Checks if OpenAI API key exists and prompts for it if not
 * @returns {Promise<void>}
 */
const checkApiKey = async (): Promise<void> => {
  if (!process.env.OPENAI_API_KEY) {
    const { apiKey } = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: 'Enter your OpenAI API key:',
        validate: (input) => (input.length > 0 ? true : 'API key is required')
      }
    ]);

    // Save API key to .env file
    const envPath = path.join(process.cwd(), '.env');
    const envContent = fs.existsSync(envPath) 
      ? `${fs.readFileSync(envPath, 'utf-8')}\nOPENAI_API_KEY=${apiKey}`
      : `OPENAI_API_KEY=${apiKey}`;
    
    fs.writeFileSync(envPath, envContent);
    process.env.OPENAI_API_KEY = apiKey;
  }
};

// Initialize command
program
  .command('init')
  .description('Initialize a new project from an idea prompt')
  .argument('<idea>', 'Your project idea')
  .option('-o, --output <dir>', 'Output directory', './output')
  .action(async (idea, options) => {
    await checkApiKey();
    console.log(chalk.green('🚀 Initializing project from idea:'), chalk.italic(idea));
    
    try {
      // Access agents through the configured Mastra instance
      const agents = getAgents();
      const result = await agents.orchestratorAgent.generate(
        [{ role: 'user', content: `Initialize project: ${idea}` }]
      );
      console.log(chalk.green('✅ Project initialized successfully!'));
    } catch (error) {
      console.error(chalk.red('❌ Error initializing project:'), error);
    }
  });

// Add feature command
program
  .command('add')
  .description('Add a new feature to an existing project')
  .argument('<feature>', 'Feature description')
  .action(async (feature) => {
    await checkApiKey();
    console.log(chalk.green('🔧 Adding feature:'), chalk.italic(feature));
    
    try {
      const agents = getAgents();
      const result = await agents.featureEnhancerAgent.generate(
        [{ role: 'user', content: `Add feature: ${feature}` }]
      );
      console.log(chalk.green('✅ Feature added successfully!'));
    } catch (error) {
      console.error(chalk.red('❌ Error adding feature:'), error);
    }
  });

// Deploy command
program
  .command('deploy')
  .description('Deploy the project to Vercel')
  .action(async () => {
    await checkApiKey();
    console.log(chalk.green('🚀 Deploying project to Vercel...'));
    
    try {
      const agents = getAgents();
      const result = await agents.deployerAgent.generate(
        [{ role: 'user', content: 'Deploy my project to Vercel' }]
      );
      console.log(chalk.green('✅ Project deployed successfully!'));
    } catch (error) {
      console.error(chalk.red('❌ Error deploying project:'), error);
    }
  });

// Parse command line arguments
program.parse(process.argv);

// Show help if no command is provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
