import { NextResponse } from "next/server"
import { deleteIntegrationSecret, getIntegrationStatus, setIntegrationSecret } from "@/lib/integration-secrets"
import { isAuthResponse, requireCurrentUser } from "@/lib/current-user"
import { operationErrorResponse, parseJsonBody } from "@/lib/http/operation-response"
import { openAiSettingsSchema } from "@/lib/operations/contracts"

export async function GET(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user

  const keys = await getIntegrationStatus(user.id, "openai")
  return NextResponse.json({ configured: keys.has("api_key") })
}

export async function PATCH(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user

  const parsed = await parseJsonBody(request, openAiSettingsSchema)
  if (!parsed.ok) return operationErrorResponse(parsed.error)

  await setIntegrationSecret(user.id, "openai", "api_key", parsed.value.apiKey)
  return NextResponse.json({ configured: true })
}

export async function DELETE(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user

  await deleteIntegrationSecret(user.id, "openai", "api_key")
  return NextResponse.json({ configured: false })
}
