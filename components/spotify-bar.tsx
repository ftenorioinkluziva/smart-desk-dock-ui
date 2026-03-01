"use client"

import { useState, useEffect, useCallback } from "react"
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat } from "lucide-react"

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
    setNowPlaying((p) => ({ ...p, isPlaying: !p.isPlaying }))
    await sendControl(action)
    setTimeout(fetchNowPlaying, 1500)
  }

  async function handleNext() {
    await sendControl("next")
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
    <div className="flex items-center w-full px-4 py-1.5 gap-3">
      {/* Album art */}
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
      <div className="flex flex-col min-w-0 w-[120px] shrink-0">
        {track ? (
          <>
            <span className="text-[11px] font-medium text-foreground truncate leading-tight">
              {track}
            </span>
            <span className="text-[9px] text-muted-foreground truncate leading-tight">
              {artist}
            </span>
          </>
        ) : (
          <span className="text-[10px] text-muted-foreground italic">
            {isMock ? "Configure Spotify credentials" : "Nothing playing"}
          </span>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Playback controls */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          aria-label="Shuffle"
          disabled={isMock}
          className="flex items-center justify-center size-6 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          <Shuffle className="size-2.5" />
        </button>
        <button
          onClick={handlePrevious}
          aria-label="Previous track"
          disabled={isMock}
          className="flex items-center justify-center size-6 text-foreground/80 hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          <SkipBack className="size-3" fill="currentColor" />
        </button>
        <button
          onClick={handlePlayPause}
          aria-label={nowPlaying.isPlaying ? "Pause" : "Play"}
          disabled={isMock}
          className="flex items-center justify-center size-7 rounded-full bg-spotify text-background hover:opacity-90 transition-opacity disabled:opacity-30 disabled:pointer-events-none"
        >
          {nowPlaying.isPlaying ? (
            <Pause className="size-3" fill="currentColor" />
          ) : (
            <Play className="size-3 ml-px" fill="currentColor" />
          )}
        </button>
        <button
          onClick={handleNext}
          aria-label="Next track"
          disabled={isMock}
          className="flex items-center justify-center size-6 text-foreground/80 hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          <SkipForward className="size-3" fill="currentColor" />
        </button>
        <button
          aria-label="Repeat"
          disabled={isMock}
          className="flex items-center justify-center size-6 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          <Repeat className="size-2.5" />
        </button>
      </div>
    </div>
  )
}
