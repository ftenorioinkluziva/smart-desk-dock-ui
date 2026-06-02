import { NextResponse } from "next/server"
import { fetchGoogleCalendarList } from "@/lib/google-calendar"
import { getGoogleAccessToken } from "@/lib/google-oauth"
import { isAuthResponse, requireCurrentUser } from "@/lib/current-user"

export async function GET(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user

  const accessToken = await getGoogleAccessToken(request, user.id)
  if (!accessToken) {
    return NextResponse.json({ calendars: [], calendarAuthRequired: true }, { status: 403 })
  }

  try {
    const calendars = await fetchGoogleCalendarList(accessToken)
    return NextResponse.json({ calendars })
  } catch (error) {
    console.error("Google Calendar list API error:", error)
    return NextResponse.json({ calendars: [], error: "Calendar list fetch failed" }, { status: 502 })
  }
}

