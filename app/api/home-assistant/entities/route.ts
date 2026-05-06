import { NextResponse } from "next/server"
import { fetchHomeAssistantEntities, homeAssistantConfigured } from "@/lib/home-assistant"

export async function GET() {
  if (!homeAssistantConfigured) {
    return NextResponse.json({ entities: [], mock: true })
  }

  try {
    const entities = await fetchHomeAssistantEntities()
    return NextResponse.json({ entities })
  } catch (error) {
    console.error("Home Assistant entities API error:", error)
    return NextResponse.json({ entities: [], error: "Home Assistant fetch failed" }, { status: 502 })
  }
}
