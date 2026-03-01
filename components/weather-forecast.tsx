"use client"

import { Sun, Cloud, CloudSun, CloudRain, Star } from "lucide-react"

interface ForecastDay {
  day: string
  iconType: "sun" | "cloud-sun" | "cloud" | "cloud-rain"
  low: number
  high: number
}

const FORECAST_DATA: ForecastDay[] = [
  { day: "DOM.", iconType: "sun", low: 13, high: 27 },
  { day: "SEG.", iconType: "sun", low: 18, high: 27 },
  { day: "TER.", iconType: "cloud-sun", low: 12, high: 26 },
  { day: "QUA.", iconType: "cloud-sun", low: 14, high: 26 },
  { day: "QUI.", iconType: "sun", low: 18, high: 31 },
]

function WeatherIcon({ type, className }: { type: ForecastDay["iconType"]; className?: string }) {
  switch (type) {
    case "sun":
      return <Sun className={className} />
    case "cloud-sun":
      return <CloudSun className={className} />
    case "cloud":
      return <Cloud className={className} />
    case "cloud-rain":
      return <CloudRain className={className} />
    default:
      return <Sun className={className} />
  }
}

export function WeatherForecast() {
  return (
    <div className="flex items-stretch h-full px-6 py-5 gap-6">
      {/* Left: current weather */}
      <div className="flex flex-col justify-center gap-1 min-w-0 flex-1">
        <span className="text-base font-semibold text-foreground tracking-tight leading-tight">
          {"S\u00e3o Paulo"}
        </span>
        <div className="flex items-center gap-2.5 mt-1">
          <Sun className="size-7 text-chart-4 shrink-0" />
          <span className="text-5xl font-light text-foreground tabular-nums font-mono leading-none tracking-tighter">
            {"20\u00B0"}
          </span>
        </div>
        <div className="flex items-center gap-2.5 mt-1.5 text-xs text-muted-foreground font-mono tabular-nums">
          <span className="flex items-center gap-0.5">
            <svg width="10" height="10" viewBox="0 0 10 10" className="text-muted-foreground" aria-hidden="true">
              <path d="M5 7L5 3M5 7L3 5M5 7L7 5" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {"13\u00B0"}
          </span>
          <span className="flex items-center gap-0.5">
            <svg width="10" height="10" viewBox="0 0 10 10" className="text-muted-foreground" aria-hidden="true">
              <path d="M5 3L5 7M5 3L3 5M5 3L7 5" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {"27\u00B0"}
          </span>
        </div>
      </div>

      {/* Right: 5-day forecast */}
      <div className="flex flex-col justify-center gap-1.5 shrink-0">
        {FORECAST_DATA.map((day) => (
          <div key={day.day} className="flex items-center gap-2.5">
            <span className="text-[11px] font-semibold text-foreground w-9 tracking-tight">
              {day.day}
            </span>
            <WeatherIcon type={day.iconType} className="size-3.5 text-chart-4 shrink-0" />
            <span className="text-[11px] text-muted-foreground tabular-nums font-mono w-6 text-right">
              {day.low}{"\u00B0"}
            </span>
            <span className="text-[11px] text-foreground tabular-nums font-mono w-6 text-right">
              {day.high}{"\u00B0"}
            </span>
          </div>
        ))}
      </div>

      {/* Favorite star */}
      <div className="flex items-start pt-0.5">
        <button
          aria-label="Toggle favorite location"
          className="size-8 flex items-center justify-center rounded-full bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Star className="size-4" fill="currentColor" />
        </button>
      </div>
    </div>
  )
}
