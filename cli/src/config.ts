/**
 * Configuration settings for the hack-helper CLI
 */

export const config = {
  /**
   * URL of the Mastra API server
   * Can be overridden with API_URL environment variable
   */
  apiUrl: 'http://localhost:4441',
  
  /**
   * Default timeout for API requests in milliseconds
   */
  requestTimeout: 60000,
  
  /**
   * Default output directory for generated projects
   */
  defaultOutputDir: './output'
};
