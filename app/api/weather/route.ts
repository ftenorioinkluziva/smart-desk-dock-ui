import { NextResponse } from "next/server"
import { isAuthResponse, requireCurrentUser } from "@/lib/current-user"
import { getUserProfile } from "@/lib/user-profile"
import { getWeatherFallback, getWeatherForecast } from "@/lib/operations/weather"
import { unexpectedUpstreamOperationError } from "@/lib/http/operation-response"

export async function GET(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user

  const includeHourly = new URL(request.url).searchParams.get("hourly") === "true"
  const profile = await getUserProfile(user.id)

  try {
    return NextResponse.json(await getWeatherForecast(profile, includeHourly))
  } catch (error) {
    const operationError = unexpectedUpstreamOperationError(error, "Weather request failed")
    console.error("Weather operation failed", { code: operationError.code, retryable: operationError.retryable })
    return NextResponse.json({
      ...getWeatherFallback(profile.weatherLocation, includeHourly),
      operationError,
    })
  }
}
