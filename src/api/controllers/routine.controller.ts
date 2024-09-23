import { NextFunction, Request, Response } from 'express';
import { NotFoundException } from '~/common/error';
import { colorList } from '~/constant';
import { ReminderService } from '~/database/reminder/reminder.service';
import { RoutineService } from '~/database/reminder/routine';
import { GoogleService } from '~/services/google/calendar';
import { calendarCreate } from '~/services/google/google.type';
import { convertTimeHHmmToDateTime } from '~/utils';

const routineService = RoutineService.getInstance();
const reminderService = ReminderService.getInstance()
export const routineController = {
    createRoutine: async (req: Request, res: Response, next: NextFunction) => {
        const { area = [], ...data } = req.body;
        const { id: userId, eventListId, googleCredentials } = req.user

        try {
            const routine = await routineService.addNewRoutine({ ...data, userId }, area);

            const isLinkGoogle = !!googleCredentials

            if(isLinkGoogle && eventListId) {
                await reminderService.RoutineAddSyncGoogle(routine.id, data, eventListId)
            }

            return res.status(200).json({
                message: "Routine created successfully"
            });
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
        const { area, dates, ...data } = req.body;
        const { id: userId, eventListId, googleCredentials } = req.user

        try {
            const dataBody = {...data}

            const routine = await routineService.getRoutineById(routineID);

            if(!routine) throw new NotFoundException("Routine Not Found")

            const updatedRoutine = await routineService.updateRoutine(routineID, dataBody, area, dates);

            if (eventListId && googleCredentials) { // If account linked with Google
                await reminderService.RoutineUpdateSyncGoogle(routine.googleEventId, eventListId, updatedRoutine)
            }
    
            return res.status(200).json(updatedRoutine);
        } catch (error) {
            console.log(error);
            next(error);
        }
    },
    updateRoutineDate: async (req: Request, res: Response, next: NextFunction) => {
        const { id: routineID } = req.params;
        const { dates } = req.body;
        // const { id: userId, eventListId, googleCredentials } = req.user

        try {

            const routine = await routineService.getRoutineById(routineID);

            if(!routine) throw new NotFoundException("Routine Not Found")

            await routineService.updateRoutineDates(routineID, dates);
        
            // if (eventListId && googleCredentials) { // If account linked with Google
            //     await reminderService.RoutineUpdateSyncGoogle(routine.googleEventId, eventListId, updatedRoutine)
            // }
    
            return res.status(200).json({
                message: "Updated dates successfully"
            });
        } catch (error) {
            console.log(error);
            next(error);
        }
    },
    toggleRoutineStatus: async (req: Request, res: Response, next: NextFunction) => {
        const { id: routineID } = req.params;
        const { id: userId, eventListId, googleCredentials } = req.user

        try {
            const routine = await routineService.toggleRoutineStatus(routineID);
            
            const isLinkGoogle = !!googleCredentials

            if(isLinkGoogle && eventListId) {
                await reminderService.RoutineUpdateSyncGoogle(routine.googleEventId, eventListId, routine)
            }

            return res.status(200).json(routine);
        } catch (error) {
            console.log(error);
            next(error);
        }
    },
    deleteRoutine: async (req: Request, res: Response, next: NextFunction) => {
        const { id: routineID } = req.params;
        const { id: userId, eventListId, googleCredentials } = req.user

        try {
            const routine = await routineService.getRoutineById(routineID)
            await routineService.deleteRoutine(routineID);

            if(googleCredentials && eventListId && routine?.googleEventId) {
                await GoogleService.deleteCalendarEvent(routine?.googleEventId, eventListId)
            }
            return res.status(200).json({ msg: "Deleted successfully" });
        } catch (error) {
            console.log(error);
            next(error);
        }
    },
};
