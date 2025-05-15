import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';

/**
 * Tool for inserting code into existing files
 * Used by the FeatureEnhancerAgent to enhance projects with new features
 */
export const insertCodeTool = createTool({
  id: 'insert-code',
  description: 'Inserts or modifies code in existing project files',
  inputSchema: z.object({
    filePath: z.string().describe('Path to the file to modify'),
    insertions: z.array(z.object({
      position: z.enum(['beginning', 'end', 'after', 'before', 'replace']).describe('Where to insert the code'),
      lineIdentifier: z.string().optional().describe('Line to find for after/before/replace positions'),
      code: z.string().describe('Code to insert'),
      indentation: z.number().optional().describe('Number of spaces to indent the inserted code')
    })).describe('Code insertions to make')
  }),
  outputSchema: z.object({
    success: z.boolean(),
    filePath: z.string(),
    modifiedContent: z.string().optional(),
    message: z.string()
  }),
  execute: async ({ context }) => {
    const { filePath, insertions } = context;
    
    try {
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        return {
          success: false,
          filePath,
          message: `File ${filePath} does not exist`
        };
      }
      
      // Read file content
      let content = await fs.readFile(filePath, 'utf-8');
      let modified = false;
      
      // Process each insertion
      for (const insertion of insertions) {
        const { position, lineIdentifier, code, indentation = 0 } = insertion;
        let modifiedContent = content;
        
        // Apply appropriate indentation to the code
        const indentedCode = code.split('\n')
          .map((line, i) => i === 0 ? line : ' '.repeat(indentation) + line)
          .join('\n');
        
        switch (position) {
          case 'beginning':
            modifiedContent = indentedCode + '\n' + content;
            modified = true;
            break;
            
          case 'end':
            modifiedContent = content + '\n' + indentedCode;
            modified = true;
            break;
            
          case 'after':
            if (!lineIdentifier) {
              return {
                success: false,
                filePath,
                message: 'Line identifier is required for "after" position'
              };
            }
            
            if (content.includes(lineIdentifier)) {
              const parts = content.split(lineIdentifier);
              if (parts.length > 1) {
                modifiedContent = parts[0] + lineIdentifier + '\n' + indentedCode + parts.slice(1).join(lineIdentifier);
                modified = true;
              }
            } else {
              return {
                success: false,
                filePath,
                message: `Line identifier "${lineIdentifier}" not found in file`
              };
            }
            break;
            
          case 'before':
            if (!lineIdentifier) {
              return {
                success: false,
                filePath,
                message: 'Line identifier is required for "before" position'
              };
            }
            
            if (content.includes(lineIdentifier)) {
              const parts = content.split(lineIdentifier);
              if (parts.length > 1) {
                modifiedContent = parts[0] + indentedCode + '\n' + lineIdentifier + parts.slice(1).join(lineIdentifier);
                modified = true;
              }
            } else {
              return {
                success: false,
                filePath,
                message: `Line identifier "${lineIdentifier}" not found in file`
              };
            }
            break;
            
          case 'replace':
            if (!lineIdentifier) {
              return {
                success: false,
                filePath,
                message: 'Line identifier is required for "replace" position'
              };
            }
            
            if (content.includes(lineIdentifier)) {
              modifiedContent = content.replace(lineIdentifier, indentedCode);
              modified = true;
            } else {
              return {
                success: false,
                filePath,
                message: `Line identifier "${lineIdentifier}" not found in file`
              };
            }
            break;
        }
        
        content = modifiedContent;
      }
      
      if (modified) {
        // Write modified content back to file
        await fs.writeFile(filePath, content, 'utf-8');
      }
      
      return {
        success: true,
        filePath,
        modifiedContent: content,
        message: modified ? `Successfully modified ${filePath}` : `No changes made to ${filePath}`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        filePath,
        message: `Error modifying file: ${errorMessage}`
      };
    }
  }
});
