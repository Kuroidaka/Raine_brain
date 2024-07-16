import { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions'
import { messagesInter } from './groq/groq.interface'
import { ConversationService } from '~/database/conversation/conversation';
import { Message } from '@prisma/client';

const conversationService = ConversationService.getInstance()
export class STMemoStore {

    userId: string;
    conversation_id: string | undefined;
    // Simulate a real database layer. Stores serialized objects.
    fakeDatabase:{};

    constructor(userId:string, conversation_id?:string) {
        this.userId = userId;
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
            userID: this.userId,
            conversationId: conversationId  
        })
    }

    async addMessages(messages:[]): Promise<void> {
    }

    async clear(): Promise<void> {
    }

    get_system_prompt(isEnableLTMemo:boolean):messagesInter[] {
        const list = []
        if(isEnableLTMemo) {
            list.unshift({ role: "system", content: "You've been given the special ability to remember user teachings from prior conversations." },)
        }
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

        return this.get_system_prompt(isEnableLTMemo).concat(history)
    }
}

