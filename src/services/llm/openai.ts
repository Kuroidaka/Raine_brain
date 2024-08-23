import { NotImplementedException } from '../../common/error';
import { NextFunction, Request, Response } from "express";
import { traceable } from "langsmith/traceable";
import { openAIClient } from '../../config/openai';
import { MsgListParams, outputInter, outputInterData, ToolCallCus } from './llm.interface';
import { io } from '~/index';
import * as fs from 'fs';
import path from 'path';
import { ChatCompletion, ChatCompletionAssistantMessageParam, ChatCompletionChunk, ChatCompletionMessage, ChatCompletionMessageToolCall } from 'openai/resources/chat/completions';
import { ReminderChatService } from '../chat/reminder';
import { llmTools, toolsDefined } from './tool';
import { Stream } from 'openai/streaming';
import chalk from 'chalk';

const analyzeSystem = `You are an expert in text analysis.
The user will give you TEXT to analyze.
The user will give you analysis INSTRUCTIONS copied twice, at both the beginning and the end.
You will follow these INSTRUCTIONS in analyzing the TEXT, then give the results of your expert analysis in the format requested.`
const audioPath = 'src/assets/file/audio';


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
          tools: toolsDefined
        }
      }

      const { choices } = await openAIClient.chat.completions.create({
        messages: dataMsg as MsgListParams[],
        model: MODEL,
        // max_tokens: 200,
        ...queryObject
      });

      return OpenaiService.handleFinishReason(
        debugChat,
        choices[0],
        dataMsg
      )
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
          tools: toolsDefined
        }
      }
      const stream = await openAIClient.chat.completions.create({
        messages: messages as MsgListParams[],
        model: MODEL,
        stream: true,
        ...queryObject
      });

      return OpenaiService.handleFinishReasonStream(debugChat, stream, messages)

      // if(toolEnable) {
      //   const isEnableStream = true
      //   return OpenaiService.handleStreamingWithTool(debugChat, stream, messages, isEnableStream)
      // }

      // return OpenaiService.handleStreaming(stream)
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
      const listData:outputInterData[] = []

      for (const toolCall of toolCalls) {
        const mark = Math.random()
        const functionName = toolCall.function.name;
        const functionToCall = availableFunctions[functionName as keyof typeof availableFunctions];
        let functionData:outputInterData = {
          name: functionName
        }

        isEnableStream && io.emit('chatResChunkFunc', { functionData: functionData, id: mark });
        const functionArgs = JSON.parse(toolCall.function.arguments);

        debugChat && console.log("functionArgs", functionArgs)
        const functionResponse = await functionToCall(functionArgs);
        // isEnableStream && io.emit('chatResChunk', { content: functionResponse.comment });

        messages.push({
          // name: functionName,
          tool_call_id: toolCall.id,
          role: "tool",
          content: functionResponse.comment,
        });

        if(functionResponse?.data){
          functionData = {
            ...functionData,
            data: functionResponse.data,
            comment: functionResponse.comment
          }
          isEnableStream && io.emit('chatResChunkFunc', { functionData: functionData, id: mark });

          listData.push(functionData)
        }

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

  handleFinishReason: async(
    debugChat: number, 
    choice: ChatCompletion.Choice,
    dataMsg: MsgListParams[]
  ):Promise<outputInter>  => {
    const finish_reason = choice.finish_reason
    // Check if the conversation was too long for the context window
    if (finish_reason === "length") {
      console.log(chalk.yellow("FINISH_REASON"), finish_reason);
      console.log("Error: The conversation was too long for the context window.");
      // Handle the error as needed, e.g., by truncating the conversation or asking for clarification
      // handleLengthError(response);

      return {
        content: "\nThe conversation was too long for the context window, do you want to continue?"
      }
    }

    // Check if the model's output included copyright material (or similar)
    if (finish_reason === "content_filter") {
      console.log(chalk.red("FINISH_REASON"), finish_reason);
      console.log("choice", choice)
      return { content: "\nThe content was filtered due to policy violations." }
    }

    // Check if the model has made a tool_call. This is the case either if the "finish_reason" is "tool_calls" 
    if (finish_reason === "tool_calls") {
      // Handle tool call
      console.log(chalk.green("FINISH_REASON"), finish_reason);
      const responseMessage = choice.message;

      const toolCalls = responseMessage.tool_calls;
  
      if (toolCalls) {
        const enableStream = false
        const result = await OpenaiService.processToolCall(
          debugChat,
          dataMsg,
          responseMessage,
          toolCalls,
          enableStream
        );

        return result
      } else {
        // If toolCalls is null or undefined, handle this case
        console.log(chalk.red("TOOL_CALLS missing in responseMessage"));
        return { content: "Tool call was expected but not found in the message." };
      }

    }

    // Else finish_reason is "stop", in which case the model was just responding directly to the user
    else if (finish_reason === "stop") {
      // Handle the normal stop case
      console.log(chalk.green("FINISH_REASON"), finish_reason);
      const content = choice.message.content

      return { content }
    }

    // Catch any other case, this is unexpected
    else {
      console.log(chalk.red("FINISH_REASON"), finish_reason);
      console.log("choice", choice)
      return { content: "Unexpected finish reason" }
    }
  },

  handleFinishReasonStream: async(
    debugChat: number, 
    completion: Stream<ChatCompletionChunk>,
    dataMsg: MsgListParams[]
  ):Promise<outputInter>  => {
    // Build up the response structs from the streamed response, simultaneously sending message chunks to the browser
    let content = ""
    let toolCalls: ToolCallCus[] = [];
    let finish_reason

    // Merge data stream
    for await (const chunk of completion) {
      const choice = chunk.choices[0]
      const delta = choice.delta;
      finish_reason = choice.finish_reason

      if (delta && delta.content) {
        // Content chunk -- send to browser and record for later saving
        content += delta.content;
        io.emit('chatResChunk', { content: delta.content });
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
      console.log(chalk.yellow("FINISH_REASON"), finish_reason);
      console.log("Error: The conversation was too long for the context window.");
      // Handle the error as needed, e.g., by truncating the conversation or asking for clarification
      // handleLengthError(response);

      return {
        content: content + "\nThe conversation was too long for the context window, do you want to continue?"
      }
    }

    // Check if the model's output included copyright material (or similar)
    if (finish_reason === "content_filter") {
      console.log(chalk.red("FINISH_REASON"), finish_reason);
      return { content: content+ "\nThe content was filtered due to policy violations." }
    }

    // Check if the model has made a tool_call. This is the case either if the "finish_reason" is "tool_calls" 
    if (finish_reason === "tool_calls") {
      // Handle tool call
      console.log(chalk.green("FINISH_REASON"), finish_reason);
      const responseMessage:ChatCompletionMessage = {
        "role": "assistant",
        "content": null,
        "refusal": null,
        tool_calls: toolCalls
      }
  
      if (toolCalls) {
        const enableStream = true
        const result = await OpenaiService.processToolCall(
          debugChat,
          dataMsg,
          responseMessage,
          toolCalls,
          enableStream
        );

        return result
      } else {
        // If toolCalls is null or undefined, handle this case
        console.log(chalk.red("TOOL_CALLS missing in responseMessage"));
        return { content: "Tool call was expected but not found in the message." };
      }

    }

    else if (finish_reason === "stop") {
      // Handle the normal stop case
      console.log(chalk.green("FINISH_REASON"), finish_reason);

      return { content }
    }

    // Catch any other case, this is unexpected
    else {
      console.log(chalk.red("FINISH_REASON"), finish_reason);
      return { content: "Unexpected finish reason" }
    }
      
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

  handleStreaming: async (completion: Stream<ChatCompletionChunk>):Promise<outputInter> => {
    let content = ""
    for await (const chunk of completion) {
      // Print the completion returned by the LLM.
      const text = chunk.choices[0]?.delta?.content || "";
      console.log(text)
      content += text 
      io.emit('chatResChunk', { content: text });
    }

    return { content };
  },
  // handleStreamingWithTool: async (debugChat:number, completion: Stream<ChatCompletionChunk>, dataMsg:MsgListParams[], isEnableStream: boolean):Promise<outputInter> => {
  //   let toolCalls: ToolCallCus[] = [];
  //   let content = ""
  //   let resObj:outputInter = {
  //     content:"",
  //     data: []
  //   }
  //   const responseMessage:ChatCompletionMessage = {
  //     "role": "assistant",
  //     "content": null,
  //     "refusal": null,
  //   }
  //   // Build up the response structs from the streamed response, simultaneously sending message chunks to the browser
  //   for await (const chunk of completion) {
  //       const delta = chunk.choices[0].delta;
  //       const finish_reason = chunk.choices[0].finish_reason

  //       if (delta && delta.content) {
  //           // Content chunk -- send to browser and record for later saving
  //           content += delta.content;
  //           io.emit('chatResChunk', { content });
  //       } else if (delta && delta.tool_calls) {
  //           const tcChunkList = delta.tool_calls;
  //           for (const tcChunk of tcChunkList) {
  //               while (toolCalls.length <= tcChunk.index) {
  //                   toolCalls.push({ id: "", type: "function", function: { name: "", arguments: "" } });
  //               }
  //               const tc = toolCalls[tcChunk.index];

  //               if (tcChunk.id) {
  //                   tc.id += tcChunk.id;
  //               }
  //               if (tcChunk.function && tcChunk.function.name) {
  //                   tc.function.name += tcChunk.function.name;
  //               }
  //               if (tcChunk.function && tcChunk.function.arguments) {
  //                   tc.function.arguments += tcChunk.function.arguments;
  //               }
  //           }
  //       }
  //   }
  //   responseMessage.tool_calls = toolCalls
  //   console.log("toolCalls", toolCalls)

  //   if (toolCalls) {
  //     const { content, data = [] } = await OpenaiService.processToolCall(debugChat, dataMsg, responseMessage, toolCalls, isEnableStream)
  //     resObj = {
  //       content,
  //       data
  //     }
  //   }

  //   return resObj;
  // },
}
