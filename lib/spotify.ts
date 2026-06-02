import { createHmac, randomBytes, timingSafeEqual } from "crypto"
import {
  deleteIntegrationProvider,
  getIntegrationSecret,
  setIntegrationSecret,
} from "@/lib/integration-secrets"

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET
const REDIRECT_ORIGIN = process.env.SPOTIFY_REDIRECT_ORIGIN

export const spotifyAppConfigured = Boolean(CLIENT_ID && CLIENT_SECRET)

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

type SpotifyTokenResponse = {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  error?: string
}

type SpotifyOAuthState = {
  exp: number
  nonce: string
  returnOrigin: string
  userId: string
}

export type SpotifyAuthStatus = {
  appConfigured: boolean
  connected: boolean
  displayName: string | null
}

function getBasicAuth() {
  return Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")
}

function getStateSecret() {
  return process.env.BETTER_AUTH_SECRET ?? process.env.APP_ENCRYPTION_KEY ?? "focus-dock-development-secret-change-me"
}

function signState(payload: string) {
  return createHmac("sha256", getStateSecret()).update(payload).digest("base64url")
}

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a)
  const bBuffer = Buffer.from(b)
  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer)
}

export function createSpotifyOAuthState(userId: string, returnOrigin: string) {
  const payload: SpotifyOAuthState = {
    exp: Date.now() + 10 * 60 * 1000,
    nonce: randomBytes(18).toString("base64url"),
    returnOrigin,
    userId,
  }
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url")
  return `${encodedPayload}.${signState(encodedPayload)}`
}

export function verifySpotifyOAuthState(state: string) {
  const [encodedPayload, signature] = state.split(".")
  if (!encodedPayload || !signature || !safeEqual(signature, signState(encodedPayload))) return null

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SpotifyOAuthState
    if (!payload.userId || !payload.returnOrigin || payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

export function getSpotifyRedirectOrigin(requestOrigin: string) {
  if (REDIRECT_ORIGIN) return REDIRECT_ORIGIN.replace(/\/$/, "")
  if (requestOrigin === "http://localhost:3000") return "http://127.0.0.1:3000"
  return requestOrigin.replace(/\/$/, "")
}

export function getSpotifyRedirectUri(requestOrigin: string) {
  return `${getSpotifyRedirectOrigin(requestOrigin)}/api/spotify/auth/callback`
}

export function getSpotifyAuthorizeUrl({ origin, state }: { origin: string; state: string }) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID ?? "",
    response_type: "code",
    redirect_uri: getSpotifyRedirectUri(origin),
    scope: [
      "user-read-playback-state",
      "user-modify-playback-state",
      "playlist-read-private",
    ].join(" "),
    state,
    show_dialog: "true",
  })

  return `https://accounts.spotify.com/authorize?${params.toString()}`
}

export async function exchangeSpotifyCode(origin: string, code: string) {
  if (!spotifyAppConfigured) throw new Error("Spotify app is not configured")

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${getBasicAuth()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: getSpotifyRedirectUri(origin),
    }),
  })

  const data = await response.json() as SpotifyTokenResponse
  if (!response.ok || !data.access_token || !data.refresh_token) {
    throw new Error(`Spotify code exchange failed: ${response.status} ${data.error ?? ""}`)
  }

  return data
}

export async function refreshSpotifyAccessToken(userId: string) {
  if (!spotifyAppConfigured) throw new Error("Spotify app is not configured")

  const refreshToken = await getIntegrationSecret(userId, "spotify", "refresh_token")
  if (!refreshToken) return null

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${getBasicAuth()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  })

  const data = await response.json() as SpotifyTokenResponse
  if (!response.ok || !data.access_token) {
    await deleteIntegrationProvider(userId, "spotify")
    return null
  }

  if (data.refresh_token) {
    await setIntegrationSecret(userId, "spotify", "refresh_token", data.refresh_token)
  }

  return data.access_token
}

export async function getSpotifyAuthStatus(userId: string): Promise<SpotifyAuthStatus> {
  const refreshToken = await getIntegrationSecret(userId, "spotify", "refresh_token")
  const displayName = await getIntegrationSecret(userId, "spotify", "display_name")
  return {
    appConfigured: spotifyAppConfigured,
    connected: Boolean(refreshToken),
    displayName,
  }
}

export async function saveSpotifyConnection(userId: string, token: SpotifyTokenResponse) {
  if (!token.refresh_token) throw new Error("Spotify refresh token missing")
  await setIntegrationSecret(userId, "spotify", "refresh_token", token.refresh_token)
}

export async function saveSpotifyProfile(userId: string, accessToken: string) {
  const response = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) return

  const profile = await response.json() as { id?: string; display_name?: string | null; email?: string }
  if (profile.id) await setIntegrationSecret(userId, "spotify", "spotify_user_id", profile.id)
  if (profile.display_name || profile.email) {
    await setIntegrationSecret(userId, "spotify", "display_name", profile.display_name ?? profile.email ?? "Spotify")
  }
}

const CONTROL_ENDPOINTS: Record<Exclude<SpotifyAction, "shuffle" | "repeat" | "volume" | "transfer" | "play-context">, { url: string; method: string }> = {
  play: { url: "https://api.spotify.com/v1/me/player/play", method: "PUT" },
  pause: { url: "https://api.spotify.com/v1/me/player/pause", method: "PUT" },
  next: { url: "https://api.spotify.com/v1/me/player/next", method: "POST" },
  previous: { url: "https://api.spotify.com/v1/me/player/previous", method: "POST" },
}

export async function spotifyControl(
  userId: string,
  action: SpotifyAction,
  options: {
    state?: boolean
    repeatState?: "track" | "context" | "off"
    volumePercent?: number
    deviceId?: string
    play?: boolean
    contextUri?: string
  } = {},
): Promise<boolean> {
  const token = await refreshSpotifyAccessToken(userId)
  if (!token) return false

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
              Math.max(0, Math.round(options.volumePercent ?? 0)),
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

  const response = await fetch(endpoint.url, {
    method: endpoint.method,
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

  if (response.status === 401) await deleteIntegrationProvider(userId, "spotify")
  return response.ok || response.status === 204
}
