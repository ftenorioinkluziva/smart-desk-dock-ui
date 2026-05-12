import { getAccessToken, spotifyConfigured } from "@/lib/spotify"

type SpotifyPlaylist = {
  id: string
  name: string
  uri: string
  images?: Array<{ url: string }>
  owner?: { display_name?: string | null }
  items?: { total?: number }
  tracks?: { total?: number }
}

export async function GET() {
  if (!spotifyConfigured) {
    return Response.json({ playlists: [], mock: true })
  }

  try {
    const token = await getAccessToken()
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
