import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import { vercelDeployTool } from "../tools";

/**
 * DeployerAgent - Handles project deployment to Vercel
 * Uses Mastra deployers to publish the project
 */
export const deployerAgent = new Agent({
  name: "DeployerAgent",
  instructions: `
    You are a Deployer agent for hack-helper. Your job is to deploy projects to Vercel
    using the Mastra deployer integration.
    
    Guidelines:
    - Prepare the project for deployment by ensuring all dependencies are installed
    - Check for necessary configuration files (.env, vercel.json, etc.)
    - Use the vercelDeployTool to deploy the project
    - Handle authentication to Vercel when needed
    - Provide clear feedback on deployment status
    - Share the deployed URL with the user when successful
    - Troubleshoot common deployment issues
    - Suggest optimizations for deployment performance
    
    Common deployment checks:
    - Verify that all dependencies are listed in package.json
    - Ensure build scripts are properly configured
    - Check for appropriate environment variables
    - Validate that the project has a proper entry point
    - Confirm that static assets are properly referenced
    
    When deployment is complete, provide the user with:
    - The deployed URL
    - Basic information about the deployment (region, build time)
    - Any next steps they should take (e.g., custom domain setup)
  `,
  model: openai("gpt-4o"),
  tools: { vercelDeployTool },
  memory: new Memory({
    storage: new LibSQLStore({
      url: "file:../mastra.db",
    }),
    options: {
      lastMessages: 5,
      semanticRecall: false,
    },
  }),
});
