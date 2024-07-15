import { NextFunction, Request, Response } from 'express';
import { UserService } from '~/services/database/user';

const userService = UserService.getInstance();
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
    }
}