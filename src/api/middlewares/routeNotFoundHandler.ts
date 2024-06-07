import { Request, Response, NextFunction } from 'express';

interface CustomResponse extends Response {
  sendResponse?: (data: any) => void;
}

export const routeNotFoundHandler = (req: Request, res: CustomResponse, next: NextFunction) => {
  const status = 404;
  const errorResponse = {
    status: status,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    message: 'Route Not Found',
  };
  res.status(status).json(errorResponse);
};
