import { isAuthResponse, requireCurrentUser } from "@/lib/current-user"
import { getSpotifyDevices, spotifyAppConfigured } from "@/lib/spotify"
import { operationErrorResponse, unexpectedUpstreamOperationError } from "@/lib/http/operation-response"

export async function GET(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user
  if (!spotifyAppConfigured) return Response.json({ devices: [], mock: true, spotifyAuthRequired: true })

  try {
    const devices = await getSpotifyDevices(user.id)
    return Response.json(devices ? { devices } : { devices: [], mock: true, spotifyAuthRequired: true })
  } catch (error) {
    return operationErrorResponse(unexpectedUpstreamOperationError(error, "Spotify devices failed"), { extra: { devices: [] } })
  }
}
