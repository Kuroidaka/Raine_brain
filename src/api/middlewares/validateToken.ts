import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface DecodedToken {
  // Define the structure of your decoded token, e.g.,
  userId: string;
  // Add more properties if needed
}

const verifyToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  let token = req.headers.authorization;

  if (!req.headers.authorization) {
    res.status(401).json({ msg: 'Access denied. No token provided.' });
    return;
  }

  if (token?.split(' ')[0] === 'Bearer') {
    token = token.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({ msg: 'Access denied. No token provided.' });
    return;
  }

  try {
    const decoded = await jwt.verify(token, 'secret-key') as DecodedToken;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(400).json({ msg: 'Invalid token.' });
  }
};

export default verifyToken;
