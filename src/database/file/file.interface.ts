// backgroundImage.interface.ts
export interface backgroundImageProps {
    name: string;
    urlPath?: string;
    extname: string
}

export interface backgroundImageModifyProps {
    name?: string;
    urlPath?: string;
    extname?: string
}

// FILE Uploaded
export interface fileProps {
    originalname: string;
    name: string;
    path: string;
    extension: string;
    size: number;
    url: string;
    userId: string;
    vectorDBIds?: string[];
    conversationId: string;
}