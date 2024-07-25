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
import { isObject } from "../../utils";

export const BrainController = {
  chat: async (req: Request, res: Response, next: NextFunction) => {
    // preprocess data params
    console.clear();
    const { prompt, conversationID, imgURL } = req.body;
    const { username } = req.user;
    const { isStream = "false", isLTMemo = "false", isVision } = req.query;
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
      let promptWithRelatedMemory = isEnableLTMemo
        ? await teachableAgent.considerMemoRetrieval(prompt)
        : prompt;

      // Short term memory process
      const STMemo = new STMemoStore(userId, conversationID);

      // Describe Context for vision
      if(isEnableVision && imgURL) {
        promptWithRelatedMemory = await STMemo.describeImage(imgURL, promptWithRelatedMemory)
      }

      const messages: MsgListParams[] = await STMemo.process(
        prompt,
        promptWithRelatedMemory,
        isEnableLTMemo
      );

      // Asking
      const output = await GroqService.chat(
        messages,
        isEnableStream,
        res,
        next
      );

      isEnableStream
        ? res.end()
        : res.status(200).json({ data: output.content });

      output.content &&
        STMemo.conversation_id &&
        STMemo.addMessage(output.content, true, STMemo.conversation_id);
      isEnableLTMemo && (await teachableAgent.considerMemoStorage(prompt));
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
      const output = await OpenaiService.chat(messages, false, res, next);

      return res.status(200).json({ data: output.content });
      // res.end()
    } catch (error) {
      console.log(error);
      next(error);
    }
  },
};
