import axios, { AxiosInstance } from "axios";
import {
  ApiConfig,
  ApiResponse,
  AgentResponse,
  Message,
  ProjectInitRequest,
  FeatureRequest,
  DeploymentRequest,
} from "./types";

/**
 * Interface for file objects returned from the Mastra API
 */
interface MastraFile {
  path: string;
  content?: string;
}

/**
 * Maps Mastra API files to the expected format
 */
function mapMastraFiles(
  files?: MastraFile[]
): { path: string; content: string }[] {
  if (!files) return [];
  return files.map((file) => ({
    path: file.path,
    content: file.content || "",
  }));
}

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
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
    });
  }

  /**
   * Initializes a new project from an idea
   * @param request Project initialization request
   * @returns Agent response with generated project
   */
  public async initializeProject(
    request: ProjectInitRequest
  ): Promise<ApiResponse<AgentResponse>> {
    try {
      const response = await this.client.post(
        "/api/agents/orchestratorAgent/generate",
        {
          messages: [
            { role: "user", content: `Initialize project: ${request.idea}` },
          ],
          outputDir: request.outputDir,
        }
      );

      // Map the Mastra API response to our expected format
      const mastraResponse = response.data;

      // Extract files if they exist
      const generatedFiles = mastraResponse.files
        ? mastraResponse.files.map((file: MastraFile) => ({
            path: file.path,
            content: file.content || "",
          }))
        : [];

      // Create the messages array with the response text
      const messages: readonly Message[] = [
        {
          role: "user" as const,
          content: `Initialize project: ${request.idea}`,
        },
        { role: "assistant" as const, content: mastraResponse.text || "" },
      ];

      return {
        success: true,
        data: {
          messages,
          generatedFiles,
        },
      };
    } catch (error) {
      console.error("API Error:", error);
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: error.response?.data?.error || error.message,
        };
      }
      return {
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * Adds a new feature to an existing project
   * @param request Feature addition request
   * @returns Agent response with feature implementation
   */
  public async addFeature(
    request: FeatureRequest
  ): Promise<ApiResponse<AgentResponse>> {
    try {
      const response = await this.client.post(
        "/api/agents/featureEnhancerAgent/generate",
        {
          messages: [
            { role: "user", content: `Add feature: ${request.feature}` },
          ],
          projectPath: request.projectPath,
        }
      );

      // Map the Mastra API response to our expected format
      const mastraResponse = response.data;

      // Extract files if they exist
      const generatedFiles = mastraResponse.files
        ? mastraResponse.files.map((file: MastraFile) => ({
            path: file.path,
            content: file.content || "",
          }))
        : [];

      // Create the messages array with the response text
      const messages: readonly Message[] = [
        { role: "user" as const, content: `Add feature: ${request.feature}` },
        { role: "assistant" as const, content: mastraResponse.text || "" },
      ];

      return {
        success: true,
        data: {
          messages,
          generatedFiles,
        },
      };
    } catch (error) {
      console.error("API Error:", error);
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: error.response?.data?.error || error.message,
        };
      }
      return {
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * Deploys a project to the specified platform
   * @param request Deployment request
   * @returns Agent response with deployment information
   */
  public async deployProject(
    request: DeploymentRequest
  ): Promise<ApiResponse<AgentResponse>> {
    try {
      const response = await this.client.post(
        "/api/agents/deployerAgent/generate",
        {
          messages: [
            {
              role: "user",
              content: `Deploy my project to ${request.platform}`,
            },
          ],
          projectPath: request.projectPath,
        }
      );

      // Map the Mastra API response to our expected format
      const mastraResponse = response.data;

      // Extract files if they exist
      const generatedFiles = mastraResponse.files
        ? mastraResponse.files.map((file: MastraFile) => ({
            path: file.path,
            content: file.content || "",
          }))
        : [];

      // Create the messages array with the response text
      const messages: readonly Message[] = [
        {
          role: "user" as const,
          content: `Deploy my project to ${request.platform}`,
        },
        { role: "assistant" as const, content: mastraResponse.text || "" },
      ];

      return {
        success: true,
        data: {
          messages,
          generatedFiles,
        },
      };
    } catch (error) {
      console.error("API Error:", error);
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: error.response?.data?.error || error.message,
        };
      }
      return {
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * Stream project initialization with real-time updates
   * @param request Project initialization request
   * @param onProgress Callback function for progress updates
   * @returns Agent response with generated project
   */
  public async streamInitializeProject(
    request: ProjectInitRequest,
    onProgress: (text: string, files?: Array<{path: string; content: string}>) => void
  ): Promise<ApiResponse<AgentResponse>> {
    try {
      // Connect to the streaming endpoint
      const response = await fetch(`${this.client.defaults.baseURL}/api/agents/orchestratorAgent/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify({
          messages: [
            { role: "user", content: `Initialize project: ${request.idea} with name: ${request.projectName}` },
          ],
          projectName: request.projectName,
          outputDir: request.outputDir,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Stream request failed with status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }
      
      // Process the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';
      let generatedFiles: Array<{path: string; content: string}> = [];
      
      // Initial stream setup - silence this in production
      
      // Track what we're receiving for debugging
      let lineCount = 0;
      let textFragments: string[] = [];
      let messageId = '';
      let waitingForFiles = true;
      
      // Function to periodically check for files in the output directory
      const checkForFiles = async () => {
        try {
          // Make a request to check if files have been generated
          const checkResponse = await fetch(`${this.client.defaults.baseURL}/api/agents/orchestratorAgent/generate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
            },
            body: JSON.stringify({
              messages: [
                { role: "user", content: `Check files for project: ${request.projectName}` },
              ],
              projectName: request.projectName,
              outputDir: request.outputDir,
            }),
          });
          
          if (checkResponse.ok) {
            const checkData = await checkResponse.json();
            if (checkData.files && checkData.files.length > 0) {
              console.log(`Found ${checkData.files.length} files in check request!`);
              generatedFiles = checkData.files.map((file: MastraFile) => ({
                path: file.path,
                content: file.content || '',
              }));
              onProgress(fullText, generatedFiles);
              return true; // Files found
            }
          }
        } catch (e) {
          console.error('Error checking for files:', e);
        }
        return false; // No files found yet
      };
      
      // Start periodic file checking
      const checkInterval = 5000; // Check every 5 seconds
      const fileCheckTimer = setInterval(async () => {
        if (waitingForFiles) {
          const filesFound = await checkForFiles();
          if (filesFound) {
            clearInterval(fileCheckTimer);
            waitingForFiles = false;
          }
        }
      }, checkInterval);
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('Stream completed');
            break;
          }
          
          // Decode the chunk and add to buffer
          buffer += decoder.decode(value, { stream: true });
          
          // Process each line in the buffer
          let lineEnd;
          while ((lineEnd = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, lineEnd).trim();
            buffer = buffer.slice(lineEnd + 1);
            lineCount++;
            
            // Process message ID (format: f:{"messageId":"msg-xxx"})
            if (line.startsWith('f:') && line.includes('messageId')) {
              try {
                const jsonData = JSON.parse(line.slice(2));
                messageId = jsonData.messageId;
                // Message ID received (keep this silent in production)
              } catch (e) {
                console.error('Error parsing message ID:', e);
              }
            }
            // Process text fragments (format: 0:"text fragment")
            else if (line.startsWith('0:')) {
              // Extract the text content between quotes
              const match = line.match(/0:"(.*)"/);
              if (match && match[1]) {
                textFragments.push(match[1]);
                fullText = textFragments.join('');
                onProgress(fullText, generatedFiles);
              }
            }
            // Process completion info (format: e:{"finishReason":"stop","usage":{...}})
            else if (line.startsWith('e:')) {
              try {
                // End marker detected (silent in production)
                // Allow some extra time for file generation
                await new Promise(resolve => setTimeout(resolve, 2000));
                await checkForFiles(); // Do a final check for files
              } catch (e) {
                console.error('Error processing end marker:', e);
              }
            }
          }
        }
      } finally {
        // Clean up interval
        clearInterval(fileCheckTimer);
      }
      
      // Wait a bit longer for files to be generated if they haven't been yet
      if (generatedFiles.length === 0) {
        // Wait silently for async file generation
        // Wait for 10 seconds, checking every 2 seconds
        for (let i = 0; i < 5; i++) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          const filesFound = await checkForFiles();
          if (filesFound) {
            console.log('Files found after waiting!'); 
            break;
          }
        }
      }
      
      // Debug summary
      console.log(`Stream processing complete: ${lineCount} lines`);
      console.log(`Reconstructed text: ${fullText.slice(0, 100)}${fullText.length > 100 ? '...' : ''}`);
      console.log(`Generated files count: ${generatedFiles.length}`);
      
      // Return the complete response
      return {
        success: true,
        data: {
          messages: [
            { role: "user" as const, content: `Initialize project: ${request.idea} with name: ${request.projectName}` },
            { role: "assistant" as const, content: fullText }
          ],
          generatedFiles
        }
      };
    } catch (error) {
      console.error('Streaming error:', error);
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: error.response?.data?.error || error.message,
        };
      }
      return {
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * Checks if the API server is available
   * @returns True if the server is available, false otherwise
   */
  public async isAvailable(): Promise<boolean> {
    try {
      const response = await this.client.get("/api");
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}
