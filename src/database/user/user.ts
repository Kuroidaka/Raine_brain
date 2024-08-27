import { dbClient } from "~/config";
import { userServiceProps, userUpdateProps } from "./user.interface";
import { backgroundImage, User } from "@prisma/client";

export class UserService {
    private static instance: UserService;

    private constructor() {}

    public static getInstance(): UserService {
        if (!UserService.instance) {
            UserService.instance = new UserService();
        }
        return UserService.instance;
    }
    
    public async getUser({ id, username }: { id?: string; username?: string }):Promise<User & { backgroundImage: backgroundImage | null } | null> {
        try {
            let query = id ? { id } : username ? { username } : null;
            
            if (!query) return null

            const user = await dbClient.user.findUnique({
                where: query,
                include: {
                    backgroundImage: true
                }
            });
            return user

        } catch (error) {
            console.log(error);
            throw error;
        }
    }
    public async getUserBGImg({ id, username }: { id?: string; username?: string }):Promise<backgroundImage | null> {
        try {
            let query = id ? { id } : username ? { username } : null;
            
            if (!query) return null

            const user = await dbClient.user.findUnique({
                where: query,
                include: {
                    backgroundImage: true
                }
            });
            if(user?.backgroundImage) 
                return user.backgroundImage
            return null

        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    public async getUsers():Promise<User[]>{
        try {
            return await dbClient.user.findMany({});
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    public async addUser(data: userServiceProps) {
        try {
            const user = await dbClient.user.create({ data });
            return user;
        } catch (error) {
            console.log(error);
            throw error;
        }
    }


    public async updateUser(userID: string, data: userUpdateProps) {
        try {
            console.log("userID", userID)
            console.log("data", data)
            const user = await dbClient.user.update({ 
                where: { id: userID },
                data
             });
            return user;
        } catch (error) {
            console.log(error);
            throw error;
        }
    }
}
