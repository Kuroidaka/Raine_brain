import { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions'

export const conversation = {
    process: (prompt:string, isEnableLTMemo:boolean):ChatCompletionMessageParam[] => {

        const messages:ChatCompletionMessageParam[] = [
           
            { role: "user", content: prompt }
        ]
        
        if(isEnableLTMemo) {
            messages.unshift({ role: "system", content: "You've been given the special ability to remember user teachings from prior conversations." },)
        }

        return messages
    }
}