import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ForbiddenException, UnauthorizedException } from '~/common/error';

const SECRET_KEY:string = process.env.JWT_SECRET || "";

export interface JwtPayload {
    id: string;
    username: string;
    // Add other properties as needed
}

const validateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) throw new UnauthorizedException('No token provided');

    const token = authHeader.split(' ')[1];

    if (!token) throw new UnauthorizedException('Invalid token format');

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            throw new UnauthorizedException('Invalid token');
        }

        req.user = decoded as JwtPayload;

        next();
    });
};

export default validateToken;
