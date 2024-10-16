import { NotImplementedException } from '../../common/error';
import { NextFunction, Request, Response } from "express";
import { traceable } from "langsmith/traceable";
import { openAIClient } from '../../config/openai';
import { MsgListParams, outputInter, outputInterData, ToolCallCus, initClassOpenAI, analyzeOutputInter, analyzeLTMemoCriteriaInter } from './llm.interface';
import { io } from '~/index';
import * as fs from 'fs';
import path from 'path';
import { ChatCompletion, ChatCompletionAssistantMessageParam, ChatCompletionChunk, ChatCompletionMessage, ChatCompletionMessageToolCall, ChatCompletionTool } from 'openai/resources/chat/completions';
import { ReminderChatService } from '../chat/reminder';
import { llmTools, otherArgs, toolsDefined, ToolsDefinedType } from './tool';
import { Stream } from 'openai/streaming';
import chalk from 'chalk';
import { tools } from '~/database/toolCall/toolCall.interface'
import { filterTools, readTextFile } from '~/utils';
import { uploadFilePath } from '~/constant';
import { VideoRecord } from '@prisma/client';

// const analyzeSystem = `You are an expert in text analysis.
// The user will give you TEXT to analyze.
// The user will give you analysis INSTRUCTIONS copied twice, at both the beginning and the end.
// You will follow these INSTRUCTIONS in analyzing the TEXT, then give the results of your expert analysis in the format requested.`
const MODEL = "gpt-4o-mini-2024-07-18";
const ANALYZER_MODEL = "gpt-4o-mini";


const analyzeSystem = `You are an expert in text analysis.
The user will give you TEXT to analyze.
The user will give you analysis INSTRUCTIONS copied twice, at both the beginning and the end.
Your analysis should focus on identifying and categorizing the following types of information from the TEXT:
You will follow these INSTRUCTIONS in analyzing the TEXT, then give the results of your expert analysis in the format requested
Do not add any explanation to your analysis, just the analysis result.
`

const decontextualizeSystem = `
The user will give you TEXT.
You should focus on adding necessary modifier to nouns or entire sentence and replacing only for these pronouns ("it", "he", "she", "they", "this", "that", "them") with the full name of the entities that referred to.
You should not replace any noun or sentence that is relate to (I, me, my, mine, myself).
Do not add any explanation to your response, just the result.
`

const modifyMemoSystem = `
The user will give you OLD_MEMO and NEW_TEXT.
You should focus on modifying OLD_MEMO base on NEW_TEXT.
Do not add any explanation to your response, just the result.
`

const isRelateMemoSystem = `
The user will give you TEXT and OLD_MEMO_GUIDE.
You should focus on identifying if TEXT contains information that can answer questions in OLD_MEMO_GUIDE.
Answer with just one word, yes or no.
`

export class OpenaiService {

  private userId?: string
  private eventListId?: string
  private isLinkGoogle: boolean
  private videoRecord?: VideoRecord
  constructor({
    userId,
    eventListId,
    isLinkGoogle = false,
    videoRecord
  }:initClassOpenAI) {
    this.userId = userId;
    this.eventListId = eventListId;
    this.isLinkGoogle = isLinkGoogle;
    videoRecord && (this.videoRecord = videoRecord);
  }

  public async chat(
    messages: MsgListParams[],
    isEnableStream = false,
    enableTools: ChatCompletionTool[],
    res?: Response,
    debugChat = 0,
  ): Promise<outputInter> {

    const dataMsg: MsgListParams[] = typeof messages === "string" 
      ? [{ role: "user", content: messages }]
      : messages;
      
    if (isEnableStream && res) {
      return this.stream(debugChat, res, dataMsg, enableTools);
    }

    try {
      let queryObject = {};

      if (enableTools.length > 0) {
        queryObject = {
          tool_choice: "auto",
          tools: enableTools,
        };
      }

      const { choices } = await openAIClient.chat.completions.create({
        messages: dataMsg,
        model: MODEL,
        ...queryObject,
      });

      return this.handleFinishReason(debugChat, choices[0], dataMsg);
    } catch (error) {
      console.error(error);
      return {
        content: "Give me a quick breather; I'll be back in a few minutes, fresher than ever!",
      };
    }
  }

