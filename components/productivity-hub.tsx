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
    <div className="flex flex-col items-center justify-center h-full gap-4 px-6">
      {/* Segmented Control */}
      <div className="flex items-center rounded-full bg-secondary/60 p-0.5">
        {(["pomodoro", "timer", "stopwatch"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-[11px] font-medium tracking-wide uppercase rounded-full transition-all ${
              activeTab === tab
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "pomodoro" && <PomodoroView />}
      {activeTab === "timer" && <TimerView />}
      {activeTab === "stopwatch" && <StopwatchView />}
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
        // Timer completed - trigger alarm
        setIsRunning(false)
        setIsAlarm(true)
        if (mode === "focus") {
          setSessions((prev) => prev + 1)
        }
        // Auto-dismiss alarm after 8 seconds
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

  // SVG circle progress
  const radius = 68
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Mode selector */}
      <div className="flex items-center gap-2">
        {(Object.keys(POMODORO_DURATIONS) as PomodoroMode[]).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider transition-all ${
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

      {/* Large circular timer with alarm effects */}
      <div
        className={`relative flex items-center justify-center transition-all duration-300 ${
          isAlarm ? "animate-pomodoro-alarm" : ""
        }`}
      >
        {/* Alarm glow ring */}
        {isAlarm && (
          <div className="absolute inset-[-8px] rounded-full animate-pomodoro-pulse">
            <div className="w-full h-full rounded-full border-2 border-destructive/60" />
          </div>
        )}

        {/* Background circle */}
        <svg
          width="170"
          height="170"
          viewBox="0 0 170 170"
          className="transform -rotate-90"
        >
          <circle
            cx="85"
            cy="85"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-secondary"
          />
          <circle
            cx="85"
            cy="85"
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

        {/* Timer text */}
        <div className={`absolute flex flex-col items-center gap-0.5 ${
          isAlarm ? "animate-pomodoro-blink" : ""
        }`}>
          <span className={`text-5xl font-extralight tabular-nums font-mono tracking-tight leading-none ${
            isAlarm ? "text-destructive" : "text-foreground"
          }`}>
            {mins}:{secs}
          </span>
          <span className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
            {isAlarm ? "Time's up!" : MODE_LABELS[mode]}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {isAlarm ? (
          <button
            onClick={dismissAlarm}
            aria-label="Dismiss alarm"
            className="flex items-center justify-center h-10 px-5 rounded-full bg-destructive text-destructive-foreground font-medium text-xs hover:opacity-90 transition-opacity animate-pomodoro-blink"
          >
            {"Dismiss"}
          </button>
        ) : (
          <>
            <button
              onClick={togglePlay}
              aria-label={isRunning ? "Pause" : "Start"}
              className="flex items-center justify-center size-12 rounded-full bg-foreground text-background hover:opacity-90 transition-opacity"
            >
              {isRunning ? (
                <Pause className="size-5" fill="currentColor" />
              ) : (
                <Play className="size-5 ml-0.5" fill="currentColor" />
              )}
            </button>
            <button
              onClick={reset}
              aria-label="Reset timer"
              className="flex items-center justify-center size-10 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <RotateCcw className="size-4" />
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
              i < sessions % 4
                ? "bg-accent"
                : "bg-secondary"
            }`}
            aria-hidden="true"
          />
        ))}
        <span className="text-[9px] text-muted-foreground ml-1 font-mono tabular-nums">
          {sessions} {"sessions"}
        </span>
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
    <>
      <div className={`text-7xl font-extralight tabular-nums font-mono tracking-tight leading-none ${
        isAlarm ? "text-destructive animate-pomodoro-blink" : "text-foreground"
      }`}>
        {mins}:{secs}
      </div>
      {isAlarm && (
        <span className="text-[10px] text-destructive font-medium uppercase tracking-widest animate-pomodoro-blink">
          {"Time's up!"}
        </span>
      )}
      <ControlButtons
        isRunning={isRunning}
        onToggle={togglePlay}
        onReset={reset}
      />
    </>
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
    <>
      <div className="text-7xl font-extralight text-foreground tabular-nums font-mono tracking-tight leading-none">
        {mins}:{secs}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          aria-label={isRunning ? "Pause" : "Start"}
          className="flex items-center justify-center size-12 rounded-full bg-foreground text-background hover:opacity-90 transition-opacity"
        >
          {isRunning ? <Pause className="size-5" fill="currentColor" /> : <Play className="size-5 ml-0.5" fill="currentColor" />}
        </button>
        <button
          onClick={reset}
          aria-label="Stop"
          className="flex items-center justify-center size-10 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <Square className="size-4" />
        </button>
      </div>
    </>
  )
}

function ControlButtons({
  isRunning,
  onToggle,
  onReset,
}: {
  isRunning: boolean
  onToggle: () => void
  onReset: () => void
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onToggle}
        aria-label={isRunning ? "Pause" : "Start"}
        className="flex items-center justify-center size-12 rounded-full bg-foreground text-background hover:opacity-90 transition-opacity"
      >
        {isRunning ? <Pause className="size-5" fill="currentColor" /> : <Play className="size-5 ml-0.5" fill="currentColor" />}
      </button>
      <button
        onClick={onReset}
        aria-label="Reset"
        className="flex items-center justify-center size-10 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      >
        <RotateCcw className="size-4" />
      </button>
    </div>
  )
}
