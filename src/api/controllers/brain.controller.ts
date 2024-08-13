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
import { ChatService, chatService } from '~/services/chat/chat';

const conversationService = ConversationService.getInstance()
export const BrainController = {
  chat: async (req: Request, res: Response, next: NextFunction) => {
    // preprocess data params
    console.clear();
    const { prompt, conversationID, imgURL } = req.body;
    console.log("body", req.body)
    const { id: userID } = req.user;
    const { isStream = "false", isVision = "false" } = req.query;
    const isEnableStream = isStream === "true";
    const isEnableVision = isVision === "true"; 

    if (isEnableStream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
    }

    try {
      const chatService = new ChatService(
        userID,
        conversationID,
        isEnableVision,
        isEnableStream
      )

      const result = await chatService.processChat(res, prompt)

      res.status(200).json({
        content: result.output.content, conversationID: result.conversationID
      })
      
      await chatService.handleProcessAfterChat(
        result.output,
        prompt,
        result.memoryDetail
      )

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
  describeImg: async (req: Request, res: Response, next: NextFunction) => {
    try {

      const { id: userID } = req.user;
      if (!req.file) {
        throw new NotFoundException("File upload failed")
      }
    
      const { prompt } = req.body
      const filePath = req.file.path;
      console.log("filePath", filePath)

      // Short term memory process
      const STMemo = new STMemoStore(userID);
      
      // Describe Context for vision
      const message = await STMemo.describeImage([filePath], prompt)

      return res.status(200).json({ data: message });
    } catch (error) {
      console.log(error);
      next(error);
    }
  },
};
