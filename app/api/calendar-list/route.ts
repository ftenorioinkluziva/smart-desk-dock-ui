import { NextResponse } from "next/server"
import {
  fetchGoogleCalendarList,
  googleCalendarConfigured,
  isGoogleCalendarAuthError,
} from "@/lib/google-calendar"

export async function GET() {
  if (!googleCalendarConfigured) {
    return NextResponse.json({ calendars: [], mock: true })
  }

  try {
    const calendars = await fetchGoogleCalendarList()
    return NextResponse.json({ calendars })
  } catch (error) {
    if (isGoogleCalendarAuthError(error)) {
      console.warn("Google Calendar authorization expired. Generate a new GOOGLE_REFRESH_TOKEN.")
      return NextResponse.json(
        {
          calendars: [],
          authExpired: true,
          error: "Google Calendar authorization expired. Generate a new GOOGLE_REFRESH_TOKEN.",
        },
        { status: 401 },
      )
    }

    console.error("Google Calendar list API error:", error)
    return NextResponse.json({ calendars: [], error: "Calendar list fetch failed" }, { status: 502 })
  }
}
