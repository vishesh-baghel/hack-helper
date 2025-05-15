import { Mastra } from "@mastra/core/mastra";
import { createLogger } from "@mastra/core/logger";
import { LibSQLStore } from "@mastra/libsql";
import { orchestratorAgent } from "./agents/orchestrator.agent";

// import {
//   orchestratorAgent,
//   briefExtractorAgent,
//   briefParserAgent,
//   plannerAgent,
//   scaffolderAgent,
//   featureEnhancerAgent,
//   boardPublisherAgent,
//   deployerAgent
// } from './consolidated-agents';

import { briefExtractorAgent } from "./agents/brief-extractor.agent";
import { briefParserAgent } from "./agents/brief-parser.agent";
import { plannerAgent } from "./agents/planner.agent";
import { scaffolderAgent } from "./agents/scaffolder.agent";
import { featureEnhancerAgent } from "./agents/feature-enhancer.agent";
import { boardPublisherAgent } from "./agents/board-publisher.agent";
import { deployerAgent } from "./agents/deployer.agent";

/**
 * Main Mastra instance for hack-helper
 * This configures all agents and their dependencies
 */
export const mastra = new Mastra({
  agents: {
    orchestratorAgent,
    briefExtractorAgent,
    briefParserAgent,
    plannerAgent,
    scaffolderAgent,
    featureEnhancerAgent,
    boardPublisherAgent,
    deployerAgent,
  },
  storage: new LibSQLStore({
    url: "file:../mastra.db", // Using persistent storage for the project
  }),
  logger: createLogger({
    name: "hack-helper",
    level: "info",
  }),
});

// Export a typesafe way to get all agents
export const getAgents = () => mastra.getAgents();

/**
 * Type definition for all available hack-helper agents
 */
export type HackHelperAgents = ReturnType<typeof getAgents>;
