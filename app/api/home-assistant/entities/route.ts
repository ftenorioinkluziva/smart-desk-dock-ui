import { NextResponse } from "next/server"
import { fetchHomeAssistantEntities } from "@/lib/home-assistant"
import { getIntegrationSecret } from "@/lib/integration-secrets"
import { isAuthResponse, requireCurrentUser } from "@/lib/current-user"
import { getUserProfile } from "@/lib/user-profile"

export async function GET(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user

  const [url, token, profile] = await Promise.all([
    getIntegrationSecret(user.id, "home_assistant", "url"),
    getIntegrationSecret(user.id, "home_assistant", "token"),
    getUserProfile(user.id),
  ])

  if (!url || !token) {
    return NextResponse.json({ entities: [], configured: false, mock: true })
  }

  try {
    const entities = await fetchHomeAssistantEntities({
      url,
      token,
      entityIds: profile.homeAssistantEntityIds,
    })
    return NextResponse.json({ entities })
  } catch (error) {
    console.error("Home Assistant entities API error:", error)
    return NextResponse.json({ entities: [], error: "Home Assistant fetch failed" }, { status: 502 })
  }
}
