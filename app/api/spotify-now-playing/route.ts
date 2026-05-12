import { getAccessToken, spotifyConfigured } from "@/lib/spotify"

export async function GET() {
  if (!spotifyConfigured) {
    return Response.json({
      isPlaying: false,
      track: null,
      artist: null,
      albumArt: null,
      album: null,
      deviceName: null,
      deviceType: null,
      volumePercent: null,
      shuffle: false,
      repeat: "off",
      progressMs: 0,
      durationMs: 0,
      mock: true,
    })
  }

  try {
    const token = await getAccessToken()
    const res = await fetch(
      "https://api.spotify.com/v1/me/player",
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (res.status === 204) {
      return Response.json({
        isPlaying: false,
        track: null,
        artist: null,
        albumArt: null,
        album: null,
        deviceName: null,
        deviceType: null,
        volumePercent: null,
        shuffle: false,
        repeat: "off",
        progressMs: 0,
        durationMs: 0,
      })
    }

    if (!res.ok) throw new Error(`Spotify error: ${res.status}`)

    const data = await res.json() as {
      is_playing: boolean
      shuffle_state?: boolean
      repeat_state?: "off" | "track" | "context"
      progress_ms?: number
      device?: {
        name?: string
        type?: string
        volume_percent?: number | null
      }
      item?: {
        name: string
        artists: Array<{ name: string }>
        duration_ms?: number
        album: {
          name?: string
          images: Array<{ url: string }>
        }
      }
    }

    return Response.json({
      isPlaying: data.is_playing,
      track:     data.item?.name                       ?? null,
      artist:    data.item?.artists?.[0]?.name         ?? null,
      albumArt:  data.item?.album?.images?.[0]?.url    ?? null,
      album:     data.item?.album?.name                ?? null,
      deviceName: data.device?.name                    ?? null,
      deviceType: data.device?.type                    ?? null,
      volumePercent: data.device?.volume_percent       ?? null,
      shuffle:   data.shuffle_state                    ?? false,
      repeat:    data.repeat_state                     ?? "off",
      progressMs: data.progress_ms                     ?? 0,
      durationMs: data.item?.duration_ms               ?? 0,
    })
  } catch {
    return Response.json({
      isPlaying: false,
      track: null,
      artist: null,
      albumArt: null,
      album: null,
      deviceName: null,
      deviceType: null,
      volumePercent: null,
      shuffle: false,
      repeat: "off",
      progressMs: 0,
      durationMs: 0,
    })
  }
}
