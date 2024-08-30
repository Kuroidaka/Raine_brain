import { NextFunction, Request, Response } from 'express';
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
        const { area = [], dates = [], ...data} = req.body;
        const { id: userId, eventListId, googleCredentials } = req.user

        try {
            const dataBody = {...data}

            const foundRoutine = await routineService.getRoutineById(routineID);

            if(data?.isActive === false)  {
                dataBody.googleEventId = null
            }
            const routine = await routineService.updateRoutine(routineID, dataBody, area, dates);

            if (eventListId && googleCredentials) { // If account linked with Google
                const googleEventData: calendarCreate = {
                    summary: data.title || routine.title,
                    description: data.note || routine.note,
                    colorId: null,
                    startDateTime: convertTimeHHmmToDateTime(routine.routineTime, new Date()),
                    endDateTime: convertTimeHHmmToDateTime(routine.routineTime, new Date()),
                    timeZone: 'Asia/Ho_Chi_Minh',
                };
    
                if (data?.color || routine.color) {
                    const colorToFind = data?.color || routine.color;
                    const colorIdIndex = colorList.findIndex(i => i.toLowerCase() === colorToFind);
                    googleEventData.colorId = String(colorIdIndex + 1);
                }
    
                if (foundRoutine?.googleEventId) {
                    if (data.isActive === false) {
                        await GoogleService.deleteCalendarEvent(foundRoutine.googleEventId, eventListId);
                    } else {
                        await GoogleService.updateEvent(foundRoutine.googleEventId as string, eventListId, googleEventData, true);
                    }
                } else if (data.isActive !== false) {
                    const { id: eventID } = await GoogleService.createEvent(eventListId, googleEventData, true);
                    if (eventID) {
                        await routineService.updateRoutineDataWithoutArea(routine.id, { googleEventId: eventID });
                    }
                }
            }
    
            return res.status(200).json(routine);
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
