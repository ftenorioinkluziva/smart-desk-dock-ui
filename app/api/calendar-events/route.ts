import { NextResponse } from "next/server"

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? "primary"

const googleCalendarConfigured = Boolean(CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN)

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
  colorId?: string
}

type CalendarEvent = {
  id: string
  title: string
  date: string
  time: string
  color: string
  completed: boolean
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

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
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

function normalizeEvent(event: GoogleCalendarEvent, index: number): CalendarEvent | null {
  const dateValue = event.start?.date ?? event.start?.dateTime
  if (!dateValue) return null

  return {
    id: event.id,
    title: event.summary?.trim() || "Sem titulo",
    date: event.start?.date ?? formatDate(new Date(dateValue)),
    time: formatTimeRange(event),
    color: EVENT_COLORS[index % EVENT_COLORS.length],
    completed: false,
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const timeMin = searchParams.get("timeMin")
  const timeMax = searchParams.get("timeMax")

  if (!googleCalendarConfigured) {
    return NextResponse.json({ events: [], mock: true })
  }

  if (!timeMin || !timeMax) {
    return NextResponse.json({ error: "Missing timeMin or timeMax" }, { status: 400 })
  }

  try {
    const token = await getAccessToken()
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: "true",
      orderBy: "startTime",
    })

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        next: { revalidate: 300 },
      },
    )

    if (!response.ok) {
      throw new Error(`Google Calendar request failed: ${response.status}`)
    }

    const data = await response.json() as { items?: GoogleCalendarEvent[] }
    const events = (data.items ?? [])
      .map(normalizeEvent)
      .filter((event): event is CalendarEvent => Boolean(event))

    return NextResponse.json({ events })
  } catch (error) {
    console.error("Google Calendar API error:", error)
    return NextResponse.json({ events: [], error: "Calendar fetch failed" }, { status: 502 })
  }
}
