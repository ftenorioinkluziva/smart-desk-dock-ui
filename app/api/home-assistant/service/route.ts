import { NextResponse } from "next/server"
import { callHomeAssistantService, type HomeAssistantColorCommand } from "@/lib/home-assistant"
import { getIntegrationSecret } from "@/lib/integration-secrets"
import { isAuthResponse, requireCurrentUser } from "@/lib/current-user"
import { getUserProfile } from "@/lib/user-profile"

export async function POST(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user

  const [url, token, profile] = await Promise.all([
    getIntegrationSecret(user.id, "home_assistant", "url"),
    getIntegrationSecret(user.id, "home_assistant", "token"),
    getUserProfile(user.id),
  ])

  if (!url || !token) {
    return NextResponse.json({ error: "Home Assistant is not configured", configured: false, mock: true }, { status: 503 })
  }

  try {
    const body = await request.json() as {
      entityId?: string
      action?: "toggle" | "turn_on" | "turn_off" | "open_cover" | "close_cover" | "stop_cover"
      brightness?: number
      color?: HomeAssistantColorCommand
    }

    if (!body.entityId || !body.action) {
      return NextResponse.json({ error: "Missing entityId or action" }, { status: 400 })
    }

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
    console.error("Home Assistant service API error:", error)
    return NextResponse.json({ error: "Home Assistant command failed" }, { status: 502 })
  }
}
