import { NextResponse } from "next/server"
import { fetchGoogleCalendarList, googleCalendarConfigured } from "@/lib/google-calendar"

export async function GET() {
  if (!googleCalendarConfigured) {
    return NextResponse.json({ calendars: [], mock: true })
  }

  try {
    const calendars = await fetchGoogleCalendarList()
    return NextResponse.json({ calendars })
  } catch (error) {
    console.error("Google Calendar list API error:", error)
    return NextResponse.json({ calendars: [], error: "Calendar list fetch failed" }, { status: 502 })
  }
}
