import { ReminderChatService } from "../chat/reminder"

export const llmTools = {
    ReminderChatService: async (args: { q: string, includeSubTask: boolean }) => {
        const { q, includeSubTask } = args

        const func = new ReminderChatService()

        return func.run(q, includeSubTask)
    }
}