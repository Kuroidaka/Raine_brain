import { NextFunction, Request, Response } from "express";
import fs from 'fs/promises';

import path from "path";

import { GroqService } from "../../services/llm/groq";
import { ChatService } from '~/services/chat/chat';
import { DeepGramService } from "~/services/llm/deepgram";

import { STMemoStore } from "~/services/STMemo";
import { ConversationService } from "~/database/conversation/conversation";
import { NotFoundException } from "~/common/error";

import { io } from "~/index";
import { createImageContent, processImage, splitText } from "~/utils";
import { OpenaiService } from "~/services/llm/openai";
import { MemoStore } from "~/services/LTMemo";
import { outputInter } from '~/services/llm/llm.interface'
import { chatClassInit } from "~/services/chat/chat.interface";
import { FileChatService } from "~/services/chat/fileAsk";

const conversationService = ConversationService.getInstance()
export const BrainController = {
  chat: async (req: Request, res: Response, next: NextFunction) => {
    // preprocess data params
    console.clear();
    const { prompt, conversationID, imgURL } = req.body;
    console.log("body", req.body)
    const { id: userID, eventListId, googleCredentials } = req.user;
    const { isStream = "false"} = req.query;
    const isEnableStream = isStream === "true";

    if (isEnableStream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
    }

    try {

      const isVision = false
      const isLinkGoogle = !!googleCredentials

      const initChatParams: chatClassInit = {
        userID,
        conversationID,
        isEnableVision: isVision,
        isEnableStream,
        lang: 'en',
        ...(eventListId && isLinkGoogle && { eventListId, isLinkGoogle }),
      };

      const chatService = new ChatService(initChatParams)
      const debugOptions = {
        debugChat: 1,
        debugMemo: 0
      }

      const result = await chatService.processChat(debugOptions, res, prompt)

      const response: outputInter & { conversationID: string } = {
        content: result.output.content,
        conversationID: result.conversationID,
        ...(result.output.data && { data: result.output.data }),
      };
      res.status(200).json(response)
      
      await chatService.handleProcessAfterChat(
        result.output,
        prompt,
        result.memoryDetail,
        result.memoStorage
      )

    } catch (error) {
      console.log(error);
      // Rethrow the error to be caught by the errorHandler middleware
      next(error);
    }
  },
  videoChat: async (req: Request, res: Response, next: NextFunction) => {
    // preprocess data params
    // console.clear();
    const { prompt, conversationID } = req.body;
    const { id: userID, eventListId, googleCredentials } = req.user;

    let filePath
    if (req.file) {
      filePath = req.file.path;
      console.log("filePath", filePath)
    }
  
    const { isStream = "false", isVision = "false" } = req.query;
    const isEnableStream = isStream === "true";

    if (isEnableStream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
    }

    try {
      const isVision = true
      const isLinkGoogle = !!googleCredentials

      const initChatParams: chatClassInit = {
        userID,
        conversationID,
        isEnableVision: isVision,
        isEnableStream,
        lang: 'en',
        ...(eventListId && isLinkGoogle && { eventListId, isLinkGoogle }),
      };

      const chatService = new ChatService(initChatParams)

      const debugOptions = {
        debugChat: 1,
        debugMemo: 0
      }

      const result = await chatService.processChat(debugOptions, res, prompt, filePath)
            
      console.log("result", result)

      res.status(200).json({
        content: result.output.content, conversationID: result.conversationID
      })
      
      await chatService.handleProcessAfterChat(
        result.output,
        prompt,
        result.memoryDetail,
        result.memoStorage
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
      const output = await GroqService.stt(filePath, 'en');

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
        // const file = await OpenaiService.tts(chunk);
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
  resetLTMemo: async (req: Request, res: Response, next:NextFunction) => {
    try {
      const { userID } = req.body
        
      const memo = new MemoStore(0)

      await memo.resetDb(userID)
      return res.status(200).json({ data: "done" }); 
    } catch (error) {
      console.log(error);
      // Rethrow the error to be caught by the errorHandler middleware
      next(error);
    }
  },
  test: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q } = req.body
      const fileChatService = new FileChatService()
      const result = await fileChatService.askFile(q)
      return res.status(200).json(result)
    } catch (error) {
      console.log(error);
      next(error);
    }
  },
  resetDocsMemo: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const fileChatService = new FileChatService()
      await fileChatService.resetDocsMemo()
      return res.status(200).json({ data: "done" }); 
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
}
