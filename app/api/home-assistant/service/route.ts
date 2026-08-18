import { NextResponse } from "next/server"
import { callHomeAssistantService } from "@/lib/home-assistant"
import { getIntegrationSecret } from "@/lib/integration-secrets"
import { isAuthResponse, requireCurrentUser } from "@/lib/current-user"
import { getUserProfile } from "@/lib/user-profile"
import { operationErrorResponse, parseJsonBody, unexpectedUpstreamOperationError } from "@/lib/http/operation-response"
import { homeAssistantServiceInputSchema } from "@/lib/operations/contracts"
import { upstreamError } from "@/lib/operations/errors"

export async function POST(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user

  const [url, token, profile] = await Promise.all([
    getIntegrationSecret(user.id, "home_assistant", "url"),
    getIntegrationSecret(user.id, "home_assistant", "token"),
    getUserProfile(user.id),
  ])

  if (!url || !token) {
    return operationErrorResponse(
      upstreamError("HOME_ASSISTANT_NOT_CONFIGURED", "Home Assistant is not configured", { retryable: false }),
      { status: 503, extra: { configured: false, mock: true } },
    )
  }

  try {
    const parsed = await parseJsonBody(request, homeAssistantServiceInputSchema)
    if (!parsed.ok) return operationErrorResponse(parsed.error)
    const body = parsed.value

    await callHomeAssistantService(
      { url, token, entityIds: profile.homeAssistantEntityIds },
      {
        entityId: body.entityId,
        action: body.action,
        brightness: body.brightness,
        color: body.color,
      },
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    const operationError = unexpectedUpstreamOperationError(error, "Home Assistant command failed")
    console.error("Home Assistant service API error", { code: operationError.code, retryable: operationError.retryable })
    return operationErrorResponse(operationError)
  }
}
