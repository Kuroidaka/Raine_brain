import { groqClient } from "~/config/groq";
import { NextFunction, Request, Response } from "express";
import { traceable } from "langsmith/traceable";
import { analyzeOutputInter, messagesInter, outputInter } from "./groq.interface";
import { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";
import { NotImplementedException } from "~/common/error";

const analyzeSystem = `You are an expert in text analysis.
The user will give you TEXT to analyze.
The user will give you analysis INSTRUCTIONS copied twice, at both the beginning and the end.
You will follow these INSTRUCTIONS in analyzing the TEXT, then give the results of your expert analysis in the format requested.`

export const GroqService = {
  chat: async (messages: ChatCompletionMessageParam[] | messagesInter[] | string, isEnableStream = false):Promise<outputInter> => {

    // This way allow us to send message as a string or and array object
    const data: (ChatCompletionMessageParam[] | messagesInter[]) = (typeof messages === 'string') 
      ? [{ role: "user", content: JSON.stringify(messages) }]
      : messages;
  
    // Return to Stream feature
    // if (isEnableStream) return GroqService.stream(data);
  
    try {
      const { choices } = await groqClient.chat.completions.create({
        messages: data as ChatCompletionMessageParam[],
        model: "llama3-70b-8192",
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
  stream: async(messages: ChatCompletionMessageParam[]) => {
    try {
      const stream = await groqClient.chat.completions.create({
        messages: messages,
        model: "llama3-8b-8192",
        stream: true,
      });
     
      for await (const chunk of stream) {
        // Print the completion returned by the LLM.
        const text = chunk.choices[0]?.delta?.content || "" 
        console.log(text);
      }

      return {
        content: ""
      }
    } catch (error) {
      console.log(error);
      throw error;
    }
  },
  analyzer: async(textToAnalyze:string, analysisInstructions:string, debug?:number): Promise<analyzeOutputInter>=> {
    try {

      const text_to_analyze = "# TEXT\n" + textToAnalyze + "\n"
      const analysis_instructions = "# INSTRUCTIONS\n" + analysisInstructions + "\n"

      const msgText = [analysis_instructions, text_to_analyze, analysis_instructions].join("\n");
      const data:ChatCompletionMessageParam[] = [
        { role: "system", content: analyzeSystem},
        { role: "user", content: msgText }
      ]

      const { choices } = await groqClient.chat.completions.create({
        messages: data,
        model: "llama3-70b-8192",
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
      console.log(">>GroqService>>analyzer", error);
      throw error;
    }
  }
}
