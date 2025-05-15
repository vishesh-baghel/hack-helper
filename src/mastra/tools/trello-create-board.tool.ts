import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import fetch from 'node-fetch';

/**
 * Tool for creating a new Trello board
 * Used by the BoardPublisherAgent to publish project plans
 */
export const trelloCreateBoardTool = createTool({
  id: 'trello-create-board',
  description: 'Creates a new Trello board for tracking project tasks',
  inputSchema: z.object({
    name: z.string().describe('Name for the Trello board'),
    description: z.string().optional().describe('Description of the board'),
    defaultLists: z.boolean().default(true).describe('Whether to create default lists (To Do, In Progress, Done)'),
    customLists: z.array(z.string()).optional().describe('Custom list names to create'),
    apiKey: z.string().optional().describe('Trello API key (will default to env variable)'),
    token: z.string().optional().describe('Trello API token (will default to env variable)')
  }),
  outputSchema: z.object({
    success: z.boolean(),
    boardId: z.string().optional(),
    boardUrl: z.string().optional(),
    message: z.string()
  }),
  execute: async ({ context }) => {
    const { name, description, defaultLists, customLists, apiKey, token } = context;
    
    // Use provided API credentials or fall back to environment variables
    const trelloKey = apiKey || process.env.TRELLO_API_KEY;
    const trelloToken = token || process.env.TRELLO_TOKEN;
    
    if (!trelloKey || !trelloToken) {
      return {
        success: false,
        message: 'Trello API key and token are required. Set TRELLO_API_KEY and TRELLO_TOKEN environment variables.'
      };
    }
    
    try {
      // Create board
      const createBoardResponse = await fetch('https://api.trello.com/1/boards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          desc: description || `Project board for ${name}`,
          defaultLists: false, // We'll create our own lists
          key: trelloKey,
          token: trelloToken
        })
      });
      
      if (!createBoardResponse.ok) {
        const errorText = await createBoardResponse.text();
        return {
          success: false,
          message: `Failed to create Trello board: ${errorText}`
        };
      }
      
      const board = await createBoardResponse.json() as { id: string, url: string };
      
      // Create lists
      const listsToCreate = defaultLists 
        ? ['To Do', 'In Progress', 'Testing', 'Done'] 
        : customLists || [];
      
      for (const [index, listName] of listsToCreate.entries()) {
        await fetch(`https://api.trello.com/1/lists`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: listName,
            idBoard: board.id,
            pos: index * 100, // Position lists in the order provided
            key: trelloKey,
            token: trelloToken
          })
        });
      }
      
      return {
        success: true,
        boardId: board.id,
        boardUrl: board.url,
        message: `Successfully created Trello board "${name}" with ${listsToCreate.length} lists`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Error creating Trello board: ${errorMessage}`
      };
    }
  }
});
