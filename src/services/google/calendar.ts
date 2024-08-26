import { InternalServerErrorException } from "~/common/error";
import { google } from 'googleapis';
import { googleOAuth2Client } from '~/config';
import { calendarCreate, calendarUpdate } from "./google.type";

export const GoogleService = {
  createCalendar: async ({
    summary, 
    description,
    colorId,
    startDateTime,
    endDateTime,
    timeZone
  }:calendarCreate, isEnableRoutine: boolean) => {

    try {
        const calendar = google.calendar({ version: 'v3', auth: googleOAuth2Client });

        const event = {
            summary: summary,
            // location: req.body.location || 'Tp. Đà Lạt',
            description: description || '',
            colorId: colorId,
            start: {
                dateTime: new Date(startDateTime).toISOString(), // Expecting date-time format 'YYYY-MM-DDTHH:MM:SSZ'
                timeZone
            },
            end: {
                dateTime: new Date(endDateTime).toISOString(), // Expecting date-time format 'YYYY-MM-DDTHH:MM:SSZ'
                timeZone
            },
            ...(isEnableRoutine && {
                recurrence: [
                    'RRULE:FREQ=DAILY'
                ],
            }),
            reminders: {
                useDefault: false,
                overrides: [
                    // { method: 'email', minutes: 24 * 60 }, // 1 day before
                    { method: 'popup', minutes: 1 },      // 10 minutes before
                ],
            }
        };

        const eventResponse = await calendar.events.insert({
            auth: googleOAuth2Client,
            calendarId: 'primary',
            sendUpdates: "all",
            requestBody: event,
        });

        return {
            message: 'Event created successfully',
            eventLink: eventResponse.data.htmlLink,
            id: eventResponse.data.id
        };
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException("error occur while process creating google calendar")
    }
  },
  getCalendarList: async () => {
    try {
      const calendar = google.calendar({ version: 'v3', auth: googleOAuth2Client });

      const calendarListResponse = await calendar.calendarList.list({
        auth: googleOAuth2Client,
      });

      return calendarListResponse.data.items || [];
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException("Error occurred while retrieving the calendar list from Google Calendar");
    }
  },
  getEventList: async () => {
    try {
      const calendar = google.calendar({ version: 'v3', auth: googleOAuth2Client });

      const calendarListResponse = await calendar.events.list({
        auth: googleOAuth2Client,
        calendarId: "primary"
      });

      return calendarListResponse.data.items || [];
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException("Error occurred while retrieving the calendar list from Google Calendar");
    }
  },
  getEvent: async (id: string) => {
    try {
      const calendar = google.calendar({ version: 'v3', auth: googleOAuth2Client });

      const calendarListResponse = await calendar.events.get({
        auth: googleOAuth2Client,
        calendarId: "primary",
        eventId: id
      });

      return calendarListResponse.data || {};
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException("Error occurred while retrieving the calendar list from Google Calendar");
    }
  },
  updateEvent: async (id: string, dataUpdate: calendarUpdate) => {
    try {
      const calendar = google.calendar({ version: 'v3', auth: googleOAuth2Client });

      const event = {
        ...dataUpdate,
        start: {
            dateTime: new Date(dataUpdate.startDateTime).toISOString(), // Expecting date-time format 'YYYY-MM-DDTHH:MM:SSZ'
            timeZone: dataUpdate?.timeZone || "Asia/Ho_Chi_Minh"
        },
        end: {
            dateTime: new Date(dataUpdate.endDateTime).toISOString(), // Expecting date-time format 'YYYY-MM-DDTHH:MM:SSZ'
            timeZone: dataUpdate?.timeZone || "Asia/Ho_Chi_Minh"
        },
        reminders: {
          useDefault: false,
          overrides: [
              // { method: 'email', minutes: 24 * 60 }, // 1 day before
              { method: 'popup', minutes: 1 },      // 10 minutes before
          ],
        }
      };

      const calendarListResponse = await calendar.events.update({
        auth: googleOAuth2Client,
        calendarId: "primary",
        eventId: id,
        requestBody: event
      });

      return {
        message: 'Event updated successfully',
        eventLink: calendarListResponse.data.htmlLink,
        id: calendarListResponse.data.id
    };
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException("Error occurred while retrieving the calendar list from Google Calendar");
    }
  },
  deleteCalendarEvent: async (eventId: string) => {
    try {
      const calendar = google.calendar({ version: 'v3', auth: googleOAuth2Client });

      await calendar.events.delete({
        auth: googleOAuth2Client,
        calendarId: 'primary',
        eventId: eventId,
      });

      return {
        message: 'Event deleted successfully',
      };
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException("Error occurred while processing the deletion of a Google Calendar event");
    }
  }
}
