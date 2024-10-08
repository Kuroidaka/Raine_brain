import { NextFunction, Request, Response } from 'express';
import { BadRequestException, ConflictException, NotFoundException, UnauthorizedException } from '~/common/error';
import { UserService } from '~/database/user/user';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const SALT_ROUNDS = 10;
const SECRET_KEY = process.env.JWT_SECRET || ""

const userService = UserService.getInstance();
export const AuthController = {
    register: async (req: Request, res: Response, next:NextFunction) => {       
        const { username, password, display_name } = req.body;

        try {
            const isUsernameExisted = await userService.getUser({ username })
            
            if(isUsernameExisted) throw new ConflictException("username already exist" );
        
            // hash the password using bcrypt
            const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

            // create new user
            const newUser = await userService.addUser({ 
                display_name,
                username,
                password: hashedPassword
            })
            
            const token = jwt.sign({ 
                id: newUser.id, 
                username 
            }, SECRET_KEY);

            return res.status(200).json({token})
        } catch (error) {
            console.log(error);
            // Rethrow the error to be caught by the errorHandler middleware
            next(error);
        }
    },
    login: async (req: Request, res: Response, next:NextFunction) => {       
        const { username, password } = req.body;

        try {
            const user = await userService.getUser({ username })
            if(!user) throw new NotFoundException("Username not found")
            
            // compare password
            if (!await bcrypt.compare(password, user.password)) {
                throw new UnauthorizedException("Password or Username is not correct")
            }

            const token = jwt.sign({ 
                id: user.id,
                username,
                googleCredentials: user.googleCredentials || null,
                eventListId: user.eventListId || null
            }, SECRET_KEY);

            // Set the token as a secure, HTTP-only cookie
            res.cookie('authToken', token, {
                httpOnly: true,  // Prevents JavaScript access to the cookie
                secure: true,    // Ensures the cookie is sent only over HTTPS
                sameSite: 'strict', // Helps protect against CSRF
                maxAge: 3600000   // 1 hour expiry
            });

            return res.status(200).json({token})
        } catch (error) {
            console.log(error);
            // Rethrow the error to be caught by the errorHandler middleware
            next(error);
        }
    },
    reGenToken: async(req: Request, res: Response, next:NextFunction) => {       
        const { id } = req.user;
        try {
            const user = await userService.getUser({ id })
            if(!user) throw new NotFoundException("Username not found")
            
        
            const token = jwt.sign({ 
                id: user.id,
                username: user.username,
                googleCredentials: user.googleCredentials,
                eventListId: user.eventListId || null
            }, SECRET_KEY);

            // Set the token as a secure, HTTP-only cookie
            res.cookie('authToken', token, {
                httpOnly: true,  // Prevents JavaScript access to the cookie
                secure: true,    // Ensures the cookie is sent only over HTTPS
                sameSite: 'strict', // Helps protect against CSRF
                maxAge: 3600000   // 1 hour expiry
            });

            return res.status(200).json({token})
        } catch (error) {
            console.log(error);
            // Rethrow the error to be caught by the errorHandler middleware
            next(error);
        }
    },
    verifyToken: async (req: Request, res: Response, next:NextFunction) => {       

        try {
            return res.status(200).json(req.user)
        } catch (error) {
            console.log(error);
            // Rethrow the error to be caught by the errorHandler middleware
            next(error);
        }
    },
}