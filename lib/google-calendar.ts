const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN
export const DEFAULT_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? "primary"
const CALENDAR_TIMEZONE = process.env.GOOGLE_CALENDAR_TIMEZONE ?? process.env.WEATHER_TIMEZONE ?? "America/Sao_Paulo"

export const googleCalendarConfigured = Boolean(CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN)

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

async function getAccessToken(): Promise<string> {
  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: REFRESH_TOKEN!,
    }),
  })

  if (!response.ok) {
    throw new Error("Google OAuth token refresh failed")
  }

  const data = await response.json() as { access_token?: string }
  if (!data.access_token) {
    throw new Error("Google OAuth response did not include an access token")
  }

  return data.access_token
}

function formatDateInTimezone(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CALENDAR_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)

  const year = parts.find((part) => part.type === "year")?.value
  const month = parts.find((part) => part.type === "month")?.value
  const day = parts.find((part) => part.type === "day")?.value

  return year && month && day ? `${year}-${month}-${day}` : date.toISOString().slice(0, 10)
}

function formatTimeRange(event: GoogleCalendarEvent): string {
  if (event.start?.date) return "Dia todo"

  const start = event.start?.dateTime ? new Date(event.start.dateTime) : null
  const end = event.end?.dateTime ? new Date(event.end.dateTime) : null

  if (!start || Number.isNaN(start.getTime())) return "Sem horário"

  const formatter = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })

  if (!end || Number.isNaN(end.getTime())) return formatter.format(start)
  return `${formatter.format(start)} - ${formatter.format(end)}`
}

export function normalizeCalendarEvent(event: GoogleCalendarEvent, index: number, calendarId: string): CalendarEvent | null {
  const dateValue = event.start?.date ?? event.start?.dateTime
  if (!dateValue) return null

  const isAllDay = Boolean(event.start?.date)
  const startDateTime = event.start?.dateTime ?? null
  const endDateTime = event.end?.dateTime ?? null

  return {
    id: `${calendarId}:${event.id}`,
    calendarId,
    title: event.summary?.trim() || "Sem título",
    date: event.start?.date ?? formatDateInTimezone(new Date(dateValue)),
    time: formatTimeRange(event),
    startDateTime,
    endDateTime,
    isAllDay,
    color: EVENT_COLORS[index % EVENT_COLORS.length],
    completed: false,
  }
}

export async function fetchGoogleCalendarEvents({
  calendarIds,
  timeMin,
  timeMax,
}: {
  calendarIds: string[]
  timeMin: string
  timeMax: string
}): Promise<CalendarEvent[]> {
  const token = await getAccessToken()
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
          Authorization: `Bearer ${token}`,
        },
        next: { revalidate: 300 },
      },
    )

    if (!response.ok) {
      throw new Error(`Google Calendar request failed for ${calendarId}: ${response.status}`)
    }

    const data = await response.json() as { items?: GoogleCalendarEvent[] }
    return (data.items ?? [])
      .map((event, eventIndex) => normalizeCalendarEvent(event, calendarIndex + eventIndex, calendarId))
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

export async function fetchGoogleCalendarList(): Promise<CalendarOption[]> {
  const token = await getAccessToken()
  const response = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    next: { revalidate: 300 },
  })

  if (!response.ok) {
    throw new Error(`Google Calendar list request failed: ${response.status}`)
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
