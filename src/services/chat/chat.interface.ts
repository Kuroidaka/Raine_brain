export interface historyChatProcessingParams {
    userID: string,
    prompt: string,
    isEnableVision: boolean,
    conversationID?:string,
    isEnableStream?:boolean,
}