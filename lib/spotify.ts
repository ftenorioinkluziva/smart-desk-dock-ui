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

export type SpotifyAction =
  | "play"
  | "pause"
  | "next"
  | "previous"
  | "shuffle"
  | "repeat"
  | "volume"
  | "transfer"
  | "play-context"

const CONTROL_ENDPOINTS: Record<Exclude<SpotifyAction, "shuffle" | "repeat" | "volume" | "transfer" | "play-context">, { url: string; method: string }> = {
  play:     { url: "https://api.spotify.com/v1/me/player/play",     method: "PUT"  },
  pause:    { url: "https://api.spotify.com/v1/me/player/pause",    method: "PUT"  },
  next:     { url: "https://api.spotify.com/v1/me/player/next",     method: "POST" },
  previous: { url: "https://api.spotify.com/v1/me/player/previous", method: "POST" },
}

/** Send a playback command to the Spotify Web API (requires Premium). */
export async function spotifyControl(
  action: SpotifyAction,
  options: {
    state?: boolean
    repeatState?: "track" | "context" | "off"
    volumePercent?: number
    deviceId?: string
    play?: boolean
    contextUri?: string
  } = {}
): Promise<void> {
  const token = await getAccessToken()
  const endpoint =
    action === "shuffle"
      ? {
          url: `https://api.spotify.com/v1/me/player/shuffle?state=${options.state ? "true" : "false"}`,
          method: "PUT",
        }
      : action === "repeat"
        ? {
            url: `https://api.spotify.com/v1/me/player/repeat?state=${options.repeatState ?? "off"}`,
            method: "PUT",
          }
        : action === "volume"
          ? {
              url: `https://api.spotify.com/v1/me/player/volume?volume_percent=${Math.min(
                100,
                Math.max(0, Math.round(options.volumePercent ?? 0))
              )}`,
              method: "PUT",
            }
          : action === "transfer"
            ? { url: "https://api.spotify.com/v1/me/player", method: "PUT" }
            : action === "play-context"
              ? {
                  url: options.deviceId
                    ? `https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(options.deviceId)}`
                    : "https://api.spotify.com/v1/me/player/play",
                  method: "PUT",
                }
          : CONTROL_ENDPOINTS[action]
  const { url, method } = endpoint
  await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(action === "transfer" || action === "play-context" ? { "Content-Type": "application/json" } : {}),
    },
    body:
      action === "transfer"
        ? JSON.stringify({ device_ids: [options.deviceId], play: options.play ?? true })
        : action === "play-context"
          ? JSON.stringify({ context_uri: options.contextUri, position_ms: 0 })
        : undefined,
  })
}
