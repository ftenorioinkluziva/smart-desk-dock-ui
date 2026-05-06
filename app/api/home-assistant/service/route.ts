import { NextResponse } from "next/server"
import { callHomeAssistantService, homeAssistantConfigured, type HomeAssistantColorCommand } from "@/lib/home-assistant"

export async function POST(request: Request) {
  if (!homeAssistantConfigured) {
    return NextResponse.json({ error: "Home Assistant is not configured", mock: true }, { status: 503 })
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

    await callHomeAssistantService({
      entityId: body.entityId,
      action: body.action,
      brightness: body.brightness,
      color: body.color,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Home Assistant service API error:", error)
    return NextResponse.json({ error: "Home Assistant command failed" }, { status: 502 })
  }
}
