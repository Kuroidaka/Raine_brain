import { groqClient } from "~/config/groq";
import { NextFunction, Request, Response } from "express";
import { traceable } from "langsmith/traceable";

export const GroqService = {
  chat: async (prompt: string) => {
    try {
      const result = await groqClient.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama3-8b-8192",
      });
      return result.choices[0].message.content;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
