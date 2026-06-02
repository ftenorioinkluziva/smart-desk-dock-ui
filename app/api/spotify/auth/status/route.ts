import { NextResponse } from "next/server"
import { isAuthResponse, requireCurrentUser } from "@/lib/current-user"
import { getSpotifyAuthStatus } from "@/lib/spotify"

export async function GET(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user

  return NextResponse.json(await getSpotifyAuthStatus(user.id))
}

