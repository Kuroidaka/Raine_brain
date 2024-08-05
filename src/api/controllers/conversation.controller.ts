import { NextFunction, Request, Response } from 'express';
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
}