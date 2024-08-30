import { dbClient } from "~/config";
import { SubTaskProps, TaskProps, TaskWithAreaProps, UpdateSubTaskProps, UpdateTaskProps, UpdateTaskWithCateProps } from "./task.type";
import { Areas, Prisma } from "@prisma/client";
import { TaskService } from "./task";
import { calendarCreate } from "~/services/google/google.type";
import { colorList } from "~/constant";
import { GoogleService } from "~/services/google/calendar";
import { RoutineProps } from "./routine.type";
import { convertTimeHHmmToDateTime } from "~/utils";
import { RoutineService } from "./routine";

export class ReminderService {
    private static instance: ReminderService;
    private taskService
    private routineService
    private googleService
    private constructor() {
        this.taskService = TaskService.getInstance(); 
        this.routineService = RoutineService.getInstance(); 
        this.googleService = GoogleService
    }

    public static getInstance(): ReminderService {
        if (!ReminderService.instance) {
            ReminderService.instance = new ReminderService();
        }
        return ReminderService.instance;
    }

    async RoutineAddSyncGoogle(RoutineID: string, data: RoutineProps, eventListId: string){
        try {
            const googleEventData:calendarCreate = {
                summary: data.title,
                description: data.note || "",
                colorId: null, 
                startDateTime: convertTimeHHmmToDateTime(data.routineTime, new Date()), 
                endDateTime: convertTimeHHmmToDateTime(data.routineTime, new Date()),
                timeZone: 'Asia/Ho_Chi_Minh',
            }

            if(data?.color) {
                let colorIdIndex = colorList.findIndex(i => i.toLowerCase() === data.color)
                googleEventData.colorId = String(colorIdIndex + 1)
            }

            // await GoogleService.createTask(eventListId, googleTaskData)
            const isEnableRoutine = true
            const { id: eventID } = await GoogleService.createEvent(eventListId, googleEventData, isEnableRoutine)
            eventID && await this.routineService.updateRoutineDataWithoutArea(RoutineID, { googleEventId: eventID })
            
        } catch (error) {
            console.log('Error adding Routine:',error)
            throw error
        }
    }
    async RoutineUpdateSyncGoogle(RoutineID: string, data: RoutineProps, eventListId: string){
        try {
          
        } catch (error) {
            console.log('Error adding Routine:',error)
            throw error
        }
    }
    async TaskAddSyncGoogle(taskID: string, data: TaskProps, eventListId: string){
        try {

            const googleEventData:calendarCreate = {
                summary: data.title,
                description: data.note || "",
                colorId: null, 
                startDateTime: data.deadline as Date, 
                endDateTime: data.deadline as Date,
                timeZone: 'Asia/Ho_Chi_Minh',
            }

            if(data?.color) {
                let colorIdIndex = colorList.findIndex(i => i.toLowerCase() === data.color)
                googleEventData.colorId = String(colorIdIndex + 1)
            }
            const isEnableRoutine = false

            const { id: eventID } = await GoogleService.createEvent(eventListId, googleEventData, isEnableRoutine)

            eventID && await this.taskService.updateTaskDataWithoutArea(taskID, { googleEventId: eventID })

            
        } catch (error) {
            console.log('Error adding task:',error)
            throw error
        }
    }
    async TaskDeleteSyncGoogle(taskID: string, googleEventId: string, eventListId: string){
        try {
            await GoogleService.deleteCalendarEvent(googleEventId, eventListId)
            await this.taskService.updateTaskDataWithoutArea(taskID, { googleEventId:null });
            
        } catch (error) {
            console.log('Error adding task:',error)
            throw error
        }
    }
}