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

