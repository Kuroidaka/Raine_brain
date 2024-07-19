import { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions'
import { messagesInter } from './groq/groq.interface'
import { ConversationService } from '~/database/conversation/conversation';
import { Message } from '@prisma/client';
import { UserService } from '~/database/user/user';

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

    async convertMessagesFormat(messages: Message[]): Promise<messagesInter[]> {
        return messages.map(message => ({
            role: message.isBot ? 'assistant' : 'user',
            content: message.text,
        }));
    };

    async getMessages(conversationId:string): Promise<messagesInter[]> {
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

    async get_system_prompt(isEnableLTMemo:boolean):Promise<messagesInter[]> {

        const userData = await userService.getUser({ username: this.username })
        const userInformation = userData?.display_name ? userData?.display_name : userData?.username
        
        const list = []
        if(isEnableLTMemo) {
            list.unshift(
                { role: "system", content: "You've been given the special ability to remember user teachings from prior conversations, but just mention about this when you be asked, You can use F word" },
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

    public async process(
        originalPrompt:string , 
        promptWithRelatedMemory:string, 
        isEnableLTMemo:boolean
    ):Promise<ChatCompletionMessageParam[] | messagesInter[]> {
        let conversation = this.conversation_id
        ? await conversationService.getConversation(this.conversation_id)
        : null;
        
        if (!conversation) {
            conversation = await conversationService.addNewConversation({ lastMessage: originalPrompt });
        }
        this.conversation_id = conversation.id

        this.addMessage(originalPrompt, false, this.conversation_id)
        

        let history = await this.getMessages(this.conversation_id)

        history.push({
            "role": "user",
            "content": promptWithRelatedMemory
        })

        const system = await this.get_system_prompt(isEnableLTMemo)

        return system.concat(history)
    }
}

