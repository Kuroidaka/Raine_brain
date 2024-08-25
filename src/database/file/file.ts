import { dbClient } from "~/config";
import { backgroundImageProps, backgroundImageModifyProps } from "./file.interface";

export class FileService {
    private static instance: FileService;

    private constructor() {}

    public static getInstance(): FileService {
        if (!FileService.instance) {
            FileService.instance = new FileService();
        }
        return FileService.instance;
    }

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
    async assignBackgroundImageToUser(userId: string, bgId: string) {
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
}
