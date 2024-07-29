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
    const { prompt, conversationID, imgURL } = req.body;
    const { username } = req.user;
    const { isStream = "false", isLTMemo = "false", isVision = "false" } = req.query;
    const isEnableStream = isStream === "true";
    const isEnableLTMemo = isLTMemo === "true"; // Enable Long term memory
    const isEnableVision = isVision === "true"; 

    if (isEnableStream) {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Transfer-Encoding", "chunked");
    }

    try {
      const userId = username;
      // Long term memory process
      const pathMemo = path.join("src", "assets", "tmp", "memos", userId);
      const teachableAgent = new TeachableService(0, pathMemo);

      const { relateMemory, memoryDetail } = await teachableAgent.considerMemoRetrieval(prompt)
      
     
      let promptWithRelatedMemory = isEnableLTMemo
        ? prompt + teachableAgent.concatenateMemoTexts(relateMemory)
        : prompt;

      // Short term memory process
      const STMemo = new STMemoStore(userId, conversationID);

      // Describe Context for vision
      // if(isEnableVision && imgURL) {
      //   promptWithRelatedMemory = await STMemo.describeImage(imgURL, promptWithRelatedMemory)
      // }

      const messages: MsgListParams[] = await STMemo.process(
        prompt,
        promptWithRelatedMemory,
        isEnableLTMemo
      );

      // Asking
      const output = await OpenaiService.chat(
        messages,
        isEnableStream,
        res
      );

      isEnableStream
      ? res.end()
      : res.status(200).json(output.content);

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
