import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';

/**
 * Persists a project plan to a JSON file
 * Used by the PlannerAgent to save the generated plan
 */
export const persistPlanTool = createTool({
  id: 'persist-plan',
  description: 'Saves a project plan as a JSON file for later reference',
  inputSchema: z.object({
    plan: z.object({
      projectName: z.string().describe('Name of the project'),
      phases: z.array(z.object({
        name: z.string().describe('Name of the phase'),
        description: z.string().describe('Description of the phase'),
        tasks: z.array(z.object({
          id: z.number().describe('Unique task identifier'),
          name: z.string().describe('Name of the task'),
          description: z.string().describe('Description of the task'),
          component: z.string().describe('Related component'),
          estimatedHours: z.number().describe('Estimated hours to complete'),
          dependencies: z.array(z.number()).describe('IDs of dependent tasks'),
          priority: z.enum(['high', 'medium', 'low']).describe('Priority level')
        }))
      })),
      totalEstimatedHours: z.number().describe('Total estimated hours for the project')
    }).describe('Project plan structure'),
    outputPath: z.string().optional().describe('Custom output path for the plan file')
  }),
  outputSchema: z.object({
    success: z.boolean(),
    filePath: z.string(),
    message: z.string()
  }),
  execute: async ({ context }) => {
    try {
      const { plan, outputPath } = context;
      
      // Create output directory if it doesn't exist
      const outputDir = outputPath || path.join(process.cwd(), 'output');
      await fs.mkdir(outputDir, { recursive: true });
      
      // Create a safe filename from the project name
      const safeProjectName = plan.projectName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${safeProjectName}-plan-${timestamp}.json`;
      
      // Write plan to file
      const filePath = path.join(outputDir, fileName);
      await fs.writeFile(filePath, JSON.stringify(plan, null, 2), 'utf-8');
      
      return {
        success: true,
        filePath,
        message: `Successfully saved project plan to ${filePath}`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        filePath: '',
        message: `Failed to save project plan: ${errorMessage}`
      };
    }
  }
});
