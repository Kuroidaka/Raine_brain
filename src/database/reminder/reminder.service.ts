import { dbClient } from "~/config";
import { SubTaskProps, TaskProps, TaskWithAreaProps, UpdateSubTaskProps, UpdateTaskProps, UpdateTaskWithCateProps } from "./task.type";
import { Areas, Prisma, Routine, Task } from "@prisma/client";
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
            console.log('Error RoutineAddSyncGoogle:',error)
            throw error
        }
    }
    async RoutineUpdateSyncGoogle(googleEventId: string | null, eventListId: string, data: Routine){
        try {
            const googleEventData: calendarCreate = {
                summary: data.title,
                description: data.note || "",
                colorId: null,
                startDateTime: convertTimeHHmmToDateTime(data.routineTime, new Date()),
                endDateTime: convertTimeHHmmToDateTime(data.routineTime, new Date()),
                timeZone: 'Asia/Ho_Chi_Minh',
            };

            if (data?.color) {
                const colorToFind = data?.color;
                const colorIdIndex = colorList.findIndex(i => i.toLowerCase() === colorToFind);
                googleEventData.colorId = String(colorIdIndex + 1);
            }

            if (googleEventId) {
                if (data.isActive === false) {
                    await GoogleService.deleteCalendarEvent(googleEventId, eventListId);

                    await this.routineService.updateRoutine(data.id, { googleEventId: null });
                } else {
                    await GoogleService.updateEvent(googleEventId, eventListId, googleEventData, true);
                }
            } else if (data.isActive !== false) {
                const { id: eventID } = await GoogleService.createEvent(eventListId, googleEventData, true);
                eventID && await this.routineService.updateRoutine(data.id, { googleEventId: eventID });
            }
        } catch (error) {
            console.log('Error RoutineUpdateSyncGoogle:',error)
            throw error
        }
    }
    async RoutineOffSyncGoogle(routineID: string, googleEventId: string, eventListId: string){
        try {
            await GoogleService.deleteCalendarEvent(googleEventId, eventListId)
            await this.routineService.updateRoutine(routineID, { googleEventId: null });
            
        } catch (error) {
            console.log('Error RoutineOffSyncGoogle:',error)
            throw error
        }
    }
    
    async TaskUpdateSyncGoogle(googleEventId: string | null, eventListId: string, data: Task){
        try {

            if(googleEventId) {
                const googleEventData:calendarCreate = {
                    summary: data.title,
                    description: data.note || "",
                    colorId: null, 
                    startDateTime: data.deadline, 
                    endDateTime: data.deadline,
                    timeZone: 'Asia/Ho_Chi_Minh',
                }
 
            if(data?.color) {
                let colorIdIndex = colorList.findIndex(i => i.toLowerCase() === data.color)
                googleEventData.colorId = String(colorIdIndex + 1)
            }
            await GoogleService.updateEvent(googleEventId, eventListId, googleEventData)
         } else await this.TaskAddSyncGoogle(data.id, data, eventListId)
            
        } catch (error) {
            console.log('Error TaskUpdateSyncGoogle:',error)
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
            console.log('Error TaskAddSyncGoogle:',error)
            throw error
        }
    }
    async TaskOffSyncGoogle(taskID: string, googleEventId: string, eventListId: string){
        try {
            await GoogleService.deleteCalendarEvent(googleEventId, eventListId)
            await this.taskService.updateTask(taskID, { googleEventId: null });
            
        } catch (error) {
            console.log('Error TaskOffSyncGoogle:',error)
            throw error
        }
    }

    async syncDelAllTasks(userId: string, eventListId: string) {
        const tasks = await this.taskService.getTasksByUser(userId);
        if (tasks.length > 0) {
            await Promise.all(tasks.map(async (task) => {
                if (task.googleEventId) {
                    await this.TaskOffSyncGoogle(task.id, task.googleEventId, eventListId);
                }
            }));
        }
    }

    async syncAddAllTasks(userId: string, eventListId: string) {
        const tasks = await this.taskService.getTasksByUser(userId);
        if (tasks.length > 0) {
            await Promise.all(tasks.map(async (task) => {
                await this.TaskAddSyncGoogle(task.id, task, eventListId);
            }));
        }
    }
    
    async syncDelAllRoutines(userId: string, eventListId: string) {
        const routines = await this.routineService.getRoutinesByUser(userId);
        if (routines.length > 0) {
            await Promise.all(routines.map(async (routine) => {
                if (routine.googleEventId) {
                    await this.RoutineOffSyncGoogle(routine.id, routine.googleEventId, eventListId);
                }
            }));
        }
    }

    async syncAddAllRoutines(userId: string, eventListId: string) {
        const routines = await this.routineService.getRoutinesByUser(userId);
        if (routines.length > 0) {
            await Promise.all(routines.map(async (routine) => {
                await this.RoutineAddSyncGoogle(routine.id, routine, eventListId);
            }));
        }
    }
    
}