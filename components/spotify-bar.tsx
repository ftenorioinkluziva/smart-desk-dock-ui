"use client"

import { useState, useEffect, useCallback } from "react"
import { Play, Pause, SkipForward, SkipBack } from "lucide-react"

type NowPlaying = {
  isPlaying: boolean
  track: string | null
  artist: string | null
  albumArt: string | null
  mock?: boolean
}

const FALLBACK: NowPlaying = {
  isPlaying: false,
  track: null,
  artist: null,
  albumArt: null,
  mock: true,
}

async function sendControl(action: "play" | "pause" | "next" | "previous") {
  await fetch("/api/spotify-control", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  }).catch(() => {})
}

export function SpotifyBar() {
  const [nowPlaying, setNowPlaying] = useState<NowPlaying>(FALLBACK)

  const fetchNowPlaying = useCallback(async () => {
    try {
      const res = await fetch("/api/spotify-now-playing")
      if (res.ok) setNowPlaying(await res.json() as NowPlaying)
    } catch {}
  }, [])

  // Poll every 7 s
  useEffect(() => {
    fetchNowPlaying()
    const id = setInterval(fetchNowPlaying, 7000)
    return () => clearInterval(id)
  }, [fetchNowPlaying])

  async function handlePlayPause() {
    const action = nowPlaying.isPlaying ? "pause" : "play"
    // Optimistic: flip local state immediately
    setNowPlaying((p) => ({ ...p, isPlaying: !p.isPlaying }))
    await sendControl(action)
    // Confirm with server after Spotify processes the command
    setTimeout(fetchNowPlaying, 1500)
  }

  async function handleNext() {
    await sendControl("next")
    // New track needs a moment to appear in the API
    setTimeout(fetchNowPlaying, 1500)
  }

  async function handlePrevious() {
    await sendControl("previous")
    setTimeout(fetchNowPlaying, 1500)
  }

  const isMock = nowPlaying.mock
  const track  = nowPlaying.track
  const artist = nowPlaying.artist

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
            <circle cx="16" cy="16" r="5"  fill="none" stroke="currentColor" strokeWidth="0.8" className="text-muted-foreground opacity-30" />
            <circle cx="16" cy="16" r="9"  fill="none" stroke="currentColor" strokeWidth="0.4" className="text-muted-foreground opacity-20" />
            <circle cx="16" cy="16" r="2"  fill="currentColor" className="text-muted-foreground opacity-40" />
          </svg>
        )}
      </div>

      {/* Track info */}
      <div className="flex flex-col min-w-0 flex-1">
        {track ? (
          <>
            <span className="text-xs font-medium text-foreground truncate leading-tight">
              {track}
            </span>
            <span className="text-[10px] text-muted-foreground truncate leading-tight">
              {artist}
            </span>
          </>
        ) : (
          <span className="text-[10px] text-muted-foreground italic">
            {isMock ? "Configure Spotify credentials" : "Nothing playing"}
          </span>
        )}
      </div>

      {/* Playback controls */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={handlePrevious}
          aria-label="Previous track"
          disabled={isMock}
          className="flex items-center justify-center size-7 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          <SkipBack className="size-3" />
        </button>

        <button
          onClick={handlePlayPause}
          aria-label={nowPlaying.isPlaying ? "Pause" : "Play"}
          disabled={isMock}
          className="flex items-center justify-center size-7 rounded-full bg-spotify text-background hover:opacity-90 transition-opacity disabled:opacity-30 disabled:pointer-events-none"
        >
          {nowPlaying.isPlaying ? (
            <Pause className="size-3" />
          ) : (
            <Play className="size-3 ml-px" />
          )}
        </button>

        <button
          onClick={handleNext}
          aria-label="Next track"
          disabled={isMock}
          className="flex items-center justify-center size-7 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          <SkipForward className="size-3" />
        </button>
      </div>
    </div>
  )
}
