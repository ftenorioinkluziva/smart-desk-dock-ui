"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { ClockWeather } from "@/components/clock-weather"
import { ProductivityHub } from "@/components/productivity-hub"
import { Agenda } from "@/components/agenda"
import { SpotifyBar } from "@/components/spotify-bar"

const PAGES = 3
const POMODORO_DURATION = 25 * 60
const TIMER_DEFAULT = 5 * 60

export default function Page() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activePage, setActivePage] = useState(0)

  // --- Timer state lifted up so timers persist across page swipes ---
  const [pomodoroSeconds, setPomodoroSeconds] = useState(POMODORO_DURATION)
  const [pomodoroIsRunning, setPomodoroIsRunning] = useState(false)

  const [timerInitial, setTimerInitial] = useState(TIMER_DEFAULT)
  const [timerSeconds, setTimerSeconds] = useState(TIMER_DEFAULT)
  const [timerIsRunning, setTimerIsRunning] = useState(false)

  const [stopwatchElapsed, setStopwatchElapsed] = useState(0)
  const [stopwatchIsRunning, setStopwatchIsRunning] = useState(false)

  // --- Timer effects (keep running even when user swipes to other pages) ---
  useEffect(() => {
    if (!pomodoroIsRunning || pomodoroSeconds <= 0) return
    const interval = setInterval(() => setPomodoroSeconds((prev) => prev - 1), 1000)
    return () => clearInterval(interval)
  }, [pomodoroIsRunning, pomodoroSeconds])

  useEffect(() => {
    if (!timerIsRunning || timerSeconds <= 0) return
    const interval = setInterval(() => setTimerSeconds((prev) => prev - 1), 1000)
    return () => clearInterval(interval)
  }, [timerIsRunning, timerSeconds])

  useEffect(() => {
    if (!stopwatchIsRunning) return
    const interval = setInterval(() => setStopwatchElapsed((prev) => prev + 1), 1000)
    return () => clearInterval(interval)
  }, [stopwatchIsRunning])

  // --- Carousel navigation ---
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const index = Math.round(el.scrollLeft / el.clientWidth)
    setActivePage(index)
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

  return (
    <div className="h-dvh w-dvw overflow-hidden bg-background relative flex flex-col">
      {/* Edge tap zones for page navigation */}
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
        {/* Page 1: Clock & Weather */}
        <section className="w-full h-full flex-shrink-0 snap-center flex items-center justify-center">
          <ClockWeather />
        </section>

        {/* Page 2: Productivity Hub */}
        <section className="w-full h-full flex-shrink-0 snap-center flex items-center justify-center">
          <ProductivityHub
            pomodoroSeconds={pomodoroSeconds}
            pomodoroIsRunning={pomodoroIsRunning}
            onPomodoroToggle={() => setPomodoroIsRunning((prev) => !prev)}
            onPomodoroReset={() => {
              setPomodoroIsRunning(false)
              setPomodoroSeconds(POMODORO_DURATION)
            }}
            timerSeconds={timerSeconds}
            timerIsRunning={timerIsRunning}
            timerInitial={timerInitial}
            onTimerToggle={() => setTimerIsRunning((prev) => !prev)}
            onTimerReset={() => {
              setTimerIsRunning(false)
              setTimerSeconds(timerInitial)
            }}
            onTimerChange={(secs) => {
              setTimerInitial(secs)
              setTimerSeconds(secs)
            }}
            stopwatchElapsed={stopwatchElapsed}
            stopwatchIsRunning={stopwatchIsRunning}
            onStopwatchToggle={() => setStopwatchIsRunning((prev) => !prev)}
            onStopwatchReset={() => {
              setStopwatchIsRunning(false)
              setStopwatchElapsed(0)
            }}
          />
        </section>

        {/* Page 3: Daily Agenda */}
        <section className="w-full h-full flex-shrink-0 snap-center">
          <Agenda />
        </section>
      </div>

      {/* Pagination Dots */}
      <div className="flex items-center justify-center gap-1.5 pb-1">
        {Array.from({ length: PAGES }).map((_, i) => (
          <span
            key={i}
            className={`rounded-full transition-all duration-300 ${
              activePage === i
                ? "w-1.5 h-1.5 bg-foreground"
                : "w-1 h-1 bg-muted-foreground/40"
            }`}
            aria-hidden="true"
          />
        ))}
      </div>

      {/* Persistent Spotify Bar */}
      <div className="w-full border-t border-border/50 bg-background/80 backdrop-blur-sm z-50">
        <SpotifyBar />
      </div>
    </div>
  )
}
