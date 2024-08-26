import { NextFunction, Request, Response } from 'express';
import * as fs from 'fs';
import { google } from 'googleapis';
import * as path from 'path';
import { googleOAuth2Client } from '~/config';
import { uploadFilePath } from '~/constant';
import { GoogleService } from '~/services/google/calendar';
import { calendarUpdate } from '~/services/google/google.type';

const tokenPath = path.join(uploadFilePath.token, 'token.json');

export const googleController = {
    authorize: async (req: Request, res: Response, next: NextFunction) => {       
        try {
            const authUrl = googleOAuth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: ['https://www.googleapis.com/auth/calendar'],
            });
            res.redirect(authUrl);
        } catch (error) {
            console.error(error);
            next(error);
        }
    },

    oauth2callback: async (req: Request, res: Response, next: NextFunction) => {       
        const code = req.query.code as string | undefined;

        if (!code) {
            return next(new Error('Authorization code not provided'));
        }

        try {
            const { tokens } = await googleOAuth2Client.getToken(code);
            googleOAuth2Client.setCredentials(tokens);

            // Save the token for later use
            fs.writeFileSync(tokenPath, JSON.stringify(tokens));

            res.send('Authorization successful! You can close this window.');
        } catch (error) {
            console.error(error);
            next(error);
        }
    },
    // Create an event in Google Calendar
    updateTask: async (req: Request, res: Response, next: NextFunction) => {
        try {

            const { id } = req.params
            // const { 
            //     summary, 
            //     description,
            //     colorId ,
            //     startDateTime,
            //     endDateTime,
            //     timeZone
            // } = req.body

            const requestBody: calendarUpdate = Object.keys(req.body).reduce((obj, key) => {
                const value = req.body[key as keyof calendarUpdate];
                if (value !== undefined) {
                    obj[key as keyof calendarUpdate] = value;
                }
                return obj;
            }, {} as calendarUpdate);
            

            const result = await GoogleService.updateEvent(id, requestBody)
            res.status(200).json(result);
        } catch (error) {
            console.error('Error updating event:', error);
            next(error);
        }
    },
    createTask: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { 
                summary = "", 
                description= "",
                colorId = null,
                startDateTime,
                endDateTime,
                timeZone='Asia/Ho_Chi_Minh'
            } = req.body

            const { isRoutine } = req.query
            const isEnableRoutine = isRoutine === "true"

            const result = await GoogleService.createCalendar({
                summary,description,colorId, startDateTime, endDateTime,timeZone,
            }, isEnableRoutine)
            res.status(200).json(result);
        } catch (error) {
            console.error('Error creating event:', error);
            next(error);
        }
    },
    getEventList: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await GoogleService.getEventList()
            res.status(200).json(result);
        } catch (error) {
            console.error('Error getting event:', error);
            next(error);
        }
    },
    getEvent: async (req: Request, res: Response, next: NextFunction) => {
        const { id } = req.params
        try {
            const result = await GoogleService.getEvent(id)
            res.status(200).json(result);
        } catch (error) {
            console.error('Error getting event:', error);
            next(error);
        }
    },
    deleteEvent: async (req: Request, res: Response, next: NextFunction) => {
        const { id } = req.params
        try {
            const result = await GoogleService.deleteCalendarEvent(id)
            res.status(200).json(result);
        } catch (error) {
            console.error('Error delete event:', error);
            next(error);
        }
    },
}
