import { Request, Response, NextFunction } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

export const validateDto = (dtoClass: any) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    console.log("req dto", req.body)
    const dto = plainToInstance(dtoClass, req.body);
    const errors = await validate(dto);
   
    if (errors.length > 0) {
      const messages = errors.map(error => Object.values(error.constraints || {}).join(', ')).join(', ');
      const err:any = new Error('Internal Server Error')
      err.status = 400
      err.message = messages
      next(err);
    }
    else {
      next();
    }
    
  };
};