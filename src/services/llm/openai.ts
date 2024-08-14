import { NotImplementedException } from '../../common/error';
import { NextFunction, Request, Response } from "express";
import { traceable } from "langsmith/traceable";
import { openAIClient } from '../../config/openai';
import { MsgListParams, outputInter } from './llm.interface';
import { io } from '~/index';
import * as fs from 'fs';
import path from 'path';

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
    res?: Response
  ):Promise<outputInter> => {

    // This way allow us to send message as a string or and array object
    const data: (MsgListParams[]) = (typeof messages === 'string') 
      ? [{ role: "user", content: messages }]
      : messages;
  
    // Return to Stream feature
    if (isEnableStream && res) return OpenaiService.stream(res, data);
  
    try {
      const { choices } = await openAIClient.chat.completions.create({
        messages: data as MsgListParams[],
        model: MODEL,
      });
      return {
        content: choices[0].message.content
      }
    } catch (error) {
      console.error(error);
      return {
        content: "Give me a quick breather; I'll be back in a few minutes, fresher than ever!"
      }
    }
  },  
  stream: async(res: Response, messages: (MsgListParams[])) => {
    let content = ""
    const errorMsg = "Someone call Canh, there are some Bug with my program"
    try {
      const stream = await openAIClient.chat.completions.create({
        messages: messages as MsgListParams[],
        model: MODEL,
        stream: true,
      });

      for await (const chunk of stream) {
        // Print the completion returned by the LLM.
        const text = chunk.choices[0]?.delta?.content || "";
        console.log(text)
        content += text 
        io.emit('chatResChunk', { content });
      }

      return { content };
    } catch (error) {
      console.log(error);
      // res.write(JSON.stringify({ text: " " + errorMsg }) + '\n');
      content += ("\n" + errorMsg)
      io.emit('chatResChunk', { content });

      return { content }
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
  }
  // analyzer: async(textToAnalyze:string, analysisInstructions:string, debug?:number): Promise<analyzeOutputInter>=> {
  //   try {

  //     const text_to_analyze = "# TEXT\n" + textToAnalyze + "\n"
  //     const analysis_instructions = "# INSTRUCTIONS\n" + analysisInstructions + "\n"

  //     const msgText = [analysis_instructions, text_to_analyze, analysis_instructions].join("\n");
  //     const data:ChatCompletionMessageParam[] = [
  //       { role: "system", content: analyzeSystem},
  //       { role: "user", content: msgText }
  //     ]

  //     const { choices } = await openAIClient.chat.completions.create({
  //       messages: data,
  //       model: MODEL,
  //     });

  //     const content = "# RESULT\n" + choices[0].message.content + "\n"

  //     if(debug && debug === 1) {
  //       console.log(analysis_instructions)
  //       console.log(text_to_analyze)
  //       console.log(content)
  //     }

  //     return {
  //       content: choices[0].message.content
  //     }
  //   } catch (error) {
  //     console.log(">>OpenaiService>>analyzer", error);
  //     throw error;
  //   }
  // }
}
