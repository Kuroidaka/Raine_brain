import path from "path";
import { Response } from "express";

import { TeachableService } from "~/services/techable";
import { STMemoStore } from "~/services/STMemo";
import { DataMemo, MsgListParams, outputInter } from "../llm/llm.interface";
import { GroqService } from "../llm/groq";
import { chatClassInit, Debug, historyChatProcessingParams } from './chat.interface';
import chalk from "chalk";
import { ConversationService } from "~/database/conversation/conversation";
import { InternalServerErrorException } from "~/common/error";
import { OpenaiService } from "../llm/openai";
import { ToolCallService } from "~/database/toolCall/toolCall";
import { filterTools } from "~/utils";
import { toolsDefined } from "../llm/tool";

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
  private eventListId?: string
  private isLinkGoogle?: boolean

  constructor({
    userID,
    conversationID,
    isEnableVision,
    isEnableStream,
    lang = 'en',
    eventListId,
    isLinkGoogle
  }:chatClassInit) {
    this.userID = userID;
    this.conversationID = conversationID;
    this.isEnableVision = isEnableVision;
    this.isEnableStream = isEnableStream;
    this.lang = lang;
    eventListId && (this.eventListId = eventListId);
    isLinkGoogle && (this.isLinkGoogle = isLinkGoogle)
  }

  public async processChat(debug: Debug, res: Response, prompt: string, imgFilePath?: string) :Promise<{
    output: outputInter,
    conversationID: string,
    memoryDetail: DataMemo[]
  }>{
    try {
      const { debugChat = 0, debugMemo = 0 } = debug

      // Long term memory process
      const pathMemo = path.join("src", "assets", "tmp", "memos", this.userID);
      this.teachableAgent = new TeachableService(debugMemo, pathMemo);
      const { relateMemory, memoryDetail } = await this.teachableAgent.considerMemoRetrieval(prompt);
      let promptWithRelatedMemory = prompt + this.teachableAgent.concatenateMemoTexts(relateMemory)

      // get conversation file
      const conversationFile = await conversationService.getConversationFile(this.conversationID)

      // Get tools
       const toolCallService = ToolCallService.getInstance();
       const tools = await toolCallService.getToolsByUser(this.userID)
       const enableTools = filterTools(tools, toolsDefined, conversationFile);

      // Short term memory process,
      this.STMemo = new STMemoStore(
        this.userID,
        this.conversationID,
        this.isEnableVision,
        this.lang,
        enableTools,
        conversationFile,
      );
      const messages = await this.STMemo.process(
        prompt, 
        promptWithRelatedMemory, 
        Boolean(imgFilePath), 
        imgFilePath,
      );
      console.log("messages", messages);

      // Asking
      const openAiService = new OpenaiService({ 
        userId: this.userID,
        ...(this.eventListId && { eventListId: this.eventListId }),
        ...(this.isLinkGoogle && { isLinkGoogle: this.isLinkGoogle }),
      });
      
      const output = await openAiService.chat(messages, this.isEnableStream, enableTools, res, debugChat);

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
      const listDataFunc = output.data

      await this.STMemo.addMessage(output.content, true, this.STMemo.conversation_id, listDataFunc, memoryDetail);

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