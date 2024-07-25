import { messagesInter, MsgListParams } from './llm/llm.interface'
import { ConversationService } from '~/database/conversation/conversation';
import { Message } from '@prisma/client';
import { UserService } from '~/database/user/user';
import { OpenaiService } from './llm/openai';

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
    fakeDatabase:{};

    constructor(username:string, conversation_id?:string) {
        this.username = username;
        this.conversation_id = conversation_id || undefined
    }

    async convertMessagesFormat(messages: Message[]): Promise<MsgListParams[]> {
        return messages.map(message => ({
            role: message.isBot ? 'assistant' : 'user',
            content: message.text,
        }));
    };

    async getMessages(conversationId:string): Promise<MsgListParams[]> {
        const msgList = await conversationService.getMsg(conversationId)

        const newMsgList = await this.convertMessagesFormat(msgList)

        return newMsgList;
    }

    async addMessage(message:string, isBot:boolean, conversationId:string): Promise<void> {

        await conversationService.addMsg({
            text: message,
            isBot: isBot,
            userID: this.username,
            conversationId: conversationId  
        })
    }

    async addMessages(messages:[]): Promise<void> {
    }

    async clear(): Promise<void> {
    }

    async get_system_prompt(isEnableLTMemo:boolean):Promise<MsgListParams[]> {

        const userData = await userService.getUser({ username: this.username })
        const userInformation = userData?.display_name ? userData?.display_name : userData?.username
        
        const list:MsgListParams[] = []
        if(isEnableLTMemo) {
            list.unshift(
                { role: "system", content: "You've been given the special ability to remember user teachings from prior conversations, but just mention about this when you be asked" },
            )
        }
        list.unshift(
            { role: "system", content: `Today is: ${new Date()}` },
            { role: "system", content: `
                Never forget your name is Raine. this is the information of the person is talking to you ${JSON.stringify(userInformation)}
                ` },    
        )
        return list
    }

    async describeImage(imgURL:string, prompt:string): Promise<string | null> {

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
                    url: imgURL,
                    },
                },
                ],
            },
        ];
        const output = await OpenaiService.chat(messages);

        return  `\t- Context:\n${output.content}\n\n\t-User Asked\n${prompt}`
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
        

        const history:MsgListParams[] = await this.getMessages(this.conversation_id)

        history.push({
            "role": "user",
            "content": promptWithRelatedMemory
        })

        const system = await this.get_system_prompt(isEnableLTMemo)

        return system.concat(history)
    }
}

