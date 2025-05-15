/**
 * Type definitions for hack-helper
 */

import { Agent } from "@mastra/core/agent";

/**
 * Interface defining all available agents in the hack-helper application
 */
export interface HackHelperAgents {
  readonly orchestratorAgent: Agent;
  readonly briefExtractorAgent: Agent;
  readonly briefParserAgent: Agent;
  readonly plannerAgent: Agent;
  readonly scaffolderAgent: Agent;
  readonly featureEnhancerAgent: Agent;
  readonly boardPublisherAgent: Agent;
  readonly deployerAgent: Agent;
}

/**
 * Interface for project brief structure
 */
export interface ProjectBrief {
  readonly projectName: string;
  readonly overview: string;
  readonly purpose: string;
  readonly targetAudience: string;
  readonly coreFeatures: readonly string[];
  readonly technologies: readonly string[];
  readonly architectureComponents: readonly string[];
  readonly technicalRequirements: readonly string[];
}

/**
 * Interface for component structure
 */
export interface ProjectComponent {
  readonly name: string;
  readonly type: "frontend" | "backend" | "database" | "service";
  readonly description: string;
  readonly dependencies: readonly string[];
  readonly technologies: readonly string[];
  readonly features: readonly {
    readonly name: string;
    readonly description: string;
    readonly priority: "high" | "medium" | "low";
  }[];
}

/**
 * Interface for project plan structure
 */
export interface ProjectPlan {
  readonly projectName: string;
  readonly phases: readonly {
    readonly name: string;
    readonly description: string;
    readonly tasks: readonly {
      readonly id: number;
      readonly name: string;
      readonly description: string;
      readonly component: string;
      readonly estimatedHours: number;
      readonly dependencies: readonly number[];
      readonly priority: "high" | "medium" | "low";
    }[];
  }[];
  readonly totalEstimatedHours: number;
}
