"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { ClockWeather } from "@/components/clock-weather"
import { WeatherForecast } from "@/components/weather-forecast"
import { ProductivityHub } from "@/components/productivity-hub"
import { CalendarPage } from "@/components/agenda"
import { AlarmsPage } from "@/components/alarms-page"
import { SpotifyBar } from "@/components/spotify-bar"
const PAGES = 5

export default function Page() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activePage, setActivePage] = useState(0)

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const index = Math.round(el.scrollLeft / el.clientWidth)
    setActivePage(index)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener("scroll", handleScroll, { passive: true })
    return () => el.removeEventListener("scroll", handleScroll)
  }, [handleScroll])

  return (
    <div className="h-dvh w-dvw overflow-hidden bg-background relative flex flex-col dock-py">
      {/* Carousel content area */}
      <div
        ref={scrollRef}
        className="flex-1 flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
      >
        {/* Page 1: Clock */}
        <section className="w-full h-full shrink-0 snap-center flex items-center justify-center">
          <ClockWeather />
        </section>

        {/* Page 2: Weather Forecast */}
        <section className="w-full h-full shrink-0 snap-center flex items-center justify-center">
          <WeatherForecast />
        </section>

        {/* Page 3: Pomodoro / Productivity Hub */}
        <section className="w-full h-full shrink-0 snap-center flex items-center justify-center">
          <ProductivityHub />
        </section>

        {/* Page 4: Calendar */}
        <section className="w-full h-full shrink-0 snap-center flex items-center justify-center">
          <CalendarPage />
        </section>

        {/* Page 5: Alarms */}
        <section className="w-full h-full shrink-0 snap-center flex items-center justify-center">
          <AlarmsPage />
        </section>
      </div>

      {/* Persistent Spotify Bar - always visible as footer */}
      <div className="w-full border-t border-border/30 bg-background/90 backdrop-blur-sm shrink-0">
        <SpotifyBar />
      </div>

      {/* Pagination Dots */}
      <div className="flex items-center justify-center gap-1 py-[clamp(0.2rem,0.7vh,0.4rem)] shrink-0">
        {Array.from({ length: PAGES }).map((_, i) => (
          <span
            key={i}
            className={`rounded-full transition-all duration-300 ${
              activePage === i
                ? "w-[clamp(0.3rem,0.9vw,0.4rem)] h-[clamp(0.3rem,0.9vw,0.4rem)] bg-foreground"
                : "w-[clamp(0.2rem,0.7vw,0.3rem)] h-[clamp(0.2rem,0.7vw,0.3rem)] bg-muted-foreground/40"
            }`}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  )
}
