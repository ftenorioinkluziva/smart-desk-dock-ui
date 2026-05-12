import { getAccessToken, spotifyConfigured } from "@/lib/spotify"

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

export async function GET() {
  if (!spotifyConfigured) {
    return Response.json({ devices: [], mock: true })
  }

  try {
    const token = await getAccessToken()
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
