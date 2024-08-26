export type calendarCreate = {
    summary: string, 
    description: string,
    colorId: string | null,
    startDateTime: string,
    endDateTime: string,
    timeZone: string
}

export type calendarUpdate = {
    summary?: string, 
    description?: string,
    colorId?: string | null,
    startDateTime: string,
    endDateTime: string,
    timeZone?: string
  }