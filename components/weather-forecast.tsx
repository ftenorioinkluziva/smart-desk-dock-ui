"use client"

import { useCallback, useEffect, useState } from "react"
import { Sun, Cloud, CloudRain, CloudSun, CloudLightning, Snowflake } from "lucide-react"

interface ForecastDay {
  day: string
  date: string
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

const PLACEHOLDER_FORECAST: ForecastDay[] = Array.from({ length: 5 }, (_, i) => ({
  day: ["DOM.", "SEG.", "TER.", "QUA.", "QUI."][i],
  date: ["05", "06", "07", "08", "09"][i],
  condition: "clear",
  low: 0,
  high: 0,
}))

export function WeatherForecast() {
  const [weather, setWeather] = useState<WeatherResponse | null>(null)

  const fetchWeather = useCallback(async () => {
    try {
      const response = await fetch("/api/weather")
      if (!response.ok) return
      const data = await response.json() as WeatherResponse
      setWeather(data)
    } catch {
      // Preserve previous state on transient errors
    }
  }, [])

  useEffect(() => {
    fetchWeather()
    const interval = setInterval(fetchWeather, 15 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchWeather])

  const forecast = weather?.forecast?.length ? weather.forecast : PLACEHOLDER_FORECAST
  const isLoaded = !!weather

  return (
    <section aria-labelledby="weather-heading" className="flex items-center h-full w-full dock-px gap-[clamp(0.75rem,2.5vw,1.5rem)]">
      <h2 id="weather-heading" className="sr-only">Clima</h2>

      {/* ── Left: current conditions ── */}
      <div className="flex flex-col justify-center gap-[clamp(0.25rem,0.8vh,0.5rem)] shrink-0">
        {/* Location */}
        <span
          className="font-medium tracking-[0.18em] uppercase text-muted-foreground leading-none"
          style={{ fontSize: "clamp(0.65rem,2vw,0.9rem)" }}
        >
          {weather?.location ?? "Brasília"}
        </span>

        {/* Icon + Temperature */}
        <div className="flex items-center gap-[clamp(0.5rem,1.5vw,0.875rem)]">
          <WeatherIcon
            condition={weather?.condition ?? "clear"}
            className="size-[clamp(1.75rem,5vw,3rem)] text-foreground shrink-0"
          />
          <span
            className="font-extralight text-foreground tabular-nums font-mono leading-none tracking-tight"
            style={{ fontSize: "clamp(3.2rem,13vw,6rem)" }}
          >
            {isLoaded ? `${weather!.temp}°` : "--°"}
          </span>
        </div>

        {/* Low / High */}
        <div
          className="flex items-center gap-[clamp(0.6rem,1.8vw,1rem)] font-mono tabular-nums"
          style={{ fontSize: "clamp(0.75rem,2.2vw,1rem)" }}
        >
          <span className="text-muted-foreground">
            ↓ {isLoaded ? `${weather!.low}°` : "--°"}
          </span>
          <span className="text-foreground">
            ↑ {isLoaded ? `${weather!.high}°` : "--°"}
          </span>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="w-px self-[stretch] bg-border/30 shrink-0 my-[clamp(0.5rem,1.5vh,1rem)]" />

      {/* ── Right: 5-day columns ── */}
      <div className="flex-1 flex items-center justify-around">
        {forecast.map((day) => (
          <div key={day.day} className="flex flex-col items-center gap-[clamp(0.2rem,0.6vh,0.4rem)]">
            <span
              className="font-semibold tracking-widest uppercase text-muted-foreground leading-none"
              style={{ fontSize: "clamp(0.6rem,1.8vw,0.8rem)" }}
            >
              {day.day}
            </span>
            <span
              className="font-mono tabular-nums text-muted-foreground/45 leading-none"
              style={{ fontSize: "clamp(0.56rem,1.5vw,0.7rem)" }}
            >
              {day.date}
            </span>

            <WeatherIcon
              condition={day.condition}
              className="size-[clamp(1.1rem,3vw,1.75rem)] text-foreground shrink-0"
            />

            <span
              className="font-medium text-foreground tabular-nums font-mono leading-none"
              style={{ fontSize: "clamp(0.8rem,2.4vw,1.1rem)" }}
            >
              {isLoaded ? `${day.high}°` : "--°"}
            </span>

            <span
              className="text-muted-foreground/65 tabular-nums font-mono leading-none"
              style={{ fontSize: "clamp(0.7rem,2vw,0.9rem)" }}
            >
              {isLoaded ? `${day.low}°` : "--°"}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
