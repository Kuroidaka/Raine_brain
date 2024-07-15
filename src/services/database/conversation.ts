import { dbClient } from "~/config";

export class conversation {

    async add(){

        const data = {
            name: name,
            from: from,
            lastMessage: '',
            lastMessageAt: new Date()
        }
        
        try {
            await dbClient.conversation.create({ data })
        
            return conversation;
        } catch (error) {
            console.log(error)
            throw error
        }
    }  
}