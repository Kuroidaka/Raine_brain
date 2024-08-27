import { NextFunction, Request, Response } from 'express';
import { RoutineService } from '~/database/reminder/routine';

const routineService = RoutineService.getInstance();

export const routineController = {
    createRoutine: async (req: Request, res: Response, next: NextFunction) => {
        const { area = [], ...data } = req.body;
        const { id: userId } = req.user;

        try {
            await routineService.addNewRoutine({ ...data, userId }, area);
            return res.status(200).json({});
        } catch (error) {
            console.log(error);
            next(error);
        }
    },
    getRoutines: async (req: Request, res: Response, next: NextFunction) => {
        const { id: userId } = req.user;

        try {
            const data = await routineService.getRoutinesByUser(userId);
            return res.status(200).json(data);
        } catch (error) {
            console.log(error);
            next(error);
        }
    },
    getRoutineById: async (req: Request, res: Response, next: NextFunction) => {
        const { id: routineID } = req.params;

        try {
            const data = await routineService.getRoutineById(routineID);
            return res.status(200).json(data);
        } catch (error) {
            console.log(error);
            next(error);
        }
    },
    updateRoutine: async (req: Request, res: Response, next: NextFunction) => {
        const { id: routineID } = req.params;
        const { area = [], dates = [], ...data} = req.body;

        try {
            const result = await routineService.updateRoutine(routineID, data, area, dates);
            return res.status(200).json(result);
        } catch (error) {
            console.log(error);
            next(error);
        }
    },
    toggleRoutineStatus: async (req: Request, res: Response, next: NextFunction) => {
        const { id: routineID } = req.params;

        try {
            const result = await routineService.toggleRoutineStatus(routineID);
            return res.status(200).json(result);
        } catch (error) {
            console.log(error);
            next(error);
        }
    },
    deleteRoutine: async (req: Request, res: Response, next: NextFunction) => {
        const { id: routineID } = req.params;

        try {
            await routineService.deleteRoutine(routineID);
            return res.status(200).json({ msg: "Deleted successfully" });
        } catch (error) {
            console.log(error);
            next(error);
        }
    },
};
