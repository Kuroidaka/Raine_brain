import { NextFunction, Request, Response } from 'express';
import { NotFoundException } from '~/common/error';
import { ConversationService } from '~/database/conversation/conversation';

const conversationService = ConversationService.getInstance()
export const ConversationController = {
    getConversation: async (req: Request, res: Response, next:NextFunction) => { 
        const { id:userID } = req.user
        try {
            const data = await conversationService.getConversationByUser(userID)
            return res.status(200).json(data);
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