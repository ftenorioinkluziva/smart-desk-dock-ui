import { NextResponse } from "next/server"
import { exchangeSpotifyCode, saveSpotifyConnection, saveSpotifyProfile, verifySpotifyOAuthState } from "@/lib/spotify"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const oauthState = state ? verifySpotifyOAuthState(state) : null
  const appOrigin = oauthState?.returnOrigin ?? url.origin

  if (!code || !oauthState) {
    return NextResponse.redirect(new URL("/?spotify=error", appOrigin))
  }

  try {
    const token = await exchangeSpotifyCode(url.origin, code)
    await saveSpotifyConnection(oauthState.userId, token)
    if (token.access_token) await saveSpotifyProfile(oauthState.userId, token.access_token)

    return NextResponse.redirect(new URL("/?spotify=connected", appOrigin))
  } catch (error) {
    console.error("Spotify OAuth callback error:", error)
    return NextResponse.redirect(new URL("/?spotify=error", appOrigin))
  }
}
