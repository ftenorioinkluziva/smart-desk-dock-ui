import { NextResponse } from "next/server"
import { deleteIntegrationProvider, getIntegrationSecret, getIntegrationStatus, setIntegrationSecret } from "@/lib/integration-secrets"
import { isAuthResponse, requireCurrentUser } from "@/lib/current-user"
import { getUserProfile, updateUserProfile } from "@/lib/user-profile"

export async function GET(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user

  const keys = await getIntegrationStatus(user.id, "home_assistant")
  const profile = await getUserProfile(user.id)
  return NextResponse.json({
    configured: keys.has("url") && keys.has("token"),
    hasUrl: keys.has("url"),
    hasToken: keys.has("token"),
    entityIds: profile.homeAssistantEntityIds,
  })
}

export async function PATCH(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user

  const body = await request.json() as {
    url?: string
    token?: string
    entityIds?: string[]
  }

  if (body.url?.trim()) await setIntegrationSecret(user.id, "home_assistant", "url", body.url.trim())
  if (body.token?.trim()) await setIntegrationSecret(user.id, "home_assistant", "token", body.token.trim())
  if (Array.isArray(body.entityIds)) {
    await updateUserProfile(user.id, { homeAssistantEntityIds: body.entityIds })
  }

  const url = await getIntegrationSecret(user.id, "home_assistant", "url")
  const token = await getIntegrationSecret(user.id, "home_assistant", "token")
  const profile = await getUserProfile(user.id)

  return NextResponse.json({
    configured: Boolean(url && token),
    hasUrl: Boolean(url),
    hasToken: Boolean(token),
    entityIds: profile.homeAssistantEntityIds,
  })
}

export async function DELETE(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user

  await deleteIntegrationProvider(user.id, "home_assistant")
  return NextResponse.json({ configured: false, hasUrl: false, hasToken: false })
}

