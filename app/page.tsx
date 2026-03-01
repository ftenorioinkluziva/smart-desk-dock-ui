"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { ClockWeather } from "@/components/clock-weather"
import { ProductivityHub } from "@/components/productivity-hub"
import { Agenda } from "@/components/agenda"
import { AlarmsView } from "@/components/alarms-view"
import { AlarmOverlay } from "@/components/alarm-overlay"
import { SpotifyBar } from "@/components/spotify-bar"
import { useAlarms } from "@/hooks/use-alarms"
import { usePomodoro } from "@/hooks/use-pomodoro"
import type { Alarm, DayOfWeek } from "@/lib/alarms"

const PAGES = 4
const TIMER_DEFAULT = 5 * 60

// Tiny silent WAV — played silently on first touch to unlock iOS audio
const SILENT_WAV =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA"

export default function Page() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activePage, setActivePage] = useState(0)

  // --- Pomodoro (full sequence state machine, runs across page swipes) ---
  const pomodoro = usePomodoro()

  // --- Free Timer / Stopwatch state ---
  const [timerInitial, setTimerInitial] = useState(TIMER_DEFAULT)
  const [timerSeconds, setTimerSeconds] = useState(TIMER_DEFAULT)
  const [timerIsRunning, setTimerIsRunning] = useState(false)
  const [stopwatchElapsed, setStopwatchElapsed] = useState(0)
  const [stopwatchIsRunning, setStopwatchIsRunning] = useState(false)

  // --- Alarm state ---
  const { alarms, addAlarm, updateAlarm, deleteAlarm, toggleAlarm } = useAlarms()
  const [firingAlarm, setFiringAlarm] = useState<Alarm | null>(null)
  const [snoozed, setSnoozed] = useState<{ id: string; until: number } | null>(null)
  const lastFiredRef = useRef<string>("")

  // --- Timer effects (keep running while user browses other pages) ---
  useEffect(() => {
    if (!timerIsRunning || timerSeconds <= 0) return
    const id = setInterval(() => setTimerSeconds((p) => p - 1), 1000)
    return () => clearInterval(id)
  }, [timerIsRunning, timerSeconds])

  useEffect(() => {
    if (!stopwatchIsRunning) return
    const id = setInterval(() => setStopwatchElapsed((p) => p + 1), 1000)
    return () => clearInterval(id)
  }, [stopwatchIsRunning])

  // --- Alarm checking loop (1 s tick, deduped per minute) ---
  useEffect(() => {
    const id = setInterval(() => {
      if (firingAlarm) return

      const now = new Date()
      const h = now.getHours()
      const m = now.getMinutes()
      const key = `${h}:${m}`
      if (lastFiredRef.current === key) return

      const day = now.getDay() as DayOfWeek

      for (const alarm of alarms) {
        if (!alarm.enabled) continue
        if (alarm.hour !== h || alarm.minute !== m) continue
        // days=[]=every day; otherwise check the day
        if (alarm.days.length > 0 && !alarm.days.includes(day)) continue
        // respect per-alarm snooze
        if (snoozed?.id === alarm.id && Date.now() < snoozed.until) continue

        lastFiredRef.current = key
        setFiringAlarm(alarm)
        break
      }
    }, 1000)
    return () => clearInterval(id)
  }, [alarms, firingAlarm, snoozed])

  // --- iOS audio unlock: play silent audio on first user interaction ---
  useEffect(() => {
    const unlock = () => {
      const a = new Audio(SILENT_WAV)
      a.play().catch(() => {})
    }
    window.addEventListener("touchstart", unlock, { once: true, passive: true })
    window.addEventListener("click", unlock, { once: true })
    return () => {
      window.removeEventListener("touchstart", unlock)
      window.removeEventListener("click", unlock)
    }
  }, [])

  // --- Carousel ---
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setActivePage(Math.round(el.scrollLeft / el.clientWidth))
  }, [])

  const scrollToPage = useCallback((index: number) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" })
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener("scroll", handleScroll, { passive: true })
    return () => el.removeEventListener("scroll", handleScroll)
  }, [handleScroll])

  // --- Alarm overlay handlers ---
  function handleStop() {
    setSnoozed(null)
    setFiringAlarm(null)
  }

  function handleSnooze() {
    if (firingAlarm) setSnoozed({ id: firingAlarm.id, until: Date.now() + 10 * 60 * 1000 })
    setFiringAlarm(null)
  }

  return (
    <div className="h-dvh w-dvw overflow-hidden bg-background relative flex flex-col">
      {/* Alarm full-screen overlay (above everything) */}
      {firingAlarm && (
        <AlarmOverlay alarm={firingAlarm} onStop={handleStop} onSnooze={handleSnooze} />
      )}

      {/* Edge tap zones for carousel navigation */}
      <div
        className="absolute left-0 top-0 w-8 h-full z-20 cursor-pointer"
        onClick={() => scrollToPage(Math.max(0, activePage - 1))}
        aria-label="Previous page"
      />
      <div
        className="absolute right-0 top-0 w-8 h-full z-20 cursor-pointer"
        onClick={() => scrollToPage(Math.min(PAGES - 1, activePage + 1))}
        aria-label="Next page"
      />

      {/* Carousel */}
      <div
        ref={scrollRef}
        className="flex-1 flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
      >
        {/* View 1 — Clock & Weather */}
        <section className="w-full h-full flex-shrink-0 snap-center flex items-center justify-center">
          <ClockWeather />
        </section>

        {/* View 2 — Productivity Hub */}
        <section className="w-full h-full flex-shrink-0 snap-center flex items-center justify-center">
          <ProductivityHub
            pomodoro={pomodoro}
            timerSeconds={timerSeconds}
            timerIsRunning={timerIsRunning}
            timerInitial={timerInitial}
            onTimerToggle={() => setTimerIsRunning((p) => !p)}
            onTimerReset={() => { setTimerIsRunning(false); setTimerSeconds(timerInitial) }}
            onTimerChange={(s) => { setTimerInitial(s); setTimerSeconds(s) }}
            stopwatchElapsed={stopwatchElapsed}
            stopwatchIsRunning={stopwatchIsRunning}
            onStopwatchToggle={() => setStopwatchIsRunning((p) => !p)}
            onStopwatchReset={() => { setStopwatchIsRunning(false); setStopwatchElapsed(0) }}
          />
        </section>

        {/* View 3 — Daily Agenda */}
        <section className="w-full h-full flex-shrink-0 snap-center">
          <Agenda />
        </section>

        {/* View 4 — Alarms */}
        <section className="w-full h-full flex-shrink-0 snap-center">
          <AlarmsView
            alarms={alarms}
            onAdd={addAlarm}
            onUpdate={updateAlarm}
            onDelete={deleteAlarm}
            onToggle={toggleAlarm}
          />
        </section>
      </div>

      {/* Pagination dots */}
      <div className="flex items-center justify-center gap-1.5 pb-1">
        {Array.from({ length: PAGES }).map((_, i) => (
          <span
            key={i}
            className={`rounded-full transition-all duration-300 ${
              activePage === i ? "w-1.5 h-1.5 bg-foreground" : "w-1 h-1 bg-muted-foreground/40"
            }`}
            aria-hidden="true"
          />
        ))}
      </div>

      {/* Persistent Spotify bar */}
      <div className="w-full border-t border-border/50 bg-background/80 backdrop-blur-sm z-50">
        <SpotifyBar />
      </div>
    </div>
  )
}
