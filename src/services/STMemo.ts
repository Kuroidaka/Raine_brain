import { messagesInter, MsgListParams } from './llm/llm.interface'
import { ConversationService } from '~/database/conversation/conversation';
import { Message } from '@prisma/client';
import { UserService } from '~/database/user/user';
import { OpenaiService } from './llm/openai';

import { ChatOpenAI } from '@langchain/openai';
import { ConversationSummaryMemory, MemoryVariables } from "langchain/memory";
import { PromptTemplate } from "@langchain/core/prompts";
import { ChatCompletionUserMessageParam } from 'groq-sdk/resources/chat/completions';

const describeImgInstruction = `
Instruction Prompt for Analyzing Tiled Screenshots from a Video Feed:

1. Overview of the Sequence:
   - Start with a brief summary of what is happening across the series of screenshots. Identify the primary subjects and any recurring actions or themes.

2. Frame-by-Frame Analysis:
   - Describe each frame sequentially, noting the key elements and changes in each frame. Focus on movement, interaction, and any transitions between frames.

3. Detail Specifics:
   - Pay attention to specific details in each frame, such as the presence of people, objects, background elements, and any text or symbols.
   - Note any significant actions, gestures, or events occurring in the frames.

4. Context and Continuity:
   - Explain how each frame relates to the previous and next ones. Ensure a clear narrative or sequence of events is established.
   - Identify any patterns or repeated actions that are significant.

5. Emotional and Atmospheric Elements:
   - Highlight any changes in mood or atmosphere across the frames. Look for cues such as facial expressions, body language, and environmental changes.

6. Concluding Interpretation:
   - Summarize the overall interpretation of the sequence. Explain the main message or event depicted by the series of frames.
   - Address any specific questions from the user by referencing relevant frames and details.

Example Analysis:

1. Overview:
   - The sequence shows a person walking through a park, interacting with various objects and people along the way.

2. Frame-by-Frame Analysis:
   - Frame 1: The person is entering the park, holding a coffee cup.
   - Frame 2: They stop to greet a friend sitting on a bench.
   - Frame 3: Both individuals are engaged in conversation, with animated expressions.
   - Frame 4: The person continues walking, now holding a phone.
   - Frame 5: They stop to admire a flower bed.
   - Frame 6: The person takes a seat on a bench, still looking at their phone.

3. Detail Specifics:
   - Frame 1: The coffee cup is a takeaway cup with a recognizable logo.
   - Frame 2: The friend has a book open on their lap.
   - Frame 3: Both are smiling, indicating a friendly conversation.
   - Frame 4: The phone is visible, showing a map application.
   - Frame 5: The flowers are brightly colored, adding a cheerful element to the scene.
   - Frame 6: The person appears relaxed, leaning back on the bench.

4. Context and Continuity:
   - The sequence shows a coherent narrative of a leisurely walk in the park, with interactions and moments of personal interest.
   - The frames transition smoothly, depicting a continuous and natural flow of events.

5. Emotional and Atmospheric Elements:
   - The overall mood is pleasant and relaxed, with friendly interactions and moments of individual enjoyment.

6. Concluding Interpretation:
   - The sequence depicts a typical, pleasant day in the park, highlighting moments of social interaction and personal relaxation.
   - If the user asks about the conversation, refer to Frames 2 and 3, noting the friendly and animated nature of the interaction.`

const conversationService = ConversationService.getInstance()
const userService = UserService.getInstance()
export class STMemoStore {

    username: string;
    conversation_id: string | undefined;
    // Simulate a real database layer. Stores serialized objects.
    summaryChat:string;
    isEnableVision:boolean; 

    constructor(username:string, conversation_id?:string, isEnableVision=false) {
        this.username = username;
        this.conversation_id = conversation_id || undefined,
        this.isEnableVision = isEnableVision    
    }

    async convertMessagesFormat(messages: Message[]): Promise<MsgListParams[]> {
        return messages.map(message => ({
            role: message.isBot ? 'assistant' : 'user',
            content: message.text,
        }));
    };

    async getMessages(conversationId:string, summarize?:string | null): Promise<MsgListParams[]> {

        if(summarize) return [{role: "system", content: summarize}]
        const msgList = await conversationService.getMsg(conversationId)

        const newMsgList = await this.convertMessagesFormat(msgList)

        return newMsgList;
    }