  private async stream(
    debugChat: number,
    res: Response,
    messages: MsgListParams[],
    enableTools: ChatCompletionTool[]
  ): Promise<outputInter> {
    let content = "";
    const errorMsg = "Someone call Canh, there are some Bug with my program";
    try {
      let queryObject = {};

      if (enableTools.length > 0) {
        queryObject = {
          tool_choice: "auto",
          tools: enableTools,
        };
      }


      const stream = await openAIClient.chat.completions.create({
        messages: messages,
        model: MODEL,
        stream: true,
        ...queryObject,
      });

      return this.handleFinishReasonStream(debugChat, stream, messages);
    } catch (error) {
      console.log(error);
      content += "\n" + errorMsg;
      io.emit("chatResChunk", { content });

      return { content };
    }
  }

  private async processToolCall(
    debugChat: number,
    messages: MsgListParams[],
    responseMessage: ChatCompletionMessage,
    toolCalls: Array<ChatCompletionMessageToolCall>,
    isEnableStream: boolean
  ): Promise<outputInter> {
    try {
      const availableFunctions = {
        "ReminderChatService": llmTools.ReminderChatService,
        "RoutineChatService": llmTools.RoutineChatService,
        "ReminderCreateChatService": llmTools.ReminderCreateChatService,
        "RoutineCreateChatService": llmTools.RoutineCreateChatService,
        "FileAskChatService":llmTools.FileAskChatService
      };

      messages.push(responseMessage);
      const listData: outputInterData[] = [];

      for (const toolCall of toolCalls) {
        const mark = Math.random();
        const functionName = toolCall.function.name;
        if (debugChat === 1) console.log(functionName);
        const functionToCall = availableFunctions[functionName as keyof typeof availableFunctions];
        let functionData: outputInterData = {
          name: functionName,
        };

        isEnableStream && io.emit("chatResChunkFunc", { functionData: functionData, id: mark });
        const functionArgs = JSON.parse(toolCall.function.arguments);
        const otherArgs:otherArgs = {
          isLinkGoogle: this.isLinkGoogle,
          ...(this.userId && { userId: this.userId }),
          ...(this.eventListId && { eventListId: this.eventListId }),
          ...(this.videoRecord && { videoRecord: this.videoRecord }),
        }

        debugChat && console.log("functionArgs", functionArgs);
        const functionResponse = await functionToCall(functionArgs, otherArgs);

        if (functionResponse.comment) {
          functionData.comment = functionResponse.comment;
        }
        if (functionResponse.data) {
          functionData.data = functionResponse.data;
        }

        isEnableStream && io.emit("chatResChunkFunc", { functionData: functionData, id: mark });

        messages.push({
          tool_call_id: toolCall.id,
          role: "tool",
          content: functionResponse.comment,
        });

        isEnableStream && io.emit("chatResChunkFunc", { functionData: functionData, id: mark });

        listData.push(functionData);
      }
      let content = "";
      const secondObj = {
        model: MODEL,
        messages: messages,
        ...(isEnableStream && { stream: true }),
      };
      const secondResponse = await openAIClient.chat.completions.create(secondObj);
      if (isEnableStream) {
        const result = await this.handleStreaming(secondResponse as Stream<ChatCompletionChunk>);
        content = result.content as string;
      } else {
        const resMsg = secondResponse as ChatCompletion;
        content = resMsg.choices[0].message.content as string;
      }

      return {
        content: content,
        data: listData,
      };
    } catch (error) {
      console.error(error);
      return {
        content: "Give me a quick breather; I'll be back in a few minutes, fresher than ever!",
      };
    }
  }

