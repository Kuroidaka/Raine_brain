import Groq from "groq-sdk";
import * as dotenv from "dotenv";
dotenv.config();


// Auto-trace LLM calls in-context
export const groqClient = new Groq({apiKey: process.env.GROQ_API_KEY});