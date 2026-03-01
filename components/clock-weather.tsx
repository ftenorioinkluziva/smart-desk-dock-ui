"use client"

import { useState, useEffect } from "react"
import { Sun } from "lucide-react"

export function ClockWeather() {
  const [time, setTime] = useState<Date | null>(null)

  useEffect(() => {
    setTime(new Date())
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  if (!time) {
    return (
      <div className="flex flex-col items-center justify-center gap-1">
        <div className="text-7xl font-extralight tracking-tight text-foreground tabular-nums font-mono">
          {"--:--"}
        </div>
        <div className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground">
          {"loading..."}
        </div>
      </div>
    )
  }

  const hours = time.getHours().toString().padStart(2, "0")
  const minutes = time.getMinutes().toString().padStart(2, "0")

  const dateStr = time.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  })

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      {/* Massive clock */}
      <div className="text-7xl font-extralight tracking-tight text-foreground tabular-nums font-mono leading-none">
        {hours}
        <span className="animate-pulse">:</span>
        {minutes}
      </div>

      {/* Date */}
      <div className="text-[11px] font-medium tracking-[0.2em] uppercase text-muted-foreground">
        {dateStr.toUpperCase()}
      </div>

      {/* Weather */}
      <div className="flex items-center gap-2 mt-1">
        <Sun className="size-4 text-muted-foreground" />
        <span className="text-sm text-foreground font-light tabular-nums">
          {"28\u00B0C"}
        </span>
        <span className="text-xs text-muted-foreground font-mono tabular-nums">
          {"H: 30\u00B0 L: 22\u00B0"}
        </span>
      </div>
    </div>
  )
}
