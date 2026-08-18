import { NextResponse } from "next/server"
import { fetchGoogleCalendarEvents } from "@/lib/google-calendar"
import { getGoogleAccessToken } from "@/lib/google-oauth"
import { isAuthResponse, requireCurrentUser } from "@/lib/current-user"
import { getUserProfile } from "@/lib/user-profile"
import { calendarEventsQuerySchema } from "@/lib/operations/contracts"
import { operationErrorResponse, unexpectedUpstreamOperationError } from "@/lib/http/operation-response"
import { validationError } from "@/lib/operations/errors"

export async function GET(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user

  const { searchParams } = new URL(request.url)
  const parsedQuery = calendarEventsQuerySchema.safeParse({
    timeMin: searchParams.get("timeMin"),
    timeMax: searchParams.get("timeMax"),
    calendarIds: searchParams.getAll("calendarId").filter(Boolean),
  })
  if (!parsedQuery.success) {
    return operationErrorResponse(validationError("Calendar query is invalid", parsedQuery.error.issues.map((issue) => issue.path.join("."))))
  }

  const accessToken = await getGoogleAccessToken(request, user.id)
  if (!accessToken) {
    return operationErrorResponse({
      code: "GOOGLE_CALENDAR_AUTH_REQUIRED",
      category: "authorization",
      message: "Google Calendar authorization is required",
      retryable: false,
    }, { status: 403, extra: { events: [], calendarAuthRequired: true } })
  }

  const profile = await getUserProfile(user.id)
  const { timeMin, timeMax, calendarIds: requestedCalendarIds } = parsedQuery.data
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
    const operationError = unexpectedUpstreamOperationError(error, "Calendar fetch failed")
    console.error("Google Calendar API error", { code: operationError.code, retryable: operationError.retryable })
    return operationErrorResponse(operationError, { extra: { events: [] } })
  }
}
