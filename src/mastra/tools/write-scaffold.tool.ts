import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';

/**
 * Interface representing a file in the project scaffold
 */
interface ScaffoldFile {
  path: string;
  content: string;
}

/**
 * Type representing a directory in the project scaffold
 */
type ScaffoldDirectory = {
  path: string;
};

/**
 * Tool for creating project scaffold files and directories
 * Used by the ScaffolderAgent to generate project structure
 */
export const writeScaffoldTool = createTool({
  id: 'write-scaffold',
  description: 'Creates project scaffold files and directories based on a project plan',
  inputSchema: z.object({
    projectName: z.string().describe('Name of the project'),
    outputPath: z.string().optional().describe('Base directory to write files to'),
    files: z.array(z.object({
      path: z.string().describe('Relative path of the file to create'),
      content: z.string().describe('Content to write to the file')
    })).describe('Files to create'),
    directories: z.array(z.object({
      path: z.string().describe('Relative path of the directory to create')
    })).optional().describe('Additional directories to create')
  }),
  outputSchema: z.object({
    success: z.boolean(),
    projectPath: z.string(),
    filesCreated: z.number(),
    directoriesCreated: z.number(),
    errors: z.array(z.string())
  }),
  execute: async ({ context }) => {
    const { projectName, files, directories = [], outputPath } = context;
    const errors: string[] = [];
    let filesCreated = 0;
    let directoriesCreated = 0;
    
    try {
      // Determine base project directory
      const safeProjectName = projectName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const baseDir = outputPath || path.join(process.cwd(), 'projects', safeProjectName);
      
      // Create base directory
      await fs.mkdir(baseDir, { recursive: true });
      directoriesCreated++;
      
      // Create additional directories
      for (const dir of directories) {
        try {
          const dirPath = path.join(baseDir, dir.path);
          await fs.mkdir(dirPath, { recursive: true });
          directoriesCreated++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push(`Failed to create directory ${dir.path}: ${errorMessage}`);
        }
      }
      
      // Create files
      for (const file of files) {
        try {
          // Create directory for file if it doesn't exist
          const filePath = path.join(baseDir, file.path);
          const fileDir = path.dirname(filePath);
          await fs.mkdir(fileDir, { recursive: true });
          
          // Write file
          await fs.writeFile(filePath, file.content, 'utf-8');
          filesCreated++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push(`Failed to create file ${file.path}: ${errorMessage}`);
        }
      }
      
      return {
        success: errors.length === 0,
        projectPath: baseDir,
        filesCreated,
        directoriesCreated,
        errors
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        projectPath: '',
        filesCreated,
        directoriesCreated,
        errors: [`Failed to create project scaffold: ${errorMessage}`]
      };
    }
  }
});
