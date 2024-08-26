import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ForbiddenException, UnauthorizedException } from '~/common/error';
import * as fs from 'fs';
import path from 'path';
import { uploadFilePath } from '~/constant';
import { googleOAuth2Client } from '~/config';

const SECRET_KEY:string = process.env.JWT_SECRET || "";

export interface JwtPayload {
    id: string;
    username: string;
    // Add other properties as needed
}


export const validateGoogleToken = (req: Request, res: Response, next: NextFunction) => {
    try {
        const tokenPath = path.join(uploadFilePath.token, 'token.json');
        
        if (fs.existsSync(tokenPath)) {
            const token = fs.readFileSync(tokenPath, 'utf8');
            googleOAuth2Client.setCredentials(JSON.parse(token));
        }
        next();  // Proceed to the next middleware or route handler
    } catch (error) {
        console.error('Error loading token:', error);
        next(error);  // Pass the error to the error handler middleware
    }
};

export default validateGoogleToken;
