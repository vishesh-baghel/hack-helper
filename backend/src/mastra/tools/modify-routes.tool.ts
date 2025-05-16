import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';

/**
 * Type representing a route modification
 */
type RouteModification = {
  path: string;
  method: string;
  handlerPath: string;
  handlerName: string;
  middlewares: string[];
};

/**
 * Tool for modifying route configurations in a project
 * Used by the FeatureEnhancerAgent to add new routes for features
 */
export const modifyRoutesTool = createTool({
  id: 'modify-routes',
  description: 'Modifies or adds routes to an existing API project',
  inputSchema: z.object({
    routesFilePath: z.string().describe('Path to the routes file to modify'),
    framework: z.enum(['express', 'koa', 'fastify', 'hapi', 'nextjs']).describe('Framework used for routing'),
    routes: z.array(z.object({
      path: z.string().describe('Route path (e.g., "/api/users")'),
      method: z.enum(['get', 'post', 'put', 'delete', 'patch']).describe('HTTP method'),
      handlerPath: z.string().describe('Path to the handler file (may need to be imported)'),
      handlerName: z.string().describe('Name of handler function'),
      middlewares: z.array(z.string()).optional().describe('Middleware functions to apply to the route')
    })).describe('Routes to add or modify')
  }),
  outputSchema: z.object({
    success: z.boolean(),
    filePath: z.string(),
    routesAdded: z.number(),
    message: z.string()
  }),
  execute: async ({ context }) => {
    const { routesFilePath, framework, routes } = context;
    let routesAdded = 0;
    
    try {
      // Check if routes file exists
      try {
        await fs.access(routesFilePath);
      } catch {
        return {
          success: false,
          filePath: routesFilePath,
          routesAdded: 0,
          message: `Routes file ${routesFilePath} does not exist`
        };
      }
      
      // Read file content
      let content = await fs.readFile(routesFilePath, 'utf-8');
      
      // Process based on framework
      switch (framework) {
        case 'express': {
          // Add imports if needed
          const handlerPaths = [...new Set(routes.map(route => route.handlerPath))];
          for (const handlerPath of handlerPaths) {
            const importName = path.basename(handlerPath, path.extname(handlerPath));
            if (!content.includes(`${importName}`) && !content.includes(`'${handlerPath}'`) && !content.includes(`"${handlerPath}"`)) {
              content = `import * as ${importName} from '${handlerPath}';\n${content}`;
            }
          }
          
          // Find position to add routes
          let insertPosition = content.lastIndexOf('module.exports');
          if (insertPosition === -1) {
            insertPosition = content.lastIndexOf('export');
          }
          if (insertPosition === -1) {
            insertPosition = content.length;
          }
          
          // Generate route code
          const routeCode = routes.map(route => {
            const { path: routePath, method, handlerName, middlewares = [] } = route;
            const handlerModule = path.basename(route.handlerPath, path.extname(route.handlerPath));
            const middlewareCode = middlewares.length > 0 
              ? middlewares.join(', ') + ', ' 
              : '';
            return `router.${method}('${routePath}', ${middlewareCode}${handlerModule}.${handlerName});`;
          }).join('\n');
          
          // Insert route code
          content = content.slice(0, insertPosition) + '\n// Added by hack-helper\n' + routeCode + '\n\n' + content.slice(insertPosition);
          routesAdded = routes.length;
          break;
        }
        
        case 'nextjs': {
          // For Next.js, we need to create or modify API route files
          // This is a simplistic implementation - for real usage, more sophisticated handling would be needed
          const apiDirectory = path.dirname(routesFilePath);
          for (const route of routes) {
            const { path: routePath, method, handlerName, handlerPath } = route;
            const routeFilePath = path.join(apiDirectory, `${routePath.replace(/^\//, '')}.ts`);
            
            const routeFileContent = `
import { NextApiRequest, NextApiResponse } from 'next';
import { ${handlerName} } from '${handlerPath}';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === '${method.toUpperCase()}') {
    return await ${handlerName}(req, res);
  }
  
  res.status(405).json({ message: 'Method not allowed' });
}
`;
            
            await fs.mkdir(path.dirname(routeFilePath), { recursive: true });
            await fs.writeFile(routeFilePath, routeFileContent, 'utf-8');
            routesAdded++;
          }
          
          // For Next.js, we don't modify the original file
          return {
            success: true,
            filePath: apiDirectory,
            routesAdded,
            message: `Successfully added ${routesAdded} Next.js API routes`
          };
        }
        
        // Add other frameworks as needed
        default:
          return {
            success: false,
            filePath: routesFilePath,
            routesAdded: 0,
            message: `Framework "${framework}" is not yet supported`
          };
      }
      
      // Write modified content back to file
      await fs.writeFile(routesFilePath, content, 'utf-8');
      
      return {
        success: true,
        filePath: routesFilePath,
        routesAdded,
        message: `Successfully added ${routesAdded} routes to ${routesFilePath}`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        filePath: routesFilePath,
        routesAdded: 0,
        message: `Error modifying routes: ${errorMessage}`
      };
    }
  }
});
