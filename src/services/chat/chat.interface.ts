export type historyChatProcessingParams = {
    userID: string,
    prompt: string,
    isEnableVision: boolean,
    conversationID?:string,
    isEnableStream?:boolean,
}

export type TaskSQL = {
    id?: string;
    title?: string;
    color?: string;
    deadline?: string | null;
    note?: string;
    userId?: string;
    status?: number | string;
    createdAt?: string;
    updatedAt?: string;
};

export type SubTaskSQL = {
    title?: string;
    status?: boolean | string;
};

export type TaskSQLWithSub = TaskSQL & { subTask?: SubTaskSQL[] }

export type RoutineSQL = {
    id?: string;
    title?: string;
    color?: string;
    note?: string;
    userId?: string;
    isActive?: number | string;
    createdAt?: string;
    updatedAt?: string;
};


export type Debug = {
    debugChat: number, 
    debugMemo: number, 
}