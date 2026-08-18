import { createHmac, randomBytes, timingSafeEqual } from "crypto"
import { z } from "zod"
import {
  deleteIntegrationProvider,
  getIntegrationSecret,
  setIntegrationSecret,
} from "@/lib/integration-secrets"
import { OperationFailure, upstreamError } from "@/lib/operations/errors"

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET
const REDIRECT_ORIGIN = process.env.SPOTIFY_REDIRECT_ORIGIN?.trim()

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

const spotifyTokenResponseSchema = z.object({
  access_token: z.string().optional(),
  refresh_token: z.string().optional(),
  expires_in: z.number().optional(),
  error: z.string().optional(),
}).passthrough()
type SpotifyTokenResponse = z.infer<typeof spotifyTokenResponseSchema>

const spotifyProfileSchema = z.object({
  id: z.string().optional(),
  display_name: z.string().nullable().optional(),
  email: z.string().optional(),
}).passthrough()

const spotifyOAuthStateSchema = z.object({
  exp: z.number(), nonce: z.string().min(1), returnOrigin: z.string().url(), userId: z.string().min(1),
}).strict()

export const EMPTY_SPOTIFY_STATE = {
  isPlaying: false,
  track: null,
  artist: null,
  albumArt: null,
  album: null,
  deviceName: null,
  deviceType: null,
  volumePercent: null,
  shuffle: false,
  repeat: "off" as const,
  progressMs: 0,
  durationMs: 0,
}

const spotifyPlaybackSchema = z.object({
  is_playing: z.boolean(),
  shuffle_state: z.boolean().optional(),
  repeat_state: z.enum(["off", "track", "context"]).optional(),
  progress_ms: z.number().optional(),
  device: z.object({
    name: z.string().optional(),
    type: z.string().optional(),
    volume_percent: z.number().nullable().optional(),
  }).passthrough().optional(),
  item: z.object({
    name: z.string(),
    artists: z.array(z.object({ name: z.string() }).passthrough()),
    duration_ms: z.number().optional(),
    album: z.object({ name: z.string().optional(), images: z.array(z.object({ url: z.string() }).passthrough()) }).passthrough(),
  }).passthrough().nullable().optional(),
}).passthrough()

const spotifyDeviceSchema = z.object({
  id: z.string().nullable(), is_active: z.boolean(), is_private_session: z.boolean(), is_restricted: z.boolean(),
  name: z.string(), type: z.string(), volume_percent: z.number().nullable(), supports_volume: z.boolean(),
}).passthrough()

const spotifyPlaylistsSchema = z.object({
  items: z.array(z.object({
    id: z.string(), name: z.string(), uri: z.string(), images: z.array(z.object({ url: z.string() }).passthrough()).optional(),
    owner: z.object({ display_name: z.string().nullable().optional() }).passthrough().optional(),
    items: z.object({ total: z.number().optional() }).passthrough().optional(),
    tracks: z.object({ total: z.number().optional() }).passthrough().optional(),
  }).passthrough()).optional(),
  total: z.number().optional(),
  next: z.string().nullable().optional(),
}).passthrough()

function spotifyRequestFailure(status: number, operation: string) {
  if (status === 401 || status === 403) {
    return new OperationFailure({
      code: status === 403 ? "SPOTIFY_FORBIDDEN" : "SPOTIFY_AUTH_REQUIRED",
      category: "authorization",
      message: status === 403 ? "Spotify permission is missing" : "Spotify account is not connected",
      retryable: false,
    })
  }
  return new OperationFailure(upstreamError(
    status === 429 ? "SPOTIFY_RATE_LIMITED" : "SPOTIFY_UPSTREAM_FAILED",
    `${operation} failed`,
    { retryable: status === 429 || status >= 500 },
  ))
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
  const secret = process.env.BETTER_AUTH_SECRET ?? process.env.APP_ENCRYPTION_KEY
  if (!secret) throw new Error("BETTER_AUTH_SECRET or APP_ENCRYPTION_KEY is required")
  return secret
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
    const parsed = spotifyOAuthStateSchema.safeParse(JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")))
    if (!parsed.success || parsed.data.exp < Date.now()) return null
    return parsed.data
  } catch {
    return null
  }
}

export function getSpotifyRedirectOrigin(requestOrigin: string) {
  if (REDIRECT_ORIGIN) return REDIRECT_ORIGIN.replace(/\/$/, "")
  if (requestOrigin === "http://localhost:3001") return "http://127.0.0.1:3001"
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
  if (!spotifyAppConfigured) throw new OperationFailure(upstreamError("SPOTIFY_NOT_CONFIGURED", "Spotify app is not configured", { retryable: false }))

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
    signal: AbortSignal.timeout(10_000),
  })

  const parsed = spotifyTokenResponseSchema.safeParse(await response.json())
  if (!parsed.success) throw new OperationFailure(upstreamError("SPOTIFY_RESPONSE_INVALID", "Spotify returned an invalid token response", { retryable: false }))
  const data = parsed.data
  if (!response.ok || !data.access_token || !data.refresh_token) {
    throw spotifyRequestFailure(response.status, "Spotify code exchange")
  }

  return data
}

