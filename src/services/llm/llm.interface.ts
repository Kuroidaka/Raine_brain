import { 
    ChatCompletionContentPart as GroqChatCompletionContentPart, 
    ChatCompletionMessageParam as OpenAIMsgParam,
    ChatCompletionContentPartImage as OpenAIChatCompletionContentPartImage,
    ChatCompletionUserMessageParam as OpenAIChatCompletionUserMessageParam,
    ChatCompletionSystemMessageParam as OpenAIChatCompletionSystemMessageParam,
    ChatCompletionAssistantMessageParam as OpenAIChatCompletionAssistantMessageParam,
    ChatCompletionToolMessageParam as OpenAIChatCompletionToolMessageParam,
    ChatCompletionFunctionMessageParam as OpenAIChatCompletionFunctionMessageParam
} from "openai/resources/chat/completions"
import { 
    ChatCompletionContentPart as OpenAIChatCompletionContentPart,
    ChatCompletionMessageParam as GroqMsgParam,
    ChatCompletionContentPartImage as GroqChatCompletionContentPartImage,
    ChatCompletionUserMessageParam as GroqChatCompletionUserMessageParam,
    ChatCompletionSystemMessageParam as GroqChatCompletionSystemMessageParam,
    ChatCompletionAssistantMessageParam as GroqChatCompletionAssistantMessageParam,
    ChatCompletionToolMessageParam as GroqChatCompletionToolMessageParam,
    ChatCompletionFunctionMessageParam as GroqChatCompletionFunctionMessageParam,
    ChatCompletionContentPartText as GroqChatCompletionContentPartText
    
 } from "groq-sdk/resources/chat/completions";


export interface messagesInter {
    role: string,
    content: string
}

export interface outputInter {
    content: string | null,
    data?: any[]
}

export interface analyzeOutputInter {
    content: string | null
}


export type MsgListParams = |
GroqChatCompletionSystemMessageParam | 
Omit<OpenAIChatCompletionSystemMessageParam, 'content'> & {
    content: string 
} |
OpenAIChatCompletionAssistantMessageParam| GroqChatCompletionAssistantMessageParam |
OpenAIChatCompletionToolMessageParam | GroqChatCompletionToolMessageParam |
OpenAIChatCompletionUserMessageParam | GroqChatCompletionUserMessageParam | 
OpenAIChatCompletionFunctionMessageParam | GroqChatCompletionFunctionMessageParam


export type ChatCompletionUserMessageParams = OpenAIChatCompletionUserMessageParam | GroqChatCompletionUserMessageParam

export type ChatCompletionContentPart = OpenAIChatCompletionContentPart | GroqChatCompletionContentPart

export type ChatCompletionContentPartImage = OpenAIChatCompletionContentPartImage | GroqChatCompletionContentPartImage

export interface DataMemo {
    id: string,
    input_text:string,
    output_text:string,
    distance: number,
    createdAt: string
}

export interface ToolCallCus {
    id: string;
    type: "function";
    function: {
        name: string;
        arguments: string;
    };
}