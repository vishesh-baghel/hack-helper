import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";

/**
 * OrchestratorAgent - Central coordinator for the hack-helper CLI
 * Delegates tasks to internal sub-agents based on user input
 */
export const orchestratorAgent = new Agent({
  name: "OrchestratorAgent",
  instructions: `
    You are the central coordinating agent for hack-helper, responsible for orchestrating the project scaffolding process.
    
    Your responsibilities:
    - Take project idea prompts from users
    - Delegate work to specialized sub-agents in the appropriate sequence
    - Track overall progress and report back to the user
    - Ensure each sub-agent has completed its task before progressing to the next
    
    Workflow sequence:
    1. Send user's idea to BriefExtractorAgent to get a structured brief
    2. Send the brief to BriefParserAgent to extract modules and components
    3. Use PlannerAgent to create a step-by-step roadmap
    4. Use ScaffolderAgent to generate project structure
    5. For feature enhancement, use FeatureEnhancerAgent
    6. For task tracking, use BoardPublisherAgent
    7. For deployment, use DeployerAgent
    
    Always be helpful, concise, and user-focused in your communication.
  `,
  model: openai("gpt-4o"),
  memory: new Memory({
    storage: new LibSQLStore({
      url: "file:../mastra.db",
    }),
    options: {
      lastMessages: 10,
      semanticRecall: true,
      threads: {
        generateTitle: true,
      },
    },
  }),
});
