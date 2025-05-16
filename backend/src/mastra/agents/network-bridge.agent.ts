import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import { hackHelperNetwork } from "../network";

/**
 * NetworkBridgeAgent - Special agent that delegates to the AgentNetwork
 * Acts as a bridge between the API and our AgentNetwork
 */
export const networkBridgeAgent = new Agent({
  name: "NetworkBridge",
  instructions: `
    ### ROLE DEFINITION
    You are a bridge agent that delegates user requests to the HackHelperNetwork. 
    Your only job is to pass the user's request to the network and return the response.
    
    ### CORE CAPABILITIES
    - Understand user requests related to project creation and enhancement
    - Delegate these requests to the HackHelperNetwork
    - Return the network's response to the user
    
    ### BEHAVIORAL GUIDELINES
    - Be transparent about your delegating role
    - Do not attempt to solve problems yourself
    - Always delegate to the network
  `,
  model: openai("gpt-4o"),
  memory: new Memory({
    storage: new LibSQLStore({
      url: "file:../mastra.db",
    }),
    options: {
      lastMessages: 10,
      semanticRecall: false,
      threads: {
        generateTitle: true,
      },
    },
  }),
  
  // Use a custom tool to delegate to the network
  tools: {
    delegateToNetwork: {
      id: "delegateToNetwork",
      description: "Delegates the request to the HackHelperNetwork",
      execute: async ({ runtimeContext }) => {
        console.log("=== NetworkBridgeAgent: Starting delegation to HackHelperNetwork ===");
        
        // Get messages from runtime context
        const messages = runtimeContext.messages || [];
        console.log(`NetworkBridgeAgent: Received ${messages.length} messages to process`);
        
        if (messages.length > 0) {
          // Log the last message to see what the user is asking for
          const lastMessage = messages[messages.length - 1];
          console.log(`NetworkBridgeAgent: Processing request: "${lastMessage.content.substring(0, 100)}${lastMessage.content.length > 100 ? '...' : ''}"`);
        }
        
        try {
          console.log("NetworkBridgeAgent: Delegating to AgentNetwork...");
          // Delegate to the network
          const startTime = Date.now();
          const response = await hackHelperNetwork.generate(messages);
          const endTime = Date.now();
          
          console.log(`NetworkBridgeAgent: AgentNetwork response received in ${(endTime - startTime) / 1000}s`);
          console.log(`NetworkBridgeAgent: Response length: ${response.text.length} characters`);
          
          return {
            success: true,
            response: response.text,
            details: "Request successfully delegated to the HackHelperNetwork",
            processingTime: endTime - startTime
          };
        } catch (error) {
          console.error("NetworkBridgeAgent: Error while delegating to AgentNetwork:", error);
          return {
            success: false,
            error: String(error)
          };
        }
      }
    }
  }
});
