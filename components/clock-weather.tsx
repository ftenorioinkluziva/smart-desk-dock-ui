"use client"

import { useState, useEffect } from "react"
import { Sun } from "lucide-react"

export function ClockWeather() {
  const [time, setTime] = useState<Date | null>(null)
  const [seconds, setSeconds] = useState("")

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTime(now)
      setSeconds(now.getSeconds().toString().padStart(2, "0"))
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  if (!time) {
    return (
      <div className="flex flex-col items-center justify-center gap-1">
        <div className="text-8xl font-extralight tracking-tight text-foreground tabular-nums font-mono">
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

  const dateStr = time.toLocaleDateString("pt-BR", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="flex flex-col items-center justify-center gap-2.5 w-full px-6">
      {/* Large clock */}
      <div className="flex items-baseline">
        <span className="text-8xl font-extralight tracking-tight text-foreground tabular-nums font-mono leading-none">
          {hours}
          <span className="animate-pulse">:</span>
          {minutes}
        </span>
        <span className="text-2xl font-extralight text-muted-foreground tabular-nums font-mono ml-1 leading-none">
          {seconds}
        </span>
      </div>

      {/* Date */}
      <div className="text-[11px] font-medium tracking-[0.2em] uppercase text-muted-foreground">
        {dateStr.toUpperCase()}
      </div>

      {/* Quick weather summary */}
      <div className="flex items-center gap-2.5 mt-1 px-4 py-2 rounded-full bg-secondary/40">
        <Sun className="size-4 text-chart-4" />
        <span className="text-sm text-foreground font-light tabular-nums font-mono">
          {"20\u00B0C"}
        </span>
        <span className="text-[10px] text-muted-foreground font-medium">
          {"S\u00e3o Paulo"}
        </span>
        <span className="text-xs text-muted-foreground font-mono tabular-nums">
          {"13\u00B0 / 27\u00B0"}
        </span>
      </div>
    </div>
  )
}
