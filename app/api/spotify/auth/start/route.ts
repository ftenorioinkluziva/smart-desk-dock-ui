import { NextResponse } from "next/server"
import { isAuthResponse, requireCurrentUser } from "@/lib/current-user"
import { createSpotifyOAuthState, getSpotifyAuthorizeUrl, spotifyAppConfigured } from "@/lib/spotify"
import { operationErrorResponse } from "@/lib/http/operation-response"
import { upstreamError } from "@/lib/operations/errors"

export async function GET(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user

  if (!spotifyAppConfigured) {
    return operationErrorResponse(
      upstreamError("SPOTIFY_NOT_CONFIGURED", "Spotify app is not configured", { retryable: false }),
      { status: 503 },
    )
  }

  const origin = new URL(request.url).origin
  const state = createSpotifyOAuthState(user.id, origin)
  const response = NextResponse.redirect(getSpotifyAuthorizeUrl({ origin, state }))
  return response
}
