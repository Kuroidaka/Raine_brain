import { NextFunction, Request, Response } from 'express';
import { BadRequestException, ConflictException, NotFoundException, UnauthorizedException } from '~/common/error';
import { colorList } from '~/constant';
import { ReminderService } from '~/database/reminder/reminder.service';
import { TaskService } from '~/database/reminder/task';
import { GoogleService } from '~/services/google/calendar';
import { calendarCreate, calendarUpdate, taskCreate } from '~/services/google/google.type';

const taskService = TaskService.getInstance()
const reminderService = ReminderService.getInstance()
export const reminderController = {
    createTask: async (req: Request, res: Response, next:NextFunction) => {       
        const { 
            area = [],
            ...data
         } = req.body;

        const { id: userId, eventListId, googleCredentials } = req.user
        
        try {
            const task = await taskService.addNewTask({...data, userId}, area)

            const isLinkGoogle = !!googleCredentials

            if(isLinkGoogle && eventListId) {
                await reminderService.TaskAddSyncGoogle(task.id, data, eventListId)
            }

            return res.status(200).json({
                message: "Task created successfully"
            })
        } catch (error) {
            console.log(error);
            // Rethrow the error to be caught by the errorHandler middleware
            next(error);
        }
    },
    getTask: async (req: Request, res: Response, next:NextFunction) => {       
        const {} = req.body;

         const { id: userId } = req.user
        
        try {
            const data = await taskService.getTasksByUser(userId)
            return res.status(200).json(data)
        } catch (error) {
            console.log(error);
            // Rethrow the error to be caught by the errorHandler middleware
            next(error);
        }
    },
    getTaskById: async (req: Request, res: Response, next:NextFunction) => {       
        const { id:taskID } = req.params;
        
        try {
            const data = await taskService.getTasksById(taskID)
            return res.status(200).json(data)
        } catch (error) {
            console.log(error);
            // Rethrow the error to be caught by the errorHandler middleware
            next(error);
        }
    },
    updateTask: async (req: Request, res: Response, next:NextFunction) => {       
        const { id:taskID } = req.params;
        const { area = [], ...data } = req.body;
        const { id: userId, eventListId, googleCredentials } = req.user
        
        try {
            const task = await taskService.updateTask(taskID, data, area)
            const isLinkGoogle = !!googleCredentials
            if(eventListId && isLinkGoogle) {// If account link with google
                // await GoogleService.createTask(eventListId, googleTaskData)  
                if(task.googleEventId) {
                       const googleEventData:calendarCreate = {
                        summary: data.title || task.title,
                        description: data.note || task.note,
                        colorId: null, 
                        startDateTime: data.deadline || task.deadline, 
                        endDateTime: data.deadline || task.deadline,
                        timeZone: 'Asia/Ho_Chi_Minh',
                    }
        
                    if(data?.color) {
                        let colorIdIndex = colorList.findIndex(i => i.toLowerCase() === data.color)
                        googleEventData.colorId = String(colorIdIndex + 1)
                    } else {
                        let colorIdIndex = colorList.findIndex(i => i.toLowerCase() === task.color)
                        googleEventData.colorId = String(colorIdIndex + 1)
                    }
                    await GoogleService.updateEvent(task.googleEventId as string, eventListId, googleEventData)
                } else await reminderService.TaskAddSyncGoogle(task.id, data, eventListId)
            }
            return res.status(200).json(task)
        } catch (error) {
            console.log(error);
            // Rethrow the error to be caught by the errorHandler middleware
            next(error);
        }
    },
    checkTask: async (req: Request, res: Response, next:NextFunction) => {       
        const { id:taskID } = req.params;
        const { id: userId, eventListId, googleCredentials } = req.user
        try {
            const task = await taskService.checkTask(taskID)

            const isLinkGoogle = !!googleCredentials
            if(isLinkGoogle && eventListId) {
                if(task.status && task?.googleEventId) {
                    await reminderService.TaskDeleteSyncGoogle(task.id, task.googleEventId, eventListId)
                }else {
                    await reminderService.TaskAddSyncGoogle(task.id, task, eventListId)
                }

            }
            return res.status(200).json(task)
        } catch (error) {
            console.log(error);
            // Rethrow the error to be caught by the errorHandler middleware
            next(error);
        }
    },
    deleteTask: async (req: Request, res: Response, next:NextFunction) => {       
        const { id:taskID } = req.params;
        const { id: userId, eventListId, googleCredentials } = req.user
        try {
            const task = await taskService.getTasksById(taskID)
            await taskService.deleteTask(taskID)

            if(googleCredentials && eventListId && task?.googleEventId) {
                await GoogleService.deleteCalendarEvent(task?.googleEventId, eventListId)
            }
            return res.status(200).json({ msg : "Deleted successful"})
        } catch (error) {
            console.log(error);
            // Rethrow the error to be caught by the errorHandler middleware
            next(error);
        }
    },
    addSubTask: async (req: Request, res: Response, next:NextFunction) => {       
        const { id:taskId } = req.params;
        const { title } = req.body;
        
        try {
            const result = await taskService.addSubTask({title, taskId})
            return res.status(200).json(result)
        } catch (error) {
            console.log(error);
            // Rethrow the error to be caught by the errorHandler middleware
            next(error);
        }
    },
    updateSubTask: async (req: Request, res: Response, next:NextFunction) => {       
        const { subId } = req.params;
        const data = req.body;
        
        try {
            const result = await taskService.updateSubTask(subId, data)
            return res.status(200).json(result)
        } catch (error) {
            console.log(error);
            // Rethrow the error to be caught by the errorHandler middleware
            next(error);
        }
    },
    deleteSubTask: async (req: Request, res: Response, next:NextFunction) => {       
        const { subId } = req.params;
        
        try {
            await taskService.deleteSubTask(subId)
            return res.status(200).json({ msg: "Deleted"})
        } catch (error) {
            console.log(error);
            // Rethrow the error to be caught by the errorHandler middleware
            next(error);
        }
    },
}