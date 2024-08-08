import { createClient } from '@deepgram/sdk';
import * as dotenv from "dotenv";
dotenv.config();

const deepgramApiKey = process.env.DEEPGRAM_API_KEY;

export const deepgramClient = createClient(deepgramApiKey);
