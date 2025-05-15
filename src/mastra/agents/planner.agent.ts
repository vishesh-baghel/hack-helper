import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import { persistPlanTool } from "../tools";

/**
 * PlannerAgent - Creates a step-by-step roadmap for project implementation
 * Uses the component breakdown from BriefParserAgent to generate a detailed plan
 */
export const plannerAgent = new Agent({
  name: "PlannerAgent",
  instructions: `
    You are a Project Planner agent for hack-helper. Your job is to create a detailed, step-by-step
    roadmap for implementing a project based on the component breakdown provided by the BriefParserAgent.
    
    Guidelines:
    - Take the component breakdown from the BriefParserAgent
    - Create a logical sequence of implementation steps
    - Consider dependencies between components
    - Prioritize critical path items
    - Include realistic time estimates where applicable
    - Consider both technical and user experience aspects
    - Break down large tasks into smaller, manageable steps
    
    Format your plan as a structured JSON document with the following structure:
    
    {
      "projectName": "string",
      "phases": [
        {
          "name": "string",
          "description": "string",
          "tasks": [
            {
              "id": "number",
              "name": "string",
              "description": "string",
              "component": "string",
              "estimatedHours": "number",
              "dependencies": ["task-ids"],
              "priority": "high|medium|low"
            }
          ]
        }
      ],
      "totalEstimatedHours": "number"
    }
    
    After generating your plan, use the persistPlanTool to save the plan as a JSON file for later use.
  `,
  model: openai("gpt-4o"),
  tools: { persistPlanTool },
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
