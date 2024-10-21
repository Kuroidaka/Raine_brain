import { NextFunction, Request, Response } from 'express';
import { NotFoundException } from '~/common/error';
import { ConversationService } from '~/database/conversation/conversation';

const conversationService = ConversationService.getInstance()
export const ConversationController = {
    getConversation: async (req: Request, res: Response, next:NextFunction) => { 
        const { id:userID } = req.user
        const { page, pageSize } = req.query
        const pageNumber = page ? parseInt(page as string) : 1
        const pageSizeNumber = pageSize ? parseInt(pageSize as string) : 40
        try {
            const { conversations, totalPages } = await conversationService.getPaginatedConversations(userID, pageNumber, pageSizeNumber)
            return res.status(200).json({
                conversations,
                currentPage: pageNumber,
                pageSize: pageSizeNumber,
                totalPages: totalPages
            });
        } catch (error) {
            console.log(error);
            // Rethrow the error to be caught by the errorHandler middleware
            next(error);
        }
    },
    getConversationById: async (req: Request, res: Response, next:NextFunction) => { 
        const { id:conID } = req.params
        try {
            const data = await conversationService.getConversation(conID)
            return res.status(200).json(data);
        } catch (error) {
            console.log(error);
            // Rethrow the error to be caught by the errorHandler middleware
            next(error);
        }
    },
    getMessagesByConversationId: async (req: Request, res: Response, next:NextFunction) => { 
        const { id:conID } = req.params

        const page = parseInt(req.query.page as string) || 1;  // Optional page query parameter
        const pageSize = parseInt(req.query.pageSize as string) || 20; // Optional pageSize query parameter
      
        try {
            const data = await conversationService.getMessagesByConversationID(conID, page, pageSize)
            return res.status(200).json(data);
        } catch (error) {
            console.log(error);
            next(error);
        }
    },
    createConversation: async (req: Request, res: Response, next:NextFunction) => { 
        const { id:userID } = req.user
        try {
            const data = await conversationService.addNewConversation({userID})
            return res.status(200).json(data);
        } catch (error) {
            console.log(error);
            // Rethrow the error to be caught by the errorHandler middleware
            next(error);
        }
    },
    deleteConversation: async (req: Request, res: Response, next:NextFunction) => { 
        const { id } = req.params
        try {
            const data = await conversationService.deleteConversation(id)
            return res.status(200).json(data);
        } catch (error) {
            console.log(error);
            // Rethrow the error to be caught by the errorHandler middleware
            next(error);
        }
    },
    getConversationFile: async (req: Request, res: Response, next:NextFunction) => { 
        const { id } = req.params
        try {
            // check conversation id
            const conversation = await conversationService.getConversation(id)
            if (!conversation) {
                throw new NotFoundException('Conversation not found')
            }

            const data = await conversationService.getConversationFile(id)
            return res.status(200).json(data);
        } catch (error) {
            console.log(error);
            next(error);
        }
    }
}