export async function refreshSpotifyAccessToken(userId: string) {
  if (!spotifyAppConfigured) throw new OperationFailure(upstreamError("SPOTIFY_NOT_CONFIGURED", "Spotify app is not configured", { retryable: false }))

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
    signal: AbortSignal.timeout(10_000),
  })

  const parsed = spotifyTokenResponseSchema.safeParse(await response.json())
  if (!parsed.success) throw new OperationFailure(upstreamError("SPOTIFY_RESPONSE_INVALID", "Spotify returned an invalid token response", { retryable: false }))
  const data = parsed.data
  if (!response.ok || !data.access_token) {
    if (response.status === 400 || response.status === 401) {
      await deleteIntegrationProvider(userId, "spotify")
      return null
    }
    throw spotifyRequestFailure(response.status, "Spotify token refresh")
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
  if (!token.refresh_token) throw new OperationFailure(upstreamError("SPOTIFY_REFRESH_TOKEN_MISSING", "Spotify refresh token missing", { retryable: false }))
  await setIntegrationSecret(userId, "spotify", "refresh_token", token.refresh_token)
}

export async function saveSpotifyProfile(userId: string, accessToken: string) {
  const response = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) return

  const parsed = spotifyProfileSchema.safeParse(await response.json())
  if (!parsed.success) return
  const profile = parsed.data
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
    signal: AbortSignal.timeout(10_000),
  })

  if (response.status === 401) await deleteIntegrationProvider(userId, "spotify")
  if (!response.ok && response.status !== 204) throw spotifyRequestFailure(response.status, "Spotify control")
  return true
}

export async function getSpotifyNowPlaying(userId: string) {
  const token = await refreshSpotifyAccessToken(userId)
  if (!token) return null
  const response = await fetch("https://api.spotify.com/v1/me/player", {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000),
  })
  if (response.status === 204) return EMPTY_SPOTIFY_STATE
  if (!response.ok) throw spotifyRequestFailure(response.status, "Spotify now playing")
  const parsed = spotifyPlaybackSchema.safeParse(await response.json())
  if (!parsed.success) throw new OperationFailure(upstreamError("SPOTIFY_RESPONSE_INVALID", "Spotify returned an invalid playback response", { retryable: false }))
  const data = parsed.data
  return {
    isPlaying: data.is_playing,
    track: data.item?.name ?? null,
    artist: data.item?.artists[0]?.name ?? null,
    albumArt: data.item?.album.images[0]?.url ?? null,
    album: data.item?.album.name ?? null,
    deviceName: data.device?.name ?? null,
    deviceType: data.device?.type ?? null,
    volumePercent: data.device?.volume_percent ?? null,
    shuffle: data.shuffle_state ?? false,
    repeat: data.repeat_state ?? "off",
    progressMs: data.progress_ms ?? 0,
    durationMs: data.item?.duration_ms ?? 0,
  }
}

export async function getSpotifyDevices(userId: string) {
  const token = await refreshSpotifyAccessToken(userId)
  if (!token) return null
  const response = await fetch("https://api.spotify.com/v1/me/player/devices", {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) throw spotifyRequestFailure(response.status, "Spotify devices")
  const parsed = z.object({ devices: z.array(spotifyDeviceSchema).optional() }).passthrough().safeParse(await response.json())
  if (!parsed.success) throw new OperationFailure(upstreamError("SPOTIFY_RESPONSE_INVALID", "Spotify returned an invalid devices response", { retryable: false }))
  return (parsed.data.devices ?? []).map((device) => ({
    id: device.id, isActive: device.is_active, isPrivateSession: device.is_private_session,
    isRestricted: device.is_restricted, name: device.name, type: device.type,
    volumePercent: device.volume_percent, supportsVolume: device.supports_volume,
  }))
}

export async function getSpotifyPlaylists(userId: string) {
  const token = await refreshSpotifyAccessToken(userId)
  if (!token) return null
  const response = await fetch("https://api.spotify.com/v1/me/playlists?limit=20&offset=0", {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) throw spotifyRequestFailure(response.status, "Spotify playlists")
  const parsed = spotifyPlaylistsSchema.safeParse(await response.json())
  if (!parsed.success) throw new OperationFailure(upstreamError("SPOTIFY_RESPONSE_INVALID", "Spotify returned an invalid playlists response", { retryable: false }))
  return {
    playlists: (parsed.data.items ?? []).map((playlist) => ({
      id: playlist.id, name: playlist.name, uri: playlist.uri, image: playlist.images?.[0]?.url ?? null,
      owner: playlist.owner?.display_name ?? null, totalTracks: playlist.items?.total ?? playlist.tracks?.total ?? null,
    })),
    total: parsed.data.total ?? 0,
    hasMore: Boolean(parsed.data.next),
  }
}
