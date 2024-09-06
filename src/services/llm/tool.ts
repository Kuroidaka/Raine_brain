import { ChatCompletionTool } from "openai/resources/chat/completions"
import { ReminderChatService } from "../chat/reminder"

export type otherArgs = {
    userId?: string,
    eventListId?: string,
    isLinkGoogle: boolean,
}

export const llmTools = {
    ReminderCreateChatService: async (args: { title: string, deadline: string, note: string }, other: otherArgs) => {
        const { title, deadline, note } = args
        const { userId, eventListId, isLinkGoogle } = other

        const func = new ReminderChatService(userId, isLinkGoogle, eventListId)

        return func.runCreateTask({title, deadline, note})
    },
    RoutineCreateChatService: async (args: { title: string, routineTime: string, note: string }, other: otherArgs) => {
        const { title, routineTime, note } = args
        const { userId, eventListId, isLinkGoogle } = other

        const func = new ReminderChatService(userId, isLinkGoogle, eventListId)

        return func.runCreateRoutine({title, routineTime, note})
    },
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


export const toolsDefined:ChatCompletionTool[] = [
    {
        type: "function",
        function: {
            name: "ReminderCreateChatService",
            description: "This tool creates a reminder task based on the provided title, deadline, and note. It utilizes the user's information to link the task to their Google account if enabled.",
            parameters: {
                type: "object",
                properties: {
                    "title": {
                        "type": "string",
                        "description": "The title of the task to be created."
                    },
                    "deadline": {
                        "type": "string",
                        "description": `
                        - The specific time that user want to remind. 
                        - Must be GMT+0700 (Indochina Time) base on current GMT+0700 (Indochina Time): ${new Date()}, example 'Sat Nov 25 2023 00:08:02 GMT+0700 (Indochina Time)'
                        - If user request to remind after a period of time, please convert into GMT+0700 (Indochina Time): base on the current time: : ${new Date()} example 'Sat Nov 25 2023 00:08:02 GMT+0700 (Indochina Time)
                        `
                    },
                    "note": {
                        "type": "string",
                        "description": "Additional notes or details related to the task."
                    }
                },
                required: ["title", "deadline"]
            }
        }
    },    
    {
        "type": "function",
        "function": {
            "name": "RoutineCreateChatService",
            "description": "This tool creates a routine based on the provided title, routine time, and note. It utilizes the user's information to link the routine to their Google account if enabled.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "The title of the routine to be created."
                    },
                    "routineTime": {
                        "type": "string",
                        "description": `
                        - The time for the routine
                        - Must be GMT+0700 (Indochina Time) base on current GMT+0700 (Indochina Time): ${new Date()}, example 'Sat Nov 25 2023 00:08:02 GMT+0700 (Indochina Time)'`
                    },
                    "note": {
                        "type": "string",
                        "description": "Additional notes or details related to the routine."
                    }
                },
                "required": ["title", "routineTime"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "ReminderChatService",
            description: "This tool processes task management queries. It can fetch tasks based on specific criteria (e.g., tasks in a particular area). For example, if the user asks to 'search task with area in work with its subtask,' the tool will process this by setting 'q' to 'search task with area in work'",
            parameters: {
                type: "object",
                properties: {
                  "q": {
                    "description": "The query string provided by the user. This string defines the criteria for searching tasks (e.g., 'search task with area in work')."
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
                    "description": "The query string provided by the user. This string defines the criteria for searching routines(e.g., 'search routine with area in work')."
                  }
                  
                },
                required: ["q"],
            },
        },
    }
];

export type ToolsDefinedType = {
    type: string;
    function: {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                [key: string]: {
                    description: string;
                } | undefined;
            };
            required: string[];
        };
    };
};