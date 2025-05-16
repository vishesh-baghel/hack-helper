import { AgentNetwork } from '@mastra/core/network';
import { openai } from '@ai-sdk/openai';

// Import all agents
import { orchestratorAgent } from './agents/orchestrator.agent';
import { briefExtractorAgent } from './agents/brief-extractor.agent';
import { briefParserAgent } from './agents/brief-parser.agent';
import { plannerAgent } from './agents/planner.agent';
import { scaffolderAgent } from './agents/scaffolder.agent';
import { featureEnhancerAgent } from './agents/feature-enhancer.agent';
import { boardPublisherAgent } from './agents/board-publisher.agent';
import { deployerAgent } from './agents/deployer.agent';

/**
 * HackHelperNetwork - Coordinates all specialized agents in the hack-helper system
 * Uses an LLM-based router to dynamically determine which agent to call next
 */

// Enhanced logging for agent delegation
const logAgentInvocation = (originalGenerate: (...args: any[]) => Promise<any>) => {
  return async function(this: { name: string }, ...args: any[]): Promise<any> {
    const agentName = this.name;
    console.log(`=== AgentNetwork: Delegating to ${agentName} ===`);
    const startTime = Date.now();
    
    try {
      const result = await originalGenerate.apply(this, args);
      const endTime = Date.now();
      console.log(`AgentNetwork: ${agentName} completed in ${(endTime - startTime) / 1000}s`);
      return result;
    } catch (error) {
      console.error(`AgentNetwork: Error in ${agentName}:`, error);
      throw error;
    }
  };
};

// Create network with enhanced logging
export const hackHelperNetwork = new AgentNetwork({
  name: 'HackHelperNetwork',
  instructions: `
    You are the coordinator for a network of specialized agents that work together to build software projects from user ideas.
    
    Your job is to:
    1. Understand the user's request
    2. Determine which specialized agent is best suited to handle each part of the task
    3. Call the appropriate agent with clear instructions
    4. Collect and synthesize the results from each agent
    5. Present a unified response to the user
    
    Available specialized agents:
    
    - orchestratorAgent: The central coordinator that manages the overall workflow
    - briefExtractorAgent: Extracts key details from the user's project idea
    - briefParserAgent: Parses and structures the extracted details
    - plannerAgent: Creates a detailed project plan
    - scaffolderAgent: Sets up the initial project structure
    - featureEnhancerAgent: Adds or enhances features in the project
    - boardPublisherAgent: Creates project management boards
    - deployerAgent: Handles deployment of the project
    
    Always delegate tasks to the most appropriate specialized agent rather than trying to solve everything yourself.
  `,
  model: openai('gpt-4o'),
  agents: [
    orchestratorAgent,
    briefExtractorAgent,
    briefParserAgent,
    plannerAgent,
    scaffolderAgent,
    featureEnhancerAgent,
    boardPublisherAgent,
    deployerAgent,
  ],
});
