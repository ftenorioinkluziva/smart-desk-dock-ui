"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { ClockWeather } from "@/components/clock-weather"
import { WeatherForecast } from "@/components/weather-forecast"
import { ProductivityHub } from "@/components/productivity-hub"
import { CalendarPage } from "@/components/agenda"
import { AlarmsPage } from "@/components/alarms-page"
import { SpotifyBar } from "@/components/spotify-bar"
import { Clock, CloudSun, Timer, Calendar, AlarmClock } from "lucide-react"

const PAGE_ICONS = [
  { icon: Clock, label: "Clock" },
  { icon: CloudSun, label: "Weather" },
  { icon: Timer, label: "Pomodoro" },
  { icon: Calendar, label: "Calendar" },
  { icon: AlarmClock, label: "Alarms" },
]

const PAGES = PAGE_ICONS.length

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

  const scrollToPage = useCallback((index: number) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" })
  }, [])

  return (
    <div className="h-dvh w-dvw overflow-hidden bg-background relative flex flex-col">
      {/* Carousel content area */}
      <div
        ref={scrollRef}
        className="flex-1 flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
      >
        {/* Page 1: Clock */}
        <section className="w-full h-full flex-shrink-0 snap-center flex items-center justify-center">
          <ClockWeather />
        </section>

        {/* Page 2: Weather Forecast */}
        <section className="w-full h-full flex-shrink-0 snap-center flex items-center justify-center">
          <WeatherForecast />
        </section>

        {/* Page 3: Pomodoro / Productivity Hub */}
        <section className="w-full h-full flex-shrink-0 snap-center flex items-center justify-center">
          <ProductivityHub />
        </section>

        {/* Page 4: Calendar */}
        <section className="w-full h-full flex-shrink-0 snap-center flex items-center justify-center">
          <CalendarPage />
        </section>

        {/* Page 5: Alarms */}
        <section className="w-full h-full flex-shrink-0 snap-center flex items-center justify-center">
          <AlarmsPage />
        </section>
      </div>

      {/* Persistent Spotify Bar - always visible as footer */}
      <div className="w-full border-t border-border/30 bg-background/90 backdrop-blur-sm shrink-0">
        <SpotifyBar />
      </div>

      {/* Bottom Navigation */}
      <nav className="w-full border-t border-border/20 bg-background shrink-0" aria-label="Page navigation">
        <div className="flex items-center justify-around px-2 py-1.5">
          {PAGE_ICONS.map(({ icon: Icon, label }, i) => (
            <button
              key={label}
              onClick={() => scrollToPage(i)}
              aria-label={label}
              aria-current={activePage === i ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-all duration-200 ${
                activePage === i
                  ? "text-accent"
                  : "text-muted-foreground/50 hover:text-muted-foreground"
              }`}
            >
              <Icon className="size-4" />
              <span className="text-[8px] font-medium tracking-wider uppercase">
                {label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
