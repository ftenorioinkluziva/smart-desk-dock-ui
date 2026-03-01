"use client"

import { useState, useEffect } from "react"

export function ClockDate() {
  const [time, setTime] = useState<Date | null>(null)

  useEffect(() => {
    setTime(new Date())
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  if (!time) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 py-4">
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
    <div className="flex flex-col items-center justify-center gap-1 py-4">
      <div className="text-7xl font-extralight tracking-tight text-foreground tabular-nums font-mono">
        {hours}
        <span className="animate-pulse">:</span>
        {minutes}
      </div>
      <div className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground">
        {dateStr.toUpperCase()}
      </div>
    </div>
  )
}
