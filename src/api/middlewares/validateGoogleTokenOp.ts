import { NextFunction, Request, Response } from 'express';
import { google } from 'googleapis';
import { NotFoundException } from '~/common/error';
import { googleOAuth2Client } from '~/config';
import { UserService } from '~/database/user/user';

const userService = UserService.getInstance();

export const validateGgTokenOptional = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Retrieve the user from the database using the ID from JWT
        const user = await userService.getUser({ id: req.user.id });

        if (!user) {
            throw new NotFoundException('User not Founded');
        }

        // Parse the stored token
        if(user.googleCredentials) {
            const credentials = JSON.parse(user.googleCredentials);
            
            // Set the credentials using the stored token
            googleOAuth2Client.setCredentials(credentials);
    
            // Check if the token is expired
            const currentTime = new Date().getTime();
            if (!credentials.expiry_date || credentials.expiry_date <= currentTime) {
                // If the token is expiring or has expired, refresh it
                const refreshedTokens = await googleOAuth2Client.refreshAccessToken();
                googleOAuth2Client.setCredentials(refreshedTokens.credentials);
    
                // Update the user's token in the database with the refreshed token
                await userService.updateUser(user.id, {
                    googleCredentials: JSON.stringify(refreshedTokens.credentials),
                });
            }
        }
        next(); // Proceed to the next middleware or route handler
    } catch (error) {
        console.error('Failed to validate Google token:', error);
        res.status(401).json({ error: 'Failed to validate Google token. Please re-link your Google account.' });
    }
};
