import { dbClient } from "~/config";
import { backgroundImage, UserSetting } from "@prisma/client";
import { userSettingUpdateProps } from "./user.interface";

export class UserSettingService {
    private static instance: UserSettingService;

    private constructor() {}

    public static getInstance(): UserSettingService {
        if (!UserSettingService.instance) {
            UserSettingService.instance = new UserSettingService();
        }
        return UserSettingService.instance;
    }
    public async getSetting(id: string):Promise<UserSetting | null> {
        try {
            const userSetting = await dbClient.userSetting.findUnique({
                where: {
                    user_id: id
                }
            });
            console.log("userSetting", userSetting);
            return userSetting
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    public async updateSetting(id: string, data: userSettingUpdateProps):Promise<UserSetting | null> {
        try {

            // find userSetting if not exist, create new
            const userSetting = await dbClient.userSetting.upsert({
                where: {
                    user_id: id
                },
                update: data,
                create: {
                    user_id: id,
                    ...data
                }
            });
            return userSetting
        } catch (error) {
            console.log(error);
            throw error;
        }
    }
  
}
