"use client"

import { useState, useEffect, useCallback } from "react"
import { Play, Pause, SkipForward } from "lucide-react"

type NowPlaying = {
  isPlaying: boolean
  track: string | null
  artist: string | null
  albumArt: string | null
  mock?: boolean
}

const FALLBACK: NowPlaying = {
  isPlaying: false,
  track: "Midnight City",
  artist: "M83",
  albumArt: null,
  mock: true,
}

export function SpotifyBar() {
  const [nowPlaying, setNowPlaying] = useState<NowPlaying>(FALLBACK)

  const fetchNowPlaying = useCallback(async () => {
    try {
      const res = await fetch("/api/spotify-now-playing")
      if (res.ok) {
        const data = await res.json() as NowPlaying
        setNowPlaying(data)
      }
    } catch {
      // Keep showing the last known state on network errors
    }
  }, [])

  // Poll every 7 seconds
  useEffect(() => {
    fetchNowPlaying()
    const interval = setInterval(fetchNowPlaying, 7000)
    return () => clearInterval(interval)
  }, [fetchNowPlaying])

  const track = nowPlaying.track ?? FALLBACK.track
  const artist = nowPlaying.artist ?? FALLBACK.artist

  return (
    <div className="flex items-center gap-3 px-4 py-2 w-full">
      {/* Album art or vinyl placeholder */}
      <div className="size-8 shrink-0 rounded-md bg-secondary flex items-center justify-center overflow-hidden">
        {nowPlaying.albumArt ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={nowPlaying.albumArt}
            alt={`${track} album art`}
            className="size-full object-cover"
          />
        ) : (
          <svg viewBox="0 0 32 32" className="size-full" aria-hidden="true">
            <rect width="32" height="32" fill="currentColor" className="text-secondary" />
            <circle cx="16" cy="16" r="5" fill="none" stroke="currentColor" strokeWidth="0.8" className="text-muted-foreground opacity-30" />
            <circle cx="16" cy="16" r="9" fill="none" stroke="currentColor" strokeWidth="0.4" className="text-muted-foreground opacity-20" />
            <circle cx="16" cy="16" r="2" fill="currentColor" className="text-muted-foreground opacity-40" />
          </svg>
        )}
      </div>

      {/* Track info */}
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-xs font-medium text-foreground truncate leading-tight">
          {track}
        </span>
        <span className="text-[10px] text-muted-foreground truncate leading-tight">
          {artist}
        </span>
      </div>

      {/* Controls — visual only; real playback goes through the Spotify app */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          aria-label={nowPlaying.isPlaying ? "Pause" : "Play"}
          className="flex items-center justify-center size-7 rounded-full bg-spotify text-background hover:opacity-90 transition-opacity"
        >
          {nowPlaying.isPlaying ? (
            <Pause className="size-3" />
          ) : (
            <Play className="size-3 ml-px" />
          )}
        </button>
        <button
          aria-label="Next track"
          className="flex items-center justify-center size-7 text-muted-foreground hover:text-foreground transition-colors"
        >
          <SkipForward className="size-3" />
        </button>
      </div>
    </div>
  )
}
