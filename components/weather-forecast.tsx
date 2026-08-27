"use client"

import { useCallback, useEffect, useState } from "react"
import { Sun, Cloud, CloudRain, CloudSun, CloudLightning, Snowflake } from "lucide-react"
import { z } from "zod"
import { authClient } from "@/lib/auth-client"
import { DockDataSourceError, useDockDataSource } from "@/components/dock-runtime-provider"
import { readUserCache, writeUserCache } from "@/lib/user-cache"

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
  mock?: boolean
}

const weatherResponseSchema = z.object({
  location: z.string(),
  temp: z.number(),
  high: z.number(),
  low: z.number(),
  condition: z.string(),
  forecast: z.array(z.object({ day: z.string(), date: z.string(), condition: z.string(), low: z.number(), high: z.number() })),
}).passthrough()

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
  const { data: session } = authClient.useSession()
  const [cachedWeather, setCachedWeather] = useState<WeatherResponse | null>(null)
  const [cachedAt, setCachedAt] = useState<string | null>(null)

  const fetchWeather = useCallback(async () => {
    const response = await fetch("/api/weather")
    if (!response.ok) throw new DockDataSourceError("UPSTREAM_UNAVAILABLE")
    const parsed = weatherResponseSchema.safeParse(await response.json())
    if (!parsed.success) throw new DockDataSourceError("INVALID_RESPONSE")
    writeUserCache(session?.user?.id, "weather", parsed.data)
    return parsed.data
  }, [session?.user?.id])

  const weatherSource = useDockDataSource("weather", fetchWeather, {
    panelId: "weather",
    schema: weatherResponseSchema,
  })

  useEffect(() => {
    const cached = readUserCache(session?.user?.id, "weather", weatherResponseSchema)
    if (cached) {
      setCachedWeather(cached.data)
      setCachedAt(cached.savedAt)
    }
  }, [session?.user?.id])

  const weather = weatherSource.data ?? cachedWeather
  const weatherUpdatedAt = weatherSource.state.updatedAt ?? cachedAt
  const isStale = weatherSource.isStale || (weatherSource.data === null && cachedWeather !== null)

  const forecast = weather?.forecast?.length ? weather.forecast : PLACEHOLDER_FORECAST
  const isLoaded = !!weather

  return (
    <section aria-labelledby="weather-heading" className="flex items-center h-full w-full dock-px gap-[clamp(0.75rem,2.5vw,1.5rem)]">
      <h2 id="weather-heading" className="sr-only">Clima</h2>

      <div className="absolute top-[calc(var(--dock-pad-y)+0.15rem)] right-[calc(var(--dock-pad-x)+var(--dock-safe-right))] text-muted-foreground/55" style={{ fontSize: "clamp(0.48rem,1.2vw,0.58rem)" }}>
        {weatherUpdatedAt ? `${isStale ? "Último valor · " : "Atualizado · "}${new Date(weatherUpdatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "Aguardando clima"}
      </div>

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
