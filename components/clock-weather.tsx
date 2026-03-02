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
      <div className="flex flex-col items-center justify-center gap-1 w-full h-full">
        <div className="text-9xl font-extralight tracking-tight text-foreground tabular-nums font-mono">
          {"--:--"}
        </div>
        <div className="text-[14px] font-medium tracking-[0.2em] uppercase text-muted-foreground">
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
    <div className="flex items-center w-full h-full px-10">
      <div className="flex w-full items-center justify-between gap-8">
        <div className="flex flex-col items-start gap-1 shrink-0">
          <div className="flex items-baseline">
            <span className="text-9xl font-extralight tracking-tight text-foreground tabular-nums font-mono leading-none">
              {hours}
              <span className="animate-pulse">:</span>
              {minutes}
            </span>
            <span className="text-xl font-extralight text-muted-foreground tabular-nums font-mono ml-1 leading-none">
              {seconds}
            </span>
          </div>
          <div className="text-[14px] font-medium tracking-[0.2em] uppercase text-muted-foreground">
            {dateStr.toUpperCase()}
          </div>
        </div>

        <div className="flex flex-col items-center gap-1.5 px-5 py-3 rounded-2xl bg-secondary/30 shrink-0">
          <WeatherIcon condition={weather?.condition ?? "clear"} className="size-8 text-shadow-chart-4" />
          <span className="text-4xl font-extralight tracking-tight text-foreground tabular-nums font-mono leading-none">
            {weather ? `${weather.temp}\u00B0` : "--\u00B0"}
          </span>
          <span className="text-[14px] text-muted-foreground font-mono tabular-nums">
            {weather ? `${weather.low}\u00B0 / ${weather.high}\u00B0` : "--\u00B0 / --\u00B0"}
          </span>
        </div>
      </div>
    </div>
  )
}
