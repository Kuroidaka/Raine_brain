import { groqClient } from '~/config/groq';
import { NextFunction, Request, Response } from 'express';
import { traceable } from 'langsmith/traceable';
import { TeachableService } from '~/services/techable';
import { GroqService } from '~/services/llm/groq';
import { MemoStore } from '~/services/LTMemo';
import { ConversationService } from '~/database/conversation/conversation';
import { STMemoStore } from '~/services/STMemo';
import { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions';
import { messagesInter, MsgListParams } from '~/services/llm/llm.interface';
import { ChatOpenAI } from "@langchain/openai";
import { ConversationSummaryMemory } from "langchain/memory";

const conversationService = ConversationService.getInstance()
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
      
      const techableAgent = new TeachableService(1)

      const customPrompt = `
      Summary of previous conversation: 
        Canh introduces themselves to the AI named Raine and asks for help planning a trip to Japan. Raine is delighted to help and asks about the details of the trip, such as when Canh is planning to go, how long they have, and what specific aspects of Japanese culture they are interested in experiencing.
      
      User say: ${prompt}
      `
      await techableAgent.considerMemoStorage(customPrompt, [])
      

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
      
      const STMemo = new STMemoStore("canh", "78f5cfe3-2553-49bc-ac8f-e28e0708d840")
      const history:MsgListParams[] = await STMemo.process(prompt, prompt, true)
      const result = await STMemo.summaryConversation(history)
      // await memory.clear()
      // const history = await memory.loadMemoryVariables({})
      return res.status(200).json({ data: result });
    } catch (error) {
      console.log(error);
      // Rethrow the error to be caught by the errorHandler middleware
      next(error);
    }
  }

  static async rsConversation(req: Request, res: Response, next:NextFunction) {
    try {
      const id = req.params.id
      
      await conversationService.deleteMsgInConversation(id)

      return res.status(200).json({ data: "Done!!" });
    } catch (error) {
      console.log(error);
      // Rethrow the error to be caught by the errorHandler middleware
      next(error);
    }
  }

  static async repairLTMemo(req: Request, res: Response, next:NextFunction) {
    try {
      const ids = req.body.ids
      const texts = req.body.texts
      
      const memo = new MemoStore(0)

      // memo.repairInputOutputPair()

      memo.saveData(false, "canh");

      return res.status(200).json({ data: "Done!!" });
    } catch (error) {
      console.log(error);
      // Rethrow the error to be caught by the errorHandler middleware
      next(error);
    }
  }
}
