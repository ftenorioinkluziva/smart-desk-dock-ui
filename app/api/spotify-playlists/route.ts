import { isAuthResponse, requireCurrentUser } from "@/lib/current-user"
import { getSpotifyPlaylists, spotifyAppConfigured } from "@/lib/spotify"
import { operationErrorResponse, unexpectedUpstreamOperationError } from "@/lib/http/operation-response"

export async function GET(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user
  if (!spotifyAppConfigured) return Response.json({ playlists: [], mock: true, spotifyAuthRequired: true })

  try {
    const result = await getSpotifyPlaylists(user.id)
    return Response.json(result ?? { playlists: [], mock: true, spotifyAuthRequired: true })
  } catch (error) {
    const operationError = unexpectedUpstreamOperationError(error, "Spotify playlists failed")
    return operationErrorResponse(operationError, {
      status: operationError.code === "SPOTIFY_FORBIDDEN" ? 403 : undefined,
      extra: { playlists: [] },
    })
  }
}
