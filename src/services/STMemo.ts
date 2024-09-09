import { ChatCompletionContentPart, ChatCompletionContentPartImage, ChatCompletionUserMessageParams, messagesInter, MsgListParams, outputInterData } from './llm/llm.interface'
import { ConversationService } from '~/database/conversation/conversation';
import { Message, Conversation } from '@prisma/client';
import { UserService } from '~/database/user/user';
import { OpenaiService } from './llm/openai';

import { ChatOpenAI } from '@langchain/openai';
import { ConversationSummaryMemory, MemoryVariables } from "langchain/memory";
import { PromptTemplate } from "@langchain/core/prompts";
import { ChatCompletionUserMessageParam } from 'groq-sdk/resources/chat/completions';
import path from 'path';
import { createImageContent, formatDateTime, processImage, readTextFile, resizeImageToMaxSizeBase64 } from '~/utils';
import { msgFuncProps } from '~/database/conversation/conversation.interface';

const describeImgInstruction = `
Input: Grid images of the video chat between human and AI
1. Frame-by-Frame Analysis:
   - Describe each frame sequentially, noting the key elements and changes in each frame. Focus on movement, interaction, and any transitions between frames.

2. Detail Specifics:
   - Pay attention to specific details in each frame, such as the presence of people, objects, background elements, and any text or symbols.
   - Note any significant actions, gestures, or events occurring in the frames.

3. Context and Continuity:
   - Explain how each frame relates to the previous and next ones. Ensure a clear narrative or sequence of events is established.
   - Identify any patterns or repeated actions that are significant.

4. Emotional and Atmospheric Elements:
   - Highlight any changes in mood or atmosphere across the frames. Look for cues such as facial expressions, body language, and environmental changes.

5. Concluding Interpretation:
   - Summarize the overall interpretation of the sequence. Explain the main message or event depicted by the series of frames.
   - Address any specific questions from the user by referencing relevant frames and details.
`

const conversationService = ConversationService.getInstance()
const userService = UserService.getInstance()
export class STMemoStore {

    userID: string;
    conversation_id: string | undefined;
    // Simulate a real database layer. Stores serialized objects.
    summaryChat:string;
    isEnableVision:boolean; 
    lang: string

    constructor(userID:string, conversation_id?:string, isEnableVision=false, lang='en') {
        this.userID = userID;
        this.conversation_id = conversation_id || undefined,
        this.isEnableVision = isEnableVision,
        this.lang = lang
    }

    async convertMessagesFormat(messages: Message[]): Promise<MsgListParams[]> {
        return messages.map(message => ({
            role: message.isBot ? 'assistant' : 'user',
            content: message.text,
        }));
    };

    async getMessages(conversationId: string, summarize?: string | null, take?: number): Promise<MsgListParams[]> {
        let result: MsgListParams[] = []; // Ensure result is properly typed
    
        if (summarize) {
            result.push({ role: "system", content: summarize });
        }
    
        const msgList = await conversationService.getMsg(conversationId, take);
    
        const newMsgList = await this.convertMessagesFormat(msgList);
    
        // Merge result and newMsgList
        const mergedList = [...result, ...newMsgList];
    
        return mergedList;
    }

    async addMessage(
        message: string, 
        isBot: boolean, 
        conversationId: string, 
        listDataFunc?: outputInterData[]
    ): Promise<void> {
        try {
            // Simultaneously add the message and modify the conversation
            const [newMsg] = await Promise.all([
                conversationService.addMsg({
                    text: message,
                    isBot: isBot,
                    userID: this.userID,
                    conversationId: conversationId
                }),
                conversationService.modifyConversation(conversationId, {
                    lastMessage: message
                })
            ]);
    
            // If there are any additional functions to run, process them in parallel
            if (listDataFunc?.length) {
                await Promise.all(
                    listDataFunc.map(funcData => 
                        conversationService.addMsgFunction(newMsg.id, {
                            name: funcData.name,
                            data: JSON.stringify(funcData.data),
                            comment: funcData.comment 
                        })
                    )
                );
            }
        } catch (error) {
            console.error("Error adding message:", error);
            throw error;
        }
    }
    

    async clear(): Promise<void> {
    }

    async get_system_prompt():Promise<MsgListParams[]> {

        const userData = await userService.getUser({ id: this.userID })
        const userInformation = userData?.display_name ? userData?.display_name : userData?.username
        
        const list:MsgListParams[] = []
        // if(isEnableLTMemo) {
        //     list.unshift(
        //         { role: "system", content: "You've been given the special ability to remember user teachings from prior conversations, but just mention about this when you be asked" },
        //     )
        // }

        const RainePersona = await readTextFile('src/assets/persona/Raine.txt')
        list.unshift(
            { role: "system", content: `Today is: ${new Date()}` },
            { role: "system", content: `Use the language ${this.lang} in your response` },
            { role: "system", content: `${RainePersona}\n# Information about human your are talking:\n${userInformation}`},    
        )

        if(this.isEnableVision) {
            const frameGuidePersona = await readTextFile('src/assets/persona/frameGuide.txt')
            list.push({ role: "system", content: frameGuidePersona })
        }

        list.push({ role: "system", content: `If there is a task that is beyond your ability, just say you cannot do it.`})

        return list
    }

