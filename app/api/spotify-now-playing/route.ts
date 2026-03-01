import { getAccessToken, spotifyConfigured } from "@/lib/spotify"

export async function GET() {
  if (!spotifyConfigured) {
    return Response.json({
      isPlaying: false,
      track: null,
      artist: null,
      albumArt: null,
      mock: true,
    })
  }

  try {
    const token = await getAccessToken()
    const res = await fetch(
      "https://api.spotify.com/v1/me/player/currently-playing",
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (res.status === 204) {
      return Response.json({ isPlaying: false, track: null, artist: null, albumArt: null })
    }

    if (!res.ok) throw new Error(`Spotify error: ${res.status}`)

    const data = await res.json() as {
      is_playing: boolean
      item?: {
        name: string
        artists: Array<{ name: string }>
        album: { images: Array<{ url: string }> }
      }
    }

    return Response.json({
      isPlaying: data.is_playing,
      track:     data.item?.name                       ?? null,
      artist:    data.item?.artists?.[0]?.name         ?? null,
      albumArt:  data.item?.album?.images?.[0]?.url    ?? null,
    })
  } catch {
    return Response.json({ isPlaying: false, track: null, artist: null, albumArt: null })
  }
}
