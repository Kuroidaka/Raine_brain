import { NextFunction, Request, Response } from 'express';
import { BadRequestException, ConflictException, NotFoundException, UnauthorizedException } from '~/common/error';
import { colorList } from '~/constant';
import { TaskService } from '~/database/reminder/task';
import { GoogleService } from '~/services/google/calendar';
import { calendarCreate, taskCreate } from '~/services/google/google.type';

const taskService = TaskService.getInstance()
export const reminderController = {
    createTask: async (req: Request, res: Response, next:NextFunction) => {       
        const { 
            area = [],
            ...data
         } = req.body;

        const { id: userId, eventListId } = req.user
        
        try {
            const task = await taskService.addNewTask({...data, userId}, area)

            // const googleTaskData:taskCreate = {
            //     note: data.note,
            //     status: "needsAction",
            //     title: data.title,
            //     due: new Date(data.deadline).toISOString(),
            // }
 
            const googleEventData:calendarCreate = {
                summary: data.title,
                description: data.note,
                colorId: null, 
                startDateTime: data.deadline, 
                endDateTime: data.deadline,
                timeZone: 'Asia/Ho_Chi_Minh',
            }

            if(data?.color) {
                let colorIdIndex = colorList.findIndex(i => i.toLowerCase() === data.color)
                googleEventData.colorId = String(colorIdIndex)
            }
            if(eventListId) {
                // await GoogleService.createTask(eventListId, googleTaskData)
                const isEnableRoutine = false
    
                const { id: eventID } = await GoogleService.createEvent(eventListId, googleEventData, isEnableRoutine)

                eventID && await taskService.updateTaskDataWithoutArea(task.id, { googleEventId: eventID })
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
        
        try {
            const result = await taskService.updateTask(taskID, data, area)
            return res.status(200).json(result)
        } catch (error) {
            console.log(error);
            // Rethrow the error to be caught by the errorHandler middleware
            next(error);
        }
    },
    checkTask: async (req: Request, res: Response, next:NextFunction) => {       
        const { id:taskID } = req.params;
        
        try {
            const result = await taskService.checkTask(taskID)
            return res.status(200).json(result)
        } catch (error) {
            console.log(error);
            // Rethrow the error to be caught by the errorHandler middleware
            next(error);
        }
    },
    deleteTask: async (req: Request, res: Response, next:NextFunction) => {       
        const { id:taskID } = req.params;
        
        try {
            await taskService.deleteTask(taskID)
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

    // ROUTINE
    createRoutine: async (req: Request, res: Response, next:NextFunction) => {       
        const { 
            data,
            area = []
         } = req.body;

        const { id: userId } = req.user
        
        try {
            await taskService.addNewTask({...data, userId}, area)
            return res.status(200).json({})
        } catch (error) {
            console.log(error);
            // Rethrow the error to be caught by the errorHandler middleware
            next(error);
        }
    },
}