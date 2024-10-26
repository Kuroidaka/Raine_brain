import { dbClient } from "~/config";

export class authService {

    async register(){

        const data = {
        }
        
        try {
            // const user = await dbClient.user.create({ data })
        
            return data;
        } catch (error) {
            console.log(error)
            throw error
        }
    }  
}