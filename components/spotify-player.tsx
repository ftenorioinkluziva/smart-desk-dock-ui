"use client"

import { useState } from "react"
import { Play, Pause, SkipBack, SkipForward } from "lucide-react"

export function SpotifyPlayer() {
  const [isPlaying, setIsPlaying] = useState(false)

  return (
    <div className="flex flex-col gap-2.5 px-4 py-3">
      <div className="flex items-center gap-3">
        {/* Album Art */}
        <div className="size-10 shrink-0 rounded-lg bg-secondary flex items-center justify-center overflow-hidden">
          <svg
            viewBox="0 0 40 40"
            className="size-full"
            aria-hidden="true"
          >
            <rect width="40" height="40" fill="currentColor" className="text-secondary" />
            <circle cx="20" cy="20" r="7" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted-foreground opacity-30" />
            <circle cx="20" cy="20" r="12" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-muted-foreground opacity-20" />
            <circle cx="20" cy="20" r="2.5" fill="currentColor" className="text-muted-foreground opacity-40" />
          </svg>
        </div>

        {/* Track Info */}
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-sm font-medium text-foreground truncate">
            {"Midnight City"}
          </span>
          <span className="text-xs text-muted-foreground truncate">
            {"M83"}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            aria-label="Previous track"
            className="flex items-center justify-center size-8 text-muted-foreground hover:text-foreground transition-colors"
          >
            <SkipBack className="size-3.5" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="flex items-center justify-center size-8 rounded-full bg-spotify text-primary-foreground hover:opacity-90 transition-opacity"
          >
            {isPlaying ? (
              <Pause className="size-3.5" />
            ) : (
              <Play className="size-3.5 ml-0.5" />
            )}
          </button>
          <button
            aria-label="Next track"
            className="flex items-center justify-center size-8 text-muted-foreground hover:text-foreground transition-colors"
          >
            <SkipForward className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground tabular-nums font-mono">
          {"1:24"}
        </span>
        <div className="flex-1 h-1 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-spotify"
            style={{ width: "35%" }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums font-mono">
          {"4:03"}
        </span>
      </div>
    </div>
  )
}
