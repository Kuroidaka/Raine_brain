import { dbClient } from "~/config";
import { conversationFileProps, conversationModifyProps, conversationProps, msgFuncProps, msgProps } from "./conversation.interface";
import { Prisma } from "@prisma/client";

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
                        },
                        include: {
                            functionData: true
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
                    },
                    include: {
                        functionData: true
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
            await dbClient.file.deleteMany({
                where: {
                    conversationId: id
                }
            })
            await dbClient.conversation.delete({
                where: { id },
            });
        } catch (error) {
            console.log('Error getting conversation:', error)
            throw error
        }
    }
    async deleteMsgInConversation(id: string) {
        try {
            await dbClient.$transaction(async (prisma) => {
                // Delete ImageFiles related to the Messages in the Conversation
                await prisma.imageFile.deleteMany({
                    where: {
                        message: {
                            conversationId: id,
                        },
                    },
                });
    
                // Delete MessageFunctions related to the Messages in the Conversation
                await prisma.messageFuntion.deleteMany({
                    where: {
                        message: {
                            conversationId: id,
                        },
                    },
                });
    
                // Delete Messages in the Conversation
                await prisma.message.deleteMany({
                    where: {
                        conversationId: id,
                    },
                });
            });
        } catch (error) {
            console.log('Error deleting messages in conversation:', error);
            throw error;
        }
    }
    
    async addMsg(data: msgProps) {
        try {
            const formattedData = {
                ...data,
                relatedMemo: data.relatedMemo ? JSON.stringify(data.relatedMemo) : undefined
            };
            return await dbClient.message.create({ data: formattedData });
        } catch (error) {
            console.error('Error adding message:', error);
            throw error;
        }
    }

    async getMsg(conversationId:string, take?: number) {
        try {

            const query:Prisma.MessageFindManyArgs  = {
                where: { conversationId },
                orderBy: {
                    createdAt: take ? 'desc' : 'asc',
                },
                include: {
                    functionData: true
                }
            }

            if(take) query.take = take
            let messages = await dbClient.message.findMany(query)

            if (take && messages.length > 0) {
                messages = messages.reverse(); // Reverse the array to get the oldest first
            }

            return messages
        } catch (error) {
            console.error('Error getting message:', error);
            throw error;
        }
    }

    async addMsgFunction(messageId: string, data: msgFuncProps) {
        try {
            return await dbClient.messageFuntion.create({ data: {
                ...data, messageId
            } });
        } catch (error) {
            console.error('Error adding message:', error);
            throw error;
        }
    }

    // get conversation file 
    async getConversationFile(conversationId: string): Promise<conversationFileProps[]> {
        try {
            if(!conversationId) return []
            return await dbClient.file.findMany({
                where: { conversationId }
            })
        } catch (error) {
            console.error('Error getting conversation file:', error);
            throw error;
        }
    }
}