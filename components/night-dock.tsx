"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

type WeatherData = {
  temp: number
  high: number
  low: number
  condition: string
}

function getBurnInOffset(date: Date) {
  const slot = Math.floor(date.getMinutes() / 5)
  const x = ((slot % 5) - 2) * 3
  const y = ((Math.floor(slot / 5) % 3) - 1) * 3
  return { x, y }
}

export function NightDock() {
  const [time, setTime] = useState<Date | null>(null)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [isDimmed, setIsDimmed] = useState(true)

  const fetchWeather = useCallback(async () => {
    try {
      const response = await fetch("/api/weather")
      if (!response.ok) return
      setWeather(await response.json() as WeatherData)
    } catch {
      // Keep previous weather visible on transient failures.
    }
  }, [])

  useEffect(() => {
    setTime(new Date())
    fetchWeather()

    const clock = setInterval(() => setTime(new Date()), 1000)
    const weatherRefresh = setInterval(fetchWeather, 15 * 60 * 1000)

    return () => {
      clearInterval(clock)
      clearInterval(weatherRefresh)
    }
  }, [fetchWeather])

  const displayTime = time ?? new Date(0)
  const hours = time ? displayTime.getHours().toString().padStart(2, "0") : "--"
  const minutes = time ? displayTime.getMinutes().toString().padStart(2, "0") : "--"
  const seconds = time ? displayTime.getSeconds().toString().padStart(2, "0") : "--"
  const weekday = time ? displayTime.toLocaleDateString("pt-BR", { weekday: "long" }) : ""
  const dateLabel = time ? displayTime.toLocaleDateString("pt-BR", { day: "numeric", month: "long" }) : ""
  const offset = useMemo(() => getBurnInOffset(displayTime), [displayTime])

  return (
    <button
      type="button"
      onClick={() => setIsDimmed((current) => !current)}
      className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label="Alternar brilho do modo noturno"
    >
      <div
        className={`flex flex-col items-center transition-[opacity,transform] duration-700 ${isDimmed ? "opacity-55" : "opacity-85"}`}
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      >
        <h2 className="sr-only">Modo Noturno</h2>
        <div className="flex items-baseline leading-none">
          <span className="font-extralight text-foreground tabular-nums font-mono tracking-tight" style={{ fontSize: "clamp(5rem,20vw,10.5rem)" }}>
            {hours}:{minutes}
          </span>
          <span className="ml-[0.28em] font-extralight text-muted-foreground/55 tabular-nums font-mono leading-none" style={{ fontSize: "clamp(1.1rem,3.5vw,2rem)" }}>
            {seconds}
          </span>
        </div>

        <div className="mt-[clamp(0.2rem,0.6vh,0.4rem)] uppercase tracking-[0.28em] text-muted-foreground/65" style={{ fontSize: "clamp(0.75rem,2vw,1rem)" }}>
          {weekday} <span className="tracking-[0.18em] text-muted-foreground/45">{dateLabel}</span>
        </div>

        <div className="mt-[clamp(0.45rem,1.2vh,0.75rem)] flex items-center gap-[clamp(0.55rem,1.5vw,0.85rem)] text-muted-foreground/55 font-mono tabular-nums" style={{ fontSize: "clamp(0.7rem,1.8vw,0.9rem)" }}>
          <span>{weather ? `${weather.temp}°` : "--°"}</span>
          <span className="h-3 w-px bg-border/30" aria-hidden="true" />
          <span>{weather ? `${weather.low}° / ${weather.high}°` : "--° / --°"}</span>
        </div>
      </div>
    </button>
  )
}