  private async handleFinishReason(
    debugChat: number,
    choice: ChatCompletion.Choice,
    dataMsg: MsgListParams[]
  ): Promise<outputInter> {
    const finish_reason = choice.finish_reason;
    if (finish_reason === "length") {
      console.log("FINISH_REASON", finish_reason);
      console.log("Error: The conversation was too long for the context window.");

      return {
        content: "\nThe conversation was too long for the context window, do you want to continue?",
      };
    }

    if (finish_reason === "content_filter") {
      console.log("FINISH_REASON", finish_reason);
      console.log("choice", choice);
      return { content: "\nThe content was filtered due to policy violations." };
    }

    if (finish_reason === "tool_calls") {
      console.log("FINISH_REASON", finish_reason);
      const responseMessage = choice.message;

      const toolCalls = responseMessage.tool_calls;

      if (toolCalls) {
        const enableStream = false;
        const result = await this.processToolCall(
          debugChat,
          dataMsg,
          responseMessage,
          toolCalls,
          enableStream
        );

        return result;
      } else {
        console.log("TOOL_CALLS missing in responseMessage");
        return { content: "Tool call was expected but not found in the message." };
      }
    } else if (finish_reason === "stop") {
      console.log("FINISH_REASON", finish_reason);
      const content = choice.message.content;

      return { content };
    } else {
      console.log("FINISH_REASON", finish_reason);
      console.log("choice", choice);
      return { content: "Unexpected finish reason" };
    }
  }

  private async handleFinishReasonStream(
    debugChat: number,
    completion: Stream<ChatCompletionChunk>,
    dataMsg: MsgListParams[]
  ): Promise<outputInter> {
    let content = "";
    let toolCalls: ToolCallCus[] = [];
    let finish_reason;

    for await (const chunk of completion) {
      const choice = chunk.choices[0];
      const delta = choice.delta;
      finish_reason = choice.finish_reason;

      if (delta && delta.content) {
        content += delta.content;
        io.emit("chatResChunk", { content: delta.content });
      } else if (delta && delta.tool_calls) {
        const tcChunkList = delta.tool_calls;
        for (const tcChunk of tcChunkList) {
          while (toolCalls.length <= tcChunk.index) {
            toolCalls.push({ id: "", type: "function", function: { name: "", arguments: "" } });
          }
          const tc = toolCalls[tcChunk.index];

          if (tcChunk.id) {
            tc.id += tcChunk.id;
          }
          if (tcChunk.function && tcChunk.function.name) {
            tc.function.name += tcChunk.function.name;
          }
          if (tcChunk.function && tcChunk.function.arguments) {
            tc.function.arguments += tcChunk.function.arguments;
          }
        }
      }
    }

    if (finish_reason === "length") {
      console.log("FINISH_REASON", finish_reason);
      console.log("Error: The conversation was too long for the context window.");

      return {
        content: content + "\nThe conversation was too long for the context window, do you want to continue?",
      };
    }

    if (finish_reason === "content_filter") {
      console.log("FINISH_REASON", finish_reason);
      return { content: content + "\nThe content was filtered due to policy violations." };
    }

    if (finish_reason === "tool_calls") {
      console.log("FINISH_REASON", finish_reason);
      const responseMessage: ChatCompletionMessage = {
        role: "assistant",
        content: null,
        refusal: null,
        tool_calls: toolCalls,
      };

      if (toolCalls) {
        const enableStream = true;
        const result = await this.processToolCall(
          debugChat,
          dataMsg,
          responseMessage,
          toolCalls,
          enableStream
        );

        return result;
      } else {
        console.log("TOOL_CALLS missing in responseMessage");
        return { content: "Tool call was expected but not found in the message." };
      }
    } else if (finish_reason === "stop") {
      console.log("FINISH_REASON", finish_reason);

      return { content };
    } else {
      console.log("FINISH_REASON", finish_reason);
      return { content: "Unexpected finish reason" };
    }
  }

  static async tts(text: string): Promise<string> {
    try {
      const outputFile = path.join(uploadFilePath.audioPath, `output_${Date.now()}.mp3`);

      const response = await openAIClient.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: text,
      });

      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.promises.writeFile(outputFile, buffer);

