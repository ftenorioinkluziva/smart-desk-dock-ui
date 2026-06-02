import { NextResponse } from "next/server"
import { isAuthResponse, requireCurrentUser } from "@/lib/current-user"
import { createSpotifyOAuthState, getSpotifyAuthorizeUrl, spotifyAppConfigured } from "@/lib/spotify"

export async function GET(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user

  if (!spotifyAppConfigured) {
    return NextResponse.json({ error: "Spotify app is not configured" }, { status: 503 })
  }

  const origin = new URL(request.url).origin
  const state = createSpotifyOAuthState(user.id, origin)
  const response = NextResponse.redirect(getSpotifyAuthorizeUrl({ origin, state }))
  return response
}
