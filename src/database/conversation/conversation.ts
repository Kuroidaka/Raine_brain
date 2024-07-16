import { dbClient } from "~/config";
import { conversationProps, msgProps } from "./conversation.interface";

export class ConversationService {
    private static instance: ConversationService;

    private constructor() {}

    public static getInstance(): ConversationService {
        if (!ConversationService.instance) {
            ConversationService.instance = new ConversationService();
        }
        return ConversationService.instance;
    }

    async addNewConversation(data:conversationProps){
        try {
            return await dbClient.conversation.create({ data })
        } catch (error) {
            console.log('Error adding conversation:',error)
            throw error
        }
    } 
    
    async getConversation(id:string){   
        try {
            return await dbClient.conversation.findUnique({ 
                where: { id }
             })
        } catch (error) {
            console.log('Error getting conversation:', error)
            throw error
        }
    }

    async addMsg(data: msgProps) {
        try {
            return await dbClient.message.create({ data });
        } catch (error) {
            console.error('Error adding message:', error);
            throw error;
        }
    }

    async getMsg(conversationId:string) {
        try {
            const messages = await dbClient.message.findMany({
                where: { conversationId },
                orderBy: {
                    createdAt: 'asc',
                },
            })

            return messages
        } catch (error) {
            console.error('Error getting message:', error);
            throw error;
        }
    }

}