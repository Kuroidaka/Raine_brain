import { ConversationService } from "~/database/conversation/conversation";
import { InternalServerErrorException } from "~/common/error";

import { DataSource } from "typeorm";
import { SqlDatabase } from "langchain/sql_db";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RoutineSQL, SubTaskSQL, TaskSQL, TaskSQLWithSub } from "./chat.interface";
import { TaskService } from "~/database/reminder/task";
import { SubTask } from "@prisma/client";


const taskService = TaskService.getInstance()
export class ReminderChatService  {

  prompt = PromptTemplate.fromTemplate(`Based on the provided SQL table schema below, write a SQL query that would answer the user's question.(not response with SQL)
  ------------
  SCHEMA: {schema}
  ------------
  QUESTION: {question}
  ------------
  SQL QUERY:`);

  datasource = new DataSource({
    type: "mysql",
    database: process.env.DATABASE_NAME,
    url: process.env.DATABASE_URL
  });

  llm = new ChatOpenAI();

  constructor() {}

  public async getTaskDataBaseOnText(q: string) {
    try {          
          const db = await SqlDatabase.fromDataSourceParams({
            appDataSource: this.datasource,
            includesTables: ["Task", "SubTask", "TaskAreas"],
            customDescription: {
              "Task": "The Task table stores information about tasks, including their title, color, deadline, and associated notes. Each task is linked to a user and can have multiple subtasks and areas associated with it",
              "SubTask": "The SubTask table contains information about individual subtasks that are related to a main task. Each subtask has a title, status, and a reference to the parent task.",
              "TaskAreas": "The TaskAreas table links tasks to specific areas, defined by the Areas enum. This allows tasks to be categorized into different life areas, such as health, play, spirituality, environment, work, finance, development, relationships."
            }
          });

          const sqlQueryChain = RunnableSequence.from([
            {
              question: (input: { question: string }) => input.question,
              schema: async () => db.getTableInfo(),
            },
            this.prompt,
            this.llm.bind({ stop: ["\nSQLResult:"] }),
            new StringOutputParser(),
          ]);
          
          const sqlQuery = await sqlQueryChain.invoke({
            question: q,
          });

          console.log("sqlQuery", sqlQuery)

          const data = await db.run(sqlQuery)
          console.log(data)
          return JSON.parse(data)
   
    } catch (error) {
      console.error("Error in process reminder chat:", error);
      throw new InternalServerErrorException("error occur while process reminder chat")
    }
  }

  public async getRoutineDataBaseOnText(q: string) {
    try {
          
          const db = await SqlDatabase.fromDataSourceParams({
            appDataSource: this.datasource,
            includesTables: ["Routine", "RoutineAreas", "RoutineDate"],
            customDescription: {
              "Routine": "The Routine table stores routine information, including title, color, notes, and whether the routine is currently active. Each routine is associated with a user and can be linked to multiple areas and routine dates.",
              "RoutineAreas": "The RoutineAreas table links routines to specific areas, as defined by the Areas enum. This allows routines to be categorized into different life areas, such as health, work, or development.",
              "RoutineDate": "The RoutineDate table tracks the completion dates for routines, storing information on when each routine was completed along with a reference to the associated routine."
            }
          });
          
          const sqlQueryChain = RunnableSequence.from([
            {
              question: (input: { question: string }) => input.question,
              schema: async () => db.getTableInfo(),
            },
            this.prompt,
            this.llm.bind({ stop: ["\nSQLResult:"] }),
            new StringOutputParser(),
          ]);
          
          const sqlQuery = await sqlQueryChain.invoke({
            question: q,
          });

          console.log("sqlQuery", sqlQuery)

          const data = await db.run(sqlQuery)
          console.log(data)
          return JSON.parse(data)
    } catch (error) {
      console.error("Error in process reminder chat:", error);
      throw new InternalServerErrorException("error occur while process reminder chat")
    }
  }
  
  public async processTaskData(tasks: TaskSQL[], isSubtask = false) {
    try {
      const data = await Promise.all(tasks.map(async task => {
        const result: TaskSQLWithSub = {};

        if (task?.id) result.id = task?.id;
        if (task?.title) result.title = task?.title;
        if (task?.color) result.color = task?.color;
        if (task?.note) result.note = task?.note;
        if (task?.deadline) result.deadline = task?.deadline;
        if (Number(task?.status) === 1) {
            result.status = "Finished";
        } else if (Number(task?.status) === 0) {
            result.status = "Unfinished";
        }

        if (isSubtask && task.id) {
            const subtask = await taskService.getSubTask(task.id);
            result.subTask = await this.processSubTaskData(subtask);
        }

        return result;
    }));


        return data
    } catch (error) {
      console.error("Error in process reminder chat:", error);
      throw new InternalServerErrorException("error occur while process reminder chat")
    }
  }
  public async processRoutineData(routines: RoutineSQL[]) {
    try {
      const data = await Promise.all(routines.map(async routine => {
        const result: RoutineSQL = {};

        if (routine?.title) result.title = routine?.title;
        if (routine?.note) result.note = routine?.note;
        if (Number(routine?.isActive) === 1) {
            result.isActive = "Active";
        } else if (Number(routine?.isActive) === 0) {
            result.isActive = "Inactive";
        }

        return result;
    }));


        return data
    } catch (error) {
      console.error("Error in process reminder chat:", error);
      throw new InternalServerErrorException("error occur while process reminder chat")
    }
  }
  public async processSubTaskData(subTasks: SubTaskSQL[]) {
    try {
      const data = await Promise.all(subTasks.map(async subTask => {
        const result: SubTaskSQL = {};

        if (subTask?.title) result.title = subTask?.title;
        if (subTask?.status) {
            result.status = "Finished";
        } else if (!subTask?.status) {
            result.status = "Unfinished";
        }
        return result;
    }));


        return data
    } catch (error) {
      console.error("Error in process reminder chat:", error);
      throw new InternalServerErrorException("error occur while process reminder chat")
    }
  }
  public async cmtTaskData(q: string, tasks: TaskSQLWithSub[]) {
    try {
      /**
         * Create the final prompt template which is tasked with getting the natural language response.
        //  */
        const finalResponsePrompt =
          PromptTemplate.fromTemplate(`Based on the question and SQL response, write a natural language response:
        ------------
        QUESTION: {question}
        ------------
        SQL RESPONSE: {response}
        ------------
        NATURAL LANGUAGE RESPONSE:`);
        
        const finalChain = RunnableSequence.from([
          {
            question: (input) => input.question,
            response: (input) => input.response,
          },
          finalResponsePrompt,
          this.llm,
          new StringOutputParser(),
        ]);
        
        const finalResponse = await finalChain.invoke({
          question: q,
          response: JSON.stringify(tasks)
        });
        
        // console.log({ finalResponse,  });

        return finalResponse
    } catch (error) {
      console.error("Error in process reminder chat:", error);
      throw new InternalServerErrorException("error occur while process reminder chat")
    }
  }

  public async run(q: string, includeSubTask: boolean) {
    try {
      const tasks = await this.getTaskDataBaseOnText(q)
      const result = await this.processTaskData(tasks, includeSubTask)

      // const cmt = await this.cmtTaskData(q, result)  
      return {
        data: result
      }
    } catch (error) {
      return{
        message: "Error occur while get data from database"
      }
    }
  }

}