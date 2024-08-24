import { NextFunction, Request, Response } from 'express';
import { FileService } from '~/database/file/file';
import { ToolCallService } from '~/database/toolCall/toolCall';
import { UserService } from '~/database/user/user';

const userService = UserService.getInstance();
const toolCallService = ToolCallService.getInstance();
export const UserController = {
    getUser: async (req: Request, res: Response, next:NextFunction) => { 
        const { id } = req.params
        try {
            const user = await userService.getUser({id})
            return res.status(200).json(user);
        } catch (error) {
            console.log(error);
            // Rethrow the error to be caught by the errorHandler middleware
            next(error);
        }
    },
    getUsers: async (req: Request, res: Response, next:NextFunction) => {       
        try {
            const users = await userService.getUsers()
            return res.status(200).json(users);
        } catch (error) {
            console.log(error);
            // Rethrow the error to be caught by the errorHandler middleware
            next(error);
        }
    },
    createUser: async (req: Request, res: Response, next:NextFunction) => {       
        const { display_name, username, password } = req.body
        try {
            const users = await userService.addUser({display_name, username, password})
            
            return res.status(200).json(users);
        } catch (error) {
            console.log(error);
            // Rethrow the error to be caught by the errorHandler middleware
            next(error);
        }
    },
    getTools: async (req: Request, res: Response, next:NextFunction) => {
        const { id: userID } = req.user
        console.log("userID", userID)
        try {
            const tools = await toolCallService.getToolsByUser(userID)
            
            return res.status(200).json(tools);
        } catch (error) {
            console.log(error);
            // Rethrow the error to be caught by the errorHandler middleware
            next(error);
        }
    },
    removeTools: async (req: Request, res: Response, next:NextFunction) => {
        const { id: userID } = req.user
        const { toolId } = req.params
        try {
            const tools = await toolCallService.removeToolFromUser(userID, toolId)
            
            return res.status(200).json(tools);
        } catch (error) {
            console.log(error);
            // Rethrow the error to be caught by the errorHandler middleware
            next(error);
        }
    },
    updateTools: async (req: Request, res: Response, next:NextFunction) => {
        const { id: userID } = req.user
        const { toolId } = req.params
        try {
            const tools = await toolCallService.addToolToUser(userID, toolId)
            
            return res.status(200).json(tools);
        } catch (error) {
            console.log(error);
            // Rethrow the error to be caught by the errorHandler middleware
            next(error);
        }
    },
    setBackgroundImage: async (req: Request, res: Response, next:NextFunction) => {
        const { id: userID } = req.user
        const { bgId } = req.body
        try {
            const fileService = FileService.getInstance();
            const result = await fileService.assignBackgroundImageToUser(userID, bgId)
            
            return res.status(200).json(result);
        } catch (error) {
            console.log(error);
            // Rethrow the error to be caught by the errorHandler middleware
            next(error);
        }
    },
}