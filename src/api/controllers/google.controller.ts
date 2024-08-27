import { NextFunction, Request, Response } from 'express';
import * as fs from 'fs';
import { google } from 'googleapis';
import * as path from 'path';
import { UnauthorizedException } from '~/common/error';
import { googleOAuth2Client } from '~/config';
import { uploadFilePath } from '~/constant';
import { UserService } from '~/database/user/user';
import { GoogleService } from '~/services/google/calendar';
import { calendarUpdate } from '~/services/google/google.type';

const tokenPath = path.join(uploadFilePath.token, 'token.json');

export const googleController = {
    linkGmail: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.query.userId;

            if(!userId) throw new UnauthorizedException("Missing user ID")

            const state = JSON.stringify({ userId: userId }); // Encode the user ID in state
    
            const authUrl = googleOAuth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/userinfo.email'],
                state: state, // Include the state parameter
            });
    
            res.redirect(authUrl)
        } catch (error) {
            console.error(error);
            next(error);
        }
    },
    unlinkGmail: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id: userId } = req.user
    
            if (!userId) {
                throw new UnauthorizedException("Missing user ID");
            }
    
            const userService = UserService.getInstance();
    
            // Fetch the user to check if there's an associated Gmail account
            const user = await userService.getUser({id: userId});
            
            if (!user || !user.gmail) {
                throw new Error("No Gmail account linked to this user");
            }
    
            // Update the user's record to remove the Gmail account and credentials
            await userService.updateUser(userId, {
                gmail: null,
                googleCredentials: null
            });
    
            res.status(200).json({
                message: 'Gmail unlinked successfully!'
            })
        } catch (error) {
            console.error(error);
            next(error);
        }
    },
    oauth2callback: async (req: Request, res: Response, next: NextFunction) => {
        const code = req.query.code as string | undefined;
        const state = req.query.state as string;
        console.log("state", state)
    
        if (!code) {
            return next(new Error('Authorization code not provided'));
        }
    
        try {
            const { tokens } = await googleOAuth2Client.getToken(code);
            googleOAuth2Client.setCredentials(tokens);
    
            // Decode the state to retrieve the user ID
            const decodedState = JSON.parse(state);
            const userId = decodedState.userId;

            const oauth2 = google.oauth2('v2');
            const userInfo = await oauth2.userinfo.get({ auth: googleOAuth2Client });
    
            const gmail = userInfo.data.email;
    
            const userService = UserService.getInstance();
            await userService.updateUser(userId, {
                gmail,
                googleCredentials: JSON.stringify(tokens)
            });
    
            res.send('Gmail linked successfully! You can close this window.');
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
    validateUserToken: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const oauth2 = google.oauth2('v2');
            const userInfo = await oauth2.userinfo.get({ auth: googleOAuth2Client });
            res.status(200).json(userInfo.data);
        } catch (error) {
            console.error('Error delete event:', error);
            next(error);
        }
    },



    
}
