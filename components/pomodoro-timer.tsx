"use client"

import { useState, useEffect, useCallback } from "react"
import { Play, Pause, RotateCcw } from "lucide-react"

export function PomodoroTimer() {
  const [totalSeconds, setTotalSeconds] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    if (!isRunning || totalSeconds <= 0) return
    const interval = setInterval(() => {
      setTotalSeconds((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [isRunning, totalSeconds])

  const reset = useCallback(() => {
    setIsRunning(false)
    setTotalSeconds(25 * 60)
  }, [])

  const togglePlay = useCallback(() => {
    setIsRunning((prev) => !prev)
  }, [])

  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0")
  const seconds = (totalSeconds % 60).toString().padStart(2, "0")

  const progress = ((25 * 60 - totalSeconds) / (25 * 60)) * 100

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="relative">
        <div className="text-4xl font-extralight text-foreground tabular-nums font-mono tracking-tight">
          {minutes}:{seconds}
        </div>
        <div className="mt-2 h-0.5 w-full rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          aria-label={isRunning ? "Pause timer" : "Start timer"}
          className="flex items-center justify-center size-9 rounded-full border border-border text-foreground hover:bg-secondary transition-colors"
        >
          {isRunning ? (
            <Pause className="size-4" />
          ) : (
            <Play className="size-4 ml-0.5" />
          )}
        </button>
        <button
          onClick={reset}
          aria-label="Reset timer"
          className="flex items-center justify-center size-9 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <RotateCcw className="size-4" />
        </button>
      </div>
    </div>
  )
}
