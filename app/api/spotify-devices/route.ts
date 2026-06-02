import { isAuthResponse, requireCurrentUser } from "@/lib/current-user"
import { refreshSpotifyAccessToken, spotifyAppConfigured } from "@/lib/spotify"

type SpotifyDevice = {
  id: string | null
  is_active: boolean
  is_private_session: boolean
  is_restricted: boolean
  name: string
  type: string
  volume_percent: number | null
  supports_volume: boolean
}

export async function GET(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user

  if (!spotifyAppConfigured) {
    return Response.json({ devices: [], mock: true, spotifyAuthRequired: true })
  }

  try {
    const token = await refreshSpotifyAccessToken(user.id)
    if (!token) return Response.json({ devices: [], mock: true, spotifyAuthRequired: true })

    const res = await fetch("https://api.spotify.com/v1/me/player/devices", {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) throw new Error(`Spotify devices error: ${res.status}`)

    const data = await res.json() as { devices?: SpotifyDevice[] }

    return Response.json({
      devices: (data.devices ?? []).map((device) => ({
        id: device.id,
        isActive: device.is_active,
        isPrivateSession: device.is_private_session,
        isRestricted: device.is_restricted,
        name: device.name,
        type: device.type,
        volumePercent: device.volume_percent,
        supportsVolume: device.supports_volume,
      })),
    })
  } catch {
    return Response.json({ devices: [] })
  }
}

