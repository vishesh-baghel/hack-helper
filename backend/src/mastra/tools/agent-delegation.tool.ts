import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { mastra } from "../index"; // Import the mastra instance

/**
 * Tool that allows one agent to delegate tasks to another agent
 * Provides direct agent-to-agent communication
 */
export const delegateToAgentTool = createTool({
  id: "delegateToAgent",
  description: "Delegate a task to another specialized agent",
  inputSchema: z.object({
    agentId: z.string().describe("The ID of the agent to delegate to (e.g., briefExtractorAgent)"),
    task: z.string().describe("The task or question to delegate to the agent"),
    context: z.string().optional().describe("Additional context to provide to the agent")
  }),
  execute: async ({ context }) => {
    const { agentId, task, context: agentContext } = context;
    console.log(`=== AgentDelegation: Delegating to ${agentId} ===`);
    console.log(`AgentDelegation: Task: "${task.substring(0, 100)}${task.length > 100 ? '...' : ''}"`);
    
    // Get the requested agent from the mastra instance
    const agents = mastra.getAgents();
    const targetAgent = agents[agentId as keyof typeof agents];
    
    if (!targetAgent) {
      console.error(`AgentDelegation: Agent ${agentId} not found`);
      return {
        success: false,
        error: `Agent ${agentId} not found`,
        availableAgents: Object.keys(agents)
      };
    }
    
    try {
      const startTime = Date.now();
      console.log(`AgentDelegation: Calling ${agentId}...`);
      
      // Construct the prompt as a single string to avoid type issues
      const prompt = `${agentContext ? agentContext + '\n\n' : ''}${task}`;
      
      // Call the target agent with the task as a single string
      const response = await targetAgent.generate(prompt);
      
      const endTime = Date.now();
      console.log(`AgentDelegation: ${agentId} responded in ${(endTime - startTime) / 1000}s`);
      console.log(`AgentDelegation: Response length: ${response.text.length} characters`);
      
      return {
        success: true,
        response: response.text,
        agentId,
        processingTime: endTime - startTime
      };
    } catch (error: unknown) {
      console.error(`AgentDelegation: Error delegating to ${agentId}:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Error delegating to ${agentId}: ${errorMessage}`
      };
    }
  }
});
