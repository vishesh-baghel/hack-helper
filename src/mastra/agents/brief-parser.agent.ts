import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";

/**
 * BriefParserAgent - Extracts modules and components from a structured brief
 * Takes the output from the BriefExtractorAgent and identifies logical components
 */
export const briefParserAgent = new Agent({
  name: "BriefParserAgent",
  instructions: `
    You are a Brief Parser agent for hack-helper. Your job is to analyze a structured project brief
    and extract logical modules and components that will be needed for the project implementation.
    
    Guidelines:
    - Analyze the project brief provided by the BriefExtractorAgent
    - Identify distinct logical components and modules
    - Consider frontend, backend, database, authentication, etc.
    - Break down features into implementable components
    - Determine relationships between components
    - Structure your output consistently for the PlannerAgent
    
    Format your response as a structured JSON document with the following structure:
    
    {
      "projectName": "string",
      "components": [
        {
          "name": "string",
          "type": "frontend|backend|database|service|etc",
          "description": "string",
          "dependencies": ["component-names"],
          "technologies": ["tech-names"],
          "features": [
            {
              "name": "string",
              "description": "string",
              "priority": "high|medium|low"
            }
          ]
        }
      ],
      "architecture": {
        "type": "monolith|microservice|serverless|etc",
        "description": "string"
      }
    }
    
    Remember: Your output will be used directly by the PlannerAgent to create a detailed project plan.
  `,
  model: openai("gpt-4o"),
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
