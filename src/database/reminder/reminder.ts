import { dbClient } from "~/config";
import { SubTaskProps, TaskProps, TaskWithCateProps, UpdateSubTaskProps, UpdateTaskProps, UpdateTaskWithCateProps } from "./reminder.interface";
import { Categories, Prisma } from "@prisma/client";

export class ReminderService {
    private static instance: ReminderService;

    private constructor() {}

    public static getInstance(): ReminderService {
        if (!ReminderService.instance) {
            ReminderService.instance = new ReminderService();
        }
        return ReminderService.instance;
    }

    private  mapCategoriesToPrisma (categories?: Categories[]): Prisma.TaskCategoryCreateNestedManyWithoutTaskInput | undefined  {
        if (!categories) return undefined;
        return {
            create: categories.map(category => ({ category }))
        };
    };
    
    async addNewTask(data:TaskProps, categories?: Categories[]){
        try {

            const dataObject: TaskWithCateProps = data
            if(categories) {
                dataObject.categories = this.mapCategoriesToPrisma(categories)
            }

            return await dbClient.task.create({ data: dataObject })
        } catch (error) {
            console.log('Error adding task:',error)
            throw error
        }
    }

    async getTasksByUser(userId:string){
        try {
            return await dbClient.task.findMany({ 
                where: {
                    userId: userId
                }
             })
        } catch (error) {
            console.log('Error geting task:',error)
            throw error
        }
    }

    async updateTask(taskId: string, data:UpdateTaskProps, categories?: Categories[]){
        try {

            const dataObject: UpdateTaskWithCateProps = data
            if(categories) {
                dataObject.categories = this.mapCategoriesToPrisma(categories)
            }

            return await dbClient.task.update({
                where: { id: taskId },
                data: dataObject
             })
        } catch (error) {
            console.log('Error updating task:',error)
            throw error
        }
    }
    
    async deleteTask(taskId:string) {
        try {
            return await dbClient.task.delete({ 
                where: {
                    id: taskId
                }
             })
        } catch (error) {
            console.log('Error deleting task:',error)
            throw error
        }
    }

    async addSubTask(data: SubTaskProps) {
        try {
            return await dbClient.subTask.create({ data })
        } catch (error) {
            console.log('Error adding subtask:',error)
            throw error
        }
    }

    async updateSubTask(subtaskID:string, data: UpdateSubTaskProps) {
        try {
            return await dbClient.subTask.update({ 
                where: { id: subtaskID },
                data 
            })
        } catch (error) {
            console.log('Error updating subtask:',error)
            throw error
        }
    }
    
    async deleteSubTask(subtaskID:string) {
        try {
            return await dbClient.subTask.delete({ 
                where: { id: subtaskID }
            })
        } catch (error) {
            console.log('Error deleting subtask:',error)
            throw error
        }
    }

}