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
      // Using standard Mastra workflow API endpoints
      // First, we start the projectGenerationWorkflow
      const response = await this.client.post(
        "/api/workflows/projectGenerationWorkflow/start-async",
        {
          input: {
            projectIdea: request.idea,
            projectName: request.projectName || request.idea.toLowerCase()
              .replace(/[^a-z0-9\s-]/g, '')
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-')
              .substring(0, 30)
          }
        }
      );

      // Get the workflow execution details and any generated content
      const workflowResponse = response.data;

      // Map files from the response or use an empty array if none exist
      const generatedFiles = workflowResponse.files 
        ? workflowResponse.files.map((file: MastraFile) => ({
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
        { 
          role: "assistant" as const, 
          content: workflowResponse.text || workflowResponse.output?.scaffoldResult || "Project initialization completed" 
        },
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
      // If you have a feature-enhancement workflow, use it here
      // For now, we're using the direct agent endpoint as before
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
      // Create a workflow run first
      console.log("Creating workflow run...");
      const createRunResponse = await fetch(`${this.client.defaults.baseURL}/api/workflows/projectGenerationWorkflow/createRun`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        }
      });
      
      if (!createRunResponse.ok) {
        const errorText = await createRunResponse.text();
        console.error("Error response:", errorText);
        throw new Error(`Failed to create workflow run: ${createRunResponse.status}. Details: ${errorText}`);
      }
      
      const createRunData = await createRunResponse.json();
      console.log("Create run response:", JSON.stringify(createRunData));
      
      const runId = createRunData.runId;
      if (!runId) {
        throw new Error('No runId returned from createRun endpoint');
      }
      
      console.log(`Created run with ID: ${runId}`);
      
      // Start watching the workflow for real-time updates
      const watchUrl = `${this.client.defaults.baseURL}/api/workflows/projectGenerationWorkflow/watch?runId=${runId}`;
      console.log(`Watching workflow at: ${watchUrl}`);
      const watchResponse = fetch(watchUrl, {
        method: 'GET', // Explicitly set GET method for watch endpoint
        headers: {
          'Accept': 'text/event-stream', // Add proper headers for SSE
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
      });
      
      // Start the workflow with our input data
      console.log(`Starting workflow with runId: ${runId}...`);
      const startUrl = `${this.client.defaults.baseURL}/api/workflows/projectGenerationWorkflow/start-async`;
      console.log(`Starting workflow at: ${startUrl}`);
      
      const response = await fetch(startUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify({
          runId,
          inputData: {
            projectIdea: request.idea,
            projectName: request.projectName
          }
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Workflow start error response:", errorText);
        throw new Error(`Workflow start failed with status: ${response.status}. Details: ${errorText}`);
      }
      
      console.log("Workflow started successfully");
      
      // Process the workflow watch responses
      const watchResponseObject = await watchResponse;
      if (!watchResponseObject.ok) {
        throw new Error(`Workflow watch failed with status: ${watchResponseObject.status}`);
      }
      
      if (!watchResponseObject.body) {
        throw new Error('Watch response body is null');
      }
      
      // Process the watch stream
      const reader = watchResponseObject.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';
      let generatedFiles: Array<{path: string; content: string}> = [];
      let currentStep = ''; // Track the current step in the workflow
      let workflowComplete = false;
      
      // Function to fetch workflow step outputs
      const fetchStepOutput = async (stepId: string): Promise<string> => {
        try {
          const stepResponse = await fetch(`${this.client.defaults.baseURL}/api/workflows/projectGenerationWorkflow/runs?runId=${runId}`, {
            headers: {
              ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
            },
          });
          
          if (stepResponse.ok) {
            const runData = await stepResponse.json();
            
            // Look for the step output in the run data
            if (runData.steps && runData.steps[stepId] && runData.steps[stepId].output) {
              const stepOutput = runData.steps[stepId].output;
              // Different steps have different output formats
              if (stepId === 'extractBrief') return stepOutput.extractedBrief || '';
              if (stepId === 'parseBrief') return JSON.stringify(stepOutput.parsedBrief, null, 2) || '';
              if (stepId === 'createPlan') return stepOutput.projectPlan || '';
              if (stepId === 'scaffoldProject') return stepOutput.scaffoldResult || '';
              
              // Default: stringify any output
              return typeof stepOutput === 'string' ? stepOutput : JSON.stringify(stepOutput, null, 2);
            }
          }
        } catch (e) {
          console.error(`Error fetching output for step ${stepId}:`, e);
        }
        return '';
      };
      
      // Function to check for generated files
      const checkForFiles = async (): Promise<boolean> => {
        try {
          // When workflow is completed, check for files in the scaffoldProject step output
          const fileCheckResponse = await fetch(`${this.client.defaults.baseURL}/api/workflows/projectGenerationWorkflow/runs?runId=${runId}`, {
            headers: {
              ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
            },
          });
          
          if (fileCheckResponse.ok) {
            const runData = await fileCheckResponse.json();
            // Check if the scaffoldProject step has files in its output
            if (runData.steps && 
                runData.steps.scaffoldProject && 
                runData.steps.scaffoldProject.output && 
                runData.steps.scaffoldProject.output.files) {
              
              const files = runData.steps.scaffoldProject.output.files;
              generatedFiles = files.map((file: MastraFile) => ({
                path: file.path,
                content: file.content || '',
              }));
              
              return generatedFiles.length > 0;
            }
          }
        } catch (e) {
          console.error('Error checking for files:', e);
        }
        return false;
      };
      
      // Set up interval to periodically check for files
      const fileCheckInterval = setInterval(async () => {
        if (workflowComplete) {
          const hasFiles = await checkForFiles();
          if (hasFiles) {
            onProgress(fullText, generatedFiles);
            clearInterval(fileCheckInterval);
          }
        }
      }, 5000);
      
      try {
        // Process workflow events
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('Workflow watch completed');
            break;
          }
          
          // Decode and process the chunk
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          // Process each event in the buffer (separated by double newlines)
          let eventEnd;
          while ((eventEnd = buffer.indexOf('\n\n')) >= 0) {
            const eventData = buffer.slice(0, eventEnd).trim();
            buffer = buffer.slice(eventEnd + 2);
            
            // Parse the event data
            if (eventData.startsWith('data: ')) {
              try {
                const jsonData = JSON.parse(eventData.slice(6));
                
                // Handle different event types
                if (jsonData.type === 'step') {
                  // A workflow step has updated its status
                  const stepId = jsonData.stepId;
                  const status = jsonData.status;
                  
                  if (status === 'running') {
                    // Step started running
                    currentStep = stepId;
                    const stepText = `Running step: ${stepId}...\n`;
                    fullText += stepText;
                    onProgress(fullText, generatedFiles);
                  } 
                  else if (status === 'success') {
                    // Step completed successfully
                    const stepOutput = await fetchStepOutput(stepId);
                    const stepCompletedText = `Completed step: ${stepId}\n\n`;
                    fullText += stepCompletedText;
                    
                    if (stepOutput) {
                      fullText += `${stepOutput}\n\n`;
                      onProgress(fullText, generatedFiles);
                    }
                    
                    // Check for files after scaffold step
                    if (stepId === 'scaffoldProject') {
                      await checkForFiles();
                      onProgress(fullText, generatedFiles);
                    }
                  }
                  else if (status === 'failed') {
                    // Step failed
                    fullText += `Error in step: ${stepId}\n`;
                    onProgress(fullText, generatedFiles);
                  }
                }
                else if (jsonData.type === 'workflow') {
                  // The workflow status has changed
                  const status = jsonData.status;
                  
                  if (status === 'COMPLETED') {
                    workflowComplete = true;
                    fullText += '\nProject initialization completed successfully!\n';
                    // Final check for files
                    await checkForFiles();
                    onProgress(fullText, generatedFiles);
                  }
                  else if (status === 'FAILED') {
                    fullText += '\nProject initialization failed.\n';
                    onProgress(fullText, generatedFiles);
                  }
                }
              } catch (e) {
                console.error('Error parsing event data:', e);
              }
            }
          }
        }
      } finally {
        clearInterval(fileCheckInterval);
      }
      
      // Return the final response
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
