import { dbClient } from "~/config";
import { Prisma, Routine } from "@prisma/client";
import { RoutineProps, UpdateRoutineProps, RoutineWithAreaProps, RoutineUpdateWithAreaProps, RoutineDateProps, UpdateRoutineDateProps } from "./routine.type";
import { Areas } from "@prisma/client";

export class RoutineService {
    private static instance: RoutineService;

    private constructor() {}

    public static getInstance(): RoutineService {
        if (!RoutineService.instance) {
            RoutineService.instance = new RoutineService();
        }
        return RoutineService.instance;
    }

    private mapAreaToPrisma(area?: Areas[]): Prisma.RoutineAreasCreateNestedManyWithoutRoutineInput | undefined {
        if (!area) return undefined;
        return {
            create: area.map(area => ({ area }))
        };
    }

    // Routine CRUD operations
    async addNewRoutine(data: RoutineProps, area?: Areas[]) {
        try {
            const dataObject: RoutineWithAreaProps = data;
            if (area && area.length > 0) {
                dataObject.area = this.mapAreaToPrisma(area);
            }

            console.log("dataObject", dataObject)
            return await dbClient.routine.create({ data: dataObject });
        } catch (error) {
            console.log('Error adding routine:', error);
            throw error;
        }
    }

    async getRoutineById(id: string): Promise<Routine> {
        try {
            const routine = await dbClient.routine.findUnique({
                where: { id },
                include: {
                    area: true,
                    routineDate: true,
                },
            });
    
            if (!routine) {
                throw new Error(`Routine with id ${id} not found`);
            }
    
            return routine;
        } catch (error) {
            console.error('Error getting routine:', error);
            throw error;
        }
    }

    async getRoutinesByUser(userId: string) {
        try {
            return await dbClient.routine.findMany({
                where: { userId },
                include: {
                    area: true,
                    routineDate: true
                }
            });
        } catch (error) {
            console.log('Error getting routines:', error);
            throw error;
        }
    }

    async updateRoutine(routineId: string, data: UpdateRoutineProps, area?: Areas[], dates?: UpdateRoutineDateProps[]):Promise<Routine> {
        try {
            return await dbClient.$transaction(async (tx) => {
                const dataObject: RoutineUpdateWithAreaProps = data;
    
                if(area){
                    // Remove all the old areas
                    await tx.routineAreas.deleteMany({where: { routineId: routineId }});
                    if (area.length > 0) {
                        dataObject.area = this.mapAreaToPrisma(area);
                    }
        
                }
                if(dates) {
                    await tx.routineDate.deleteMany({where: { routineID: routineId }});
                    // Handle RoutineDate logic
                    if(dates.length > 0) {
                        for (const date of dates) {

                            const dateISO = new Date(date.completion_date).toISOString()
                            const existingDate = await tx.routineDate.findFirst({
                                where: {
                                    routineID: routineId,
                                    completion_date: dateISO,
                                },
                            });
            
                            if (existingDate) {
                                // If the date already exists, delete it
                                await tx.routineDate.delete({
                                    where: { id: existingDate.id },
                                });
                            } else {
                                // If the date does not exist, create a new RoutineDate
                                await tx.routineDate.create({
                                    data: {
                                        routineID: routineId,
                                        completion_date: dateISO,
                                    },
                                });
                            }
                        }
                    }
                }
                
                if(data) {
                    // Update Routine
                    const updatedRoutine = await tx.routine.update({
                        where: { id: routineId },
                        data: dataObject,
                    });
                    return updatedRoutine;
                } else {
                    return this.getRoutineById(routineId)
                }
            });
        } catch (error) {
            console.log('Error updating routine:', error);
            throw error;
        }
    }
    async updateRoutineDates(routineId: string, dates?: UpdateRoutineDateProps[]):Promise<void> {
        try {
            await dbClient.$transaction(async (tx) => {
                if(dates) {
                    await tx.routineDate.deleteMany({where: { routineID: routineId }});
                    // Handle RoutineDate logic
                    if(dates.length > 0) {
                        for (const date of dates) {

                            const dateISO = new Date(date.completion_date).toISOString()
                            const existingDate = await tx.routineDate.findFirst({
                                where: {
                                    routineID: routineId,
                                    completion_date: dateISO,
                                },
                            });
            
                            if (existingDate) {
                                // If the date already exists, delete it
                                await tx.routineDate.delete({
                                    where: { id: existingDate.id },
                                });
                            } else {
                                // If the date does not exist, create a new RoutineDate
                                await tx.routineDate.create({
                                    data: {
                                        routineID: routineId,
                                        completion_date: dateISO,
                                    },
                                });
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.log('Error updating routine:', error);
            throw error;
        }
    }

    async updateRoutineDataWithoutArea(routineID: string, data:UpdateRoutineProps){
        try {
            return await dbClient.routine.update({
                where: { id: routineID },
                data: data
            });
        } catch (error) {
            console.log('Error updating task:', error);
            throw error;
        }
    }

    async toggleRoutineStatus(routineId: string) {
        try {
            const routine = await dbClient.routine.findUnique({
                where: { id: routineId }
            });

            return await dbClient.routine.update({
                where: { id: routineId },
                data: {
                    isActive: !routine?.isActive
                }
            });
        } catch (error) {
            console.log('Error toggling routine status:', error);
            throw error;
        }
    }

    async deleteRoutine(routineId: string) {
        try {
            return await dbClient.$transaction(async (tx) => {
                // Delete related RoutineAreas records
                await tx.routineAreas.deleteMany({
                    where: { routineId }
                });

                // Delete related RoutineDate records
                await tx.routineDate.deleteMany({
                    where: { routineID: routineId }
                });

                // Finally, delete the Routine itself
                return await tx.routine.delete({
                    where: { id: routineId }
                });
            });
        } catch (error) {
            console.log('Error deleting routine:', error);
            throw error;
        }
    }

    // RoutineDate CRUD operations
    async addRoutineDate(data: RoutineDateProps) {
        try {
            return await dbClient.routineDate.create({ data });
        } catch (error) {
            console.log('Error adding routine date:', error);
            throw error;
        }
    }

    async getRoutineDateById(id: string) {
        try {
            return await dbClient.routineDate.findUnique({
                where: { id },
                include: {
                    routine: true,
                },
            });
        } catch (error) {
            console.log('Error getting routine date:', error);
            throw error;
        }
    }

    async getRoutineDatesByRoutineId(routineID: string) {
        try {
            return await dbClient.routineDate.findMany({
                where: { routineID },
                include: {
                    routine: true,
                },
            });
        } catch (error) {
            console.log('Error getting routine dates:', error);
            throw error;
        }
    }

    async updateRoutineDate(id: string, data: UpdateRoutineDateProps) {
        try {
            return await dbClient.routineDate.update({
                where: { id },
                data,
            });
        } catch (error) {
            console.log('Error updating routine date:', error);
            throw error;
        }
    }

    async deleteRoutineDate(id: string) {
        try {
            return await dbClient.routineDate.delete({
                where: { id },
            });
        } catch (error) {
            console.log('Error deleting routine date:', error);
            throw error;
        }
    }
}
