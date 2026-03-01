import { spotifyConfigured, spotifyControl, type SpotifyAction } from "@/lib/spotify"

export async function POST(req: Request) {
  if (!spotifyConfigured) {
    return Response.json({ error: "Spotify not configured" }, { status: 503 })
  }

  const { action } = await req.json() as { action: SpotifyAction }

  if (!["play", "pause", "next", "previous"].includes(action)) {
    return Response.json({ error: "Invalid action" }, { status: 400 })
  }

  try {
    await spotifyControl(action)
    return Response.json({ ok: true })
  } catch (err) {
    console.error("Spotify control error:", err)
    return Response.json({ error: "Playback control failed" }, { status: 502 })
  }
}
