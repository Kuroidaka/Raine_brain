import { groqClient } from "~/config/groq";
import { NextFunction, Request, Response } from "express";
import { traceable } from "langsmith/traceable";
import { analyzeOutputInter, messagesInter, MsgListParams, outputInter } from "./llm.interface";
import { NotFoundException } from "~/common/error";

const analyzeSystem = `You are an expert in text analysis.
The user will give you TEXT to analyze.
The user will give you analysis INSTRUCTIONS copied twice, at both the beginning and the end.
You will follow these INSTRUCTIONS in analyzing the TEXT, then give the results of your expert analysis in the format requested.`

export const GroqService = {
  chat: async (
    messages: MsgListParams[] | string,
    isEnableStream = false,
    res?: Response
  ):Promise<outputInter> => {

    // This way allow us to send message as a string or and array object
    const data: (MsgListParams[]) = (typeof messages === 'string') 
      ? [{ role: "user", content: JSON.stringify(messages) }]
      : messages;
  
    // Return to Stream feature
    if (isEnableStream && res) return GroqService.stream(res, data);
  
    try {
      const { choices } = await groqClient.chat.completions.create({
        messages: data as MsgListParams[],
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
  stream: async(res: Response, messages: (MsgListParams[])) => {
    let content = ""
    const errorMsg = "Someone call Canh, there are some Bug with my program"
    try {
      const stream = await groqClient.chat.completions.create({
        messages: messages as MsgListParams[],
        model: "llama3-8b-8192",
        stream: true,
      });

      for await (const chunk of stream) {
        // Print the completion returned by the LLM.
        const text = chunk.choices[0]?.delta?.content || "";
        content += text;
        console.log(text);
        res.write(JSON.stringify({ text }) + '\n');
      }

      return { content };
    } catch (error) {
      console.log(error);
      res.write(JSON.stringify({ text: " " + errorMsg }) + '\n');
      content += errorMsg

      return { content }
    }
  },
  analyzer: async(textToAnalyze:string, analysisInstructions:string, debug?:number): Promise<analyzeOutputInter>=> {
    try {

      const text_to_analyze = "# TEXT\n" + textToAnalyze + "\n"
      const analysis_instructions = "# INSTRUCTIONS\n" + analysisInstructions + "\n"

      const msgText = [analysis_instructions, text_to_analyze, analysis_instructions].join("\n");
      const data:MsgListParams[] = [
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
