import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ForbiddenException, UnauthorizedException } from '~/common/error';

const SECRET_KEY:string = process.env.JWT_SECRET || "";

export interface JwtPayload {
    id: string;
    username: string;
    eventListId: string | null
    googleCredentials: string | null
    // Add other properties as needed
}

const validateToken = (req: Request, res: Response, next: NextFunction) => {
    let token: string | undefined;

    // First, check the Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader) {
        token = authHeader.split(' ')[1];
    }

    // If no token is found in the Authorization header, check the cookies
    if (!token) {
        token = req.cookies.authToken;
    }

    if (!token) {
        throw new UnauthorizedException('No token provided');
    }

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            throw new UnauthorizedException('Invalid token');
        }

        req.user = decoded as JwtPayload;

        next();
    });
};

export default validateToken;

