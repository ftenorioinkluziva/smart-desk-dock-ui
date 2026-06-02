import { NextResponse } from "next/server"
import { fetchGoogleCalendarEvents } from "@/lib/google-calendar"
import { getGoogleAccessToken } from "@/lib/google-oauth"
import { isAuthResponse, requireCurrentUser } from "@/lib/current-user"
import { getUserProfile } from "@/lib/user-profile"

export async function GET(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user

  const { searchParams } = new URL(request.url)
  const timeMin = searchParams.get("timeMin")
  const timeMax = searchParams.get("timeMax")

  if (!timeMin || !timeMax) {
    return NextResponse.json({ error: "Missing timeMin or timeMax" }, { status: 400 })
  }

  const accessToken = await getGoogleAccessToken(request, user.id)
  if (!accessToken) {
    return NextResponse.json({ events: [], calendarAuthRequired: true }, { status: 403 })
  }

  const profile = await getUserProfile(user.id)
  const requestedCalendarIds = searchParams.getAll("calendarId").filter(Boolean)
  const calendarIds = requestedCalendarIds.length > 0 ? requestedCalendarIds : profile.googleCalendarIds

  try {
    const events = await fetchGoogleCalendarEvents({
      accessToken,
      calendarIds,
      timeMin,
      timeMax,
      timezone: profile.googleCalendarTimezone,
    })
    return NextResponse.json({ events })
  } catch (error) {
    console.error("Google Calendar API error:", error)
    return NextResponse.json({ events: [], error: "Calendar fetch failed" }, { status: 502 })
  }
}

