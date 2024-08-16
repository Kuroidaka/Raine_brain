import { NextFunction, Request, Response } from 'express';
import { GoalService } from '~/database/reminder/goal.service'; 

const goalService = GoalService.getInstance();

export const goalController = {
    createGoal: async (req: Request, res: Response, next: NextFunction) => {
        const { data, area = [] } = req.body;
        const { id: userId } = req.user;

        try {
            await goalService.addNewGoal({ ...data, userId }, area);
            return res.status(200).json({});
        } catch (error) {
            console.log(error);
            next(error);
        }
    },
    getGoals: async (req: Request, res: Response, next: NextFunction) => {
        const { id: userId } = req.user;

        try {
            const data = await goalService.getGoalsByUser(userId);
            return res.status(200).json(data);
        } catch (error) {
            console.log(error);
            next(error);
        }
    },
    getGoalById: async (req: Request, res: Response, next: NextFunction) => {
        const { id: goalID } = req.params;

        try {
            const data = await goalService.getGoalById(goalID);
            return res.status(200).json(data);
        } catch (error) {
            console.log(error);
            next(error);
        }
    },
    updateGoal: async (req: Request, res: Response, next: NextFunction) => {
        const { id: goalID } = req.params;
        const { data, area = [] } = req.body;

        try {
            const result = await goalService.updateGoal(goalID, data, area);
            return res.status(200).json(result);
        } catch (error) {
            console.log(error);
            next(error);
        }
    },
    deleteGoal: async (req: Request, res: Response, next: NextFunction) => {
        const { id: goalID } = req.params;

        try {
            await goalService.deleteGoal(goalID);
            return res.status(200).json({ msg: "Deleted successfully" });
        } catch (error) {
            console.log(error);
            next(error);
        }
    },
};
