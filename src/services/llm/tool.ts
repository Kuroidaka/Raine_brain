import { ReminderChatService } from "../chat/reminder"

export const llmTools = {
    ReminderChatService: async (args: { q: string }) => {
        const { q  } = args

        const func = new ReminderChatService()

        return func.run(q)
    }
}


export const toolsDefined = [
    {
        type: "function",
        function: {
            name: "ReminderChatService",
            description: "This tool processes task management queries. It can fetch tasks based on specific criteria (e.g., tasks in a particular area) and optionally include related subtasks. For example, if the user asks to 'search task with area in work with its subtask,' the tool will process this by setting 'q' to 'search task with area in work'",
            parameters: {
                type: "object",
                properties: {
                  "q": {
                    "description": "The query string provided by the user. This string defines the criteria for searching tasks, always query all the table fields(e.g., 'search task with area in work').",
                    "type": "string",
                  }
                },
                required: ["q"],
            },
        },
    }
  ];