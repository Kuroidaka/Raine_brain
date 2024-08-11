import { NextFunction, Request, Response } from "express";
import fs from 'fs/promises';
import { traceable } from "langsmith/traceable";
import { json } from "body-parser";
import path from "path";
import { ConversationSummaryMemory } from "langchain/memory";
import chalk from "chalk";
import { groqClient } from "~/config/groq";
import { fileURLToPath } from 'url';

import { GroqService } from "../../services/llm/groq";
import { TeachableService } from "~/services/techable";
import { STMemoStore } from "~/services/STMemo";
import { messagesInter, MsgListParams } from "~/services/llm/llm.interface";
import { OpenaiService } from "~/services/llm/openai";
import { DeepGramService } from "~/services/llm/deepgram";


import { ConversationService } from "~/database/conversation/conversation";
import { NotFoundException } from "~/common/error";

import { io } from "~/index";
import { splitText } from "~/utils";

const conversationService = ConversationService.getInstance()
export const BrainController = {
  chat: async (req: Request, res: Response, next: NextFunction) => {
    // preprocess data params
    console.clear();
    const { prompt, conversationID, imgURL, base64Data } = req.body;
    console.log("body", req.body)
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
      // if(isEnableVision && base64Data) {
      //   promptWithRelatedMemory = await STMemo.describeImage(base64Data, promptWithRelatedMemory)
      // }

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


      res.status(200).json({content: output.content, conversationID: STMemo.conversation_id})
      await callBack()




    } catch (error) {
      console.log(error);
      // Rethrow the error to be caught by the errorHandler middleware
      next(error);
    }
  },
  stt: async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      throw new NotFoundException("File upload failed")
    }
  
    const filePath = req.file.path;
    console.log("filePath", filePath)
    try {
      const output = await GroqService.stt(filePath);

      return res.status(200).json(output)
    } catch (error) {
      console.log(error);
      next(error);
    }
  },
  tts: async (req: Request, res: Response, next: NextFunction) => {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
  
    try {
      const chunks = splitText(text, 2000);

      for (const chunk of chunks) {
        const file = await DeepGramService.tts(chunk);
        const absolutePath = path.resolve(file);

        const fileBuffer = await fs.readFile(absolutePath);

        // Emit the file buffer
        io.emit('audioFile', fileBuffer);
      }

      return res.status(200).json({ message: 'Audio files are being processed and sent via WebSocket' });
        
    } catch (error) {
      console.error(error);
      return next(error);
    }
  },
  test: async (req: Request, res: Response, next: NextFunction) => {
    try {

      const { id: userID } = req.user;
      if (!req.file) {
        throw new NotFoundException("File upload failed")
      }
    
      const filePath = req.file.path;
      console.log("filePath", filePath)

      // Short term memory process
      const STMemo = new STMemoStore(userID);
      
      // Describe Context for vision
      const message = await STMemo.describeImage([filePath])

      return res.status(200).json({ data: message });
    } catch (error) {
      console.log(error);
      next(error);
    }
  },
};
