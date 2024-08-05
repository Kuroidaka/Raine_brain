import { groqClient } from "~/config/groq";
import { NextFunction, Request, Response } from "express";
import { traceable } from "langsmith/traceable";
import { GroqService } from "../../services/llm/groq";
import { json } from "body-parser";
import { TeachableService } from "~/services/techable";
import { STMemoStore } from "~/services/STMemo";
import { messagesInter, MsgListParams } from "~/services/llm/llm.interface";
import path from "path";
import { OpenaiService } from "~/services/llm/openai";

import { ConversationSummaryMemory } from "langchain/memory";
import chalk from "chalk";
import { ConversationService } from "~/database/conversation/conversation";

const conversationService = ConversationService.getInstance()
export const BrainController = {
  chat: async (req: Request, res: Response, next: NextFunction) => {
    // preprocess data params
    console.clear();
    const { prompt, conversationID, imgURL, base64Data } = req.body;
    console.log("base64Data", req.body)
    const { id: userID } = req.user;
    const { isStream = "false", isLTMemo = "false", isVision = "false" } = req.query;
    const isEnableStream = isStream === "true";
    const isEnableLTMemo = isLTMemo === "true"; // Enable Long term memory
    const isEnableVision = isVision === "true"; 

    if (isEnableStream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
    }

    try {
      // Long term memory process
      const pathMemo = path.join("src", "assets", "tmp", "memos", userID);
      const teachableAgent = new TeachableService(0, pathMemo);

      const { relateMemory, memoryDetail } = await teachableAgent.considerMemoRetrieval(prompt)
      
     
      let promptWithRelatedMemory = isEnableLTMemo
        ? prompt + teachableAgent.concatenateMemoTexts(relateMemory)
        : prompt;

      // Short term memory process
      const STMemo = new STMemoStore(userID, conversationID, isEnableVision);

      // Describe Context for vision
      if(isEnableVision && base64Data) {
        promptWithRelatedMemory = await STMemo.describeImage(base64Data, promptWithRelatedMemory)
      }

      const messages: MsgListParams[] = await STMemo.process(
        prompt,
        promptWithRelatedMemory,
        isEnableLTMemo
      );

      console.log("messages", messages)

      // Asking
      const output = await GroqService.chat(
        messages,
        isEnableStream,
        res
      );

      const callBack = async () => {
        // Add Ai response into DB
        output.content && STMemo.conversation_id &&
        await STMemo.addMessage(output.content, true, STMemo.conversation_id);
      
        // summrize the conversation
        const historySummarized = await STMemo.processSummaryConversation(STMemo.conversation_id as string)
        console.log(chalk.green("HistorySummarized: "), historySummarized)
  
        await conversationService.modifyConversation(STMemo.conversation_id as string, {
          summarize: historySummarized,
        });
  
        // Consider store into LTMemo
        isEnableLTMemo && await teachableAgent.considerMemoStorage(prompt, memoryDetail, STMemo.summaryChat);
      }


      res.status(200).json(output.content)
      await callBack()




    } catch (error) {
      console.log(error);
      // Rethrow the error to be caught by the errorHandler middleware
      next(error);
    }
  },

  test: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { prompt, imgURL } = req.body;

      const messages: MsgListParams[] = [
        {
          role: "system",
          content: `

          `,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: imgURL,
              },
            },
          ],
        },
      ];
      const output = await OpenaiService.chat(messages, false, res);

      return res.status(200).json({ data: output.content });
      // res.end()
    } catch (error) {
      console.log(error);
      next(error);
    }
  },
};
