import { dbClient } from "~/config";
import {
  conversationFileProps,
  conversationModifyProps,
  conversationProps,
  msgFuncProps,
  msgProps,
} from "./conversation.interface";
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

  async addNewConversation(data: conversationProps) {
    try {
      return await dbClient.conversation.create({ data });
    } catch (error) {
      console.log("Error adding conversation:", error);
      throw error;
    }
  }

  async getConversation(id: string) {
    try {
      return await dbClient.conversation.findUnique({
        where: { id },
        // include: {
        //   messages: {
        //     orderBy: {
        //       createdAt: "asc",
        //     },
        //     include: {
        //       functionData: true,
        //       videoRecord: true,
        //     },
        //   },
        // },
      });
    } catch (error) {
      console.log("Error getting conversation:", error);
      throw error;
    }
  }
  async getConversationByUser(userId: string) {
    try {
      return await dbClient.conversation.findMany({
        where: {
          userID: userId,
        },
        include: {
          messages: {
            orderBy: {
              createdAt: "asc",
            },
            include: {
              functionData: true,
              videoRecord: true,
            },
          },
        },
        orderBy: {
          lastMessageAt: "desc",
        },
      });
    } catch (error) {
      console.log("Error getting conversation:", error);
      throw error;
    }
  }

  async getPaginatedConversations(userId: string, page = 1, pageSize = 40) {
    const skip = (page - 1) * pageSize; // Calculate the number of records to skip for pagination

    const conversations = await dbClient.conversation.findMany({
      where: { userID: userId },
      skip,
      take: pageSize, // Limit the number of records per page
      include: {
        // messages: {
        //   orderBy: {
        //     createdAt: "asc",
        //   },
        //   include: {
        //     imgList: true, // Include message images
        //     functionData: true, // Include message function data
        //     videoRecord: true, // Include video records
        //   },
        // },
        files: true, // Include conversation files
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Count total conversations for the given user to calculate total pages
    const totalConversations = await dbClient.conversation.count({
      where: { userID: userId },
    });

    const totalPages = Math.ceil(totalConversations / pageSize);

    return {
      conversations,
      totalConversations,
      totalPages,
      currentPage: page,
      pageSize,
    };
  }

  async modifyConversation(id: string, data: conversationModifyProps) {
    try {
      return await dbClient.conversation.update({
        where: { id },
        data: data,
      });
    } catch (error) {
      console.log("Error getting conversation:", error);
      throw error;
    }
  }

  async deleteConversation(id: string) {
    try {
      await this.deleteMsgInConversation(id);
      await dbClient.file.deleteMany({
        where: {
          conversationId: id,
        },
      });
      await dbClient.conversation.delete({
        where: { id },
      });
    } catch (error) {
      console.log("Error getting conversation:", error);
      throw error;
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
      console.log("Error deleting messages in conversation:", error);
      throw error;
    }
  }

  async addMsg(data: msgProps) {
    try {
      const formattedData = {
        ...data,
        relatedMemo:
          data.relatedMemo && data.relatedMemo.length > 0
            ? JSON.stringify(data.relatedMemo)
            : undefined,
        memoStorage:
          data.memoStorage && data.memoStorage.length > 0
            ? data.memoStorage
            : (null as any),
      };
      return await dbClient.message.create({ data: formattedData });
    } catch (error) {
      console.error("Error adding message:", error);
      throw error;
    }
  }

  async getMsg(conversationId: string, take?: number) {
    try {
      const query: Prisma.MessageFindManyArgs = {
        where: { conversationId },
        orderBy: {
          createdAt: take ? "desc" : "asc",
        },
        include: {
          functionData: true,
        },
      };

      if (take) query.take = take;
      let messages = await dbClient.message.findMany(query);

      if (take && messages.length > 0) {
        messages = messages.reverse(); // Reverse the array to get the oldest first
      }

      return messages;
    } catch (error) {
      console.error("Error getting message:", error);
      throw error;
    }
  }
  async getMessagesByConversationID(conversationId: string, page: number = 1, pageSize: number = 20) {
    const skip = (page - 1) * pageSize; // Calculate the number of records to skip
  
    try {
      const messages = await dbClient.message.findMany({
        where: { conversationId },
        skip,
        take: pageSize,
        include: {
          imgList: true,          // Include related images
          functionData: true,     // Include related function data
          videoRecord: true,      // Include related video record
        },
        orderBy: {
          createdAt: 'desc',       // Order messages by creation date
        },
      });
  
      // Count total messages for the given conversation ID
      const totalMessages = await dbClient.message.count({
        where: { conversationId },
      });
  
      // Calculate total pages
      const totalPages = Math.ceil(totalMessages / pageSize);
  
      return {
        messages: messages.reverse(),
        totalMessages,
        totalPages,
        currentPage: page,
        pageSize,
      };
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw new Error('Could not fetch messages');
    }
  }

  async addMsgFunction(messageId: string, data: msgFuncProps) {
    try {
      return await dbClient.messageFuntion.create({
        data: {
          ...data,
          messageId,
        },
      });
    } catch (error) {
      console.error("Error adding message:", error);
      throw error;
    }
  }

  // get conversation file
  async getConversationFile(
    conversationId: string
  ): Promise<conversationFileProps[]> {
    try {
      if (!conversationId) return [];
      return await dbClient.file.findMany({
        where: { conversationId },
      });
    } catch (error) {
      console.error("Error getting conversation file:", error);
      throw error;
    }
  }
}
