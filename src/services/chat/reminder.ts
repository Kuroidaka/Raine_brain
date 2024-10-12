import { ConversationService } from "~/database/conversation/conversation";
import { InternalServerErrorException, NotFoundException } from "~/common/error";

import { DataSource } from "typeorm";
import { SqlDatabase } from "langchain/sql_db";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RoutineFullIncluded, RoutineSQL, SubTaskSQL, TaskFullIncluded, TaskSQL, TaskSQLWithSub } from "./chat.interface";
import { TaskService } from "~/database/reminder/task";
import { SubTask, Task, TaskAreas, VideoRecord } from "@prisma/client";
import { RoutineService } from "~/database/reminder/routine";
import { ReminderService } from "~/database/reminder/reminder.service";
import { formatTimeToHHMM } from "~/utils";


export class ReminderChatService  {

  prompt = PromptTemplate.fromTemplate(`Based on the provided SQL table schema below, write a SQL query that would answer the user's question, always select id.(only response with SQL)
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
  private taskService;
  private routineService;
  private reminderService

  private userID?: string;
  private isLinkGoogle: boolean = false;
  private eventListId?: string;

  constructor(userId?: string, isLinkGoogle: boolean = false, eventListId?: string) {
    this.taskService = TaskService.getInstance()
    this.routineService = RoutineService.getInstance()
    this.reminderService = ReminderService.getInstance()

    if (this.isLinkGoogle && !this.eventListId) {
      throw new Error("eventListId must be provided when isLinkGoogle is true");
    }
    if(userId) {
      this.userID = userId
    }
    if(isLinkGoogle && eventListId) {
      this.isLinkGoogle = isLinkGoogle
      this.eventListId = eventListId
    }
  }

  public async getTaskDataBaseOnText(q: string) {
    try {          
          const db = await SqlDatabase.fromDataSourceParams({
            appDataSource: this.datasource,
            includesTables: ["Task", "TaskAreas"],
            customDescription: {
              "Task": "The Task table stores information about tasks, including their title, color, deadline, and associated notes. Each task is linked to a user and can have multiple subtasks and areas associated with it",
              "TaskAreas": "The TaskAreas table links tasks to specific areas, defined by the Areas enum. This allows tasks to be categorized into different life areas, such as health, play, spirituality, environment, work, finance, development, relationships, This table have to query joined with Task table otherwise error will occur"
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
              "RoutineAreas": "The RoutineAreas table links routines to specific areas, as defined by the Areas enum. This allows routines to be categorized into different life areas, such as health, work, or development. This table have to query joined with Task table otherwise error will occur",
              "RoutineDate": "The RoutineDate table tracks just for the completed dates for routines, storing information on when each routine was completed along with a reference to the associated routine."
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
  
  public async processTaskData(tasks: TaskSQL[]):Promise<(TaskSQL | TaskFullIncluded)[]>  {
    try {
      const data = await Promise.all(
        tasks.map(async task => {
          let result
          if(task.id) {
            result = await this.taskService.getTasksById(task.id);
          }
          else {
            result = task
          }
          return result
        })
      );
      // Filter out null values from the result
      const filteredData = data.filter(task => task !== null);

      return filteredData
    } catch (error) {
      console.error("Error in process reminder chat:", error);
      throw new InternalServerErrorException("error occur while process reminder chat")
    }
  }


  public async processRoutineData(routines: RoutineSQL[]):Promise<(RoutineSQL | RoutineFullIncluded)[]> {
    try {
      const data = await Promise.all(routines.map(async routine => {
        let result
        if(routine.id) {
          result = await this.routineService.getRoutineById(routine.id);
        }
        else {
          result = routine
        }
        return result       
      }));
      const filteredData = data.filter(routine => routine !== null);

      return filteredData
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
  public async cmtTaskData(q: string, tasks: (TaskSQL | TaskFullIncluded)[] | (RoutineSQL | RoutineFullIncluded)[]) {
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

  public async run(q: string) {
    try {
      const tasks = await this.getTaskDataBaseOnText(q)
      const result = await this.processTaskData(tasks)

      const cmt = await this.cmtTaskData(q, result)  
      return {
        data: result,
        comment: cmt
      }
    } catch (error) {
      return{
        comment: "Error occur while get data from database"
      }
    }
  }

  public async runRoutine(q: string) {
    try {
      const routines = await this.getRoutineDataBaseOnText(q)
      const result = await this.processRoutineData(routines)
      console.log(result)

      const cmt = await this.cmtTaskData(q, result)  
      return {
        data: result,
        comment: cmt
      }
    } catch (error) {
      return{
        comment: "Error occur while get data from database"
      }
    }
  }

  public async runCreateTask({title, deadline, note, videoRecord}: {title: string, deadline: string, note?: string, videoRecord?: VideoRecord}) {
    try {

      if(!this.userID) throw new NotFoundException("userId not founded")
      const data = {
        title: title,
        color: "1",
        deadline: deadline,
        note: note || "",
        userId: this.userID
      }

      const task = await this.taskService.addNewTask(data)

      if(videoRecord) {
        await this.taskService.addTaskAttachment(task.id, {
          name: videoRecord.name,
          url: videoRecord.url,
          type: "video"
        })
      }


      if(this.isLinkGoogle && this.eventListId) {
        await this.reminderService.TaskAddSyncGoogle(task.id, data, this.eventListId)
      }

      return {
        data: [task],
        comment: "Task created successfully"
      }
    } catch (error) {
      return{
        comment: "Error while creating task"
      }
    }
  }

  public async runCreateRoutine({title, routineTime, note}: {title: string, routineTime: string, note?: string}) {
    try {

      if(!this.userID) throw new NotFoundException("userId not founded")
      const data = {
        title: title,
        color: "1",
        note: note || "",
        userId: this.userID,
        routineTime: formatTimeToHHMM(new Date(routineTime)),
        isActive: true,
      }

      const routine = await this.routineService.addNewRoutine(data);

      if(this.isLinkGoogle && this.eventListId) {
        await this.reminderService.RoutineAddSyncGoogle(routine.id, data, this.eventListId)
      }

      return {
        data: routine,
        comment: "Routine created successfully"
      }
    } catch (error) {
      console.log("runCreateRoutine", error)
      return{
        comment: "Error while creating routine"
      }
    }
  }
}