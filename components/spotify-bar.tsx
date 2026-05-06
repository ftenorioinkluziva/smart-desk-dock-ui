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
    <div className="flex items-center w-full dock-px py-[clamp(0.25rem,0.8vh,0.375rem)] gap-[clamp(0.45rem,1.4vw,0.75rem)]">
      {/* Album art */}
      <div className="size-[clamp(2rem,4.5vw,2.5rem)] shrink-0 rounded-md bg-secondary flex items-center justify-center overflow-hidden">
        {nowPlaying.albumArt ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={nowPlaying.albumArt}
            alt={`Capa do álbum ${track}`}
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
            <span className="text-[clamp(0.72rem,1.8vw,0.9rem)] font-medium text-foreground truncate leading-tight">
              {track}
            </span>
            <span className="text-[clamp(0.62rem,1.55vw,0.78rem)] text-muted-foreground truncate leading-tight">
              {artist}
            </span>
          </>
        ) : (
          <span className="text-[clamp(0.65rem,1.6vw,0.8rem)] text-muted-foreground italic">
            {isMock ? "Configure as credenciais do Spotify" : "Nada tocando"}
          </span>
        )}
      </div>

      {/* Playback controls */}
      <div className="flex items-center gap-[clamp(0.1rem,0.4vw,0.25rem)] shrink-0">
        <button
          aria-label="Aleatório"
          disabled={isMock}
          className="flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
          style={{ width: "var(--dock-control-size)", height: "var(--dock-control-size)" }}
        >
          <Shuffle className="size-(--dock-control-icon-size)" />
        </button>
        <button
          onClick={handlePrevious}
          aria-label="Faixa anterior"
          disabled={isMock}
          className="flex items-center justify-center text-foreground/80 hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
          style={{ width: "var(--dock-control-size)", height: "var(--dock-control-size)" }}
        >
          <SkipBack className="size-[calc(var(--dock-control-icon-size)*1.15)]" fill="currentColor" />
        </button>
        <button
          onClick={handlePlayPause}
          aria-label={nowPlaying.isPlaying ? "Pausar" : "Tocar"}
          disabled={isMock}
          className="flex items-center justify-center rounded-full bg-spotify text-background hover:opacity-90 transition-opacity disabled:opacity-30 disabled:pointer-events-none"
          style={{ width: "calc(var(--dock-control-size) * 1.2)", height: "calc(var(--dock-control-size) * 1.2)" }}
        >
          {nowPlaying.isPlaying ? (
            <Pause className="size-[calc(var(--dock-control-icon-size)*1.2)]" fill="currentColor" />
          ) : (
            <Play className="size-[calc(var(--dock-control-icon-size)*1.2)] ml-px" fill="currentColor" />
          )}
        </button>
        <button
          onClick={handleNext}
          aria-label="Próxima faixa"
          disabled={isMock}
          className="flex items-center justify-center text-foreground/80 hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
          style={{ width: "var(--dock-control-size)", height: "var(--dock-control-size)" }}
        >
          <SkipForward className="size-[calc(var(--dock-control-icon-size)*1.15)]" fill="currentColor" />
        </button>
        <button
          aria-label="Repetir"
          disabled={isMock}
          className="flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
          style={{ width: "var(--dock-control-size)", height: "var(--dock-control-size)" }}
        >
          <Repeat className="size-(--dock-control-icon-size)" />
        </button>
      </div>
    </div>
  )
}
