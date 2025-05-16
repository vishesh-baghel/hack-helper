import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { mastra } from "../index"; // Import the mastra instance

// API call tracking to prevent rate limiting and endless loops
interface ApiCallTracker {
  lastCallTime: Record<string, number>;
  callCount: Record<string, number>;
  isRateLimited: boolean;
  rateLimitResetTime: number;
}

// Module-level variable to track API calls across invocations
const apiCallTracker: ApiCallTracker = {
  lastCallTime: {},
  callCount: {},
  isRateLimited: false,
  rateLimitResetTime: 0
};

/**
 * Tool that allows one agent to delegate tasks to another agent
 * Provides direct agent-to-agent communication with enhanced validation
 */
export const delegateToAgentTool = createTool({
  id: "delegateToAgent",
  description: "Delegate a task to another specialized agent",
  inputSchema: z.object({
    agentId: z.string().describe("The ID of the agent to delegate to (e.g., briefExtractorAgent)"),
    task: z.string().describe("The task or question to delegate to the agent"),
    context: z.string().optional().describe("Additional context to provide to the agent"),
    expectedFormat: z.string().optional().describe("Expected format of the response for validation"),
    workflowState: z.string().optional().describe("Current state in the workflow process")
  }),
  execute: async ({ context }) => {
    const { agentId, task, context: agentContext, expectedFormat, workflowState } = context;
    
    // Input validation
    if (!task || task.trim().length < 10) {
      return {
        success: false,
        error: "Task is too short or empty. Please provide a detailed task description.",
        validationError: true
      };
    }
    
    console.log(`=== AgentDelegation: Delegating to ${agentId} ===`);
    console.log(`AgentDelegation: Task: "${task.substring(0, 100)}${task.length > 100 ? '...' : ''}"`);    
    if (workflowState) {
      console.log(`AgentDelegation: Current workflow state: ${workflowState}`);
    }
    
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
      // Use module-level API call tracker
      const now = Date.now();
      
      // Global rate limit cooldown
      if (apiCallTracker.isRateLimited && now < apiCallTracker.rateLimitResetTime) {
        const waitTime = Math.ceil((apiCallTracker.rateLimitResetTime - now) / 1000);
        console.log(`AgentDelegation: System is rate limited. Waiting ${waitTime}s before retry...`);
        
        // Wait for the cooldown period
        await new Promise(resolve => setTimeout(resolve, apiCallTracker.rateLimitResetTime - now));
      }
      
      // Per-agent throttling
      if (apiCallTracker.lastCallTime[agentId] && now - apiCallTracker.lastCallTime[agentId] < 2000) {
        const waitTime = 2000 - (now - apiCallTracker.lastCallTime[agentId]);
        console.log(`AgentDelegation: Throttling ${agentId} calls. Waiting ${waitTime}ms...`);
        
        // Add small delay between calls to the same agent
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      // Update tracking
      apiCallTracker.lastCallTime[agentId] = Date.now();
      apiCallTracker.callCount[agentId] = (apiCallTracker.callCount[agentId] || 0) + 1;
      
      // Too many calls to the same agent - possible loop
      if (apiCallTracker.callCount[agentId] > 10) {
        console.warn(`AgentDelegation: WARNING - High call count (${apiCallTracker.callCount[agentId]}) detected for ${agentId}. Possible loop.`);
      }
      
      const startTime = Date.now();
      console.log(`AgentDelegation: Calling ${agentId}...`);
      
      // Add expected format to task if provided
      let enhancedTask = task;
      if (expectedFormat) {
        enhancedTask += `\n\nIMPORTANT: Your response must follow this format: ${expectedFormat}`;
      }
      
      // Construct the prompt as a single string to avoid type issues
      const prompt = `${agentContext ? agentContext + '\n\n' : ''}${enhancedTask}`;
      
      // Call the target agent with the task as a single string
      let response;
      try {
        response = await targetAgent.generate(prompt);
      } catch (apiError: any) {
        // Handle rate limiting specifically
        if (apiError.message && apiError.message.includes('Rate limit reached')) {
          // Extract wait time if available in the error message
          const waitTimeMatch = apiError.message.match(/try again in ([\d.]+)([ms])/i);
          const waitTime = waitTimeMatch ? 
            (waitTimeMatch[2] === 's' ? parseFloat(waitTimeMatch[1]) * 1000 : parseFloat(waitTimeMatch[1])) : 
            60000; // Default to 60s if we can't parse the time
          
          // Set global rate limit state
          apiCallTracker.isRateLimited = true;
          apiCallTracker.rateLimitResetTime = Date.now() + waitTime + 5000; // Add 5s buffer
          
          console.warn(`AgentDelegation: Rate limit hit. Setting cooldown for ${Math.ceil(waitTime/1000)}s`);
          
          // Return rate limited response
          return {
            success: false,
            error: `Rate limit reached for ${agentId}. Try again shortly.`,
            errorType: 'rate_limited',
            retryAfter: waitTime,
            workflowState
          };
        }
        throw apiError; // Re-throw other errors
      }
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      console.log(`AgentDelegation: ${agentId} responded in ${processingTime / 1000}s`);
      console.log(`AgentDelegation: Response length: ${response.text.length} characters`);
      
      // Validate response based on agent type and expected format
      let validationResult = validateAgentResponse(agentId, response.text, expectedFormat);
      
      // Reset call counter on successful response
      if (validationResult.isValid) {
        apiCallTracker.callCount[agentId] = 0;
      }
      
      return {
        success: validationResult.isValid,
        response: response.text,
        agentId,
        processingTime,
        validationResult: validationResult,
        workflowState
      };
    } catch (error: unknown) {
      console.error(`AgentDelegation: Error delegating to ${agentId}:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Error delegating to ${agentId}: ${errorMessage}`,
        errorType: 'execution_error'
      };
    }
  }
});

