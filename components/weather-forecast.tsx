"use client"

import { useCallback, useEffect, useState } from "react"
import { Sun, Cloud, CloudRain, CloudSun, CloudLightning, Snowflake, Star } from "lucide-react"

interface ForecastDay {
  day: string
  condition: string
  low: number
  high: number
}

interface WeatherResponse {
  location: string
  temp: number
  high: number
  low: number
  condition: string
  forecast: ForecastDay[]
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
    case "partly-cloudy":
      return <CloudSun className={className} />
    default:
      return <Sun className={className} />
  }
}

export function WeatherForecast() {
  const [weather, setWeather] = useState<WeatherResponse | null>(null)

  const fetchWeather = useCallback(async () => {
    try {
      const response = await fetch("/api/weather")
      if (!response.ok) {
        return
      }

      const data = await response.json() as WeatherResponse
      setWeather(data)
    } catch {
      // Preserve previous weather state on transient errors
    }
  }, [])

  useEffect(() => {
    fetchWeather()
    const interval = setInterval(fetchWeather, 15 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchWeather])

  const forecast = weather?.forecast ?? []

  return (
    <div className="flex items-center h-full w-full dock-px">
      <div className="flex w-full items-center justify-between" style={{ gap: "var(--dock-gap)" }}>
        <div className="flex flex-col items-start gap-1.5">
          <span className="text-[clamp(0.65rem,1.7vw,0.875rem)] font-semibold text-foreground tracking-tight leading-tight">
            {weather?.location ?? "Brasília"}
          </span>
          <div className="flex items-center gap-3 mt-1">
            <WeatherIcon condition={weather?.condition ?? "clear"} className="size-[clamp(1.3rem,2.8vw,2.25rem)] text-chart-4 shrink-0" />
            <span className="font-light text-foreground tabular-nums font-mono leading-none tracking-tighter" style={{ fontSize: "var(--dock-big-number-size)" }}>
              {weather ? `${weather.temp}\u00B0` : "--\u00B0"}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-[clamp(0.6rem,1.4vw,0.75rem)] text-muted-foreground font-mono tabular-nums">
            <span className="flex items-center gap-0.5">
              <svg width="10" height="10" viewBox="0 0 10 10" className="text-muted-foreground" aria-hidden="true">
                <path d="M5 7L5 3M5 7L3 5M5 7L7 5" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {weather ? `${weather.low}\u00B0` : "--\u00B0"}
            </span>
            <span className="flex items-center gap-0.5">
              <svg width="10" height="10" viewBox="0 0 10 10" className="text-muted-foreground" aria-hidden="true">
                <path d="M5 3L5 7M5 3L3 5M5 3L7 5" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {weather ? `${weather.high}\u00B0` : "--\u00B0"}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-[clamp(0.5rem,1.6vw,1.25rem)]">
          <div className="flex flex-col justify-center gap-[clamp(0.35rem,1vh,0.5rem)] min-w-[clamp(7rem,26vw,9rem)]">
            {forecast.map((day) => (
              <div key={day.day} className="flex items-center gap-2.5">
                <span className="text-[clamp(0.55rem,1.3vw,0.7rem)] font-semibold text-foreground w-9 tracking-tight">
                  {day.day}
                </span>
                <WeatherIcon condition={day.condition} className="size-[clamp(0.65rem,1.2vw,0.875rem)] text-chart-4 shrink-0" />
                <span className="text-[clamp(0.55rem,1.3vw,0.7rem)] text-muted-foreground tabular-nums font-mono w-6 text-right">
                  {day.low}{"\u00B0"}
                </span>
                <span className="text-[clamp(0.55rem,1.3vw,0.7rem)] text-foreground tabular-nums font-mono w-6 text-right">
                  {day.high}{"\u00B0"}
                </span>
              </div>
            ))}

            {forecast.length === 0 &&
              Array.from({ length: 5 }).map((_, index) => (
                <div key={`placeholder-${index}`} className="flex items-center gap-2.5">
                  <span className="text-[clamp(0.55rem,1.3vw,0.7rem)] font-semibold text-foreground w-9 tracking-tight">---</span>
                  <Sun className="size-[clamp(0.65rem,1.2vw,0.875rem)] text-chart-4 shrink-0" />
                  <span className="text-[clamp(0.55rem,1.3vw,0.7rem)] text-muted-foreground tabular-nums font-mono w-6 text-right">--°</span>
                  <span className="text-[clamp(0.55rem,1.3vw,0.7rem)] text-foreground tabular-nums font-mono w-6 text-right">--°</span>
                </div>
              ))}
          </div>

          <div className="flex items-start pt-0.5">
            <button
              aria-label="Toggle favorite location"
              className="size-8 flex items-center justify-center rounded-full bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Star className="size-4" fill="currentColor" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
