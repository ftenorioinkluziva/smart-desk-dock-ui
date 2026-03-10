"use client"

import { useState, useEffect, useCallback } from "react"
import { Sun, Cloud, CloudRain, CloudLightning, Snowflake } from "lucide-react"

type WeatherData = {
  temp: number
  high: number
  low: number
  description: string
  condition: string
}

function WeatherIcon({ condition, className }: { condition: string; className?: string }) {
  switch (condition) {
    case "rain":
    case "drizzle":
      return <CloudRain className={className} />
    case "clouds":
      return <Cloud className={className} />
    case "thunderstorm":
      return <CloudLightning className={className} />
    case "snow":
      return <Snowflake className={className} />
    default:
      return <Sun className={className} />
  }
}

export function ClockWeather() {
  const [time, setTime] = useState<Date | null>(null)
  const [seconds, setSeconds] = useState("")
  const [weather, setWeather] = useState<WeatherData | null>(null)

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

  const fetchWeather = useCallback(async () => {
    try {
      const res = await fetch("/api/weather")
      if (res.ok) {
        const data = await res.json() as WeatherData
        setWeather(data)
      }
    } catch {
      // Keep showing previous data on transient network errors
    }
  }, [])

  useEffect(() => {
    fetchWeather()
    const interval = setInterval(fetchWeather, 15 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchWeather])

  if (!time) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full">
        <div className="font-extralight tracking-tight text-foreground tabular-nums font-mono leading-none" style={{ fontSize: "clamp(4rem, 17vw, 8rem)" }}>
          {"--:--"}
        </div>
      </div>
    )
  }

  const hours = time.getHours().toString().padStart(2, "0")
  const minutes = time.getMinutes().toString().padStart(2, "0")

  const weekday = time.toLocaleDateString("pt-BR", { weekday: "long" })
  const monthDay = time.toLocaleDateString("pt-BR", { weekday: undefined, month: "long", day: "numeric" })

  return (
    <div className="flex flex-col items-center justify-center w-full h-full gap-[clamp(0.2rem,0.7vh,0.55rem)]">
      {/* Clock — large, centered */}
      <div className="flex items-baseline">
        <span
          className="font-extralight tracking-tight text-foreground tabular-nums font-mono leading-none"
          style={{ fontSize: "clamp(4.5rem, 19vw, 9rem)" }}
        >
          {hours}
          <span className="animate-pulse">:</span>
          {minutes}
        </span>
        <span
          className="font-extralight text-muted-foreground/60 tabular-nums font-mono ml-[0.3em] leading-none self-end pb-[0.1em]"
          style={{ fontSize: "clamp(1.1rem, 3.8vw, 2rem)" }}
        >
          {seconds}
        </span>
      </div>

      {/* Weekday */}
      <div
        className="font-semibold tracking-[0.2em] uppercase text-muted-foreground leading-tight"
        style={{ fontSize: "clamp(0.875rem, 2.6vw, 1.25rem)" }}
      >
        {weekday}
      </div>

      {/* Date */}
      <div
        className="tracking-[0.12em] uppercase text-muted-foreground/55 leading-tight"
        style={{ fontSize: "clamp(0.75rem, 2.2vw, 1.05rem)" }}
      >
        {monthDay}
      </div>

      {/* Weather — compact strip below date */}
      <div className="flex items-center gap-[clamp(0.6rem,1.8vw,1.1rem)] mt-[clamp(0.3rem,1vh,0.6rem)] px-[clamp(0.9rem,2.4vw,1.5rem)] py-[clamp(0.4rem,1.1vh,0.6rem)] rounded-full bg-secondary/30">
        <WeatherIcon
          condition={weather?.condition ?? "clear"}
          className="size-[clamp(1rem,2.4vw,1.4rem)] text-chart-4 shrink-0"
        />
        <span
          className="font-light text-foreground tabular-nums font-mono leading-none"
          style={{ fontSize: "clamp(0.875rem, 2.4vw, 1.1rem)" }}
        >
          {weather ? `${weather.temp}\u00B0` : "--\u00B0"}
        </span>
        <span className="w-px h-4 bg-border/40 shrink-0" aria-hidden="true" />
        <span
          className="text-muted-foreground font-mono tabular-nums leading-none"
          style={{ fontSize: "clamp(0.8rem, 2vw, 0.975rem)" }}
        >
          {weather ? `${weather.low}\u00B0 / ${weather.high}\u00B0` : "--\u00B0 / --\u00B0"}
        </span>
      </div>
    </div>
  )
}
