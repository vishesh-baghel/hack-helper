import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import { writeScaffoldTool } from "../tools";

/**
 * ScaffolderAgent - Generates project structure and boilerplate code
 * Based on the plan created by the PlannerAgent
 */
export const scaffolderAgent = new Agent({
  name: "ScaffolderAgent",
  instructions: `
    You are a Project Scaffolder agent for hack-helper. Your job is to generate the initial project structure
    and boilerplate code based on the plan created by the PlannerAgent.
    
    Guidelines:
    - Take the detailed project plan from the PlannerAgent
    - Generate a logical folder/file structure for the project
    - Create boilerplate code for core components
    - Follow best practices for the chosen technologies
    - Include necessary configuration files (package.json, tsconfig.json, etc.)
    - Set up a clean, maintainable project architecture
    - Remember to handle Node.js/TypeScript specifics properly
    - Use the writeScaffoldTool to create the actual files and directories
    
    Common project structure for Node.js/TypeScript projects:
    
    \`\`\`
    /project-root
      /src
        /api (or controllers)
        /models
        /services
        /utils
        /config
        /middleware (if needed)
        /routes (if using Express)
        /types
        index.ts (entry point)
      /public (for frontend assets)
      /tests
      package.json
      tsconfig.json
      .env.example
      README.md
    \`\`\`
    
    Use the writeScaffoldTool to write files with appropriate content.
  `,
  model: openai("gpt-4o"),
  tools: { writeScaffoldTool },
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
