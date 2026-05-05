import { NextResponse } from "next/server"

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN

const googleCalendarConfigured = Boolean(CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN)

type GoogleCalendarListItem = {
  id: string
  summary: string
  primary?: boolean
  backgroundColor?: string
  selected?: boolean
}

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

export async function GET() {
  if (!googleCalendarConfigured) {
    return NextResponse.json({ calendars: [], mock: true })
  }

  try {
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
    const calendars = (data.items ?? [])
      .filter((calendar) => calendar.selected !== false)
      .map((calendar) => ({
        id: calendar.id,
        name: calendar.summary,
        primary: Boolean(calendar.primary),
        color: calendar.backgroundColor ?? null,
      }))

    return NextResponse.json({ calendars })
  } catch (error) {
    console.error("Google Calendar list API error:", error)
    return NextResponse.json({ calendars: [], error: "Calendar list fetch failed" }, { status: 502 })
  }
}
