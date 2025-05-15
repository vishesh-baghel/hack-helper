import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

// Promisify exec for async/await usage
const execAsync = promisify(exec);

/**
 * Tool for deploying a project to Vercel
 * Used by the DeployerAgent to deploy the generated project
 */
export const vercelDeployTool = createTool({
  id: 'vercel-deploy',
  description: 'Deploys a project to Vercel',
  inputSchema: z.object({
    projectPath: z.string().describe('Path to the project directory'),
    projectName: z.string().describe('Name for the deployed project'),
    teamName: z.string().optional().describe('Vercel team name (if applicable)'),
    environment: z.enum(['production', 'preview', 'development']).default('production').describe('Deployment environment'),
    buildCommand: z.string().optional().describe('Custom build command if needed'),
    outputDirectory: z.string().optional().describe('Custom output directory if needed'),
    installVercel: z.boolean().default(false).describe('Whether to install Vercel CLI if not present'),
    vercelToken: z.string().optional().describe('Vercel authentication token (will default to env variable)')
  }),
  outputSchema: z.object({
    success: z.boolean(),
    deployedUrl: z.string().optional(),
    logs: z.string().optional(),
    message: z.string()
  }),
  execute: async ({ context }) => {
    const { 
      projectPath,
      projectName,
      teamName,
      environment,
      buildCommand,
      outputDirectory,
      installVercel,
      vercelToken
    } = context;
    
    // Check if project directory exists
    try {
      await fs.access(projectPath);
    } catch {
      return {
        success: false,
        message: `Project directory ${projectPath} does not exist`
      };
    }
    
    try {
      // Verify or install Vercel CLI
      try {
        await execAsync('vercel --version');
      } catch {
        if (installVercel) {
          console.log('Installing Vercel CLI...');
          await execAsync('npm install -g vercel');
        } else {
          return {
            success: false,
            message: 'Vercel CLI is not installed. Run with installVercel: true to install automatically.'
          };
        }
      }
      
      // Create vercel.json configuration file if it doesn't exist
      const vercelConfigPath = path.join(projectPath, 'vercel.json');
      try {
        await fs.access(vercelConfigPath);
      } catch {
        // Create basic vercel.json
        const vercelConfig = {
          name: projectName,
          ...(buildCommand && { buildCommand }),
          ...(outputDirectory && { outputDirectory }),
          ...(teamName && { scope: teamName })
        };
        
        await fs.writeFile(
          vercelConfigPath,
          JSON.stringify(vercelConfig, null, 2),
          'utf-8'
        );
      }
      
      // Prepare deployment command
      let deployCommand = `vercel ${projectPath} --name ${projectName} --confirm`;
      
      if (teamName) {
        deployCommand += ` --scope ${teamName}`;
      }
      
      if (environment === 'production') {
        deployCommand += ' --prod';
      }
      
      // Add token if provided
      const token = vercelToken || process.env.VERCEL_TOKEN;
      if (token) {
        deployCommand += ` --token ${token}`;
      }
      
      // Execute deployment
      console.log(`Deploying ${projectName} to Vercel...`);
      const { stdout, stderr } = await execAsync(deployCommand);
      
      // Extract deployed URL from output
      const deployedUrl = stdout.match(/https:\/\/[^\s]+\.vercel\.app/)?.[0] || 
                          stdout.match(/https:\/\/[^\s]+/)?.[0];
      
      if (!deployedUrl) {
        return {
          success: false,
          logs: stdout + '\n' + stderr,
          message: 'Deployment might have failed or URL not found in output'
        };
      }
      
      return {
        success: true,
        deployedUrl,
        logs: stdout,
        message: `Successfully deployed ${projectName} to ${deployedUrl}`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Error deploying to Vercel: ${errorMessage}`
      };
    }
  }
});
