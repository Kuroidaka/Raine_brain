import { groqClient } from '~/config/groq';
import { NextFunction, Request, Response } from 'express';
import { traceable } from 'langsmith/traceable';
import { TeachableService } from '~/services/techable';
import { GroqService } from '~/services/groq/groq';
import { MemoStore } from '~/services/LTMemo';
import { ConversationService } from '~/database/conversation/conversation';
import { STMemoStore } from '~/services/STMemo';
import { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions';
import { messagesInter } from '~/services/groq/groq.interface';


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
  static async testCreateMemo(req: Request, res: Response, next:NextFunction) {
    try {
      const inputText = req.body.prompt
      const outputText = req.body.outputText
      
      const memo = new MemoStore(0)

      const result = await memo.addInputOutputPair(inputText, outputText)

      return res.status(200).json({ data: result });
    } catch (error) {
      console.log(error);
      // Rethrow the error to be caught by the errorHandler middleware
      next(error);
    }
  }
  static async testGetListMemo(req: Request, res: Response, next:NextFunction) {
    try {
      const inputText = req.body.prompt
        
      const memo = new MemoStore(0)

      const result = await memo.get_related_memos(inputText)

      return res.status(200).json({ data: result });
    } catch (error) {
      console.log(error);
      // Rethrow the error to be caught by the errorHandler middleware
      next(error);
    }
  }
  static async resetMemo(req: Request, res: Response, next:NextFunction) {
    try {
      const { q } = req.body
        
      const memo = new MemoStore(0)

      await memo.resetDb(q)
      return res.status(200).json({ data: "done" }); 
    } catch (error) {
      console.log(error);
      // Rethrow the error to be caught by the errorHandler middleware
      next(error);
    }
  }

  static async considerMemo(req: Request, res: Response, next:NextFunction) {
    try {
      const prompt = req.body.prompt
      
      const techableAgent = new TeachableService(0)
      await techableAgent.considerMemoStorage(prompt)
      

      return res.status(200).json({ data: "done" });
    } catch (error) {
      console.log(error);
      // Rethrow the error to be caught by the errorHandler middleware
      next(error);
    }
  }

  static async considerMemoRetrieval(req: Request, res: Response, next:NextFunction) {
    try {
      const prompt = req.body.prompt
      
      const techableAgent = new TeachableService(0)
      const newprompt = await techableAgent.considerMemoRetrieval(prompt)
      

      return res.status(200).json({ data: newprompt });
    } catch (error) {
      console.log(error);
      // Rethrow the error to be caught by the errorHandler middleware
      next(error);
    }
  }

  static async do(req: Request, res: Response, next:NextFunction) {
    try {
      const prompt = req.body.prompt
      
      const STMemo = new STMemoStore("Pham", "153a7bb9-afb5-42ed-84cf-24700d86cf1f")
      const messages:(ChatCompletionMessageParam[]| messagesInter[]) = await STMemo.process(prompt, prompt, true)

      console.log("messages", messages)
      return res.status(200).json({ data: messages });
    } catch (error) {
      console.log(error);
      // Rethrow the error to be caught by the errorHandler middleware
      next(error);
    }
  }
}
