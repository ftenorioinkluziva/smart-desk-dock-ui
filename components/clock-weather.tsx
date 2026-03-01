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
  const [weather, setWeather] = useState<WeatherData | null>(null)

  // Clock — update every second
  useEffect(() => {
    setTime(new Date())
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Weather — fetch on mount then poll every 15 minutes
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
      <div className="flex flex-col items-center justify-center gap-1">
        <div className="text-9xl font-extralight tracking-tight text-foreground tabular-nums font-mono">
          {"--:--"}
        </div>
        <div className="text-sm font-medium tracking-[0.2em] uppercase text-muted-foreground">
          {"loading..."}
        </div>
      </div>
    )
  }

  const hours = time.getHours().toString().padStart(2, "0")
  const minutes = time.getMinutes().toString().padStart(2, "0")

  const dateStr = time
    .toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    })
    .toUpperCase()

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      {/* Massive clock */}
      <div className="text-9xl font-extralight tracking-tight text-foreground tabular-nums font-mono leading-none">
        {hours}
        <span className="animate-pulse">:</span>
        {minutes}
      </div>

      {/* Date */}
      <div className="text-sm font-medium tracking-[0.2em] uppercase text-muted-foreground">
        {dateStr}
      </div>

      {/* Weather */}
      <div className="flex items-center gap-2 mt-1">
        <WeatherIcon
          condition={weather?.condition ?? "clear"}
          className="size-5 text-muted-foreground"
        />
        <span className="text-lg text-foreground font-light tabular-nums">
          {weather ? `${weather.temp}\u00B0C` : "--\u00B0C"}
        </span>
        <span className="text-sm text-muted-foreground font-mono tabular-nums">
          {weather
            ? `H: ${weather.high}\u00B0 L: ${weather.low}\u00B0`
            : "H: --\u00B0 L: --\u00B0"}
        </span>
      </div>
    </div>
  )
}
