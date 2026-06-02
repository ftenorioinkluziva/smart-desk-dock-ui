export class GoogleCalendarAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "GoogleCalendarAuthError"
  }
}

export function isGoogleCalendarAuthError(error: unknown): error is GoogleCalendarAuthError {
  return error instanceof GoogleCalendarAuthError
}

type GoogleCalendarEvent = {
  id: string
  summary?: string
  start?: {
    date?: string
    dateTime?: string
  }
  end?: {
    date?: string
    dateTime?: string
  }
}

type GoogleCalendarListItem = {
  id: string
  summary: string
  primary?: boolean
  backgroundColor?: string
  selected?: boolean
}

export type CalendarEvent = {
  id: string
  calendarId: string
  title: string
  date: string
  time: string
  startDateTime: string | null
  endDateTime: string | null
  isAllDay: boolean
  color: string
  completed: boolean
}

export type CalendarOption = {
  id: string
  name: string
  primary: boolean
  color: string | null
}

const EVENT_COLORS = ["bg-accent", "bg-chart-1", "bg-chart-2", "bg-chart-4", "bg-chart-5"]

function formatDateInTimezone(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)

  const year = parts.find((part) => part.type === "year")?.value
  const month = parts.find((part) => part.type === "month")?.value
  const day = parts.find((part) => part.type === "day")?.value

  return year && month && day ? `${year}-${month}-${day}` : date.toISOString().slice(0, 10)
}

function formatTimeRange(event: GoogleCalendarEvent, timezone: string): string {
  if (event.start?.date) return "Dia todo"

  const start = event.start?.dateTime ? new Date(event.start.dateTime) : null
  const end = event.end?.dateTime ? new Date(event.end.dateTime) : null

  if (!start || Number.isNaN(start.getTime())) return "Sem horário"

  const formatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })

  if (!end || Number.isNaN(end.getTime())) return formatter.format(start)
  return `${formatter.format(start)} - ${formatter.format(end)}`
}

export function normalizeCalendarEvent(event: GoogleCalendarEvent, index: number, calendarId: string, timezone: string): CalendarEvent | null {
  const dateValue = event.start?.date ?? event.start?.dateTime
  if (!dateValue) return null

  const isAllDay = Boolean(event.start?.date)
  const startDateTime = event.start?.dateTime ?? null
  const endDateTime = event.end?.dateTime ?? null

  return {
    id: `${calendarId}:${event.id}`,
    calendarId,
    title: event.summary?.trim() || "Sem título",
    date: event.start?.date ?? formatDateInTimezone(new Date(dateValue), timezone),
    time: formatTimeRange(event, timezone),
    startDateTime,
    endDateTime,
    isAllDay,
    color: EVENT_COLORS[index % EVENT_COLORS.length],
    completed: false,
  }
}

export async function fetchGoogleCalendarEvents({
  accessToken,
  calendarIds,
  timeMin,
  timeMax,
  timezone,
}: {
  accessToken: string
  calendarIds: string[]
  timeMin: string
  timeMax: string
  timezone: string
}): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
  })

  const calendarResults = await Promise.all(calendarIds.map(async (calendarId, calendarIndex) => {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        next: { revalidate: 300 },
      },
    )

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`Google Calendar request failed for ${calendarId}: ${response.status} ${errorBody}`)
    }

    const data = await response.json() as { items?: GoogleCalendarEvent[] }
    return (data.items ?? [])
      .map((event, eventIndex) => normalizeCalendarEvent(event, calendarIndex + eventIndex, calendarId, timezone))
      .filter((event): event is CalendarEvent => Boolean(event))
  }))

  return calendarResults
    .flat()
    .sort((a, b) => {
      const aTime = a.startDateTime ? new Date(a.startDateTime).getTime() : Number.MAX_SAFE_INTEGER
      const bTime = b.startDateTime ? new Date(b.startDateTime).getTime() : Number.MAX_SAFE_INTEGER
      return aTime - bTime
    })
}

export async function fetchGoogleCalendarList(accessToken: string): Promise<CalendarOption[]> {
  const response = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    next: { revalidate: 300 },
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Google Calendar list request failed: ${response.status} ${errorBody}`)
  }

  const data = await response.json() as { items?: GoogleCalendarListItem[] }
  return (data.items ?? [])
    .filter((calendar) => calendar.selected !== false)
    .map((calendar) => ({
      id: calendar.id,
      name: calendar.summary,
      primary: Boolean(calendar.primary),
      color: calendar.backgroundColor ?? null,
    }))
}
