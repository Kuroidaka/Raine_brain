import { ChatCompletionMessageParam as OpenAIMsgParam } from "groq-sdk/resources/chat/completions"
import { ChatCompletionMessageParam as GroqMsgParam } from "groq-sdk/resources/chat/completions";

export interface messagesInter {
    role: string,
    content: string
}

export interface outputInter {
    content: string | null
}

export interface analyzeOutputInter {
    content: string | null
}


export type MsgListParams = | OpenAIMsgParam | GroqMsgParam