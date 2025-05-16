import axios, { AxiosInstance } from "axios";
import {
  ApiConfig,
  ApiResponse,
  AgentResponse,
  Message,
  ProjectInitRequest,
  FeatureRequest,
  DeploymentRequest,
  WorkflowStatusUpdate,
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
            projectName:
              request.projectName ||
              request.idea
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, "")
                .replace(/\s+/g, "-")
                .replace(/-+/g, "-")
                .substring(0, 30),
          },
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
          content:
            workflowResponse.text ||
            workflowResponse.output?.scaffoldResult ||
            "Project initialization completed",
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
    onProgress: (
      text: string,
      files?: Array<{ path: string; content: string }>
    ) => void
  ): Promise<ApiResponse<AgentResponse>> {
    try {
      // Create a workflow run first
      console.log("Creating workflow run...");
      const createRunResponse = await fetch(
        `${this.client.defaults.baseURL}/api/workflows/projectGenerationWorkflow/createRun`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
          },
        }
      );

      if (!createRunResponse.ok) {
        const errorText = await createRunResponse.text();
        console.error("Error response:", errorText);
        throw new Error(
          `Failed to create workflow run: ${createRunResponse.status}. Details: ${errorText}`
        );
      }

      const createRunData = await createRunResponse.json();
      console.log("Create run response:", JSON.stringify(createRunData));

      const runId = createRunData.runId;
      if (!runId) {
        throw new Error("No runId returned from createRun endpoint");
      }

      console.log(`Created run with ID: ${runId}`);

      // Start watching the workflow for real-time updates
      const watchUrl = `${this.client.defaults.baseURL}/api/workflows/projectGenerationWorkflow/watch?runId=${runId}`;
      console.log(`Watching workflow at: ${watchUrl}`);
      
      // Define fetch options with timeout
      const fetchOptions = {
        method: "GET", // Explicitly set GET method for watch endpoint
        headers: {
          Accept: "text/event-stream", // Add proper headers for SSE
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        // SSE connections need longer timeouts than regular requests
        signal: AbortSignal.timeout(60000), // 60 second timeout for headers
      };
      
      let watchResponse;
      let watchPromise;
      try {
        // Start the watch request but don't await it yet
        watchPromise = fetch(watchUrl, fetchOptions);
      } catch (error) {
        console.error("Error initiating watch request:", error);
        // Continue without watch - we'll rely on polling
      }

      // Start the workflow with our input data
      console.log(`Starting workflow with runId: ${runId}...`);
      const startUrl = `${this.client.defaults.baseURL}/api/workflows/projectGenerationWorkflow/start-async`;
      console.log(`Starting workflow at: ${startUrl}`);

      const response = await fetch(startUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify({
          runId,
          inputData: {
            projectIdea: request.idea,
            projectName: request.projectName,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Workflow start error response:", errorText);
        throw new Error(
          `Workflow start failed with status: ${response.status}. Details: ${errorText}`
        );
      }

      console.log("Workflow started successfully");
      
      // Also use the monitorWorkflowStatus method as a backup monitoring approach
      const outputDir = request.outputDir || process.cwd();
      this.monitorWorkflowStatus(
        "projectGenerationWorkflow",
        runId,
        (status) => {
          console.log(`Workflow status from polling: ${status.status}`);
          if (status.activePaths.size > 0) {
            status.activePaths.forEach((value, key) => {
              console.log(`Step ${key}: ${value.status}`);
            });
          }
        },
        { 
          pollingInterval: 1000,
          outputDir // Pass the output directory to the monitoring function
        }
      );

      // Variable for the watch Stream reader
      let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
      let watchResponseObject: Response | undefined;
      
      // Process the workflow watch responses if we have a watch request
      if (watchPromise) {
        try {
          // Set a timeout for the watch fetch
          const timeoutPromise = new Promise<Response>((_, reject) => {
            setTimeout(() => reject(new Error('Watch request timed out')), 15000);
          });
          
          // Race the fetch against the timeout
          watchResponseObject = await Promise.race([watchPromise, timeoutPromise]);
          
          if (!watchResponseObject.ok) {
            console.error(`Workflow watch failed with status: ${watchResponseObject.status}`);
            // Continue with polling only - don't throw
          } else if (!watchResponseObject.body) {
            console.error("Watch response body is null");
            // Continue with polling only - don't throw
          } else {
            // Process the watch stream
            reader = watchResponseObject.body.getReader();
          }
        } catch (error) {
          console.error("Error getting watch response:", error);
          // Continue with polling as fallback
        }
      }
      
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";
      let generatedFiles: Array<{ path: string; content: string }> = [];
      let currentStep = ""; // Track the current step in the workflow
      let workflowComplete = false;

      console.log("Started processing watch stream events...");

      // Function to fetch workflow step outputs
      const fetchStepOutput = async (stepId: string): Promise<string> => {
        try {
          const stepResponse = await fetch(
            `${this.client.defaults.baseURL}/api/workflows/projectGenerationWorkflow/runs?runId=${runId}`,
            {
              headers: {
                ...(this.apiKey
                  ? { Authorization: `Bearer ${this.apiKey}` }
                  : {}),
              },
            }
          );

          if (stepResponse.ok) {
            const runData = await stepResponse.json();

            // Look for the step output in the run data
            if (
              runData.steps &&
              runData.steps[stepId] &&
              runData.steps[stepId].output
            ) {
              const stepOutput = runData.steps[stepId].output;
              // Different steps have different output formats
              if (stepId === "extractBrief")
                return stepOutput.extractedBrief || "";
              if (stepId === "parseBrief")
                return JSON.stringify(stepOutput.parsedBrief, null, 2) || "";
              if (stepId === "createPlan") return stepOutput.projectPlan || "";
              if (stepId === "scaffoldProject")
                return stepOutput.scaffoldResult || "";

              // Default: stringify any output
              return typeof stepOutput === "string"
                ? stepOutput
                : JSON.stringify(stepOutput, null, 2);
            }
          }
        } catch (e) {
          console.error(`Error fetching output for step ${stepId}:`, e);
        }
        return "";
      };

      // Function to check for generated files
      const checkForFiles = async (): Promise<boolean> => {
        try {
          // When workflow is completed, check for files in the scaffoldProject step output
          const fileCheckResponse = await fetch(
            `${this.client.defaults.baseURL}/api/workflows/projectGenerationWorkflow/runs?runId=${runId}`,
            {
              headers: {
                ...(this.apiKey
                  ? { Authorization: `Bearer ${this.apiKey}` }
                  : {}),
              },
            }
          );

          if (fileCheckResponse.ok) {
            const runData = await fileCheckResponse.json();
            // Check if the scaffoldProject step has files in its output
            if (
              runData.steps &&
              runData.steps.scaffoldProject &&
              runData.steps.scaffoldProject.output &&
              runData.steps.scaffoldProject.output.files
            ) {
              const files = runData.steps.scaffoldProject.output.files;
              generatedFiles = files.map((file: MastraFile) => ({
                path: file.path,
                content: file.content || "",
              }));

              return generatedFiles.length > 0;
            }
          }
        } catch (e) {
          console.error("Error checking for files:", e);
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
        // Process workflow events, but only if we have a valid reader
        if (reader) {
          // Process the watch stream if we have a reader
          while (true) {
            try {
              const { done, value } = await reader.read();
              
              if (done) {
                console.log("Workflow watch completed");
                break;
              }

              // Decode and process the chunk
              const chunk = decoder.decode(value, { stream: true });
              buffer += chunk;

              // Process each event in the buffer (separated by double newlines)
              let eventEnd;
              while ((eventEnd = buffer.indexOf("\n\n")) >= 0) {
                const eventData = buffer.slice(0, eventEnd).trim();
                buffer = buffer.slice(eventEnd + 2);

                console.log(`Raw event data: ${eventData}`);

                // Parse the event data
                if (eventData.startsWith("data: ")) {
                  try {
                    const jsonString = eventData.slice(6);
                    console.log(`Parsing JSON: ${jsonString}`);
                    const jsonData = JSON.parse(jsonString);
                    console.log(`Parsed JSON data:`, jsonData);

                    // Handle different event types
                    if (jsonData.type === "step") {
                      // A workflow step has updated its status
                      const stepId = jsonData.stepId;
                      const status = jsonData.status;

                      if (status === "running") {
                        // Step started running
                        currentStep = stepId;
                        const stepText = `Running step: ${stepId}...\n`;
                        fullText += stepText;
                        onProgress(fullText, generatedFiles);
                      } else if (status === "success") {
                        // Step completed successfully
                        console.log(`Step ${stepId} completed successfully`);
                        const stepOutput = await fetchStepOutput(stepId);
                        const stepCompletedText = `Completed step: ${stepId}\n\n`;
                        fullText += stepCompletedText;

                        if (stepOutput) {
                          fullText += `${stepOutput}\n\n`;
                          onProgress(fullText, generatedFiles);
                        }

                        // Check for files after scaffold step
                        if (stepId === "scaffoldProject") {
                          await checkForFiles();
                          onProgress(fullText, generatedFiles);
                        }
                      } else if (status === "failed") {
                        // Step failed
                        fullText += `Error in step: ${stepId}\n`;
                        onProgress(fullText, generatedFiles);
                      }
                    } else if (jsonData.type === "status") {
                      console.log(`Workflow status update: ${jsonData.status}`);

                      if (jsonData.status === "completed") {
                        // Workflow has completed
                        workflowComplete = true;
                        const completedText = "Workflow completed\n";
                        fullText += completedText;
                        onProgress(fullText, generatedFiles);

                        // Check for files when workflow is done
                        const hasFiles = await checkForFiles();
                        if (hasFiles) {
                          onProgress(fullText, generatedFiles);
                        }
                      } else {
                        // For any other status updates
                        const statusText = `Workflow status: ${jsonData.status}\n`;
                        fullText += statusText;
                        onProgress(fullText, generatedFiles);
                      }
                    } else {
                      console.log(
                        `Unhandled event type: ${jsonData.type || "unknown"}`
                      );
                    }
                  } catch (e) {
                    console.error(
                      "Error parsing event data:",
                      e,
                      "\nRaw data:",
                      eventData.slice(6)
                    );
                  }
                } else {
                  console.log(
                    `Event doesn't start with 'data: ', raw event: ${eventData}`
                  );
                }
              }
            } catch (readError) {
              console.error("Error reading from stream:", readError);
              break; // Break the read loop on error
            }
          } // End of while loop
        } else {
          // If we don't have a reader, just rely on polling
          console.log("Using polling-only mode for workflow updates");
          // Wait for polling to complete naturally
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      } catch (streamError) {
        console.error("Error processing workflow stream:", streamError);
        // We'll continue and return what we have so far
      } finally {
        clearInterval(fileCheckInterval);
      }

      // Return the final response
      return {
        success: true,
        data: {
          messages: [
            {
              role: "user" as const,
              content: `Initialize project: ${request.idea} with name: ${request.projectName}`,
            },
            { role: "assistant" as const, content: fullText },
          ],
          generatedFiles,
        },
      };
    } catch (error) {
      console.error("Streaming error:", error);
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
      const response = await this.client.get("/health");
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Gets the base URL of the API server
   * @returns The base URL of the API server
   */
  public getBaseUrl(): string {
    return this.client.defaults.baseURL || "";
  }

  /**
   * Extracts project files from a completed workflow and writes them to the specified output directory
   * @param workflowName Name of the workflow that generated the files
   * @param runId ID of the workflow run
   * @param outputDir Directory to write the files to (defaults to current directory)
   * @returns Promise that resolves when files are extracted
   */
  private async extractProjectFiles(
    workflowName: string,
    runId: string,
    outputDir: string = process.cwd()
  ): Promise<void> {
    try {
      console.log(`Extracting project files from ${workflowName} run ${runId} to ${outputDir}...`);
      
      // Fetch the workflow run data to get file information
      console.log(`Fetching workflow data from: /api/workflows/${workflowName}/runs?runId=${runId}`);
      const response = await this.client.get<{
        steps: Record<string, {
          status: string;
          output: any;
        }>;
      }>(`/api/workflows/${workflowName}/runs`, {
        params: { runId },
      });
      
      // Check if we have a successful response with steps
      if (!response.data || !response.data.steps) {
        console.log('No workflow steps found in response');
        console.log('Response data:', JSON.stringify(response.data, null, 2));
        
        // Try an alternative approach - check the output directory on the server
        await this.extractFromOutputDirectory(outputDir, runId);
        return;
      }
      
      console.log('Workflow steps found:', Object.keys(response.data.steps).join(', '));
      
      // Find the scaffold step that contains file information
      const scaffoldStep = Object.entries(response.data.steps).find(
        ([stepId, step]) => stepId.includes('scaffold') && step.status === 'success'
      );
      
      if (!scaffoldStep) {
        console.log('No successful scaffold step found, looking for any scaffold step...');
        // Try to find any scaffold step, even if not marked as success
        const anyScaffoldStep = Object.entries(response.data.steps).find(
          ([stepId]) => stepId.includes('scaffold')
        );
        
        if (!anyScaffoldStep) {
          console.log('No scaffold step found at all, trying alternate extraction methods...');
          await this.extractFromOutputDirectory(outputDir, runId);
          return;
        }
        
        console.log(`Found scaffold step ${anyScaffoldStep[0]} with status: ${anyScaffoldStep[1].status}`);
        
        if (!anyScaffoldStep[1].output || !anyScaffoldStep[1].output.files) {
          console.log('Scaffold step found but no files in output:', anyScaffoldStep[0]);
          console.log('Step output:', JSON.stringify(anyScaffoldStep[1].output, null, 2));
          await this.extractFromOutputDirectory(outputDir, runId);
          return;
        }
        
        const files: MastraFile[] = anyScaffoldStep[1].output.files;
        await this.writeFilesToDirectory(files, outputDir);
        return;
      }
      
      console.log(`Found successful scaffold step: ${scaffoldStep[0]}`);
      
      if (!scaffoldStep[1].output || !scaffoldStep[1].output.files) {
        console.log('Successful scaffold step found but no files in output');
        console.log('Step output:', JSON.stringify(scaffoldStep[1].output, null, 2));
        await this.extractFromOutputDirectory(outputDir, runId);
        return;
      }
      
      const files: MastraFile[] = scaffoldStep[1].output.files;
      if (!files || files.length === 0) {
        console.log('No files found in scaffold step output');
        await this.extractFromOutputDirectory(outputDir, runId);
        return;
      }
      
      await this.writeFilesToDirectory(files, outputDir);
    } catch (error) {
      console.error('Error extracting project files:', error);
      // Try the fallback method if the main method fails
      try {
        await this.extractFromOutputDirectory(outputDir);
      } catch (fallbackError) {
        console.error('Fallback extraction also failed:', fallbackError);
      }
    }
  }
  
  /**
   * Fallback method to extract files from the .mastra/output directory
   * @param outputDir Directory to write the files to
   * @param runId Optional runId for file matching
   */
  private async extractFromOutputDirectory(outputDir: string, runId?: string): Promise<void> {
    try {
      console.log('Attempting to extract files from backend output directory...');
      
      // Import required modules for file operations
      const fs = await import('fs');
      const path = await import('path');
      
      // Define paths to check
      const potentialPaths = [
        '/home/vishesh.baghel/Documents/workspace/hack-helper/backend/.mastra/output',
        './backend/.mastra/output',
        '../backend/.mastra/output',
        './.mastra/output'
      ];
      
      let outputPath = '';
      for (const testPath of potentialPaths) {
        if (fs.existsSync(testPath)) {
          outputPath = testPath;
          console.log(`Found output directory: ${outputPath}`);
          break;
        }
      }
      
      if (!outputPath) {
        console.log('Could not find the .mastra/output directory');
        return;
      }
      
      // Look for the most recent directory in the output folder
      let directories = fs.readdirSync(outputPath)
        .filter(file => fs.statSync(path.join(outputPath, file)).isDirectory());
      
      // If runId is provided, try to find a matching directory
      if (runId) {
        const matchingDirs = directories.filter(dir => dir.includes(runId));
        if (matchingDirs.length > 0) {
          directories = matchingDirs;
        }
      }
      
      // Sort by modification time (newest first)
      directories.sort((a, b) => {
        return fs.statSync(path.join(outputPath, b)).mtime.getTime() -
               fs.statSync(path.join(outputPath, a)).mtime.getTime();
      });
      
      if (directories.length === 0) {
        console.log('No project directories found in the output folder');
        return;
      }
      
      const latestDir = path.join(outputPath, directories[0]);
      console.log(`Using most recent project directory: ${latestDir}`);
      
      // Copy all files from the source to the destination
      this.copyFilesRecursively(latestDir, outputDir, fs, path);
    } catch (error) {
      console.error('Error in fallback extraction:', error);
    }
  }
  
  /**
   * Copy files recursively from one directory to another
   */
  private copyFilesRecursively(
    sourceDir: string, 
    targetDir: string, 
    fs: typeof import('fs'), 
    path: typeof import('path')
  ): void {
    // Create the target directory if it doesn't exist
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // Read all items in the source directory
    const items = fs.readdirSync(sourceDir);
    
    let fileCount = 0;
    for (const item of items) {
      const sourcePath = path.join(sourceDir, item);
      const targetPath = path.join(targetDir, item);
      
      const stats = fs.statSync(sourcePath);
      
      if (stats.isDirectory()) {
        // Recursively copy directories
        this.copyFilesRecursively(sourcePath, targetPath, fs, path);
      } else {
        // Copy files
        fs.copyFileSync(sourcePath, targetPath);
        fileCount++;
        console.log(`Copied file: ${targetPath}`);
      }
    }
    
    console.log(`Copied ${fileCount} files from ${sourceDir} to ${targetDir}`);
  }
  
  /**
   * Write Mastra files to the specified directory
   */
  /**
   * Public method to manually ensure project files are extracted to the specified directory
   * This can be called from the CLI when files are not found in the expected location
   * @param outputDir Directory to write the files to
   * @returns Promise that resolves when files are extracted
   */
  public async ensureProjectFilesExtracted(outputDir: string): Promise<void> {
    try {
      console.log('Manual extraction of project files requested...');
      
      // First try to extract from any recent workflow runs
      const response = await this.client.get<{
        runs: Array<{
          id: string;
          status: string;
          startTime: string;
        }>;
      }>('/api/workflows/projectGenerationWorkflow/runs/list');
      
      if (response.data && response.data.runs && response.data.runs.length > 0) {
        // Sort runs by start time (most recent first)
        const runs = response.data.runs.sort((a, b) => {
          return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
        });
        
        console.log(`Found ${runs.length} workflow runs, trying most recent ones...`);
        
        // Try the three most recent runs
        const recentRuns = runs.slice(0, 3);
        
        for (const run of recentRuns) {
          console.log(`Attempting extraction from run ${run.id} (${run.status})...`);
          await this.extractProjectFiles('projectGenerationWorkflow', run.id, outputDir);
          
          // Check if files were extracted successfully
          const fs = await import('fs');
          if (fs.existsSync(outputDir) && fs.readdirSync(outputDir).length > 0) {
            console.log(`Successfully extracted files from run ${run.id}`);
            return;
          }
        }
      }
      
      // If no successful extraction from workflow runs, try the fallback method
      await this.extractFromOutputDirectory(outputDir);
    } catch (error) {
      console.error('Error in ensureProjectFilesExtracted:', error);
      // Try one more fallback approach
      await this.extractFromOutputDirectory(outputDir);
    }
  }
  
  private async writeFilesToDirectory(files: MastraFile[], outputDir: string): Promise<void> {
    console.log(`Writing ${files.length} files to ${outputDir}`);
    
    // Import required modules for file operations
    const fs = await import('fs');
    const path = await import('path');
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write each file to the output directory
    let fileCount = 0;
    for (const file of files) {
      try {
        if (!file.path) {
          console.log('Skipping file with no path');
          continue;
        }
        
        // Create full path to the file
        const filePath = path.join(outputDir, file.path);
        
        // Create directory if it doesn't exist
        const dirPath = path.dirname(filePath);
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
        
        // Write file content
        fs.writeFileSync(filePath, file.content || '');
        fileCount++;
        console.log(`Wrote file: ${filePath}`);
      } catch (fileError) {
        console.error(`Error writing file ${file.path}:`, fileError);
      }
    }
    
    console.log(`Successfully extracted ${fileCount} files to ${outputDir}`);
  }

  /**
   * Monitors the status of a workflow run with periodic polling
   * @param workflowName Name of the workflow to monitor
   * @param runId Unique identifier for the workflow run
   * @param onUpdate Callback function for status updates
   * @param options Additional options for monitoring
   * @returns Function to stop the monitoring
   */
  public monitorWorkflowStatus(
    workflowName: string,
    runId: string,
    onUpdate: (status: WorkflowStatusUpdate) => void,
    options?: {
      pollingInterval?: number;
      maxRetries?: number;
      stopOnCompletion?: boolean;
      outputDir?: string; // Add option for output directory
    }
  ): () => void {
    // Default options
    const pollingInterval = options?.pollingInterval || 2000;
    const maxRetries = options?.maxRetries || 3;
    const stopOnCompletion = options?.stopOnCompletion !== false;
    const outputDir = options?.outputDir || process.cwd(); // Default to current directory

    // Tracking variables
    let isMonitoring = true;
    let consecutiveErrors = 0;
    let projectFiles: MastraFile[] = [];
    let hasExtractedFiles = false;

    // Polling function that calls itself recursively
    const poll = async (): Promise<void> => {
      if (!isMonitoring) {
        return;
      }

      try {
        console.log(`Polling workflow status for ${workflowName}:${runId}...`);
        const response = await this.client.get<{
          status: string;
          results: Record<string, any>;
          activePaths: Record<
            string,
            {
              status: string;
              suspendPayload?: any;
              stepPath: string[];
            }
          >;
          timestamp: number;
        }>(`/api/workflows/${workflowName}/watch`, {
          params: { runId },
        });

        console.log(
          `Received response:`,
          JSON.stringify(response.data, null, 2)
        );

        if (response.data) {
          // Reset error counter on successful response
          consecutiveErrors = 0;

          // Process workflow data
          const workflowData = response.data;

          // Convert activePaths to a Map for type safety and easier access
          const activePaths = new Map(
            Object.entries(workflowData.activePaths || {})
          );

          // Call the update callback with the status data
          console.log(`Calling onUpdate with status: ${workflowData.status}`);
          onUpdate({
            runId,
            status: workflowData.status,
            results: workflowData.results || {},
            activePaths,
            timestamp: workflowData.timestamp || Date.now(),
          });
          
          // If workflow is complete or has a scaffold step that completed,
          // check for and extract project files
          const isWorkflowComplete = ["completed", "success"].includes(workflowData.status);
          const hasScaffoldCompleted = Array.from(activePaths.entries())
            .some(([stepId, step]) => 
              stepId.includes("scaffold") && step.status === "success");
            
          if ((isWorkflowComplete || hasScaffoldCompleted) && !hasExtractedFiles) {
            // Attempt to extract project files
            await this.extractProjectFiles(workflowName, runId, outputDir);
            hasExtractedFiles = true;
          }

          // Stop monitoring if workflow is complete and stopOnCompletion is true
          if (
            stopOnCompletion &&
            ["completed", "failed", "cancelled", "error"].includes(
              workflowData.status
            )
          ) {
            if (!hasExtractedFiles) {
              // One last attempt to extract files
              await this.extractProjectFiles(workflowName, runId, outputDir);
            }
            isMonitoring = false;
            return;
          }
        }
      } catch (error) {
        consecutiveErrors++;
        console.error(
          `Error polling workflow status (attempt ${consecutiveErrors}):`,
          error
        );

        // Stop monitoring after reaching max retries
        if (consecutiveErrors >= maxRetries) {
          console.error(
            `Stopping workflow monitoring after ${maxRetries} consecutive failures`
          );
          isMonitoring = false;
          return;
        }
      }

      // Continue polling if still monitoring
      if (isMonitoring) {
        setTimeout(poll, pollingInterval);
      }
    };

    // Start polling immediately
    poll();

    // Return function to stop monitoring
    return () => {
      isMonitoring = false;
    };
  }
}
