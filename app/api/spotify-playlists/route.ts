import { isAuthResponse, requireCurrentUser } from "@/lib/current-user"
import { refreshSpotifyAccessToken, spotifyAppConfigured } from "@/lib/spotify"

type SpotifyPlaylist = {
  id: string
  name: string
  uri: string
  images?: Array<{ url: string }>
  owner?: { display_name?: string | null }
  items?: { total?: number }
  tracks?: { total?: number }
}

export async function GET(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user

  if (!spotifyAppConfigured) {
    return Response.json({ playlists: [], mock: true, spotifyAuthRequired: true })
  }

  try {
    const token = await refreshSpotifyAccessToken(user.id)
    if (!token) return Response.json({ playlists: [], mock: true, spotifyAuthRequired: true })

    const res = await fetch("https://api.spotify.com/v1/me/playlists?limit=20&offset=0", {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (res.status === 403) {
      return Response.json({ playlists: [], error: "missing_scope" }, { status: 403 })
    }

    if (!res.ok) throw new Error(`Spotify playlists error: ${res.status}`)

    const data = await res.json() as {
      items?: SpotifyPlaylist[]
      total?: number
      next?: string | null
    }

    return Response.json({
      playlists: (data.items ?? []).map((playlist) => ({
        id: playlist.id,
        name: playlist.name,
        uri: playlist.uri,
        image: playlist.images?.[0]?.url ?? null,
        owner: playlist.owner?.display_name ?? null,
        totalTracks: playlist.items?.total ?? playlist.tracks?.total ?? null,
      })),
      total: data.total ?? 0,
      hasMore: Boolean(data.next),
    })
  } catch {
    return Response.json({ playlists: [] })
  }
}

