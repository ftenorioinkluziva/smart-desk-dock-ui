import { NextResponse } from "next/server"
import { DEFAULT_CALENDAR_ID, fetchGoogleCalendarEvents, googleCalendarConfigured } from "@/lib/google-calendar"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const timeMin = searchParams.get("timeMin")
  const timeMax = searchParams.get("timeMax")
  const requestedCalendarIds = searchParams.getAll("calendarId").filter(Boolean)
  const calendarIds = requestedCalendarIds.length > 0 ? requestedCalendarIds : [DEFAULT_CALENDAR_ID]

  if (!googleCalendarConfigured) {
    return NextResponse.json({ events: [], mock: true })
  }

  if (!timeMin || !timeMax) {
    return NextResponse.json({ error: "Missing timeMin or timeMax" }, { status: 400 })
  }

  try {
    const events = await fetchGoogleCalendarEvents({
      calendarIds,
      timeMin,
      timeMax,
    })
    return NextResponse.json({ events })
  } catch (error) {
    console.error("Google Calendar API error:", error)
    return NextResponse.json({ events: [], error: "Calendar fetch failed" }, { status: 502 })
  }
}
