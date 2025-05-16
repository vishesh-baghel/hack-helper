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
  type?: string; // Optional type for categorization (e.g., 'config', 'source', 'test')
}

/**
 * Type representing a directory in the project scaffold
 */
type ScaffoldDirectory = {
  path: string;
  purpose?: string; // Optional description of directory purpose
};

/**
 * Interface for created files to return in the report
 */
interface CreatedFile {
  path: string;
  size: number;
  type?: string;
}

/**
 * Tool for creating project scaffold files and directories
 * Used by the ScaffolderAgent to generate project structure
 */
export const writeScaffoldTool = createTool({
  id: 'write-scaffold',
  description: 'Creates project scaffold files and directories based on a project plan',
  inputSchema: z.object({
    projectName: z.string().describe('Name of the project'),
    projectDescription: z.string().optional().describe('Short description of the project'),
    outputPath: z.string().optional().describe('Base directory to write files to'),
    files: z.array(z.object({
      path: z.string().describe('Relative path of the file to create'),
      content: z.string().describe('Content to write to the file'),
      type: z.string().optional().describe('Type of file (e.g., config, source, test)')
    })).describe('Files to create'),
    directories: z.array(z.object({
      path: z.string().describe('Relative path of the directory to create'),
      purpose: z.string().optional().describe('Purpose of this directory')
    })).optional().describe('Additional directories to create')
  }),
  outputSchema: z.object({
    success: z.boolean(),
    projectPath: z.string(),
    projectName: z.string(),
    projectStructure: z.string(),
    filesCreated: z.array(z.object({
      path: z.string(),
      size: z.number(),
      type: z.string().optional()
    })),
    directoriesCreated: z.array(z.string()),
    totalFiles: z.number(),
    totalDirectories: z.number(),
    errors: z.array(z.string())
  }),
  execute: async ({ context }) => {
    const { projectName, projectDescription = '', files, directories = [], outputPath } = context;
    const errors: string[] = [];
    const createdFiles: CreatedFile[] = [];
    const createdDirectories: string[] = [];
    
    // Generate a safe project name to use in file paths
    const safeProjectName = projectName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    console.log(`=== ScaffoldTool: Creating project: ${projectName} ===`);
    
    try {
      // Determine base project directory
      const baseDir = outputPath || path.join(process.cwd(), safeProjectName);
      
      console.log(`ScaffoldTool: Base directory: ${baseDir}`);
      
      // Create base directory
      await fs.mkdir(baseDir, { recursive: true });
      createdDirectories.push('/');
      
      // Create additional directories
      for (const dir of directories) {
        try {
          const dirPath = path.join(baseDir, dir.path);
          await fs.mkdir(dirPath, { recursive: true });
          createdDirectories.push(dir.path);
          console.log(`ScaffoldTool: Created directory: ${dir.path}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`ScaffoldTool: Failed to create directory ${dir.path}: ${errorMessage}`);
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
          
          // Ensure parent directories are recorded
          const parentDir = path.dirname(file.path);
          if (parentDir !== '.' && !createdDirectories.includes(parentDir)) {
            createdDirectories.push(parentDir);
          }
          
          // Write file
          await fs.writeFile(filePath, file.content, 'utf-8');
          
          // Record file details
          const stats = await fs.stat(filePath);
          createdFiles.push({
            path: file.path,
            size: stats.size,
            type: file.type || getFileType(file.path)
          });
          
          console.log(`ScaffoldTool: Created file: ${file.path} (${stats.size} bytes)`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`ScaffoldTool: Failed to create file ${file.path}: ${errorMessage}`);
          errors.push(`Failed to create file ${file.path}: ${errorMessage}`);
        }
      }
      
      // Generate project structure visualization
      const projectStructure = generateProjectStructure(createdDirectories, createdFiles.map(f => f.path));
      
      console.log(`ScaffoldTool: Project creation complete. Created ${createdFiles.length} files and ${createdDirectories.length} directories.`);
      if (errors.length > 0) {
        console.log(`ScaffoldTool: Encountered ${errors.length} errors during project creation.`);
      }
      
      return {
        success: errors.length === 0,
        projectPath: baseDir,
        projectName: safeProjectName,
        projectStructure,
        filesCreated: createdFiles,
        directoriesCreated: createdDirectories,
        totalFiles: createdFiles.length,
        totalDirectories: createdDirectories.length,
        errors
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`ScaffoldTool: Critical error: ${errorMessage}`);
      return {
        success: false,
        projectPath: '',
        projectName: safeProjectName,
        projectStructure: '',
        filesCreated: [],
        directoriesCreated: [],
        totalFiles: 0,
        totalDirectories: 0,
        errors: [`Failed to create project scaffold: ${errorMessage}`]
      };
    }
  }
});

/**
 * Determine file type based on file extension
 * @param filePath Path to the file
 * @returns Type classification for the file
 */
function getFileType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  
  // Config files
  if (['.json', '.yml', '.yaml', '.env', '.config.js', '.config.ts', '.config.json'].some(e => filePath.includes(e))) {
    return 'config';
  }
  
  // Source files
  if (['.js', '.ts', '.jsx', '.tsx', '.vue', '.svelte'].includes(ext)) {
    return 'source';
  }
  
  // Test files
  if (['.test.', '.spec.', '.e2e.'].some(e => filePath.includes(e))) {
    return 'test';
  }
  
  // Style files
  if (['.css', '.scss', '.sass', '.less', '.styl'].includes(ext)) {
    return 'style';
  }
  
  // Documentation
  if (['.md', '.mdx', '.txt', '.doc'].includes(ext)) {
    return 'documentation';
  }
  
  return 'other';
}

/**
 * Generate a text-based visualization of the project structure
 * @param directories List of directory paths
 * @param files List of file paths
 * @returns String representation of project structure
 */
function generateProjectStructure(directories: string[], files: string[]): string {
  // Sort directories by depth and then alphabetically
  const sortedDirs = [...directories].sort((a, b) => {
    const depthDiff = a.split('/').length - b.split('/').length;
    return depthDiff !== 0 ? depthDiff : a.localeCompare(b);
  });
  
  // Build directory tree
  const dirTree: Record<string, string[]> = {
    '/': []
  };
  
  // Add all directories to the tree
  for (const dir of sortedDirs) {
    if (dir === '/') continue;
    const normalizedDir = dir.startsWith('/') ? dir : `/${dir}`;
    const parentPath = path.dirname(normalizedDir).replace(/\\/g, '/');
    const dirName = path.basename(normalizedDir);
    
    if (!dirTree[parentPath]) {
      dirTree[parentPath] = [];
    }
    
    if (!dirTree[normalizedDir]) {
      dirTree[normalizedDir] = [];
    }
    
    // Add directory to parent's children if not already there
    if (!dirTree[parentPath].includes(dirName)) {
      dirTree[parentPath].push(dirName);
    }
  }
  
  // Add files to their respective directories
  for (const filePath of files) {
    const normalizedFilePath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    const dirPath = path.dirname(normalizedFilePath).replace(/\\/g, '/');
    const fileName = path.basename(normalizedFilePath);
    
    if (!dirTree[dirPath]) {
      dirTree[dirPath] = [];
    }
    
    dirTree[dirPath].push(fileName);
  }
  
  // Generate text representation
  let result = 'Project Structure:\n';
  
  function printTree(dir: string, indent: string = '') {
    const items = dirTree[dir] || [];
    items.sort(); // Sort alphabetically
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const isLast = i === items.length - 1;
      const childPath = `${dir}/${item}`.replace(/\/+/g, '/');
      
      // Check if this is a directory
      const isDirectory = dirTree[childPath] !== undefined;
      const itemPrefix = isLast ? '└── ' : '├── ';
      const nextIndent = indent + (isLast ? '    ' : '│   ');
      
      result += `${indent}${itemPrefix}${item}${isDirectory ? '/' : ''}\n`;
      
      if (isDirectory) {
        printTree(childPath, nextIndent);
      }
    }
  }
  
  // Start printing from root
  printTree('/');
  
  return result;
}
