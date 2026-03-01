"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { ClockWeather } from "@/components/clock-weather"
import { WeatherForecast } from "@/components/weather-forecast"
import { ProductivityHub } from "@/components/productivity-hub"
import { CalendarPage } from "@/components/agenda"
import { SpotifyBar } from "@/components/spotify-bar"
import { Clock, CloudSun, Timer, Calendar, Music } from "lucide-react"

const PAGE_ICONS = [
  { icon: Clock, label: "Clock" },
  { icon: CloudSun, label: "Weather" },
  { icon: Timer, label: "Pomodoro" },
  { icon: Calendar, label: "Calendar" },
  { icon: Music, label: "Spotify" },
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
      {/* Carousel */}
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

        {/* Page 5: Spotify */}
        <section className="w-full h-full flex-shrink-0 snap-center flex items-center justify-center">
          <SpotifyFullPage />
        </section>
      </div>

      {/* Pagination - Icon based nav */}
      <nav className="flex items-center justify-center gap-3 py-1.5" aria-label="Page navigation">
        {PAGE_ICONS.map(({ icon: Icon, label }, i) => (
          <button
            key={label}
            onClick={() => scrollToPage(i)}
            aria-label={label}
            aria-current={activePage === i ? "page" : undefined}
            className={`flex items-center justify-center size-6 rounded-full transition-all duration-300 ${
              activePage === i
                ? "text-foreground bg-secondary/60"
                : "text-muted-foreground/40 hover:text-muted-foreground"
            }`}
          >
            <Icon className="size-3.5" />
          </button>
        ))}
      </nav>
    </div>
  )
}

function SpotifyFullPage() {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full px-4">
      <SpotifyBar />
    </div>
  )
}
