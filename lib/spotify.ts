// Shared Spotify Web API helpers.
// Required env vars (set in .env.local):
//   SPOTIFY_CLIENT_ID      — from developer.spotify.com
//   SPOTIFY_CLIENT_SECRET  — from developer.spotify.com
//   SPOTIFY_REFRESH_TOKEN  — obtained once via Authorization Code flow

const CLIENT_ID     = process.env.SPOTIFY_CLIENT_ID
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET
const REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN

export const spotifyConfigured =
  Boolean(CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN)

/** Exchange the stored refresh token for a short-lived access token. */
export async function getAccessToken(): Promise<string> {
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

export type SpotifyAction = "play" | "pause" | "next" | "previous"

const CONTROL_ENDPOINTS: Record<SpotifyAction, { url: string; method: string }> = {
  play:     { url: "https://api.spotify.com/v1/me/player/play",     method: "PUT"  },
  pause:    { url: "https://api.spotify.com/v1/me/player/pause",    method: "PUT"  },
  next:     { url: "https://api.spotify.com/v1/me/player/next",     method: "POST" },
  previous: { url: "https://api.spotify.com/v1/me/player/previous", method: "POST" },
}

/** Send a playback command to the Spotify Web API (requires Premium). */
export async function spotifyControl(action: SpotifyAction): Promise<void> {
  const token = await getAccessToken()
  const { url, method } = CONTROL_ENDPOINTS[action]
  await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}` },
  })
}
