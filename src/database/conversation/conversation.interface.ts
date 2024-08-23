export interface conversationProps {
    name?: string
    from?: string
    lastMessage?: string
    userID: string
}

export interface msgProps {
    text: string
    isBot: boolean
    userID: string
    conversationId: string  
}
export interface msgFuncProps {
    name: string
    data?: string
    comment?: string 
}

export interface conversationModifyProps {
    name?: string
    from?: string
    summarize?: string | null
    lastMessage?: string
}