import path from "path";
import { Response } from "express";

import { TeachableService } from "~/services/techable";
import { STMemoStore } from "~/services/STMemo";
import { DataMemo, MsgListParams, outputInter } from "../llm/llm.interface";
import { GroqService } from "../llm/groq";
import { historyChatProcessingParams } from './chat.interface';
import chalk from "chalk";
import { ConversationService } from "~/database/conversation/conversation";
import { InternalServerErrorException } from "~/common/error";
import { OpenaiService } from "../llm/openai";

const conversationService = ConversationService.getInstance()
export class ChatService  {

  private userID: string;
  private conversationID: string;
  private isEnableVision: boolean;
  private isEnableStream: boolean;
  private base64Data: string | null;
  private STMemo: STMemoStore;
  private teachableAgent: TeachableService
  private lang: string

  constructor(
    userID: string,
    conversationID: string,
    isEnableVision: boolean,
    isEnableStream: boolean,
    lang = 'en'
  ) {
    this.userID = userID;
    this.conversationID = conversationID;
    this.isEnableVision = isEnableVision;
    this.isEnableStream = isEnableStream;
    this.lang = lang
  }

  public async processChat(res: Response, prompt: string, 
    imgFilePath?: string) :Promise<{
    output: outputInter,
    conversationID: string,
    memoryDetail: DataMemo[]
  }>{
    try {
      // Long term memory process
      const pathMemo = path.join("src", "assets", "tmp", "memos", this.userID);
      this.teachableAgent = new TeachableService(0, pathMemo);

      const { relateMemory, memoryDetail } = await this.teachableAgent.considerMemoRetrieval(prompt);

      let promptWithRelatedMemory = prompt + this.teachableAgent.concatenateMemoTexts(relateMemory)

      // Short term memory process,
      this.STMemo = new STMemoStore(this.userID, this.conversationID, this.isEnableVision, this.lang);

      const messages = await this.STMemo.process(prompt, promptWithRelatedMemory, Boolean(imgFilePath), imgFilePath);

      console.log("messages", messages);

      // Asking
      const output = await OpenaiService.chat(messages, this.isEnableStream, res);

      return {
        output: output,
        conversationID: this.STMemo.conversation_id as string,
        memoryDetail: memoryDetail
      }
    } catch (error) {
      console.error("Error in processChat:", error);
      throw new InternalServerErrorException("error occur while processing chat")
    }
  }

  // public async processVideoChat(res: Response, prompt: string, imgFilePath: string) :Promise<{
  //   output: outputInter,
  //   conversationID: string,
  //   memoryDetail: DataMemo[]
  // }>{
  //   try {
  //     return this.processChat(res, prompt, imgFilePath);
  //   } catch (error) {
  //     console.error("Error in processChat:", error);
  //     throw new InternalServerErrorException("error occur while processing chat")
  //   }
  // }

  public async handleProcessAfterChat(output: outputInter, prompt: string, memoryDetail: DataMemo[]) {
    // Add AI response into DB
    if (output.content && this.STMemo.conversation_id) {
      await this.STMemo.addMessage(output.content, true, this.STMemo.conversation_id);

      // Summarize the conversation
      const historySummarized = await this.STMemo.processSummaryConversation(this.STMemo.conversation_id as string);
      console.log(chalk.green("HistorySummarized: "), historySummarized);

      await conversationService.modifyConversation(this.STMemo.conversation_id as string, {
        summarize: historySummarized,
      });

      // Consider storing into LTMemo
      await this.teachableAgent.considerMemoStorage(prompt, memoryDetail, this.STMemo.summaryChat);
    }
  }
}