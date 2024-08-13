import { groqClient, openAIClient} from '~/config';
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
      return res.status(200).json({ data: `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` });
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
      const response = await openAIClient.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: "what is my favorite?"
          },
          {
            role: "assistant",
            content: "Egg"
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Can you see it from this image" },
              {
                type: "image_url",
                image_url: {
                  "url": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ_70EYZOC0uaAZ4iKgu8T6tnGlOYTgAjf-_w&s",
                },
              },
            ],
          },
        ],
      });      

      return res.status(200).json({ data: response.choices[0] });
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

      await conversationService.modifyConversation(id, { summarize: null })

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

  static async describeImageBase(req: Request, res: Response, next:NextFunction) {
    try {
      const base64Data = req.body.data

      // const decodedData = Buffer.from(base64Data, 'base64').toString('utf-8');

    // create an OpenAI request with a prompt
      console.log("decodedData", base64Data)
      // const completion = await openAIClient.chat.completions.create({
      //   model: "gpt-4o",
      //   messages: [
      //     {
      //       role: "user",
      //       content: [
      //         {
      //           type: "text",
      //           text: "Describe this image as if you were David Attenborough. Provide as much detail as possible.",
      //         },
      //         {
      //           type: "image_url",
      //           image_url: {
      //             url: base64Data,
      //           },
      //         },
      //       ],
      //     },
      //   ],
      //   stream: false,
      //   max_tokens: 1000,
      // });

      // const result = completion.choices[0].message.content 

      return res.status(200).json({ data: base64Data });
    } catch (error) {
      console.log(error);
      // Rethrow the error to be caught by the errorHandler middleware
      next(error);
    }
  }
}
