import { NotImplementedException } from '../../common/error';
import { NextFunction, Request, Response } from "express";
import { traceable } from "langsmith/traceable";
import { openAIClient } from '../../config/openai';
import { MsgListParams, outputInter, ToolCallCus } from './llm.interface';
import { io } from '~/index';
import * as fs from 'fs';
import path from 'path';
import { ChatCompletion, ChatCompletionAssistantMessageParam, ChatCompletionChunk, ChatCompletionMessage, ChatCompletionMessageToolCall } from 'openai/resources/chat/completions';
import { ReminderChatService } from '../chat/reminder';
import { llmTools } from './tool';
import { Stream } from 'openai/streaming';

const analyzeSystem = `You are an expert in text analysis.
The user will give you TEXT to analyze.
The user will give you analysis INSTRUCTIONS copied twice, at both the beginning and the end.
You will follow these INSTRUCTIONS in analyzing the TEXT, then give the results of your expert analysis in the format requested.`
const audioPath = 'src/assets/file/audio';


const tools = [
  {
      type: "function",
      function: {
          name: "ReminderChatService",
          description: "This tool processes task management queries. It can fetch tasks based on specific criteria (e.g., tasks in a particular area) and optionally include related subtasks. For example, if the user asks to 'search task with area in work with its subtask,' the tool will process this by setting 'q' to 'search task with area in work' and 'includeSubTask' to true.",
          parameters: {
              type: "object",
              properties: {
                "q": {
                  "description": "The query string provided by the user. This string defines the criteria for searching tasks (e.g., 'search task with area in work').",
                  "type": "string",
                },
                "includeSubTask": {
                  "description": "A boolean flag indicating whether to include subtasks in the processing. If true, the tool will retrieve and include related subtasks in the result.",
                  "type": "boolean",
                }
              },
              required: ["expression", "includeSubTask"],
          },
      },
  }
];

