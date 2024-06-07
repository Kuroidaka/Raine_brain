import { Request, Response, NextFunction } from 'express'

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (!err) {
    err = new Error('Internal Server Error')
    err.status = 500
  }
  console.log("error occur")
  const status = err.status || 500
  const errorResponse = {
    status: status,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    message: err.message
  }

  res.status(status).json(errorResponse)
}
