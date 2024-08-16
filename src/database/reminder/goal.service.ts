import { dbClient } from "~/config";
import { Prisma } from "@prisma/client";
import { GoalProps, UpdateGoalProps, GoalWithAreaProps, GoalUpdateWithAreaProps } from "./goal.type";
import { Areas } from "@prisma/client";

export class GoalService {
    private static instance: GoalService;

    private constructor() {}

    public static getInstance(): GoalService {
        if (!GoalService.instance) {
            GoalService.instance = new GoalService();
        }
        return GoalService.instance;
    }

    private mapAreaToPrisma(area?: Areas[]): Prisma.GoalAreasCreateNestedManyWithoutGoalInput | undefined {
        if (!area) return undefined;
        return {
            create: area.map(area => ({ area }))
        };
    }

    async addNewGoal(data: GoalProps, area: Areas[]) {
        try {
            const dataObject: GoalWithAreaProps = data;
            if (area.length > 0) {
                dataObject.area = this.mapAreaToPrisma(area);
            }

            return await dbClient.goal.create({ data: dataObject });
        } catch (error) {
            console.log('Error adding goal:', error);
            throw error;
        }
    }

    async getGoalById(id: string) {
        try {
            return await dbClient.goal.findUnique({
                where: { id },
                include: {
                    area: true,
                }
            });
        } catch (error) {
            console.log('Error getting goal:', error);
            throw error;
        }
    }

    async getGoalsByUser(userId: string) {
        try {
            return await dbClient.goal.findMany({
                where: { userId },
                include: {
                    area: true,
                }
            });
        } catch (error) {
            console.log('Error getting goals:', error);
            throw error;
        }
    }

    async updateGoal(goalId: string, data: UpdateGoalProps, area: Areas[]) {
        try {
            const dataObject: GoalUpdateWithAreaProps = data;
            // Remove all the old areas
            await dbClient.goalAreas.deleteMany({
                where: {
                    goalId: goalId
                }
            });

            if (area.length > 0) {
                dataObject.area = this.mapAreaToPrisma(area);
            }

            return await dbClient.goal.update({
                where: { id: goalId },
                data: dataObject
            });
        } catch (error) {
            console.log('Error updating goal:', error);
            throw error;
        }
    }

    async deleteGoal(goalId: string) {
        try {
            return await dbClient.$transaction(async (tx) => {
                // Delete related GoalAreas records
                await tx.goalAreas.deleteMany({
                    where: { goalId }
                });

                // Finally, delete the Goal itself
                return await tx.goal.delete({
                    where: { id: goalId }
                });
            });
        } catch (error) {
            console.log('Error deleting goal:', error);
            throw error;
        }
    }
}
