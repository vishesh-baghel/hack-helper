import { Step, Workflow } from "@mastra/core/workflows";
import { z } from "zod";
import { briefExtractorAgent } from "./agents/brief-extractor.agent";
import { briefParserAgent } from "./agents/brief-parser.agent";
import { plannerAgent } from "./agents/planner.agent";
import { scaffolderAgent } from "./agents/scaffolder.agent";
import path from "path";

/**
 * Project Generation Workflow
 * A structured workflow that handles the entire process of generating a project from a user idea
 * using a sequence of specialized agents without loops or race conditions.
 */

// Step 1: Extract Brief
const extractBriefStep = new Step({
  id: "extractBrief",
  execute: async ({ context }) => {
    console.log(`Workflow: Starting Extract Brief step`);
    const projectIdea = context.triggerData.projectIdea;
    
    // Call the brief extractor agent with the full project idea
    const response = await briefExtractorAgent.generate(
      `Extract key details from this project idea: ${projectIdea}. \n\n` +
      `Provide a complete structured brief with the following sections: \n` +
      `- Overview\n` +
      `- Purpose\n` +
      `- Target Audience\n` +
      `- Core Features\n` +
      `- Technologies\n` +
      `- Technical Requirements`
    );
    
    console.log(`Workflow: Extract Brief step completed`);
    return { 
      extractedBrief: response.text,
      projectIdea
    };
  },
});

// Step 2: Parse Brief
const parseBriefStep = new Step({
  id: "parseBrief",
  execute: async ({ context }) => {
    console.log(`Workflow: Starting Parse Brief step`);
    if (context?.steps.extractBrief.status !== "success") {
      throw new Error("Extract brief step failed");
    }
    
    const extractedBrief = context.steps.extractBrief.output.extractedBrief;
    
    // Call the brief parser agent with the extracted brief
    const response = await briefParserAgent.generate(
      `Parse the following extracted brief into a structured JSON format suitable for project planning:\n\n` +
      `${extractedBrief}\n\n` +
      `The output must be a valid JSON object with the following structure:\n` +
      `{\n` +
      `  "projectName": "string",\n` +
      `  "components": [\n` +
      `    {\n` +
      `      "name": "string",\n` +
      `      "type": "frontend|backend|database|service|etc",\n` +
      `      "description": "string",\n` +
      `      "dependencies": ["component-names"],\n` +
      `      "technologies": ["tech-names"],\n` +
      `      "features": [\n` +
      `        {\n` +
      `          "name": "string",\n` +
      `          "description": "string",\n` +
      `          "priority": "high|medium|low"\n` +
      `        }\n` +
      `      ]\n` +
      `    }\n` +
      `  ],\n` +
      `  "architecture": {\n` +
      `    "type": "monolith|microservice|serverless|etc",\n` +
      `    "description": "string"\n` +
      `  }\n` +
      `}`
    );
    
    console.log(`Workflow: Parse Brief step completed`);
    
    // Try to parse the response as JSON
    let parsedBrief;
    try {
      // First attempt to find a JSON block in the response (agent might have wrapped it in text)
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedBrief = JSON.parse(jsonMatch[0]);
      } else {
        // If no JSON block found, try parsing the entire text
        parsedBrief = JSON.parse(response.text);
      }
    } catch (error) {
      console.error("Failed to parse JSON from briefParserAgent response:", error);
      // Return a simplified structure if parsing fails
      parsedBrief = {
        projectName: context.triggerData.projectName || "tool",
        components: [{
          name: "core",
          type: "backend",
          description: "Core functionality",
          dependencies: [],
          technologies: ["typescript", "nodejs"],
          features: [{
            name: "basic",
            description: "Basic functionality",
            priority: "high"
          }]
        }],
        architecture: {
          type: "monolith",
          description: "Simple application architecture"
        }
      };
    }
    
    return { 
      parsedBrief,
      projectName: parsedBrief.projectName || context.triggerData.projectName || "tool"
    };
  },
});

// Step 3: Create Project Plan
const createPlanStep = new Step({
  id: "createPlan",
  execute: async ({ context }) => {
    console.log(`Workflow: Starting Create Plan step`);
    if (context?.steps.parseBrief.status !== "success") {
      throw new Error("Parse brief step failed");
    }
    
    const parsedBrief = context.steps.parseBrief.output.parsedBrief;
    const projectName = context.steps.parseBrief.output.projectName;
    
    // Call the planner agent with the parsed brief
    const response = await plannerAgent.generate(
      `Create a detailed project plan for ${projectName} based on the following parsed brief:\n\n` +
      `${JSON.stringify(parsedBrief, null, 2)}\n\n` +
      `Include specific files to create, their contents, and organization.`
    );
    
    console.log(`Workflow: Create Plan step completed`);
    return { 
      projectPlan: response.text,
      projectName
    };
  },
});

// Step 4: Scaffold Project
const scaffoldProjectStep = new Step({
  id: "scaffoldProject",
  execute: async ({ context }) => {
    console.log(`Workflow: Starting Scaffold Project step`);
    if (context?.steps.createPlan.status !== "success") {
      throw new Error("Create plan step failed");
    }
    
    const projectPlan = context.steps.createPlan.output.projectPlan;
    const projectName = context.steps.createPlan.output.projectName;
    
    // Call the scaffolder agent to generate the project structure
    const response = await scaffolderAgent.generate(
      `Generate the project scaffolding for ${projectName} based on the following project plan:\n\n` +
      `${projectPlan}\n\n` +
      `Create the project directly in the current working directory, not in a subdirectory.`
    );
    
    console.log(`Workflow: Scaffold Project step completed`);
    return { 
      scaffoldResult: response.text,
      projectName
    };
  },
});

// Define the workflow
export const projectGenerationWorkflow = new Workflow({
  name: "project-generation",
  triggerSchema: z.object({
    projectIdea: z.string(),
    projectName: z.string().optional(),
  }),
});

// Build and commit the workflow
projectGenerationWorkflow
  .step(extractBriefStep)
  .then(parseBriefStep)
  .then(createPlanStep)
  .then(scaffoldProjectStep)
  .commit();
