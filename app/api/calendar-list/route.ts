import { NextResponse } from "next/server"
import { fetchGoogleCalendarList } from "@/lib/google-calendar"
import { getGoogleAccessToken } from "@/lib/google-oauth"
import { isAuthResponse, requireCurrentUser } from "@/lib/current-user"
import { operationErrorResponse, unexpectedUpstreamOperationError } from "@/lib/http/operation-response"

export async function GET(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user

  const accessToken = await getGoogleAccessToken(request, user.id)
  if (!accessToken) {
    return operationErrorResponse({
      code: "GOOGLE_CALENDAR_AUTH_REQUIRED",
      category: "authorization",
      message: "Google Calendar authorization is required",
      retryable: false,
    }, { status: 403, extra: { calendars: [], calendarAuthRequired: true } })
  }

  try {
    const calendars = await fetchGoogleCalendarList(accessToken)
    return NextResponse.json({ calendars })
  } catch (error) {
    const operationError = unexpectedUpstreamOperationError(error, "Calendar list fetch failed")
    console.error("Google Calendar list API error", { code: operationError.code, retryable: operationError.retryable })
    return operationErrorResponse(operationError, { extra: { calendars: [] } })
  }
}
