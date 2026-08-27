import { NextResponse } from "next/server"
import { fetchHomeAssistantEntities } from "@/lib/home-assistant"
import { getIntegrationSecret } from "@/lib/integration-secrets"
import { isAuthResponse, requireCurrentUser } from "@/lib/current-user"
import { getUserProfile } from "@/lib/user-profile"
import { operationErrorResponse, unexpectedUpstreamOperationError } from "@/lib/http/operation-response"

export async function GET(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user

  const [url, token, profile] = await Promise.all([
    getIntegrationSecret(user.id, "home_assistant", "url"),
    getIntegrationSecret(user.id, "home_assistant", "token"),
    getUserProfile(user.id),
  ])

  if (!url || !token) {
    return NextResponse.json({ entities: [], configured: false })
  }

  try {
    const entities = await fetchHomeAssistantEntities(
      { url, token, entityIds: profile.homeAssistantEntityIds },
      { includeAll: true },
    )
    return NextResponse.json({ entities, configured: true })
  } catch (error) {
    const operationError = unexpectedUpstreamOperationError(error, "Home Assistant catalog fetch failed")
    console.error("Home Assistant catalog API error", { code: operationError.code, retryable: operationError.retryable })
    return operationErrorResponse(operationError, { extra: { entities: [] } })
  }
}
