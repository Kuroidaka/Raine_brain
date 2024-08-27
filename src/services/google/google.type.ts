export type calendarCreate = {
    summary: string, 
    description: string,
    colorId: string | null,
    startDateTime: string | Date,
    endDateTime: string | Date,
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

export type taskCreate = {
    note: string,
    status: "needsAction" | "completed",
    title: string,
    due: string,
}