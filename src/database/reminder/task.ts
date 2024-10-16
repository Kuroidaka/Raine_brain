import { dbClient } from "~/config";
import { SubTaskProps, TaskAttachmentProps, TaskProps, TaskWithAreaProps, UpdateSubTaskProps, UpdateTaskProps, UpdateTaskWithCateProps } from "./task.type";
import { Areas, Prisma, Task } from "@prisma/client";

export class TaskService {
    private static instance: TaskService;

    private constructor() {}

    public static getInstance(): TaskService {
        if (!TaskService.instance) {
            TaskService.instance = new TaskService();
        }
        return TaskService.instance;
    }

    private  mapAreaToPrisma (area?: Areas[]): Prisma.TaskAreasCreateNestedManyWithoutTaskInput | undefined  {
        if (!area) return undefined;
        return {
            create: area.map(area => ({ area }))
        };
    };

    private preprocessDeadlineTime(deadline: Date | string) {
        if (deadline !== null) return new Date(deadline).toISOString()
        else return deadline
    }
    
    async addNewTask(data:TaskProps, area?: Areas[]){
        try {

            const dataObject: TaskWithAreaProps = data
            dataObject.deadline = this.preprocessDeadlineTime(dataObject.deadline)
            if(area && area.length > 0) {
                dataObject.area = this.mapAreaToPrisma(area)
            }

            return await dbClient.task.create({ data: dataObject })
        } catch (error) {
            console.log('Error adding task:',error)
            throw error
        }
    }

    async getTasksById(id:string){
        try {
            return await dbClient.task.findUnique({ 
                where: { id },
                include: {
                    area: true,
                    subTask: true,
                    taskAttachment: true
                }
             })
        } catch (error) {
            console.log('Error geting task:',error)
            throw error
        }
    }

    async getTasksByUser(userId:string){
        try {
            return await dbClient.task.findMany({ 
                where: {
                    userId: userId
                },
                include: {
                    area: true,
                    subTask: true,
                    taskAttachment: true
                }
             })
        } catch (error) {
            console.log('Error geting task:',error)
            throw error
        }
    }

    async updateTask(taskId: string, data:UpdateTaskProps, area?: Areas[]):Promise<Task>{
        try {
            const dataObject: UpdateTaskWithCateProps = data;
            if(dataObject.deadline){
                dataObject.deadline = this.preprocessDeadlineTime(dataObject.deadline)
            }
            if(area) {
                // Remove all the old list
                await dbClient.taskAreas.deleteMany({
                    where: {
                        taskId: taskId
                    }
                });
    
                if (area.length > 0) {
                    // If Area are provided, update the Area
                    dataObject.area = this.mapAreaToPrisma(area);
                }
            }
            return await dbClient.task.update({
                where: { id: taskId },
                data: dataObject
            });
        } catch (error) {
            console.log('Error updating task:', error);
            throw error;
        }
    }

    async updateTaskDataWithoutArea(taskId: string, data:UpdateTaskProps){
        try {
            return await dbClient.task.update({
                where: { id: taskId },
                data: data
            });
        } catch (error) {
            console.log('Error updating task:', error);
            throw error;
        }
    }
    
    async checkTask(taskId: string){
        try {
            const task = await dbClient.task.findUnique({
                where: { id: taskId }
            })

            return await dbClient.task.update({
                where: { id: taskId },
                data: {
                    status: !task?.status
                }
            });
        } catch (error) {
            console.log('Error checking task:', error);
            throw error;
        }
    }
    
    async deleteTask(taskId:string) {
        try {
        // Start a transaction
        return await dbClient.$transaction(async (tx) => {
            // Delete related TaskArea records
            await tx.taskAreas.deleteMany({
                where: { taskId }
            });

            // Delete related SubTask records
            await tx.subTask.deleteMany({
                where: { taskId }
            });

            await tx.taskAttachment.deleteMany({
                where: { taskId }
            });

            // Finally, delete the Task itself
            return await tx.task.delete({
                where: { id: taskId }
            });
        });
        } catch (error) {
            console.log('Error deleting task:',error)
            throw error
        }
    }

    async getSubTask(taskID:string) {
        try {
            return await dbClient.subTask.findMany({ where: {
                taskId: taskID
            }})
        } catch (error) {
            console.log('Error get subtask:',error)
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

    async addTaskAttachment(taskId: string, data: TaskAttachmentProps) {
        try {
            return await dbClient.taskAttachment.create({ data: {
                ...data,
                taskId
            } })
        } catch (error) {
            console.log('Error adding task attachment:',error)
            throw error
        }
    }


}