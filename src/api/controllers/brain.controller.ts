import { groqClient } from '~/config/groq';
import { NextFunction, Request, Response } from 'express';
import { traceable } from 'langsmith/traceable';
import { GroqService } from '../../services/groq/groq';
import { json } from 'body-parser';
import { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions';
import { TeachableService } from '~/services/techable';
import { STMemoStore } from '~/services/STMemo';


export const BrainController = {
  chat: async (req: Request, res: Response, next:NextFunction) => {
    // preprocess data params
    const { prompt } = req.body;
    const isEnableStream = req.query?.isStream === "true";
    const isEnableLTMemo = req.query?.isLTMemo === "true"; // LT: Long term memo
    try {
      
      // Long term memory process
      const teachableAgent = new TeachableService(0)
      const promptWithRelatedMemory = isEnableLTMemo ? await teachableAgent.preprocess(prompt) : prompt
      
      // Short term memory process

      // Process Conversation Data
      const STMemo = new STMemoStore()
      const messages:ChatCompletionMessageParam[] = STMemo.process(promptWithRelatedMemory, isEnableLTMemo)
      
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
