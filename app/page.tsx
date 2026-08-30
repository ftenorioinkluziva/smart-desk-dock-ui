"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
import { AuthGate } from "@/components/auth-gate"
import { PanelErrorBoundary } from "@/components/panel-error-boundary"
import { useDockPanels } from "@/components/dock-panel-provider"
import { useDockRuntime } from "@/components/dock-runtime-provider"
import { isLowPowerDockActive, isNightDockActive, NIGHT_MODE_SETTINGS_EVENT, readNightModeSettings } from "@/lib/dock-settings"
import type { DockPanelId } from "@/lib/dock-panels"

const PANEL_COMPONENTS: Record<DockPanelId, () => React.ReactNode> = {
  today: TodayPanel,
  voice: VoiceAgentPanel,
  weather: WeatherForecast,
  productivity: ProductivityHub,
  agenda: CalendarPage,
  "home-assistant": HomeAssistantPanel,
  finance: FinancePanel,
  spotify: SpotifyExpandedPanel,
  "windy-map": WindyMap,
}

export default function Page() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activePage, setActivePage] = useState(0)
  const [nightModeSettings, setNightModeSettings] = useState(() => readNightModeSettings())
  const [nightDockActive, setNightDockActive] = useState(() => isNightDockActive(new Date(), readNightModeSettings()))
  const { config, visiblePanelIds } = useDockPanels()
  const { setActivePanel, setLowPowerMode } = useDockRuntime()
  const visiblePanelKey = visiblePanelIds.join("|")
  const lowPowerMode = isLowPowerDockActive(new Date(), nightModeSettings)

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el || el.clientWidth <= 0) return
    const index = Math.max(0, Math.min(visiblePanelIds.length - 1, Math.round(el.scrollLeft / el.clientWidth)))
    setActivePage(index)
  }, [visiblePanelIds.length])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener("scroll", handleScroll, { passive: true })
    return () => el.removeEventListener("scroll", handleScroll)
  }, [handleScroll])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const sections = container.querySelectorAll<HTMLElement>("[data-dock-panel]")
    if (sections.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting && e.intersectionRatio > 0.5)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)

        if (visible.length === 0) return

        const panelId = visible[0].target.getAttribute("data-dock-panel")
        if (!panelId) return
        const index = visiblePanelIds.indexOf(panelId as DockPanelId)
        if (index >= 0) setActivePage(index)
      },
      { root: container, threshold: [0.5, 0.6, 0.7, 0.8, 0.9, 1] },
    )

    for (const section of sections) observer.observe(section)
    return () => observer.disconnect()
  }, [visiblePanelIds])

  const scrollToPage = useCallback((pageIndex: number, behavior: ScrollBehavior = "smooth") => {
    const el = scrollRef.current
    if (!el || visiblePanelIds.length === 0) return
    const safeIndex = Math.max(0, Math.min(visiblePanelIds.length - 1, pageIndex))
    el.scrollTo({ left: el.clientWidth * safeIndex, behavior })
    setActivePage(safeIndex)
  }, [visiblePanelIds.length])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault()
      scrollToPage(activePage + 1)
    } else if (e.key === "ArrowLeft") {
      e.preventDefault()
      scrollToPage(activePage - 1)
    }
  }, [activePage, scrollToPage])

  useEffect(() => {
    const handleSettingsChange = () => {
      const nextSettings = readNightModeSettings()
      setNightModeSettings(nextSettings)
      setNightDockActive(isNightDockActive(new Date(), nextSettings))
    }
    window.addEventListener(NIGHT_MODE_SETTINGS_EVENT, handleSettingsChange)
    return () => window.removeEventListener(NIGHT_MODE_SETTINGS_EVENT, handleSettingsChange)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      setNightDockActive(isNightDockActive(now, nightModeSettings))
    }, 30 * 1000)

    return () => clearInterval(interval)
  }, [nightModeSettings])

  useEffect(() => {
    setLowPowerMode(lowPowerMode)
    setActivePanel(nightDockActive ? null : visiblePanelIds[activePage] ?? null)
  }, [activePage, lowPowerMode, nightDockActive, setActivePanel, setLowPowerMode, visiblePanelIds])

  useEffect(() => {
    const initialIndex = visiblePanelIds.indexOf(config.initialPanelId)
    const safeIndex = initialIndex >= 0 ? initialIndex : 0
    setActivePage(safeIndex)
    requestAnimationFrame(() => scrollToPage(safeIndex, "auto"))
  // The order key changes only when the configured panel set/order changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.initialPanelId, visiblePanelKey])

  useEffect(() => {
    if (!config.autoRotate || nightDockActive || visiblePanelIds.length < 2) return

    const interval = window.setInterval(() => {
      setActivePage((current) => {
        const next = (current + 1) % visiblePanelIds.length
        const carousel = scrollRef.current
        carousel?.scrollTo({ left: (carousel.clientWidth || 0) * next, behavior: "smooth" })
        return next
      })
    }, 60 * 1000)

    return () => window.clearInterval(interval)
  }, [config.autoRotate, nightDockActive, visiblePanelIds.length])

  useEffect(() => {
    if (nightDockActive) return
    const current = visiblePanelIds[activePage]
    if (current) return
    scrollToPage(0, "auto")
  }, [activePage, nightDockActive, scrollToPage, visiblePanelIds])

  const renderedPanels = useMemo(() => visiblePanelIds.map((panelId) => ({
    panelId,
    Panel: PANEL_COMPONENTS[panelId],
  })), [visiblePanelIds])

  return (
    <AuthGate>
      <div
        className={`h-dvh w-dvw overflow-hidden relative flex flex-col dock-py ${nightDockActive ? "night-dock-surface bg-background" : "bg-background"}`}
      >
        <header className="flex h-[var(--dock-chrome-size)] shrink-0 items-center justify-end dock-px">
          <SettingsPanel showTrigger />
        </header>

        {nightDockActive ? (
          <main className="flex min-h-0 flex-1 items-center justify-center">
            <NightDock lowPowerMode={lowPowerMode} />
          </main>
        ) : (
          <div
            ref={scrollRef}
            data-dock-carousel
            tabIndex={0}
            className="flex-1 flex overflow-x-auto snap-x snap-mandatory scrollbar-hide outline-none"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
            onKeyDown={handleKeyDown}
            aria-label="Painéis do Focus Dock"
          >
            {renderedPanels.map(({ panelId, Panel }) => (
              <section key={panelId} data-dock-panel={panelId} className="w-full h-full shrink-0 snap-center flex items-center justify-center">
                <PanelErrorBoundary panelId={panelId}>
                  <Panel />
                </PanelErrorBoundary>
              </section>
            ))}
          </div>
        )}

        <div
          className={`absolute inset-x-0 bottom-[calc(var(--dock-safe-bottom)+0.25rem)] flex items-center justify-center gap-1 transition-opacity ${
            nightDockActive || visiblePanelIds.length < 2 ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
          aria-label="Navegação dos painéis"
        >
          {visiblePanelIds.map((panelId, index) => (
            <button
              key={panelId}
              type="button"
              onClick={() => scrollToPage(index)}
              className={`rounded-full transition-[width,height] duration-300 ${
                activePage === index
                  ? "w-[clamp(0.3rem,0.9vw,0.4rem)] h-[clamp(0.3rem,0.9vw,0.4rem)] bg-foreground"
                  : "w-[clamp(0.2rem,0.7vw,0.3rem)] h-[clamp(0.2rem,0.7vw,0.3rem)] bg-muted-foreground/40"
              }`}
              aria-label={`Ir para painel ${index + 1}`}
              aria-current={activePage === index ? "true" : undefined}
            />
          ))}
        </div>
      </div>
    </AuthGate>
  )
}