      return outputFile;
    } catch (error) {
      console.error(error);
      throw new NotImplementedException("Error occur while text to speech with openAI");
    }
  }

  async handleStreaming(completion: Stream<ChatCompletionChunk>): Promise<outputInter> {
    let content = "";
    for await (const chunk of completion) {
      const text = chunk.choices[0]?.delta?.content || "";
      console.log(text);
      content += text;
      io.emit("chatResChunk", { content: text });
    }

    return { content };
  }


  async analyze(textToAnalyze:string, analysisInstructions:string, debug?:number): Promise<analyzeOutputInter> {
    try {

      const text_to_analyze = "# TEXT\n" + textToAnalyze + "\n"
      const analysis_instructions = "# INSTRUCTIONS\n" + analysisInstructions + "\n"

      const msgText = [analysis_instructions, text_to_analyze, analysis_instructions].join("\n");
      const data:MsgListParams[] = [
        { role: "system", content: `Today is ${new Date().toLocaleDateString()}`},
        { role: "system", content: analyzeSystem},
        { role: "user", content: msgText }
      ]

      const { choices } = await openAIClient.chat.completions.create({
        messages: data,
        model: ANALYZER_MODEL,
      });

      const content = "# RESULT\n" + choices[0].message.content + "\n"

      if(debug && debug === 1) {
        console.log(analysis_instructions)
        console.log(text_to_analyze)
        console.log(content)
      }

      return {
        content: choices[0].message.content
      }
    } catch (error) {
      console.log(">>OpenAIService>>analyzer", error);
      throw error;
    }
  }

  async analyzeLTMemoCriteria(textToAnalyze:string): Promise<analyzeLTMemoCriteriaInter> {
    try {

      const analyzeLTMemoCriteriaSystem = await readTextFile('src/assets/instruction/criteriaAnalyze.txt')
      const data:MsgListParams[] = [
        { role: "system", content: `Today is ${new Date().toLocaleDateString()}`},
        { role: "system", content: analyzeLTMemoCriteriaSystem},
        { role: "user", content: textToAnalyze }
      ]

      const { choices } = await openAIClient.chat.completions.create({
        messages: data,
        model: ANALYZER_MODEL,
        response_format: { type: "json_object" }
      });

      return  JSON.parse(choices[0].message.content || "{}")
    }
    catch (error) {
      console.log(">>OpenAIService>>analyzeLTMemoCriteria", error);
      throw error;
    }
  } 

  // Decontextualize the proposition by adding necessary modifier to nouns or entire sentence and replacing pronouns (e.g., "it", "he", "she", "they", "this", "that") with the full name of the entities that referred to.

  async decontextualize(textToDecontextualize:string, contextual:string): Promise<string> {
    try {
      const data:MsgListParams[] = [
        { role: "system", content: decontextualizeSystem},
        { role: "system", content: contextual},
        { role: "user", content: textToDecontextualize }
      ]

      const { choices } = await openAIClient.chat.completions.create({
        messages: data,
        model: ANALYZER_MODEL,
      });

      return choices[0].message.content || ""
    } catch (error) {
      console.log(">>OpenAIService>>decontextualize", error);
      throw error;
    }
  }

  // modify old memo text with new text
  async modifyMemo(oldMemo:string, newText:string): Promise<string> {
    try {
      const data:MsgListParams[] = [
        { role: "system", content: modifyMemoSystem},
        { role: "system", content: oldMemo},
        { role: "user", content: newText }
      ]

      const { choices } = await openAIClient.chat.completions.create({
        messages: data,
        model: ANALYZER_MODEL,
      });

      return choices[0].message.content || ""
    } catch (error) {
      console.log(">>OpenAIService>>modifyMemo", error);
      throw error;
    }
  }

  async isRelateMemo(textToAnalyze:string, oldMemo:string): Promise<boolean> {
    try {
      const data:MsgListParams[] = [
        { role: "system", content: `Today is ${new Date().toLocaleDateString()}`},
        { role: "system", content: isRelateMemoSystem},
        { role: "user", content: `TEXT: ${textToAnalyze}\nOLD_MEMO_GUIDE: ${oldMemo}`}
      ]

      const { choices } = await openAIClient.chat.completions.create({
        messages: data,
        model: ANALYZER_MODEL,
      });


      return choices[0].message.content?.toLowerCase().includes("yes") || false
    }
    catch (error) {
      console.log(">>OpenAIService>>isRelateMemo", error);
      throw error;
    }
  }
}
