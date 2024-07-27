export interface conversationProps {
    name?: string
    from?: string
    lastMessage: string
}

export interface msgProps {
    text: string
    isBot: boolean
    userID: string
    functionList?: string
    conversationId: string  
}

export interface conversationModifyProps {
    name?: string
    from?: string
    summarize?: string | null
    lastMessage?: string
}