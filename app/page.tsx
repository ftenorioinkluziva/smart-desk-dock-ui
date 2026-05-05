"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { WeatherForecast } from "@/components/weather-forecast"
import { ProductivityHub } from "@/components/productivity-hub"
import { CalendarPage } from "@/components/agenda"
import { SpotifyBar } from "@/components/spotify-bar"
import { TodayPanel } from "@/components/today-panel"
import { SettingsPanel } from "@/components/settings-panel"
import { NightDock } from "@/components/night-dock"
import { isWithinNightMode, NIGHT_MODE_SETTINGS_EVENT, readNightModeSettings } from "@/lib/dock-settings"
const PAGES = 5
const NIGHT_DOCK_PAGE_INDEX = 1

export default function Page() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activePage, setActivePage] = useState(0)
  const [nightModeSettings, setNightModeSettings] = useState(() => readNightModeSettings())

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

  const scrollToPage = useCallback((pageIndex: number) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ left: el.clientWidth * pageIndex, behavior: "smooth" })
  }, [])

  useEffect(() => {
    const handleSettingsChange = () => setNightModeSettings(readNightModeSettings())
    window.addEventListener(NIGHT_MODE_SETTINGS_EVENT, handleSettingsChange)
    return () => window.removeEventListener(NIGHT_MODE_SETTINGS_EVENT, handleSettingsChange)
  }, [])

  useEffect(() => {
    let wasInNightMode = isWithinNightMode(new Date(), nightModeSettings)

    if (wasInNightMode && activePage === 0) {
      scrollToPage(NIGHT_DOCK_PAGE_INDEX)
    }

    const interval = setInterval(() => {
      const isNightMode = isWithinNightMode(new Date(), nightModeSettings)
      if (isNightMode && !wasInNightMode) {
        scrollToPage(NIGHT_DOCK_PAGE_INDEX)
      }
      wasInNightMode = isNightMode
    }, 30 * 1000)

    return () => clearInterval(interval)
  }, [activePage, nightModeSettings, scrollToPage])

  return (
    <div className="h-dvh w-dvw overflow-hidden bg-background relative flex flex-col dock-py">
      <SettingsPanel />

      {/* Carousel content area */}
      <div
        ref={scrollRef}
        className="flex-1 flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
      >
        {/* Page 1: Today */}
        <section className="w-full h-full shrink-0 snap-center flex items-center justify-center">
          <TodayPanel />
        </section>

        {/* Page 2: Night Dock */}
        <section className="w-full h-full shrink-0 snap-center flex items-center justify-center">
          <NightDock />
        </section>

        {/* Page 3: Weather Forecast */}
        <section className="w-full h-full shrink-0 snap-center flex items-center justify-center">
          <WeatherForecast />
        </section>

        {/* Page 4: Pomodoro / Productivity Hub */}
        <section className="w-full h-full shrink-0 snap-center flex items-center justify-center">
          <ProductivityHub />
        </section>

        {/* Page 5: Calendar */}
        <section className="w-full h-full shrink-0 snap-center flex items-center justify-center">
          <CalendarPage />
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
