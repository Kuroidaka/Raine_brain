import { dbClient } from "~/config";
import { conversationModifyProps, conversationProps, msgProps } from "./conversation.interface";

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
                where: { id },
                include: {
                    messages: {
                        orderBy: {
                            createdAt: 'asc'
                        }
                    },
                },
            })
        } catch (error) {
            console.log('Error getting conversation:', error)
            throw error
        }
    }
    async getConversationByUser(userId:string){   
        try {
            return await dbClient.conversation.findMany({
                where: {
                  userID: userId,
                },
                include: {
                  messages: {
                    orderBy: {
                        createdAt: 'asc'
                    }
                  },
                },
                orderBy: {
                    lastMessageAt: 'desc',
                }
            })
        } catch (error) {
            console.log('Error getting conversation:', error)
            throw error
        }
    }

    async modifyConversation(id: string, data: conversationModifyProps) {
        try {
            return await dbClient.conversation.update({ 
                where: { id },
                data: data
             })
        } catch (error) {
            console.log('Error getting conversation:', error)
            throw error
        }
    }

    async deleteConversation(id:string) {
        try {
            await this.deleteMsgInConversation(id)
            await dbClient.conversation.delete({
                where: { id },
            });
        } catch (error) {
            console.log('Error getting conversation:', error)
            throw error
        }
    }
    async deleteMsgInConversation(id:string) {
        try {
            await dbClient.message.deleteMany({
                where: {
                  conversationId: id,
                },
            });
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