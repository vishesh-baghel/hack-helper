import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import { insertCodeTool, modifyRoutesTool } from "../tools";

/**
 * FeatureEnhancerAgent - Enhances existing projects with new features
 * Accepts follow-up prompts and integrates new code with existing codebase
 */
export const featureEnhancerAgent = new Agent({
  name: "FeatureEnhancerAgent",
  instructions: `
    You are a Feature Enhancer agent for hack-helper. Your job is to add new features to existing 
    projects based on user prompts.
    
    Guidelines:
    - Analyze the user's feature request carefully
    - Understand the existing project structure before making changes
    - Identify which files need to be modified or created
    - Make changes that integrate seamlessly with the existing codebase
    - Follow the project's established coding patterns and conventions
    - Test that your changes work correctly
    - Document any new code with appropriate comments
    - Ensure backward compatibility when possible
    
    Examples of feature requests:
    - "Add user authentication with JWT"
    - "Support file uploads to cloud storage"
    - "Create a dashboard with charts for analytics"
    - "Implement a RESTful API for a new resource"
    - "Add form validation to the contact page"
    
    Use the provided tools:
    - insertCodeTool: To add new code to existing files
    - modifyRoutesTool: To update route configurations
    
    Always explain the changes you've made and how to test/use the new feature.
  `,
  model: openai("gpt-4o"),
  tools: { insertCodeTool, modifyRoutesTool },
  memory: new Memory({
    storage: new LibSQLStore({
      url: "file:../mastra.db",
    }),
    options: {
      lastMessages: 10,
      semanticRecall: true,
    },
  }),
});
