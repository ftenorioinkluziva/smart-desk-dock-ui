"use client"

import { useState } from "react"
import { Play, Pause, SkipForward } from "lucide-react"

export function SpotifyBar() {
  const [isPlaying, setIsPlaying] = useState(false)

  return (
    <div className="flex items-center gap-3 px-4 py-2 w-full">
      {/* Mini album art */}
      <div className="size-8 shrink-0 rounded-md bg-secondary flex items-center justify-center overflow-hidden">
        <svg viewBox="0 0 32 32" className="size-full" aria-hidden="true">
          <rect width="32" height="32" fill="currentColor" className="text-secondary" />
          <circle cx="16" cy="16" r="5" fill="none" stroke="currentColor" strokeWidth="0.8" className="text-muted-foreground opacity-30" />
          <circle cx="16" cy="16" r="9" fill="none" stroke="currentColor" strokeWidth="0.4" className="text-muted-foreground opacity-20" />
          <circle cx="16" cy="16" r="2" fill="currentColor" className="text-muted-foreground opacity-40" />
        </svg>
      </div>

      {/* Track info */}
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-xs font-medium text-foreground truncate leading-tight">
          {"Midnight City"}
        </span>
        <span className="text-[10px] text-muted-foreground truncate leading-tight">
          {"M83"}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="flex items-center justify-center size-7 rounded-full bg-spotify text-background hover:opacity-90 transition-opacity"
        >
          {isPlaying ? (
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
