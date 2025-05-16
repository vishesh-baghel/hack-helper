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
          outputDir, // Pass the output directory to the monitoring function
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
            setTimeout(
              () => reject(new Error("Watch request timed out")),
              15000
            );
          });

          // Race the fetch against the timeout
          watchResponseObject = await Promise.race([
            watchPromise,
            timeoutPromise,
          ]);

          if (!watchResponseObject.ok) {
            console.error(
              `Workflow watch failed with status: ${watchResponseObject.status}`
            );
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
          await new Promise((resolve) => setTimeout(resolve, 10000));
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
      console.log(
        `Extracting project files from ${workflowName} run ${runId} to ${outputDir}...`
      );

      // Fetch the workflow run data to get file information
      console.log(
        `Fetching workflow data from: /api/workflows/${workflowName}/runs?runId=${runId}`
      );
      const response = await this.client.get<{
        steps: Record<
          string,
          {
            status: string;
            output: any;
          }
        >;
      }>(`/api/workflows/${workflowName}/runs`, {
        params: { runId },
      });

      // Check if we have a successful response with steps
      if (!response.data || !response.data.steps) {
        console.log("No workflow steps found in response");
        console.log("Response data:", JSON.stringify(response.data, null, 2));

        // Try an alternative approach - check the output directory on the server
        await this.extractFromOutputDirectory(outputDir, runId);
        return;
      }

      console.log(
        "Workflow steps found:",
        Object.keys(response.data.steps).join(", ")
      );

      // Find the scaffold step that contains file information
      const scaffoldStep = Object.entries(response.data.steps).find(
        ([stepId, step]) =>
          stepId.includes("scaffold") && step.status === "success"
      );

      if (!scaffoldStep) {
        console.log(
          "No successful scaffold step found, looking for any scaffold step..."
        );
        // Try to find any scaffold step, even if not marked as success
        const anyScaffoldStep = Object.entries(response.data.steps).find(
          ([stepId]) => stepId.includes("scaffold")
        );

        if (!anyScaffoldStep) {
          console.log(
            "No scaffold step found at all, trying alternate extraction methods..."
          );
          await this.extractFromOutputDirectory(outputDir, runId);
          return;
        }

        console.log(
          `Found scaffold step ${anyScaffoldStep[0]} with status: ${anyScaffoldStep[1].status}`
        );

        if (!anyScaffoldStep[1].output || !anyScaffoldStep[1].output.files) {
          console.log(
            "Scaffold step found but no files in output:",
            anyScaffoldStep[0]
          );
          console.log(
            "Step output:",
            JSON.stringify(anyScaffoldStep[1].output, null, 2)
          );
          await this.extractFromOutputDirectory(outputDir, runId);
          return;
        }

        const files: MastraFile[] = anyScaffoldStep[1].output.files;
        await this.writeFilesToDirectory(files, outputDir);
        return;
      }

      console.log(`Found successful scaffold step: ${scaffoldStep[0]}`);

      if (!scaffoldStep[1].output || !scaffoldStep[1].output.files) {
        console.log("Successful scaffold step found but no files in output");
        console.log(
          "Step output:",
          JSON.stringify(scaffoldStep[1].output, null, 2)
        );
        await this.extractFromOutputDirectory(outputDir, runId);
        return;
      }

      const files: MastraFile[] = scaffoldStep[1].output.files;
      if (!files || files.length === 0) {
        console.log("No files found in scaffold step output");
        await this.extractFromOutputDirectory(outputDir, runId);
        return;
      }

      await this.writeFilesToDirectory(files, outputDir);
    } catch (error) {
      console.error("Error extracting project files:", error);
      // Try the fallback method if the main method fails
      try {
        await this.extractFromOutputDirectory(outputDir);
      } catch (fallbackError) {
        console.error("Fallback extraction also failed:", fallbackError);
      }
    }
  }

  /**
   * Fallback method to extract files from the .mastra/output directory
   * @param outputDir Directory to write the files to
   * @param runId Optional runId for file matching
   */
  private async extractFromOutputDirectory(
    outputDir: string,
    runId?: string,
    useAlternativePaths: boolean = false
  ): Promise<void> {
    try {
      console.log(
        "Attempting to extract files from backend output directory..."
      );

      // Import required modules for file operations
      const fs = await import("fs");
      const path = await import("path");

      // Define paths to check - primary paths first, then alternative paths
      const primaryPaths = [
        "/home/vishesh.baghel/Documents/workspace/hack-helper/backend/.mastra/hack-helper",
        "./backend/.mastra/hack-helper",
        "../backend/.mastra/hack-helper",
        "./.mastra/hack-helper",
      ];

      // Additional paths to check if primary paths don't work or when useAlternativePaths is true
      const alternativePaths = [
        "/home/vishesh.baghel/Documents/workspace/hack-helper/backend/.mastra/output",
        "./backend/.mastra/output",
        "../backend/.mastra/output",
        "./.mastra/output",
        "/home/vishesh.baghel/Documents/workspace/hack-helper/backend/.mastra",
        "./backend/.mastra",
        "../backend/.mastra",
        "./.mastra",
        "/home/vishesh.baghel/Documents/workspace/hack-helper/backend",
        "./backend",
        "../backend",
        ".",
      ];

      // Determine which paths to try
      const potentialPaths = useAlternativePaths
        ? [...alternativePaths, ...primaryPaths] // Try alternative paths first
        : [...primaryPaths, ...alternativePaths]; // Try primary paths first

      let outputPath = "";
      let foundDirectory = false;

      // Try to find a suitable output directory
      for (const testPath of potentialPaths) {
        if (fs.existsSync(testPath)) {
          outputPath = testPath;
          console.log(`Found potential output directory: ${outputPath}`);

          // Check if this directory contains project files or subdirectories
          try {
            const contents = fs.readdirSync(outputPath);
            if (contents.length > 0) {
              const hasDirectories = contents.some((item) =>
                fs.statSync(path.join(outputPath, item)).isDirectory()
              );

              // If it has directories or specific project files, consider it a match
              if (
                hasDirectories ||
                contents.some((file) =>
                  ["package.json", "tsconfig.json", "README.md"].includes(file)
                )
              ) {
                console.log(
                  `Found output directory with valid content: ${outputPath}`
                );
                foundDirectory = true;
                break;
              }
            }
          } catch (readError) {
            console.log(`Could not read directory ${testPath}:`, readError);
          }
        }
      }

      if (!foundDirectory) {
        console.log(
          "Could not find any suitable output directory with project files"
        );
        return;
      }

      // Look for the most recent directories in the output folder
      let directories: string[] = [];
      try {
        directories = fs.readdirSync(outputPath).filter((file) => {
          try {
            return fs.statSync(path.join(outputPath, file)).isDirectory();
          } catch (statError) {
            return false;
          }
        });
      } catch (readError) {
        console.error(
          `Error reading output directory ${outputPath}:`,
          readError
        );
      }

      // If runId is provided, try to find a matching directory
      if (runId) {
        const matchingDirs = directories.filter((dir) => dir.includes(runId));
        if (matchingDirs.length > 0) {
          directories = matchingDirs;
        }
      }

      // Sort by modification time (newest first)
      try {
        directories.sort((a, b) => {
          try {
            return (
              fs.statSync(path.join(outputPath, b)).mtime.getTime() -
              fs.statSync(path.join(outputPath, a)).mtime.getTime()
            );
          } catch (statError) {
            return 0; // Keep original order if we can't stat
          }
        });
      } catch (sortError) {
        console.error("Error sorting directories:", sortError);
      }

      if (directories.length === 0) {
        console.log("No project directories found in the output folder");

        // If we're here but outputPath exists, see if we can copy files directly from it
        // This handles the case where files might be directly in the output path
        try {
          const files = fs
            .readdirSync(outputPath)
            .filter(
              (file) => !fs.statSync(path.join(outputPath, file)).isDirectory()
            );

          if (files.length > 0) {
            console.log(
              `Found ${files.length} files directly in ${outputPath}, copying them`
            );
            this.copyFilesRecursively(outputPath, outputDir, fs, path);
            return;
          }
        } catch (readError) {
          console.error("Error checking for direct files:", readError);
        }

        return;
      }

      // First, look for a directory with key project files (package.json, tsconfig.json, etc.)
      for (const dir of directories) {
        const sourceDir = path.join(outputPath, dir);
        console.log(`Checking for complete project in directory: ${sourceDir}`);

        try {
          // Check if this looks like a proper project root (has package.json or tsconfig.json)
          const contents = fs.readdirSync(sourceDir);
          if (
            contents.some((file) =>
              ["package.json", "tsconfig.json", "README.md"].includes(file)
            )
          ) {
            console.log(`Found likely project root: ${sourceDir}`);

            // This looks like a proper project directory - copy all files from here
            this.copyFilesRecursively(sourceDir, outputDir, fs, path);

            // Check if we successfully copied any files
            if (
              fs.existsSync(outputDir) &&
              fs.readdirSync(outputDir).length > 0
            ) {
              console.log(
                `Successfully copied complete project from ${sourceDir}`
              );
              return; // Success - exit the method
            }
          }
        } catch (readError) {
          console.error(`Error reading directory ${sourceDir}:`, readError);
        }
      }

      console.log(
        "No complete project directory found, checking for project in parent"
      );

      // If we get here, check if 'undefined-project' is a special marker - the parent dir may be the actual project
      if (directories.includes("undefined-project")) {
        console.log(
          "Found undefined-project marker, checking parent directory"
        );
        try {
          // The parent directory may have the scaffolded project
          const contents = fs.readdirSync(outputPath);

          // Check if output path has project files or expected directories
          if (
            contents.some((file) =>
              ["package.json", "tsconfig.json", "README.md"].includes(file)
            ) ||
            contents.some((file) =>
              ["src", "dist", "tests", "config"].includes(file)
            )
          ) {
            console.log(
              `Found project structure in parent directory: ${outputPath}`
            );
            this.copyFilesRecursively(outputPath, outputDir, fs, path);

            if (
              fs.existsSync(outputDir) &&
              fs.readdirSync(outputDir).length > 0
            ) {
              console.log(
                `Successfully copied project from parent dir ${outputPath}`
              );
              return;
            }
          }
        } catch (parentError) {
          console.error(`Error checking parent directory:`, parentError);
        }
      }

      // If still no luck, try combining files from multiple directories
      console.log("Attempting to collect files from multiple directories");
      let filesCopied = 0;

      // Try to copy src directory (if it exists)
      if (
        directories.includes("src") ||
        directories.some((d) => d.includes("src"))
      ) {
        const srcDir = directories.includes("src")
          ? path.join(outputPath, "src")
          : path.join(
              outputPath,
              directories.find((d) => d.includes("src")) || ""
            );

        try {
          if (fs.existsSync(srcDir) && fs.statSync(srcDir).isDirectory()) {
            console.log(`Copying files from src directory: ${srcDir}`);
            const targetSrcDir = path.join(outputDir, "src");
            if (!fs.existsSync(targetSrcDir)) {
              fs.mkdirSync(targetSrcDir, { recursive: true });
            }
            this.copyFilesRecursively(srcDir, targetSrcDir, fs, path);
            filesCopied++;
          }
        } catch (srcError) {
          console.error(`Error copying src directory:`, srcError);
        }
      }

      // Try each directory and see if it contains useful files
      for (const dir of directories) {
        // Skip 'src' as we already handled it
        if (dir === "src" || dir.includes("src")) continue;

        const sourceDir = path.join(outputPath, dir);
        console.log(`Checking directory for useful files: ${sourceDir}`);

        try {
          const contents = fs.readdirSync(sourceDir);

          // Look for specific file patterns that should be copied
          const hasUsefulFiles = contents.some(
            (file) =>
              file.endsWith(".json") ||
              file.endsWith(".md") ||
              file.endsWith(".ts") ||
              file.endsWith(".js") ||
              file.endsWith(".html") ||
              file.endsWith(".css")
          );

          if (hasUsefulFiles) {
            console.log(`Found useful files in: ${sourceDir}`);
            // Copy based on the directory name to maintain structure
            const targetDir = path.join(outputDir, dir);
            if (!fs.existsSync(targetDir)) {
              fs.mkdirSync(targetDir, { recursive: true });
            }
            this.copyFilesRecursively(sourceDir, targetDir, fs, path);
            filesCopied++;
          }
        } catch (dirError) {
          console.error(`Error processing directory ${dir}:`, dirError);
        }
      }

      // If we've copied at least some files, consider it a partial success
      if (filesCopied > 0) {
        console.log(`Copied files from ${filesCopied} directories`);
        return;
      }

      // If we get here, we tried all directories but none worked
      console.log("None of the project directories contained viable files");
    } catch (error) {
      console.error("Error in fallback extraction:", error);
    }
  }

  /**
   * Copy files recursively from one directory to another
   */
  private copyFilesRecursively(
    sourceDir: string,
    targetDir: string,
    fs: typeof import("fs"),
    path: typeof import("path")
  ): void {
    // Create the target directory if it doesn't exist
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Directories to explicitly exclude from copying
    const excludedDirs = [
      "playground",
      "assets",
      "node_modules",
      "output",
      ".git",
      ".mastra",
    ];

    // Filter for relevant file extensions (only copy useful project files)
    const relevantExtensions = [
      ".ts",
      ".js",
      ".tsx",
      ".jsx",
      ".json",
      ".md",
      ".html",
      ".css",
      ".scss",
      ".yaml",
      ".yml",
      ".svg",
      ".png",
      ".ico",
      ".gitignore",
      ".env",
      ".env.example",
      ".npmrc",
      ".eslintrc",
      ".prettierrc",
    ];

    // Check if this is a directory we should skip
    const dirName = path.basename(sourceDir);
    if (excludedDirs.includes(dirName)) {
      console.log(`Skipping excluded directory: ${dirName}`);
      return;
    }

    // Read all items in the source directory
    const items = fs.readdirSync(sourceDir);

    let fileCount = 0;
    for (const item of items) {
      // Skip hidden files and directories (start with .)
      if (item.startsWith(".") && item !== ".gitignore") {
        continue;
      }

      const sourcePath = path.join(sourceDir, item);
      const targetPath = path.join(targetDir, item);

      try {
        const stats = fs.statSync(sourcePath);

        if (stats.isDirectory()) {
          // Skip excluded directories
          if (excludedDirs.includes(item)) {
            console.log(`Skipping excluded directory: ${item}`);
            continue;
          }

          // Recursively copy directories
          this.copyFilesRecursively(sourcePath, targetPath, fs, path);
        } else {
          // Only copy files with relevant extensions
          const ext = path.extname(item).toLowerCase();
          const isRelevantFile =
            relevantExtensions.includes(ext) ||
            relevantExtensions.some((e) => item.endsWith(e)) ||
            item === "package.json" ||
            item === "tsconfig.json" ||
            item === "README.md";

          if (isRelevantFile) {
            // Copy files
            fs.copyFileSync(sourcePath, targetPath);
            fileCount++;
            console.log(`Copied file: ${targetPath}`);
          } else {
            console.log(`Skipping irrelevant file: ${item}`);
          }
        }
      } catch (error) {
        console.error(`Error processing ${sourcePath}:`, error);
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
      console.log("Manual extraction of project files requested...");

      // First directly try the fallback method as it's more likely to work
      await this.extractFromOutputDirectory(outputDir);

      // Check if we already have files
      const fs = await import("fs");
      if (fs.existsSync(outputDir) && fs.readdirSync(outputDir).length > 0) {
        console.log("Successfully extracted files using fallback method");
        return;
      }

      // As a secondary approach, try the API if direct extraction failed
      try {
        console.log("Checking for workflow runs in API...");
        // Only proceed if the API endpoint exists
        const runExists = await this.client.get("/health").catch(() => null);

        if (runExists) {
          // Try to get list of runs if the API is available
          const response = await this.client.get<{
            runs: Array<{
              id: string;
              status: string;
              startTime: string;
            }>;
          }>("/api/workflows/projectGenerationWorkflow/runs/list");

          if (
            response.data &&
            response.data.runs &&
            response.data.runs.length > 0
          ) {
            // Sort runs by start time (most recent first)
            const runs = response.data.runs.sort((a, b) => {
              return (
                new Date(b.startTime).getTime() -
                new Date(a.startTime).getTime()
              );
            });

            console.log(
              `Found ${runs.length} workflow runs, trying most recent ones...`
            );

            // Try the most recent run
            const recentRun = runs[0];
            console.log(
              `Attempting extraction from run ${recentRun.id} (${recentRun.status})...`
            );
            await this.extractProjectFiles(
              "projectGenerationWorkflow",
              recentRun.id,
              outputDir
            );

            // Check again if files were extracted successfully
            if (
              fs.existsSync(outputDir) &&
              fs.readdirSync(outputDir).length > 0
            ) {
              console.log(
                `Successfully extracted files from run ${recentRun.id}`
              );
              return;
            }
          }
        }
      } catch (apiError) {
        console.log("API approach failed, continuing with local extraction");
        // Just continue - we already tried the fallback method
      }

      // If we're here, we've tried everything and still don't have files
      // Try one more time with a different fallback path pattern
      try {
        console.log("Trying alternative output paths...");
        await this.extractFromOutputDirectory(outputDir, undefined, true);
      } catch (fallbackError) {
        console.error("Final fallback extraction also failed");
      }
    } catch (error) {
      console.error("Error in ensureProjectFilesExtracted:", error);
      // We should never get here, but just to be safe
      try {
        await this.extractFromOutputDirectory(outputDir);
      } catch (finalError) {
        console.error("All extraction methods failed");
      }
    }
  }

  private async writeFilesToDirectory(
    files: MastraFile[],
    outputDir: string
  ): Promise<void> {
    console.log(`Writing ${files.length} files to ${outputDir}`);

    // Import required modules for file operations
    const fs = await import("fs");
    const path = await import("path");

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write each file to the output directory
    let fileCount = 0;
    for (const file of files) {
      try {
        if (!file.path) {
          console.log("Skipping file with no path");
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
        fs.writeFileSync(filePath, file.content || "");
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
        // Don't log polling after first poll to reduce console noise
        if (consecutiveErrors === 0) {
          console.log(
            `Polling workflow status for ${workflowName}:${runId}...`
          );
        }

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

        // Only log detailed responses for debugging
        if (process.env.DEBUG) {
          console.log(
            `Received response:`,
            JSON.stringify(response.data, null, 2)
          );
        }

        if (response.data) {
          // Reset error counter on successful response
          consecutiveErrors = 0;

          // Process workflow data
          const workflowData = response.data;

          // Convert activePaths to a Map for type safety and easier access
          const activePaths = new Map(
            Object.entries(workflowData.activePaths || {})
          );

          // Only log status changes to avoid noise
          if (process.env.DEBUG) {
            console.log(`Calling onUpdate with status: ${workflowData.status}`);
          }

          onUpdate({
            runId,
            status: workflowData.status,
            results: workflowData.results || {},
            activePaths,
            timestamp: workflowData.timestamp || Date.now(),
          });

          // If workflow is complete or has a scaffold step that completed,
          // check for and extract project files
          const isWorkflowComplete = ["completed", "success"].includes(
            workflowData.status
          );
          const hasScaffoldCompleted = Array.from(activePaths.entries()).some(
            ([stepId, step]) =>
              stepId.includes("scaffold") && step.status === "success"
          );

          if (
            (isWorkflowComplete || hasScaffoldCompleted) &&
            !hasExtractedFiles
          ) {
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

        // Check if the error is related to a closed connection (expected when workflow completes)
        const axiosError = error as any; // Type assertion for error handling
        const isConnectionClosed =
          axios.isAxiosError(error) &&
          (axiosError.code === "ECONNRESET" ||
            axiosError.code === "ECONNREFUSED" ||
            axiosError.code === "ECONNABORTED");

        if (isConnectionClosed) {
          // Server has probably completed the workflow and shut down the connection
          // This is expected behavior - attempt to extract files one final time
          if (!hasExtractedFiles) {
            try {
              console.log(
                "Connection closed, extracting files from completed workflow..."
              );
              await this.extractProjectFiles(workflowName, runId, outputDir);
              hasExtractedFiles = true;
            } catch (extractError) {
              // If extraction fails, try the fallback method
              await this.extractFromOutputDirectory(outputDir, runId);
            }
          }
          isMonitoring = false;
          return;
        } else if (consecutiveErrors <= 1) {
          // Only log the first error to reduce noise
          console.log(
            `Connection issue with workflow server (${
              axiosError.message || "Unknown error"
            }). Using local file extraction.`
          );
        }

        // Stop monitoring after reaching max retries
        if (consecutiveErrors >= maxRetries) {
          if (!hasExtractedFiles) {
            try {
              // Last attempt to extract files using directory method
              await this.extractFromOutputDirectory(outputDir, runId);
            } catch (finalError) {
              // Ignore, we tried our best
            }
          }
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