/**
 * Validates agent response based on agent type and expected format
 * @param agentId The ID of the agent that provided the response
 * @param response The response text to validate
 * @param expectedFormat Optional expected format description
 * @returns Validation result object
 */
function validateAgentResponse(
  agentId: string,
  response: string,
  expectedFormat?: string
): { isValid: boolean; reason?: string } {
  // Basic validation - check if response is not empty
  if (!response || response.trim().length === 0) {
    return { isValid: false, reason: "Empty response" };
  }
  
  // Agent-specific validation
  switch (agentId) {
    case 'briefExtractorAgent':
      // Check if response has required sections
      const requiredSections = ['Overview', 'Purpose', 'Core Features', 'Technologies'];
      const missingSection = requiredSections.find(section => !response.includes(section));
      
      if (missingSection) {
        return {
          isValid: false,
          reason: `Missing required section: ${missingSection}`
        };
      }
      break;
      
    case 'briefParserAgent':
      // Verify response is valid JSON with expected structure
      try {
        // Check if the response looks like JSON (starts with { and ends with })
        if (!response.trim().startsWith('{') || !response.trim().endsWith('}')) {
          return { isValid: false, reason: "Response is not in JSON format" };
        }
        
        // Try to parse as JSON
        const parsedJson = JSON.parse(response);
        
        // Verify required fields
        if (!parsedJson.projectName || !parsedJson.components || !Array.isArray(parsedJson.components)) {
          return { 
            isValid: false, 
            reason: "Missing required JSON fields: projectName or components array"
          };
        }
      } catch (error) {
        return { isValid: false, reason: "Invalid JSON structure" };
      }
      break;
      
    case 'plannerAgent':
      // Basic validation for planner - check if it contains project structure info
      if (!response.includes('Project Structure') && !response.includes('structure')) {
        return { isValid: false, reason: "Missing project structure information" };
      }
      break;
      
    case 'scaffolderAgent':
      // Check if scaffolder confirms file generation
      if (!response.includes('successfully') && !response.includes('generated') && !response.includes('created')) {
        return { isValid: false, reason: "No confirmation of file generation" };
      }
      break;
  }
  
  // If we made it here, the validation passed
  return { isValid: true };
}
