import { NextResponse } from "next/server"
import { deleteIntegrationSecret, getIntegrationStatus, setIntegrationSecret } from "@/lib/integration-secrets"
import { isAuthResponse, requireCurrentUser } from "@/lib/current-user"

export async function GET(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user

  const keys = await getIntegrationStatus(user.id, "openai")
  return NextResponse.json({ configured: keys.has("api_key") })
}

export async function PATCH(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user

  const body = await request.json() as { apiKey?: string }
  const apiKey = body.apiKey?.trim()
  if (!apiKey) {
    return NextResponse.json({ error: "API key is required" }, { status: 400 })
  }

  await setIntegrationSecret(user.id, "openai", "api_key", apiKey)
  return NextResponse.json({ configured: true })
}

export async function DELETE(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user

  await deleteIntegrationSecret(user.id, "openai", "api_key")
  return NextResponse.json({ configured: false })
}

