"use client"

import { useState } from "react"
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat } from "lucide-react"

export function SpotifyBar() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress] = useState(43) // percentage

  return (
    <div className="flex flex-col w-full px-4 py-2.5 gap-2">
      {/* Top row: album art + track info + controls */}
      <div className="flex items-center gap-3 w-full">
        {/* Album art */}
        <div className="size-10 shrink-0 rounded-lg bg-secondary overflow-hidden">
          <svg viewBox="0 0 40 40" className="size-full" aria-hidden="true">
            <defs>
              <linearGradient id="albumGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#1db954" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#191414" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#1db954" stopOpacity="0.4" />
              </linearGradient>
            </defs>
            <rect width="40" height="40" fill="url(#albumGrad)" />
            <circle cx="20" cy="20" r="7" fill="none" stroke="white" strokeWidth="0.5" opacity="0.3" />
            <circle cx="20" cy="20" r="12" fill="none" stroke="white" strokeWidth="0.3" opacity="0.2" />
            <circle cx="20" cy="20" r="2.5" fill="white" opacity="0.4" />
          </svg>
        </div>

        {/* Track info */}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-foreground truncate leading-tight">
              {"Imagine Us There"}
            </span>
            <span className="inline-flex items-center justify-center size-3.5 rounded-full bg-spotify" aria-hidden="true">
              <svg viewBox="0 0 12 12" className="size-2 text-background" fill="currentColor">
                <path d="M5 8.5L2.5 6l1-1L5 6.5l3.5-3.5 1 1L5 8.5z" />
              </svg>
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground truncate leading-tight">
            {"spring gang, Astyn Turr"}
          </span>
        </div>

        {/* Playback controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            aria-label="Shuffle"
            className="flex items-center justify-center size-7 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Shuffle className="size-3" />
          </button>
          <button
            aria-label="Previous track"
            className="flex items-center justify-center size-7 text-foreground/80 hover:text-foreground transition-colors"
          >
            <SkipBack className="size-3.5" fill="currentColor" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="flex items-center justify-center size-8 rounded-full bg-foreground text-background hover:opacity-90 transition-opacity"
          >
            {isPlaying ? (
              <Pause className="size-3.5" fill="currentColor" />
            ) : (
              <Play className="size-3.5 ml-0.5" fill="currentColor" />
            )}
          </button>
          <button
            aria-label="Next track"
            className="flex items-center justify-center size-7 text-foreground/80 hover:text-foreground transition-colors"
          >
            <SkipForward className="size-3.5" fill="currentColor" />
          </button>
          <button
            aria-label="Repeat"
            className="flex items-center justify-center size-7 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Repeat className="size-3" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-spotify tabular-nums font-mono w-7 text-right">
          {"2:16"}
        </span>
        <div className="flex-1 h-1 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-foreground/60 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums font-mono w-7">
          {"3:12"}
        </span>
      </div>
    </div>
  )
}
