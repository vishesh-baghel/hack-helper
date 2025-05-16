import axios, { AxiosInstance } from 'axios';
import { ApiConfig, ApiResponse, AgentResponse, Message, ProjectInitRequest, FeatureRequest, DeploymentRequest } from './types';

/**
 * Client for communicating with the Mastra API server
 */
export class ApiClient {
  private readonly client: AxiosInstance;
  private readonly apiKey?: string;

  /**
   * Creates a new API client
   * @param config Configuration for the API client
   */
  constructor(config: ApiConfig) {
    const { baseUrl, apiKey } = config;
    this.apiKey = apiKey;
    
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
      }
    });
  }

  /**
   * Initializes a new project from an idea
   * @param request Project initialization request
   * @returns Agent response with generated project
   */
  public async initializeProject(request: ProjectInitRequest): Promise<ApiResponse<AgentResponse>> {
    try {
      const response = await this.client.post<ApiResponse<AgentResponse>>('/api/agents/orchestrator', {
        messages: [{ role: 'user', content: `Initialize project: ${request.idea}` }],
        outputDir: request.outputDir
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: error.response?.data?.error || error.message
        };
      }
      return {
        success: false,
        error: String(error)
      };
    }
  }

  /**
   * Adds a new feature to an existing project
   * @param request Feature addition request
   * @returns Agent response with feature implementation
   */
  public async addFeature(request: FeatureRequest): Promise<ApiResponse<AgentResponse>> {
    try {
      const response = await this.client.post<ApiResponse<AgentResponse>>('/api/agents/feature-enhancer', {
        messages: [{ role: 'user', content: `Add feature: ${request.feature}` }],
        projectPath: request.projectPath
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: error.response?.data?.error || error.message
        };
      }
      return {
        success: false,
        error: String(error)
      };
    }
  }

  /**
   * Deploys a project to the specified platform
   * @param request Deployment request
   * @returns Agent response with deployment information
   */
  public async deployProject(request: DeploymentRequest): Promise<ApiResponse<AgentResponse>> {
    try {
      const response = await this.client.post<ApiResponse<AgentResponse>>('/api/agents/deployer', {
        messages: [{ role: 'user', content: `Deploy my project to ${request.platform}` }],
        projectPath: request.projectPath
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: error.response?.data?.error || error.message
        };
      }
      return {
        success: false,
        error: String(error)
      };
    }
  }

  /**
   * Checks if the API server is available
   * @returns True if the server is available, false otherwise
   */
  public async isAvailable(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/health');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}
