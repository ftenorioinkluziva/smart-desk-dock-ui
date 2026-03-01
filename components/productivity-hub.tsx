"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Play, Pause, RotateCcw, Square, Coffee, Brain } from "lucide-react"

type Tab = "pomodoro" | "timer" | "stopwatch"
type PomodoroMode = "focus" | "short-break" | "long-break"

const POMODORO_DURATIONS: Record<PomodoroMode, number> = {
  "focus": 25 * 60,
  "short-break": 5 * 60,
  "long-break": 15 * 60,
}

const MODE_LABELS: Record<PomodoroMode, string> = {
  "focus": "Focus",
  "short-break": "Short Break",
  "long-break": "Long Break",
}

export function ProductivityHub() {
  const [activeTab, setActiveTab] = useState<Tab>("pomodoro")

  return (
    <div className="flex items-center justify-center h-full w-full px-5 gap-5">
      {/* Left: Segmented Control (vertical) */}
      <div className="flex flex-col items-center gap-1.5 shrink-0">
        {(["pomodoro", "timer", "stopwatch"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`w-full px-3.5 py-1.5 text-[10px] font-medium tracking-wide uppercase rounded-full transition-all text-center ${
              activeTab === tab
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Right: Content area */}
      <div className="flex-1 flex items-center justify-center min-w-0">
        {activeTab === "pomodoro" && <PomodoroView />}
        {activeTab === "timer" && <TimerView />}
        {activeTab === "stopwatch" && <StopwatchView />}
      </div>
    </div>
  )
}

function PomodoroView() {
  const [mode, setMode] = useState<PomodoroMode>("focus")
  const [totalSeconds, setTotalSeconds] = useState(POMODORO_DURATIONS["focus"])
  const [isRunning, setIsRunning] = useState(false)
  const [isAlarm, setIsAlarm] = useState(false)
  const [sessions, setSessions] = useState(0)
  const alarmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const duration = POMODORO_DURATIONS[mode]
  const progress = ((duration - totalSeconds) / duration) * 100

  useEffect(() => {
    if (!isRunning || totalSeconds <= 0) {
      if (totalSeconds <= 0 && isRunning) {
        setIsRunning(false)
        setIsAlarm(true)
        if (mode === "focus") {
          setSessions((prev) => prev + 1)
        }
        alarmTimeoutRef.current = setTimeout(() => {
          setIsAlarm(false)
        }, 8000)
      }
      return
    }
    const interval = setInterval(() => {
      setTotalSeconds((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [isRunning, totalSeconds, mode])

  useEffect(() => {
    return () => {
      if (alarmTimeoutRef.current) {
        clearTimeout(alarmTimeoutRef.current)
      }
    }
  }, [])

  const switchMode = useCallback((newMode: PomodoroMode) => {
    setMode(newMode)
    setTotalSeconds(POMODORO_DURATIONS[newMode])
    setIsRunning(false)
    setIsAlarm(false)
  }, [])

  const reset = useCallback(() => {
    setIsRunning(false)
    setTotalSeconds(POMODORO_DURATIONS[mode])
    setIsAlarm(false)
  }, [mode])

  const togglePlay = useCallback(() => {
    setIsAlarm(false)
    setIsRunning((prev) => !prev)
  }, [])

  const dismissAlarm = useCallback(() => {
    setIsAlarm(false)
  }, [])

  const mins = Math.floor(totalSeconds / 60).toString().padStart(2, "0")
  const secs = (totalSeconds % 60).toString().padStart(2, "0")

  const radius = 58
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="flex items-center gap-6 w-full">
      {/* Left side: circular timer */}
      <div
        className={`relative flex items-center justify-center shrink-0 transition-all duration-300 ${
          isAlarm ? "animate-pomodoro-alarm" : ""
        }`}
      >
        {isAlarm && (
          <div className="absolute inset-[-6px] rounded-full animate-pomodoro-pulse">
            <div className="w-full h-full rounded-full border-2 border-destructive/60" />
          </div>
        )}

        <svg
          width="140"
          height="140"
          viewBox="0 0 140 140"
          className="transform -rotate-90"
        >
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-secondary"
          />
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={`transition-all duration-1000 ease-linear ${
              isAlarm
                ? "text-destructive animate-pomodoro-blink"
                : mode === "focus"
                ? "text-accent"
                : "text-chart-2"
            }`}
          />
        </svg>

        <div className={`absolute flex flex-col items-center gap-0.5 ${
          isAlarm ? "animate-pomodoro-blink" : ""
        }`}>
          <span className={`text-4xl font-extralight tabular-nums font-mono tracking-tight leading-none ${
            isAlarm ? "text-destructive" : "text-foreground"
          }`}>
            {mins}:{secs}
          </span>
          <span className="text-[8px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
            {isAlarm ? "Time's up!" : MODE_LABELS[mode]}
          </span>
        </div>
      </div>

      {/* Right side: mode selector, controls, sessions */}
      <div className="flex flex-col items-start gap-3 flex-1 min-w-0">
        {/* Mode selector - horizontal */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(Object.keys(POMODORO_DURATIONS) as PomodoroMode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-medium uppercase tracking-wider transition-all ${
                mode === m
                  ? "bg-accent/20 text-accent"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "focus" ? (
                <Brain className="size-2.5" />
              ) : (
                <Coffee className="size-2.5" />
              )}
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2.5">
          {isAlarm ? (
            <button
              onClick={dismissAlarm}
              aria-label="Dismiss alarm"
              className="flex items-center justify-center h-9 px-5 rounded-full bg-destructive text-destructive-foreground font-medium text-xs hover:opacity-90 transition-opacity animate-pomodoro-blink"
            >
              {"Dismiss"}
            </button>
          ) : (
            <>
              <button
                onClick={togglePlay}
                aria-label={isRunning ? "Pause" : "Start"}
                className="flex items-center justify-center size-10 rounded-full bg-foreground text-background hover:opacity-90 transition-opacity"
              >
                {isRunning ? (
                  <Pause className="size-4" fill="currentColor" />
                ) : (
                  <Play className="size-4 ml-0.5" fill="currentColor" />
                )}
              </button>
              <button
                onClick={reset}
                aria-label="Reset timer"
                className="flex items-center justify-center size-9 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <RotateCcw className="size-3.5" />
              </button>
            </>
          )}
        </div>

        {/* Session counter */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <span
              key={i}
              className={`size-2 rounded-full transition-colors ${
                i < sessions % 4 ? "bg-accent" : "bg-secondary"
              }`}
              aria-hidden="true"
            />
          ))}
          <span className="text-[9px] text-muted-foreground ml-1 font-mono tabular-nums">
            {sessions} {"sessions"}
          </span>
        </div>
      </div>
    </div>
  )
}

function TimerView() {
  const [totalSeconds, setTotalSeconds] = useState(5 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [isAlarm, setIsAlarm] = useState(false)
  const initialRef = useRef(5 * 60)

  useEffect(() => {
    if (!isRunning || totalSeconds <= 0) {
      if (totalSeconds <= 0 && isRunning) {
        setIsRunning(false)
        setIsAlarm(true)
        setTimeout(() => setIsAlarm(false), 6000)
      }
      return
    }
    const interval = setInterval(() => {
      setTotalSeconds((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [isRunning, totalSeconds])

  const reset = useCallback(() => {
    setIsRunning(false)
    setTotalSeconds(initialRef.current)
    setIsAlarm(false)
  }, [])

  const togglePlay = useCallback(() => {
    setIsAlarm(false)
    setIsRunning((prev) => !prev)
  }, [])

  const mins = Math.floor(totalSeconds / 60).toString().padStart(2, "0")
  const secs = (totalSeconds % 60).toString().padStart(2, "0")

  return (
    <div className="flex items-center gap-6 w-full justify-center">
      {/* Timer display */}
      <div className="flex flex-col items-center gap-1">
        <span className={`text-6xl font-extralight tabular-nums font-mono tracking-tight leading-none ${
          isAlarm ? "text-destructive animate-pomodoro-blink" : "text-foreground"
        }`}>
          {mins}:{secs}
        </span>
        {isAlarm && (
          <span className="text-[10px] text-destructive font-medium uppercase tracking-widest animate-pomodoro-blink">
            {"Time's up!"}
          </span>
        )}
      </div>

      {/* Controls to the right */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={togglePlay}
          aria-label={isRunning ? "Pause" : "Start"}
          className="flex items-center justify-center size-10 rounded-full bg-foreground text-background hover:opacity-90 transition-opacity"
        >
          {isRunning ? <Pause className="size-4" fill="currentColor" /> : <Play className="size-4 ml-0.5" fill="currentColor" />}
        </button>
        <button
          onClick={reset}
          aria-label="Reset"
          className="flex items-center justify-center size-9 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <RotateCcw className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

function StopwatchView() {
  const [elapsed, setElapsed] = useState(0)
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [isRunning])

  const reset = useCallback(() => {
    setIsRunning(false)
    setElapsed(0)
  }, [])

  const togglePlay = useCallback(() => {
    setIsRunning((prev) => !prev)
  }, [])

  const mins = Math.floor(elapsed / 60).toString().padStart(2, "0")
  const secs = (elapsed % 60).toString().padStart(2, "0")

  return (
    <div className="flex items-center gap-6 w-full justify-center">
      {/* Time display */}
      <span className="text-6xl font-extralight text-foreground tabular-nums font-mono tracking-tight leading-none">
        {mins}:{secs}
      </span>

      {/* Controls to the right */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={togglePlay}
          aria-label={isRunning ? "Pause" : "Start"}
          className="flex items-center justify-center size-10 rounded-full bg-foreground text-background hover:opacity-90 transition-opacity"
        >
          {isRunning ? <Pause className="size-4" fill="currentColor" /> : <Play className="size-4 ml-0.5" fill="currentColor" />}
        </button>
        <button
          onClick={reset}
          aria-label="Stop"
          className="flex items-center justify-center size-9 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <Square className="size-3.5" />
        </button>
      </div>
    </div>
  )
}
