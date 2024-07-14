import { groqClient } from '~/config/groq';
import { NextFunction, Request, Response } from 'express';
import { traceable } from 'langsmith/traceable';
import { GroqService } from '../../services/groq/groq';
import { json } from 'body-parser';
import { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions';
import { TeachableService } from '~/services/techable';
import { conversation } from '~/services/conversation';


export const BrainController = {
  chat: async (req: Request, res: Response, next:NextFunction) => {
    // preprocess data params
    const { prompt } = req.body;
    const isEnableStream = req.query?.isStream === "true";
    const isEnableLTMemo = req.query?.isLTMemo === "true"; // LT: Long term memo
    try {
      
      // Long term memory process
      const techableAgent = new TeachableService()
      const promptWithRelatedMemory = isEnableLTMemo ? await techableAgent.preprocess(prompt) : prompt
      
      // Short term memory process

      // Process Conversation Data
      const messages:ChatCompletionMessageParam[] = conversation.process(promptWithRelatedMemory, isEnableLTMemo)
      
      // Asking
      const output = await GroqService.chat(messages, isEnableStream)

      // Storage new conversation

      return res.status(200).json({ data: output.content });
    } catch (error) {
      console.log(error);
      // Rethrow the error to be caught by the errorHandler middleware
      next(error);
    }
  }
}
