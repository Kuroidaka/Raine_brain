import { groqClient } from '~/config/groq';
import { NextFunction, Request, Response } from 'express';
import { traceable } from 'langsmith/traceable';
import { TeachableService } from '~/services/techable';
import { GroqService } from '~/services/groq/groq';
import { MemoStore } from '~/services/LTMemo';


export class TestController {
  static async ping(req: Request, res: Response, next:NextFunction) {
    try {
      return res.status(200).json({ data: "pong!" });
    } catch (error) {
      console.log(error);
      // Rethrow the error to be caught by the errorHandler middleware
      next(error);
    }
  }
  static async do(req: Request, res: Response, next:NextFunction) {
    try {
      const inputText = req.body.prompt
      const outputText = req.body.outputText
      
      const memo = new MemoStore()

      const result = await memo.addInputOutputPair(inputText, outputText)

      return res.status(200).json({ data: result });
    } catch (error) {
      console.log(error);
      // Rethrow the error to be caught by the errorHandler middleware
      next(error);
    }
  }

  static async do1(req: Request, res: Response, next:NextFunction) {
    try {
      const inputText = req.body.prompt
        
      const memo = new MemoStore()

      const result = await memo.get_related_memos(inputText)

      return res.status(200).json({ data: result });
    } catch (error) {
      console.log(error);
      // Rethrow the error to be caught by the errorHandler middleware
      next(error);
    }
  }
  static async do2(req: Request, res: Response, next:NextFunction) {
    try {
      const inputText = req.body.prompt
        
      const memo = new MemoStore()

      const result = await memo.resetDb()
      return res.status(200).json({ data: "done" }); 
    } catch (error) {
      console.log(error);
      // Rethrow the error to be caught by the errorHandler middleware
      next(error);
    }
  }
}
