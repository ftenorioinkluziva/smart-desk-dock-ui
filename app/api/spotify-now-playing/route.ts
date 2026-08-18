import { isAuthResponse, requireCurrentUser } from "@/lib/current-user"
import { EMPTY_SPOTIFY_STATE, getSpotifyNowPlaying, spotifyAppConfigured } from "@/lib/spotify"
import { unexpectedUpstreamOperationError } from "@/lib/http/operation-response"

export async function GET(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user
  if (!spotifyAppConfigured) return Response.json({ ...EMPTY_SPOTIFY_STATE, mock: true, spotifyAuthRequired: true })

  try {
    const playback = await getSpotifyNowPlaying(user.id)
    return Response.json(playback ?? { ...EMPTY_SPOTIFY_STATE, mock: true, spotifyAuthRequired: true })
  } catch (error) {
    const operationError = unexpectedUpstreamOperationError(error, "Spotify now playing failed")
    console.error("Spotify now-playing operation failed", { code: operationError.code, retryable: operationError.retryable })
    return Response.json({ ...EMPTY_SPOTIFY_STATE, operationError })
  }
}
