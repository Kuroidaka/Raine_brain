import { NextFunction, Request, Response } from 'express';
import { BadRequestException, ConflictException, NotFoundException, UnauthorizedException } from '~/common/error';
import { TaskService } from '~/database/reminder/task';

const taskService = TaskService.getInstance()
export const reminderController = {
    createTask: async (req: Request, res: Response, next:NextFunction) => {       
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
        const { data, area = [] } = req.body;
        
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