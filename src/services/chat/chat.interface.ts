import { Routine, RoutineAreas, RoutineDate, SubTask, Task, TaskAreas } from '@prisma/client';
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
    status?: number | boolean;
    createdAt?: string;
    updatedAt?: string;
};

export type SubTaskSQL = {
    title?: string;
    status?: boolean | string;
};

export type TaskFullIncluded = Task & { area?: TaskAreas[], subTask?: SubTask[] }
export type RoutineFullIncluded = Routine & { area?: RoutineAreas[], routineDate?: RoutineDate[] }


export type TaskSQLWithSub = TaskSQL & { subTask?: SubTaskSQL[] }

export type RoutineSQL = {
    id?: string;
    title?: string;
    color?: string;
    note?: string;
    userId?: string;
    isActive?: number | boolean;
    createdAt?: string;
    updatedAt?: string;
};


export type Debug = {
    debugChat: number, 
    debugMemo: number, 
}


export type chatClassInit = {
    userID: string,
    conversationID: string,
    isEnableVision: boolean,
    isEnableStream: boolean,
    lang: string,
    eventListId?: string,
    isLinkGoogle?: boolean
}