const MODEL = "gpt-4o"
export const OpenaiService = {
  chat: async (
    messages: MsgListParams[],
    isEnableStream = false,
    toolEnable = false,
    res?: Response,
    debugChat = 0
  ):Promise<outputInter> => {

    // This way allow us to send message as a string or and array object
    const dataMsg: (MsgListParams[]) = (typeof messages === 'string') 
      ? [{ role: "user", content: messages }]
      : messages;
  
    // Return to Stream feature
    if (isEnableStream && res) return OpenaiService.stream(debugChat, res, dataMsg, toolEnable);
  
    try {
      let queryObject = {}
      let resObj:{content: string, data: any[]} = {content: '', data: []}

      if(toolEnable) {
        queryObject = {
          tool_choice: 'auto',
          tools
        }
      }

      const { choices } = await openAIClient.chat.completions.create({
        messages: dataMsg as MsgListParams[],
        model: MODEL,
        ...queryObject
      });
      debugChat === 1 && console.log("choice", choices)
      const responseMessage = choices[0].message;
      resObj.content = responseMessage.content as string

      const toolCalls = responseMessage.tool_calls;
  
      if (toolCalls) {
        const responseMessage = choices[0].message
        const { content, data = [] } = await OpenaiService.processToolCall(debugChat, dataMsg, responseMessage, toolCalls, isEnableStream)
        resObj = {
          content: content as string,
          data
        }
      }

      return resObj
    } catch (error) {
      console.error(error);
      return {
        content: "Give me a quick breather; I'll be back in a few minutes, fresher than ever!"
      }
    }
  },
  stream: async(debugChat: number ,res: Response, messages: (MsgListParams[]), toolEnable: boolean):Promise<outputInter> => {
    let content = ""
    const errorMsg = "Someone call Canh, there are some Bug with my program"
    try {
      let queryObject = {}
      if(toolEnable) {
        queryObject = {
          tool_choice: 'auto',
          tools
        }
      }
      const stream = await openAIClient.chat.completions.create({
        messages: messages as MsgListParams[],
        model: MODEL,
        stream: true,
        ...queryObject
      });

      if(toolEnable) {
        const isEnableStream = true
        return OpenaiService.handleStreamingWithTool(debugChat, stream, messages, isEnableStream)
      }

      return OpenaiService.handleStreaming(stream)
    } catch (error) {
      console.log(error);
      content += ("\n" + errorMsg)
      io.emit('chatResChunk', { content });

      return { content }
    }
  },
  processToolCall: async(debugChat: number, messages: MsgListParams[], responseMessage: ChatCompletionMessage, toolCalls: Array<ChatCompletionMessageToolCall>, isEnableStream: boolean):Promise<outputInter> => {
    try {
      const availableFunctions = {
          "ReminderChatService": llmTools.ReminderChatService,
      };

      messages.push(responseMessage);
      const listData = []

      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        const functionToCall = availableFunctions[functionName as keyof typeof availableFunctions];

        const functionArgs = JSON.parse(toolCall.function.arguments);

        debugChat && console.log("functionArgs", functionArgs)
        const functionResponse = await functionToCall(functionArgs);

        messages.push({
          // name: functionName,
          tool_call_id: toolCall.id,
          role: "tool",
          content: functionResponse.message,
        });

        if(functionResponse?.data){
          listData.push({
            name: functionName,
            data:functionResponse.data
          })
        }

        debugChat && console.log("functionResponse.message", functionResponse.message)
      }
      let content = ""
      const secondObj = {
        model: MODEL,
        messages: messages,
        ...(isEnableStream && { stream: true })
      }
      const secondResponse = await openAIClient.chat.completions.create(secondObj)
      if(isEnableStream) {
        const result = await OpenaiService.handleStreaming(secondResponse as Stream<ChatCompletionChunk>)
        content = result.content as string
      } else {
        const resMsg = secondResponse as ChatCompletion
        content = resMsg.choices[0].message.content as string
      }
      
      return {
        content: content,
        data: listData
      }

    } catch (error) {
      console.error(error);
      return {
        content: "Give me a quick breather; I'll be back in a few minutes, fresher than ever!"
      }
    }
  },
  handleStreamingWithTool: async (debugChat:number, completion: Stream<ChatCompletionChunk>, dataMsg:MsgListParams[], isEnableStream: boolean):Promise<outputInter> => {
    // STILL MISSING CASE FOR FINISHED REASON
    let toolCalls: ToolCallCus[] = [];
    let content = ""
    let resObj:outputInter = {
      content:"",
      data: []
    }
    const responseMessage:ChatCompletionMessage = {
      "role": "assistant",
      "content": null,
      "refusal": null,
    }
    // Build up the response structs from the streamed response, simultaneously sending message chunks to the browser
    for await (const chunk of completion) {
        const delta = chunk.choices[0].delta;

        if (delta && delta.content) {
            // Content chunk -- send to browser and record for later saving
            content += delta.content;
            io.emit('chatResChunk', { content });
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
    responseMessage.tool_calls = toolCalls
    console.log("toolCalls", toolCalls)

    if (toolCalls) {
      const { content, data = [] } = await OpenaiService.processToolCall(debugChat, dataMsg, responseMessage, toolCalls, isEnableStream)
      resObj = {
        content,
        data
      }
    }

    return resObj;
  },
  handleStreaming: async (completion: Stream<ChatCompletionChunk>):Promise<outputInter> => {
    let content = ""
    for await (const chunk of completion) {
      // Print the completion returned by the LLM.
      const text = chunk.choices[0]?.delta?.content || "";
      console.log(text)
      content += text 
      io.emit('chatResChunk', { content });
    }

    return { content };
  },
  tts: async (text:string) => {
    try {
      const outputFile = path.join(audioPath, `output_${Date.now()}.mp3`)

      const response = await openAIClient.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: text,
      });

      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.promises.writeFile(outputFile, buffer);



      // const stream = await response.getStream();
      // if (stream) {
      //   const file = fs.createWriteStream(outputFile);
      //     await pipeline(stream as ReadableStream<Uint8Array>, file);
      //     console.log(`Audio file written to ${outputFile}`);
      // } else {
      //   throw new NotImplementedException("Error occur while text to speech with deepgram")
      // }

      return outputFile


    } catch (error) {
      console.error(error);
      throw new NotImplementedException("Error occur while text to speech with openAI")
    }
  },
}
