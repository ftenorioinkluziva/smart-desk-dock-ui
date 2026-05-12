import { spotifyConfigured, spotifyControl, type SpotifyAction } from "@/lib/spotify"

export async function POST(req: Request) {
  if (!spotifyConfigured) {
    return Response.json({ error: "Spotify not configured" }, { status: 503 })
  }

  const { action, state, repeatState, volumePercent, deviceId, play, contextUri } = await req.json() as {
    action: SpotifyAction
    state?: boolean
    repeatState?: "track" | "context" | "off"
    volumePercent?: number
    deviceId?: string
    play?: boolean
    contextUri?: string
  }

  if (!["play", "pause", "next", "previous", "shuffle", "repeat", "volume", "transfer", "play-context"].includes(action)) {
    return Response.json({ error: "Invalid action" }, { status: 400 })
  }

  if (action === "repeat" && !["track", "context", "off"].includes(repeatState ?? "")) {
    return Response.json({ error: "Invalid repeat state" }, { status: 400 })
  }

  if (action === "volume" && (typeof volumePercent !== "number" || volumePercent < 0 || volumePercent > 100)) {
    return Response.json({ error: "Invalid action" }, { status: 400 })
  }

  if (action === "transfer" && !deviceId) {
    return Response.json({ error: "Invalid device" }, { status: 400 })
  }

  if (action === "play-context" && !contextUri?.startsWith("spotify:playlist:")) {
    return Response.json({ error: "Invalid context" }, { status: 400 })
  }

  try {
    await spotifyControl(action, { state, repeatState, volumePercent, deviceId, play, contextUri })
    return Response.json({ ok: true })
  } catch (err) {
    console.error("Spotify control error:", err)
    return Response.json({ error: "Playback control failed" }, { status: 502 })
  }
}
