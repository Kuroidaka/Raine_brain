import { OpenAI } from "openai";
import { traceable } from "langsmith/traceable";
import { wrapOpenAI } from "langsmith/wrappers";
import * as dotenv from "dotenv";
dotenv.config();


// Auto-trace LLM calls in-context
export const openAIClient = wrapOpenAI(new OpenAI({apiKey: process.env.OPENAI_API_KEY}));