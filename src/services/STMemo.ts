import { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions'
import { messagesInter } from './groq/groq.interface'

export class STMemoStore {

    sessionId: string;

    // Simulate a real database layer. Stores serialized objects.
    fakeDatabase:{};

    constructor(sessionId:string) {
        this.sessionId = sessionId;
    }

    async getMessages(): Promise<messagesInter[]> {
        // const messages = this.fakeDatabase[this.sessionId] ?? [];
        return [];
    }

    async addMessage(message:string): Promise<void> {
    }

    async addMessages(messages:[]): Promise<void> {
    }

    async clear(): Promise<void> {
    }

    get_system_prompt(history:messagesInter[], isEnableLTMemo:boolean):messagesInter[] {

        if(isEnableLTMemo) {
            history.unshift({ role: "system", content: "You've been given the special ability to remember user teachings from prior conversations." },)
        }
        return history
    }

    public async process(prompt:string, isEnableLTMemo:boolean):Promise<ChatCompletionMessageParam[] | messagesInter[]> {

        await this.addMessage(prompt)

        const history = await this.getMessages()

        return this.get_system_prompt(history, isEnableLTMemo).concat(history)

    }
}

