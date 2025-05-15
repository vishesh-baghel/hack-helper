import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import fetch from 'node-fetch';

/**
 * Tool for creating a new card on a Trello board
 * Used by the BoardPublisherAgent to create task cards from the project plan
 */
export const trelloCreateCardTool = createTool({
  id: 'trello-create-card',
  description: 'Creates a new card on a Trello list',
  inputSchema: z.object({
    boardId: z.string().describe('ID of the Trello board'),
    listName: z.string().describe('Name of the list to add the card to'),
    name: z.string().describe('Name/title of the card'),
    description: z.string().optional().describe('Description of the card'),
    labels: z.array(z.object({
      name: z.string().describe('Label name'),
      color: z.enum(['yellow', 'purple', 'blue', 'red', 'green', 'orange', 'black', 'sky', 'lime', 'pink']).describe('Label color')
    })).optional().describe('Labels to add to the card'),
    dueDate: z.string().optional().describe('Due date for the card (ISO format)'),
    position: z.enum(['top', 'bottom']).default('bottom').describe('Position in the list'),
    apiKey: z.string().optional().describe('Trello API key (will default to env variable)'),
    token: z.string().optional().describe('Trello API token (will default to env variable)')
  }),
  outputSchema: z.object({
    success: z.boolean(),
    cardId: z.string().optional(),
    cardUrl: z.string().optional(),
    message: z.string()
  }),
  execute: async ({ context }) => {
    const { 
      boardId, 
      listName, 
      name, 
      description, 
      labels, 
      dueDate, 
      position,
      apiKey, 
      token 
    } = context;
    
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
      // Get lists for the board to find the correct list ID
      const listsResponse = await fetch(`https://api.trello.com/1/boards/${boardId}/lists?key=${trelloKey}&token=${trelloToken}`);
      
      if (!listsResponse.ok) {
        const errorText = await listsResponse.text();
        return {
          success: false,
          message: `Failed to get lists for board: ${errorText}`
        };
      }
      
      const lists = await listsResponse.json() as Array<{ id: string, name: string }>;
      const list = lists.find(l => l.name === listName);
      
      if (!list) {
        return {
          success: false,
          message: `List "${listName}" not found on board`
        };
      }
      
      // Create card
      const cardData: Record<string, any> = {
        name,
        desc: description || '',
        idList: list.id,
        pos: position === 'top' ? 'top' : 'bottom',
        key: trelloKey,
        token: trelloToken
      };
      
      if (dueDate) {
        cardData.due = dueDate;
      }
      
      const createCardResponse = await fetch('https://api.trello.com/1/cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cardData)
      });
      
      if (!createCardResponse.ok) {
        const errorText = await createCardResponse.text();
        return {
          success: false,
          message: `Failed to create card: ${errorText}`
        };
      }
      
      const card = await createCardResponse.json() as { id: string, url: string };
      
      // Add labels if provided
      if (labels && labels.length > 0) {
        // First get existing labels on the board
        const labelsResponse = await fetch(`https://api.trello.com/1/boards/${boardId}/labels?key=${trelloKey}&token=${trelloToken}`);
        const existingLabels = await labelsResponse.json() as Array<{ id: string, name: string, color: string }>;
        
        for (const labelData of labels) {
          // Check if label already exists
          let labelId = null;
          const existingLabel = existingLabels.find(l => 
            l.name.toLowerCase() === labelData.name.toLowerCase() && 
            l.color === labelData.color
          );
          
          if (existingLabel) {
            labelId = existingLabel.id;
          } else {
            // Create new label
            const createLabelResponse = await fetch(`https://api.trello.com/1/labels?key=${trelloKey}&token=${trelloToken}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                name: labelData.name,
                color: labelData.color,
                idBoard: boardId
              })
            });
            
            if (createLabelResponse.ok) {
              const newLabel = await createLabelResponse.json() as { id: string };
              labelId = newLabel.id;
            }
          }
          
          // Add label to card
          if (labelId) {
            await fetch(`https://api.trello.com/1/cards/${card.id}/idLabels?key=${trelloKey}&token=${trelloToken}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                value: labelId
              })
            });
          }
        }
      }
      
      return {
        success: true,
        cardId: card.id,
        cardUrl: card.url,
        message: `Successfully created card "${name}" in list "${listName}"`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Error creating Trello card: ${errorMessage}`
      };
    }
  }
});