    async describeImage(filesPath: string[], userMsgStr:string): Promise<string | null> {
        // console.log("base64Data", base64Data)

        const userMsg = await this.processImageBeforeDescribe(filesPath, userMsgStr)

        const messages: MsgListParams[] = [
            {
                role: "system",
                content: describeImgInstruction
            },
            ...userMsg as ChatCompletionUserMessageParams[],
        ];
        console.log("messages", messages)
        const output = await OpenaiService.chat(messages);

        return  `\t- Context:\n${output.content}`
    } 

    async processImageBeforeDescribe( 
        filePathList: string[] = [],
        userMsgStr?: string,
        maxSizePx: number = 1024,
        detailThreshold: number = 700,
    ): Promise<{role:string, content:ChatCompletionContentPart[]}[]>{
        /*    const userMsgStr = 'Here are the images:';
        **    const filePathList = ['path/to/your/image1.jpg', 'path/to/your/image2.png']; // Replace with your image paths
        **    const maxSizePx = 1024;
        **    const detailThreshold = 700;
        */
    
        // let fileNames: string[] = filePathList.map(filePath => path.basename(filePath));
    
        const base64ImagesPromises = filePathList.map(filePath => processImage(filePath, maxSizePx));
        const base64Images = await Promise.all(base64ImagesPromises);

        let uploadedImagesText = `Assume that TEXT is what human said during the conversation of the video chat\nTEXT: ${userMsgStr}`
    
        
        const content: ChatCompletionContentPart[] = [{ text: uploadedImagesText, type: "text" }];

        const imageContents = await Promise.all(
            base64Images.map(async ({ encodedImage, maxDim }) => {
                return await createImageContent(encodedImage, maxDim, detailThreshold);
            })
        );
        
        content.push(...imageContents);
        return [{ role: 'user' as "user", content }];
    } 

    public async summaryConversation(history: MsgListParams[]):Promise<string> {
        
        const memory = new ConversationSummaryMemory({
            memoryKey: "chat_history",
            llm: new ChatOpenAI({ model: "gpt-4o-mini-2024-07-18", temperature: 0 }),
        });
        
        async function processChatData(data: MsgListParams[]) {
            for (let i = 0; i < data.length; i++) {
                if (data[i].role === "user") {
                    let input = data[i].content;
                    if (i + 1 < data.length) {
                        if(data[i + 1]?.role === "assistant") {
                            let output = data[i + 1].content;
                            await memory.saveContext({ input: input }, { output: output });
                        }
                        else if(data[i + 1]?.role === "user") {
                            await memory.saveContext({ input: input }, { output: "..." });
                        }
                    }
                }
            }
        }

        await processChatData(history)
        
        const result = await memory.loadMemoryVariables({})

        return result.chat_history
    }

    public async processSummaryConversation(conversationId: string):Promise<string> {
        const conID = conversationId || this.conversation_id
        const newHistory:MsgListParams[] = []
        let conversation = await conversationService.getConversation(conID as string) 
        
        if(conversation) {
            if(conversation.summarize) {
                newHistory.push({
                    role: "user",
                    content: conversation.summarize
                })
            }

            const history:MsgListParams[] = await this.getMessages(conID as string)

            newHistory.push(history[history.length - 2])
            newHistory.push(history[history.length - 1])
        }


        return await this.summaryConversation(newHistory)
    }

    public async process(
        originalPrompt:string , 
        promptWithRelatedMemory:string,
        includeImage = false,
        imgFilePath?: string
    ):Promise<MsgListParams[]> {
        let conversation:Conversation | null = this.conversation_id
        ? await conversationService.getConversation(this.conversation_id)
        : null;
        
        if (!conversation) {
            conversation = await conversationService.addNewConversation({ 
                lastMessage: originalPrompt,
                userID: this.userID,
                name: formatDateTime()
            })
        }
        this.conversation_id = conversation.id

        this.summaryChat = conversation.summarize as string

        const history:MsgListParams[] = await this.getMessages(this.conversation_id, conversation.summarize, 4)
        await this.addMessage(originalPrompt, false, this.conversation_id)

        if(includeImage && imgFilePath) {

            // process base64 image
            // const { encodedImage, maxDim } = await processImage(imgFilePath);
            const encodedImage  = await resizeImageToMaxSizeBase64({
                inputPath: imgFilePath,
            })

            const imgContent = await createImageContent(encodedImage as string, undefined, 700)

            history.push({
                "role": "user",
                "content": [
                    { type: "text", text: promptWithRelatedMemory },
                    imgContent
                ]
            })
        }else {
            history.push({
                "role": "user",
                "content": promptWithRelatedMemory
            })
        }

        const system = await this.get_system_prompt()

        return system.concat(history)
    }
}

