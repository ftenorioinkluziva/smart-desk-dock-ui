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
    <div className="flex items-center justify-center gap-8 w-full px-8">
      {/* Left: Large clock */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <div className="flex items-baseline">
          <span className="text-7xl font-extralight tracking-tight text-foreground tabular-nums font-mono leading-none">
            {hours}
            <span className="animate-pulse">:</span>
            {minutes}
          </span>
          <span className="text-xl font-extralight text-muted-foreground tabular-nums font-mono ml-1 leading-none">
            {seconds}
          </span>
        </div>
        <div className="text-[10px] font-medium tracking-[0.2em] uppercase text-muted-foreground">
          {dateStr.toUpperCase()}
        </div>
      </div>

      {/* Right: Quick weather summary (vertical) */}
      <div className="flex flex-col items-center gap-1.5 px-5 py-3 rounded-2xl bg-secondary/30">
        <Sun className="size-6 text-chart-4" />
        <span className="text-2xl font-light text-foreground tabular-nums font-mono leading-none">
          {"20\u00B0"}
        </span>
        <span className="text-[9px] text-muted-foreground font-medium tracking-wide">
          {"S\u00e3o Paulo"}
        </span>
        <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
          {"13\u00B0 / 27\u00B0"}
        </span>
      </div>
    </div>
  )
}
