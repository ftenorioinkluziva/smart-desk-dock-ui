"use client"

import { useState } from "react"
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat } from "lucide-react"

export function SpotifyBar() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress] = useState(43) // percentage

  return (
    <div className="flex items-center w-full px-4 py-1.5 gap-3">
      {/* Album art */}
      <div className="size-8 shrink-0 rounded-md bg-secondary overflow-hidden">
        <svg viewBox="0 0 32 32" className="size-full" aria-hidden="true">
          <defs>
            <linearGradient id="albumGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1db954" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#191414" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#1db954" stopOpacity="0.4" />
            </linearGradient>
          </defs>
          <rect width="32" height="32" fill="url(#albumGrad)" />
          <circle cx="16" cy="16" r="5" fill="none" stroke="white" strokeWidth="0.5" opacity="0.3" />
          <circle cx="16" cy="16" r="9" fill="none" stroke="white" strokeWidth="0.3" opacity="0.2" />
          <circle cx="16" cy="16" r="2" fill="white" opacity="0.4" />
        </svg>
      </div>

      {/* Track info */}
      <div className="flex flex-col min-w-0 w-[120px] shrink-0">
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-medium text-foreground truncate leading-tight">
            {"Imagine Us There"}
          </span>
          <span className="inline-flex items-center justify-center size-3 rounded-full bg-spotify shrink-0" aria-hidden="true">
            <svg viewBox="0 0 12 12" className="size-1.5 text-background" fill="currentColor">
              <path d="M5 8.5L2.5 6l1-1L5 6.5l3.5-3.5 1 1L5 8.5z" />
            </svg>
          </span>
        </div>
        <span className="text-[9px] text-muted-foreground truncate leading-tight">
          {"spring gang, Astyn Turr"}
        </span>
      </div>

      {/* Progress bar (inline) */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className="text-[9px] text-spotify tabular-nums font-mono w-6 text-right shrink-0">
          {"2:16"}
        </span>
        <div className="flex-1 h-[3px] rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-foreground/60 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[9px] text-muted-foreground tabular-nums font-mono w-6 shrink-0">
          {"3:12"}
        </span>
      </div>

      {/* Playback controls (compact) */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          aria-label="Shuffle"
          className="flex items-center justify-center size-6 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Shuffle className="size-2.5" />
        </button>
        <button
          aria-label="Previous track"
          className="flex items-center justify-center size-6 text-foreground/80 hover:text-foreground transition-colors"
        >
          <SkipBack className="size-3" fill="currentColor" />
        </button>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="flex items-center justify-center size-7 rounded-full bg-foreground text-background hover:opacity-90 transition-opacity"
        >
          {isPlaying ? (
            <Pause className="size-3" fill="currentColor" />
          ) : (
            <Play className="size-3 ml-0.5" fill="currentColor" />
          )}
        </button>
        <button
          aria-label="Next track"
          className="flex items-center justify-center size-6 text-foreground/80 hover:text-foreground transition-colors"
        >
          <SkipForward className="size-3" fill="currentColor" />
        </button>
        <button
          aria-label="Repeat"
          className="flex items-center justify-center size-6 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Repeat className="size-2.5" />
        </button>
      </div>
    </div>
  )
}