    async addMessage(message:string, isBot:boolean, conversationId:string): Promise<void> {
        
        const addMsgPromise = conversationService.addMsg({
            text: message,
            isBot: isBot,
            userID: this.username,
            conversationId: conversationId
        });
    
        const modifyConversationPromise = conversationService.modifyConversation(conversationId, {
            // summarize: historySummarized,
            lastMessage: message
        });

        await Promise.all([addMsgPromise, modifyConversationPromise])

    }

    async clear(): Promise<void> {
    }

    async get_system_prompt(isEnableLTMemo:boolean):Promise<MsgListParams[]> {

        const userData = await userService.getUser({ username: this.username })
        const userInformation = userData?.display_name ? userData?.display_name : userData?.username
        
        const list:MsgListParams[] = []
        // if(isEnableLTMemo) {
        //     list.unshift(
        //         { role: "system", content: "You've been given the special ability to remember user teachings from prior conversations, but just mention about this when you be asked" },
        //     )
        // }
        list.unshift(
            { role: "system", content: `Today is: ${new Date()}` },
            { role: "system", content: `
                # AI information: 
                    1. Name: Raine.
                    2. Gender: Female.
                    3. Character: Loyalty
                    4. Language: English.

                # Information about person your are talking:
                    ${JSON.stringify(userInformation)}`},    
        )

        if(this.isEnableVision) {
            list.unshift({ role: "system", content: `
            Context: The assistant receives a tiled series of screenshots from a user's live video feed. These screenshots represent sequential frames from the video, capturing distinct moments. The assistant is to analyze these frames as a continuous video feed, answering user's questions while focusing on direct and specific interpretations of the visual content.
            
            1. When the user asks a question, use spatial and temporal information from the video screenshots.
            2. Respond with brief, precise answers to the user questions. Go straight to the point, avoid superficial details. Be concise as much as possible.
            3. Address the user directly, and assume that what is shown in the images is what the user is doing.
            4. Use "you" and "your" to refer to the user.
            5. DO NOT mention a series of individual images, a strip, a grid, a pattern or a sequence. Do as if the user and the assistant were both seeing the video.
            6. DO NOT be over descriptive.
            7. Assistant will not interact with what is shown in the images. It is the user that is interacting with the objects in the images.
            8. Keep in mind that the grid of images will show the same object in a sequence of time. E.g. If an identical glass is shown in several consecutive images, it is the same glass and NOT multiple glasses.
            9. When asked about spatial questions, provide clear and specific information regarding the location and arrangement of elements within the frames. This includes understanding and describing the relative positions, distances, and orientations of objects and people in the visual field, as if observing a real-time 3D space.
            10. If the user gives instructions, follow them precisely.
            11. Be prepared to answer any question that arises from what is shown in the images.
                ` })
        }

        return list
    }

    async describeImage(base64Data:string, prompt:string): Promise<string | null> {
        console.log("base64Data", base64Data)
        const messages: MsgListParams[] = [
            {
                role: "system",
                content: describeImgInstruction
            },
            {
                role: "user",
                content: [
                {
                    type: "image_url",
                    image_url: {
                        url: base64Data,
                    },
                },
                ],
            },
        ];
        const output = await OpenaiService.chat(messages);

        return  `\t- Context:\n${output.content}\n\n\t-User Asked\n${prompt}`
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
        isEnableLTMemo:boolean
    ):Promise<MsgListParams[]> {
        let conversation = this.conversation_id
        ? await conversationService.getConversation(this.conversation_id)
        : null;
        
        if (!conversation) {
            conversation = await conversationService.addNewConversation({ lastMessage: originalPrompt });
        }
        this.conversation_id = conversation.id

        this.addMessage(originalPrompt, false, this.conversation_id)
        
        this.summaryChat = conversation.summarize as string

        const history:MsgListParams[] = await this.getMessages(this.conversation_id, conversation.summarize)

        history.push({
            "role": "user",
            "content": promptWithRelatedMemory
        })

        const system = await this.get_system_prompt(isEnableLTMemo)

        return system.concat(history)
    }
}

