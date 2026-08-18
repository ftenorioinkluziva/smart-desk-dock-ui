import { isAuthResponse, requireCurrentUser } from "@/lib/current-user"
import { spotifyAppConfigured, spotifyControl } from "@/lib/spotify"
import { operationErrorResponse, parseJsonBody, unexpectedUpstreamOperationError } from "@/lib/http/operation-response"
import { spotifyControlInputSchema } from "@/lib/operations/contracts"
import { upstreamError } from "@/lib/operations/errors"

export async function POST(req: Request) {
  const user = await requireCurrentUser(req)
  if (isAuthResponse(user)) return user

  if (!spotifyAppConfigured) {
    return operationErrorResponse(
      upstreamError("SPOTIFY_NOT_CONFIGURED", "Spotify not configured", { retryable: false }),
      { status: 503 },
    )
  }

  const parsed = await parseJsonBody(req, spotifyControlInputSchema)
  if (!parsed.ok) return operationErrorResponse(parsed.error)
  const { action, state, repeatState, volumePercent, deviceId, play, contextUri } = parsed.value

  try {
    const ok = await spotifyControl(user.id, action, { state, repeatState, volumePercent, deviceId, play, contextUri })
    if (!ok) {
      return operationErrorResponse({
        code: "SPOTIFY_AUTH_REQUIRED",
        category: "authorization",
        message: "Spotify account is not connected",
        retryable: false,
      }, { status: 401, extra: { spotifyAuthRequired: true } })
    }
    return Response.json({ ok: true })
  } catch (err) {
    const operationError = unexpectedUpstreamOperationError(err, "Playback control failed")
    console.error("Spotify control error", { code: operationError.code, retryable: operationError.retryable })
    return operationErrorResponse(operationError)
  }
}
