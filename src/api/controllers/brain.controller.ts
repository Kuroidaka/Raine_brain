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
import { FileService } from "~/database/file/file";
import { videoRecordProps } from "~/database/file/file.interface";
import { redisClient } from "~/config/redis";

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

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    // Get the file from 'file' field
    let filePath: string | undefined;
    if (files && files['file'] && files['file'][0]) {
        filePath = files['file'][0].path;
        console.log("filePath", filePath);
    }

    // Get the file from 'fileVideo' field
    let fileVideoPath: string | undefined;
    if (files && files['fileVideo'] && files['fileVideo'][0]) {
        fileVideoPath = files['fileVideo'][0].path;
        console.log("fileVideoPath", fileVideoPath);
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

      const targetSocketId = await redisClient.get(userID as string);
      if (targetSocketId) {
        io.to(targetSocketId).emit("processing", {
          message: "Thinking..."
        })
      }

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

      const result = await chatService.processChat(debugOptions, res, prompt, filePath, fileVideoPath)

      // if (fileVideoPath) {
      //   const fileService = FileService.getInstance();

      //   const videoRecordData:videoRecordProps = {
      //       name: files['fileVideo'][0].filename,
      //       url: fileVideoPath,
      //       messageId: id
      //   }
      //   const videoRecord = await fileService.uploadVideoRecord(videoRecordData);
      // }
            

      res.status(200).json({
        content: result.output.content, 
        conversationID: result.conversationID
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
    const { id: userID } = req.user;
    console.log("filePath", filePath)
    try {
      const targetSocketId = await redisClient.get(userID as string);
      targetSocketId && io.to(targetSocketId).emit('processing', {
        message: "Getting audio to text"
      })
      const output = await GroqService.stt(filePath, 'en');

      if(output.content) {
        targetSocketId && io.to(targetSocketId).emit('processing', {
          message: "Done getting audio to text"
        })
      }
      else {
        targetSocketId && io.to(targetSocketId).emit('processing', {
          message: "Speak again"
        })
      }

      return res.status(200).json(output)
    } catch (error) {
      console.log(error);
      next(error);
    }
  },
  tts: async (req: Request, res: Response, next: NextFunction) => {
    const { text } = req.body;
    const { id: userID } = req.user;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
  
    try {

      const chunks = splitText(text, 2000);
      const targetSocketId = await redisClient.get(userID as string);
      targetSocketId && io.to(targetSocketId).emit('processing', {
        message: "Processing text to audio"
      })
      for (const chunk of chunks) {
        const file = await DeepGramService.tts(chunk);
        // const file = await OpenaiService.tts(chunk);
        const absolutePath = path.resolve(file);

        const fileBuffer = await fs.readFile(absolutePath);

        // Emit the file buffer
        targetSocketId && io.to(targetSocketId).emit('audioFile', fileBuffer);
      }

      targetSocketId && io.to(targetSocketId).emit('processing', {
        message: null
      })

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
