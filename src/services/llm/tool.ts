import { ReminderChatService } from "../chat/reminder"

export const llmTools = {
    ReminderChatService: async (args: { q: string }) => {
        const { q  } = args

        const func = new ReminderChatService()

        return func.run(q)
    },
    RoutineChatService: async (args: { q: string }) => {
        const { q  } = args

        const func = new ReminderChatService()

        return func.runRoutine(q)
    }
}


export const toolsDefined = [
    {
        type: "function",
        function: {
            name: "ReminderChatService",
            description: "This tool processes task management queries. It can fetch tasks based on specific criteria (e.g., tasks in a particular area). For example, if the user asks to 'search task with area in work with its subtask,' the tool will process this by setting 'q' to 'search task with area in work'",
            parameters: {
                type: "object",
                properties: {
                  "q": {
                    "description": "The query string provided by the user. This string defines the criteria for searching tasks (e.g., 'search task with area in work').",
                    "type": "string",
                  }
                },
                required: ["q"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "RoutineChatService",
            description: "This tool processes routine management queries. It can fetch routines based on specific criteria (e.g., routines in a particular area) or Routine that completed recently or fetch routine based on specific criteria (e.g., routines in a particular area). For example, if the user asks to 'search routine with area in work' the tool will process this by setting 'q' to 'search routine with area in work'",
            parameters: {
                type: "object",
                properties: {
                  "q": {
                    "description": "The query string provided by the user. This string defines the criteria for searching routines(e.g., 'search routine with area in work').",
                    "type": "string",
                  }
                  
                },
                required: ["q"],
            },
        },
    }
  ];