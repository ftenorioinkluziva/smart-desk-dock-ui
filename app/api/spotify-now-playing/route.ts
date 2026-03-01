// Spotify "Now Playing" serverless route.
// Set these env vars to enable real Spotify integration:
//   SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN
//
// To get a refresh token for a personal account, follow the Authorization Code
// flow once and store the resulting refresh_token as an env var.

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET
const REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN

async function getAccessToken(): Promise<string> {
  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: REFRESH_TOKEN!,
    }),
  })
  const data = await res.json() as { access_token: string }
  return data.access_token
}

export async function GET() {
  // Return static mock when Spotify env vars are not configured
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    return Response.json({
      isPlaying: false,
      track: "Midnight City",
      artist: "M83",
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

    // 204 = nothing playing
    if (res.status === 204) {
      return Response.json({ isPlaying: false, track: null, artist: null, albumArt: null })
    }

    if (!res.ok) {
      throw new Error(`Spotify error: ${res.status}`)
    }

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
      track: data.item?.name ?? null,
      artist: data.item?.artists?.[0]?.name ?? null,
      albumArt: data.item?.album?.images?.[0]?.url ?? null,
    })
  } catch {
    return Response.json({ isPlaying: false, track: null, artist: null, albumArt: null })
  }
}
