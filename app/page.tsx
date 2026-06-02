"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { WeatherForecast } from "@/components/weather-forecast"
import { ProductivityHub } from "@/components/productivity-hub"
import { CalendarPage } from "@/components/agenda"
import { TodayPanel } from "@/components/today-panel"
import { SettingsPanel } from "@/components/settings-panel"
import { NightDock } from "@/components/night-dock"
import { HomeAssistantPanel } from "@/components/home-assistant-panel"
import { SpotifyExpandedPanel } from "@/components/spotify-expanded-panel"
import { FinancePanel } from "@/components/finance-panel"
import { VoiceAgentPanel } from "@/components/voice-agent-panel"
import { WindyMap } from "@/components/windy-map"
import { isWithinNightMode, NIGHT_MODE_SETTINGS_EVENT, readNightModeSettings } from "@/lib/dock-settings"
const PAGES = 10
const NIGHT_DOCK_PAGE_INDEX = 2

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

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault()
      const next = Math.min(activePage + 1, PAGES - 1)
      scrollToPage(next)
    } else if (e.key === "ArrowLeft") {
      e.preventDefault()
      const prev = Math.max(activePage - 1, 0)
      scrollToPage(prev)
    }
  }, [activePage, scrollToPage])

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
      <SettingsPanel showTrigger={activePage === 0} />

      {/* Carousel content area */}
      <div
        ref={scrollRef}
        data-dock-carousel
        className="flex-1 flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
        onKeyDown={handleKeyDown}
      >
        {/* Page 1: Today */}
        <section className="w-full h-full shrink-0 snap-center flex items-center justify-center">
          <TodayPanel />
        </section>

        {/* Page 2: Voice Agent */}
        <section className="w-full h-full shrink-0 snap-center flex items-center justify-center">
          <VoiceAgentPanel />
        </section>

        {/* Page 3: Night Dock */}
        <section className="w-full h-full shrink-0 snap-center flex items-center justify-center">
          <NightDock />
        </section>

        {/* Page 4: Weather Forecast */}
        <section className="w-full h-full shrink-0 snap-center flex items-center justify-center">
          <WeatherForecast />
        </section>

        {/* Page 5: Pomodoro / Productivity Hub */}
        <section className="w-full h-full shrink-0 snap-center flex items-center justify-center">
          <ProductivityHub />
        </section>

        {/* Page 6: Calendar */}
        <section className="w-full h-full shrink-0 snap-center flex items-center justify-center">
          <CalendarPage />
        </section>

        {/* Page 7: Home Assistant */}
        <section className="w-full h-full shrink-0 snap-center flex items-center justify-center">
          <HomeAssistantPanel />
        </section>

        {/* Page 8: Finance */}
        <section className="w-full h-full shrink-0 snap-center flex items-center justify-center">
          <FinancePanel />
        </section>

        {/* Page 9: Expanded Spotify */}
        <section className="w-full h-full shrink-0 snap-center flex items-center justify-center">
          <SpotifyExpandedPanel />
        </section>

        {/* Page 10: Windy Map */}
        <section className="w-full h-full shrink-0 snap-center flex items-center justify-center">
          <WindyMap />
        </section>

      </div>

      {/* Pagination Dots */}
      <div
        className={`absolute inset-x-0 bottom-[calc(var(--dock-safe-bottom)+0.25rem)] flex items-center justify-center gap-1 transition-opacity ${
          activePage === PAGES - 1 ? "opacity-0" : "opacity-100"
        }`}
      >
        {Array.from({ length: PAGES }).map((_, i) => (
          <button
            key={i}
            onClick={() => scrollToPage(i)}
            className={`rounded-full transition-[width,height] duration-300 ${
              activePage === i
                ? "w-[clamp(0.3rem,0.9vw,0.4rem)] h-[clamp(0.3rem,0.9vw,0.4rem)] bg-foreground"
                : "w-[clamp(0.2rem,0.7vw,0.3rem)] h-[clamp(0.2rem,0.7vw,0.3rem)] bg-muted-foreground/40"
            }`}
            aria-label={`Ir para painel ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
