import { dbClient } from "~/config";
import { backgroundImageProps, backgroundImageModifyProps, fileProps, videoRecordProps } from "./file.interface";

export class FileService {
    private static instance: FileService;

    private constructor() {}

    public static getInstance(): FileService {
        if (!FileService.instance) {
            FileService.instance = new FileService();
        }
        return FileService.instance;
    }
// BACKGROUND IMAGE
    // Add a new Background Image
    async addNewBackgroundImage(data: backgroundImageProps) {
        try {
            return await dbClient.backgroundImage.create({ data });
        } catch (error) {
            console.error('Error adding Background Image:', error);
            throw error;
        }
    }

    // Get Background Image by ID
    async getBackgroundImage(id: string) {
        try {
            return await dbClient.backgroundImage.findUnique({
                where: { id }
            });
        } catch (error) {
            console.error('Error getting Background Image:', error);
            throw error;
        }
    }

    // Get all Background Images
    async getAllBackgroundImages() {
        try {
            return await dbClient.backgroundImage.findMany({
                orderBy: {
                    createdAt: 'asc',
                },
            });
        } catch (error) {
            console.error('Error getting Background Images:', error);
            throw error;
        }
    }

    // Update a Background Image
    async updateBackgroundImage(id: string, data: backgroundImageModifyProps) {
        try {
            return await dbClient.backgroundImage.update({
                where: { id },
                data,
            });
        } catch (error) {
            console.error('Error updating Background Image:', error);
            throw error;
        }
    }

    // Delete a Background Image
    async deleteBackgroundImage(id: string) {
        try {
            return await dbClient.backgroundImage.delete({
                where: { id },
            });
        } catch (error) {
            console.error('Error deleting Background Image:', error);
            throw error;
        }
    }

    // Assign a Background Image to a User
    async assignBackgroundImageToUser(userId: string, bgId: string | null) {
        try {
            return await dbClient.user.update({
                where: { id: userId },
                data: {
                    bg_id: bgId,
                },
            });
        } catch (error) {
            console.error('Error assigning Background Image to User:', error);
            throw error;
        }
    }

    // Remove a Background Image from a User
    async removeBackgroundImageFromUser(userId: string) {
        try {
            return await dbClient.user.update({
                where: { id: userId },
                data: {
                    bg_id: null,
                },
            });
        } catch (error) {
            console.error('Error removing Background Image from User:', error);
            throw error;
        }
    }
// FILE Uploaded

    // Add a new File
    async addNewFile(data: fileProps) {
        try {
            return await dbClient.file.create({ data });
        } catch (error) {
            console.error('Error adding File:', error);
            throw error;
        }
    }

    // Get File by ID
    async getFile(id: string) {
        try {
            return await dbClient.file.findUnique({
                where: { id }
            });
        } catch (error) {
            console.error('Error getting File:', error);
            throw error;
        }
    }

    // Get all Files
    async getAllFiles() {
        try {
            return await dbClient.file.findMany();
        } catch (error) {
            console.error('Error getting Files:', error);
            throw error;
        }
    }

    // Update a File
    async updateFile(id: string, data: fileProps) {
        try {
            return await dbClient.file.update({
                where: { id },
                data,
            });
        } catch (error) {
            console.error('Error updating File:', error);
            throw error;
        }
    }

    // Delete a File
    async deleteFile(id: string) {
        try {
            return await dbClient.file.delete({
                where: { id },
            });
        } catch (error) {
            console.error('Error deleting File:', error);
            throw error;
        }
    }

    // Upload a Video Record
    async uploadVideoRecord(data: videoRecordProps) {
        try {
            return await dbClient.videoRecord.create({ data });
        } catch (error) {
            console.error('Error uploading Video Record:', error);
            throw error;
        }
    }
}