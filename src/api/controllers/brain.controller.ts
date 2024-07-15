import { groqClient } from '~/config/groq';
import { NextFunction, Request, Response } from 'express';
import { traceable } from 'langsmith/traceable';
import { GroqService } from '../../services/groq/groq';
import { json } from 'body-parser';
import { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions';
import { TeachableService } from '~/services/techable';
import { STMemoStore } from '~/services/STMemo';
import { messagesInter } from '~/services/groq/groq.interface';
import path from 'path';


export const BrainController = {
  chat: async (req: Request, res: Response, next:NextFunction) => {
    // preprocess data params
    console.clear()
    const { prompt } = req.body;
    const { isStream = "false", isLTMemo = "false" } = req.query;
    const isEnableStream = isStream === "true";
    const isEnableLTMemo = isLTMemo === "true"; // Enable Long term memory
    try {
      
      const userId = "NdwkapHWAlkwa"
      // Long term memory process
      const pathMemo = path.join('src', 'assets', 'tmp', 'memos', userId)
      const teachableAgent = new TeachableService(0, pathMemo)
      const promptWithRelatedMemory = isEnableLTMemo ? await teachableAgent.considerMemoRetrieval(prompt) : prompt
      
      // Short term memory process
      const STMemo = new STMemoStore(userId)
      const messages:(ChatCompletionMessageParam[]| messagesInter[]) = await STMemo.process(promptWithRelatedMemory, isEnableLTMemo)

      // const messages:ChatCompletionMessageParam[] = [
      //   { role: "user", content: promptWithRelatedMemory }
      // ]
    
      // if(isEnableLTMemo) {
      //     messages.unshift({ role: "system", content: "You've been given the special ability to remember user teachings from prior conversations." },)
      // }
      
      // Asking
      const output = await GroqService.chat(messages, isEnableStream)

      // Storage new conversation

      res.status(200).json({ data: output.content });

      isEnableLTMemo && teachableAgent.considerMemoStorage(prompt)

    } catch (error) {
      console.log(error);
      // Rethrow the error to be caught by the errorHandler middleware
      next(error);
    }
  }
}
