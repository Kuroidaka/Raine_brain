import { groqClient } from '~/config/groq';
import { NextFunction, Request, Response } from 'express';
import { traceable } from 'langsmith/traceable';
import { GroqService } from '../../services/groq';


export const BrainController = {
  chat: async (req: Request, res: Response, next:NextFunction) => {
    const { prompt } = req.body;
    try {

      const output = await GroqService.chat(prompt)

      return res.status(200).json({ data: output });
    } catch (error) {
      console.log(error);
      // Rethrow the error to be caught by the errorHandler middleware
      next(error);
    }
  }
}
