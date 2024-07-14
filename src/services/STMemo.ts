import { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions'

export class STMemoStore {
    private recall_threshold: number;
    constructor(
        reset=false,
        recall_threshold=.5
    ) {}
    
    public process(prompt:string, isEnableLTMemo:boolean):ChatCompletionMessageParam[] {

        const messages:ChatCompletionMessageParam[] = [

            { role: "user", content: prompt }
        ]
        
        if(isEnableLTMemo) {
            messages.unshift({ role: "system", content: "You've been given the special ability to remember user teachings from prior conversations." },)
        }

        return messages
    }
}