import { NextFunction, Request, Response } from 'express';
import { BadRequestException, ConflictException, NotFoundException, UnauthorizedException } from '~/common/error';
import { UserService } from '~/services/database/user';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const SALT_ROUNDS = 10;
const SECRET_KEY = 'your-secret-key'

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
            
            const token = jwt.sign({ id: newUser.id, username }, SECRET_KEY, { expiresIn: '12h' });

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

            const token = jwt.sign({ id: user.id, username }, SECRET_KEY, { expiresIn: '12h' });

            return res.status(200).json({token})
        } catch (error) {
            console.log(error);
            // Rethrow the error to be caught by the errorHandler middleware
            next(error);
        }
    }
}