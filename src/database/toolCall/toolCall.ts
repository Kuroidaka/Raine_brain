import { dbClient } from "~/config";
import { aiToolProps, aiToolParamProps, aiToolModifyProps, tools } from "./toolCall.interface";
import { Prisma } from "@prisma/client";

export class ToolCallService {
    private static instance: ToolCallService;

    private constructor() {}

    public static getInstance(): ToolCallService {
        if (!ToolCallService.instance) {
            ToolCallService.instance = new ToolCallService();
        }
        return ToolCallService.instance;
    }
    // Get AI Tool by ID
    async getTool(id: string) {
        try {
            return await dbClient.aiTool.findUnique({ 
                where: { id }
            });
        } catch (error) {
            console.error('Error getting AI Tool:', error);
            throw error;
        }
    }

    // Get all AI Tools
    async getAllTools() {
        try {
            return await dbClient.aiTool.findMany({
                orderBy: {
                    createdAt: 'asc',
                },
            });
        } catch (error) {
            console.error('Error getting AI Tools:', error);
            throw error;
        }
    }

    async addToolToUser(userId: string, aiToolId: string) {
        try {
            return await dbClient.userOnAiTools.create({
                data: {
                    userId,
                    aiToolId,
                },
            });
        } catch (error) {
            console.error('Error adding AI Tool to User:', error);
            throw error;
        }
    }

    async removeToolFromUser(userId: string, aiToolId: string) {
        try {
            return await dbClient.userOnAiTools.delete({
                where: {
                    userId_aiToolId: {
                        userId,
                        aiToolId,
                    },
                },
            });
        } catch (error) {
            console.error('Error removing AI Tool from User:', error);
            throw error;
        }
    }

    async getToolsByUser(userId: string):Promise<tools[]>{
        try {
            console.log(userId)
            return await dbClient.userOnAiTools.findMany({
                where: { userId },
                include: {
                    aiTool: true, // This will include the AiTool data in the result
                },
            });
        } catch (error) {
            console.error('Error getting AI Tools by User:', error);
            throw error;
        }
    }

    async getAllToolsWithUserStatus(userId:string) {
        try {
          const allTools = await dbClient.aiTool.findMany({
            include: {
              users: {
                where: {
                  userId: userId,
                },
              },
            },
          });
      
          return allTools.map((tool) => ({
            id: tool.id,
            name: tool.name,
            description: tool.description,
            assigned: tool.users.length > 0, // Check if this tool is assigned to the user
          }));
        } catch (error) {
          console.error('Error fetching tools with user status:', error);
          throw error;
        }
    }
    async toggleUserTool(userId: string, toolId:string) {
        try {
          const existingAssignment = await dbClient.userOnAiTools.findUnique({
            where: {
              userId_aiToolId: { userId, aiToolId: toolId },
            },
          });
      
          if (existingAssignment) {
            // If the tool is already assigned, remove it
            const result = await dbClient.userOnAiTools.delete({
              where: {
                userId_aiToolId: { userId, aiToolId: toolId },
              },
            });
            return result;
          } else {
            // If the tool is not assigned, add it
            const result = await dbClient.userOnAiTools.create({
              data: {
                userId: userId,
                aiToolId: toolId,
              },
            });
            return result;
          }
        } catch (error) {
          console.error('Error toggling tool assignment:', error);
          throw error;
        }
      }
}