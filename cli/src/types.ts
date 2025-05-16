/**
 * Type definitions for the CLI application
 */

/**
 * Configuration for the API client
 */
export type ApiConfig = {
  readonly baseUrl: string;
  readonly apiKey?: string;
};

/**
 * API response structure
 */
export type ApiResponse<T> = {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
};

/**
 * Message format for agent interactions
 */
export type Message = {
  readonly role: 'user' | 'assistant' | 'system';
  readonly content: string;
};

/**
 * Project initialization request
 */
export type ProjectInitRequest = {
  readonly idea: string;
  readonly projectName: string;
  readonly outputDir?: string;
};

/**
 * Feature addition request
 */
export type FeatureRequest = {
  readonly feature: string;
  readonly projectPath?: string;
};

/**
 * Deployment request
 */
export type DeploymentRequest = {
  readonly platform: 'vercel' | 'netlify' | 'github' | string;
  readonly projectPath?: string;
};

/**
 * Agent response containing generated content
 */
export type AgentResponse = {
  readonly messages: readonly Message[];
  readonly generatedFiles?: readonly {
    readonly path: string;
    readonly content: string;
  }[];
};
