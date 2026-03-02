"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Play, Pause, RotateCcw, Square, Coffee, Brain, BellRing, CheckCircle2 } from "lucide-react"

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

const TIMER_PRESETS = [5, 10, 15]

export function ProductivityHub(): JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>("pomodoro")

  return (
    <div className="flex flex-col h-full w-full dock-px justify-center gap-[clamp(0.5rem,1.5vh,0.85rem)]">
      <div className="flex items-center gap-1 p-1 rounded-full bg-secondary/40 border border-border/50 self-start">
        {(["pomodoro", "timer", "stopwatch"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-[clamp(0.6rem,1.8vw,0.875rem)] py-[clamp(0.28rem,0.8vh,0.38rem)] text-[clamp(0.5rem,1.2vw,0.64rem)] font-medium tracking-wide uppercase rounded-full transition-all text-center ${
              activeTab === tab
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 flex items-center min-w-0">
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
  const [isAlertVisible, setIsAlertVisible] = useState(false)
  const [sessions, setSessions] = useState(0)

  const duration = POMODORO_DURATIONS[mode]
  const progress = ((duration - totalSeconds) / duration) * 100

  useEffect(() => {
    if (!isRunning) {
      return
    }

    if (totalSeconds <= 0) {
      setIsRunning(false)
      setIsAlertVisible(true)
      if (mode === "focus") {
        setSessions((prev) => prev + 1)
      }
      return
    }

    const interval = setInterval(() => {
      setTotalSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning, totalSeconds, mode])

  const switchMode = useCallback((newMode: PomodoroMode) => {
    setMode(newMode)
    setTotalSeconds(POMODORO_DURATIONS[newMode])
    setIsRunning(false)
    setIsAlertVisible(false)
  }, [])

  const reset = useCallback(() => {
    setIsRunning(false)
    setTotalSeconds(POMODORO_DURATIONS[mode])
    setIsAlertVisible(false)
  }, [mode])

  const togglePlay = useCallback(() => {
    setIsAlertVisible(false)
    if (totalSeconds <= 0) {
      setTotalSeconds(POMODORO_DURATIONS[mode])
      setIsRunning(true)
      return
    }
    setIsRunning((prev) => !prev)
  }, [mode, totalSeconds])

  const dismissAlert = useCallback(() => {
    setIsAlertVisible(false)
  }, [])

  const startNextPhase = useCallback(() => {
    const nextMode: PomodoroMode = mode === "focus"
      ? sessions > 0 && sessions % 4 === 0
        ? "long-break"
        : "short-break"
      : "focus"

    setMode(nextMode)
    setTotalSeconds(POMODORO_DURATIONS[nextMode])
    setIsAlertVisible(false)
    setIsRunning(true)
  }, [mode, sessions])

  const mins = Math.floor(totalSeconds / 60).toString().padStart(2, "0")
  const secs = (totalSeconds % 60).toString().padStart(2, "0")

  const radius = 58
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="w-full flex flex-col items-center justify-center gap-[clamp(0.45rem,1.2vh,0.8rem)]">
      <div className="flex items-center justify-center gap-1.5 flex-wrap">
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

      <div
        className={`relative flex items-center justify-center shrink-0 transition-all duration-300 ${
          isAlertVisible ? "animate-pomodoro-alarm" : ""
        }`}
      >
        {isAlertVisible && (
          <div className="absolute -inset-1.5 rounded-full animate-pomodoro-pulse">
            <div className="w-full h-full rounded-full border-2 border-destructive/60" />
          </div>
        )}

        <svg
          width="140"
          height="140"
          viewBox="0 0 140 140"
          className="w-[clamp(6.4rem,18vw,9.6rem)] h-[clamp(6.4rem,18vw,9.6rem)] transform -rotate-90"
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
              isAlertVisible
                ? "text-destructive animate-pomodoro-blink"
                : mode === "focus"
                ? "text-accent"
                : "text-chart-2"
            }`}
          />
        </svg>

        <div className={`absolute flex flex-col items-center gap-0.5 ${
          isAlertVisible ? "animate-pomodoro-blink" : ""
        }`}>
          <span className={`font-semibold tabular-nums font-mono tracking-tight leading-none ${
            isAlertVisible ? "text-destructive" : "text-foreground"
          }`} style={{ fontSize: "calc(var(--dock-big-number-size) * 1.2)" }}>
            {mins}:{secs}
          </span>
          <span className="text-[9px] uppercase tracking-[0.17em] text-muted-foreground font-medium">
            {isAlertVisible ? "Phase complete" : MODE_LABELS[mode]}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
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
      </div>

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

      {isAlertVisible && (
        <div className="w-full max-w-136 rounded-lg border border-destructive/50 bg-destructive/10 px-2.5 py-2 flex items-center justify-between gap-2" role="status" aria-live="polite">
          <div className="flex items-center gap-1.5 min-w-0">
            <BellRing className="size-3.5 text-destructive shrink-0 animate-pomodoro-blink" />
            <span className="text-[10px] text-destructive-foreground/90 font-medium truncate">Tempo concluído. Iniciar próxima fase?</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={dismissAlert}
              className="h-7 px-2.5 rounded-md text-[10px] border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              Dispensar
            </button>
            <button
              onClick={startNextPhase}
              className="h-7 px-2.5 rounded-md text-[10px] bg-accent/20 text-accent hover:opacity-90 transition-opacity"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function TimerView() {
  const [totalSeconds, setTotalSeconds] = useState(5 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [isAlertVisible, setIsAlertVisible] = useState(false)
  const initialRef = useRef(5 * 60)

  useEffect(() => {
    if (!isRunning) {
      return
    }

    if (totalSeconds <= 0) {
      setIsRunning(false)
      setIsAlertVisible(true)
      return
    }

    const interval = setInterval(() => {
      setTotalSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning, totalSeconds])

  const reset = useCallback(() => {
    setIsRunning(false)
    setTotalSeconds(initialRef.current)
    setIsAlertVisible(false)
  }, [])

  const togglePlay = useCallback(() => {
    setIsAlertVisible(false)
    if (totalSeconds <= 0) {
      setTotalSeconds(initialRef.current)
      setIsRunning(true)
      return
    }
    setIsRunning((prev) => !prev)
  }, [totalSeconds])

  const applyPreset = useCallback((minutes: number) => {
    const presetSeconds = minutes * 60
    initialRef.current = presetSeconds
    setTotalSeconds(presetSeconds)
    setIsRunning(false)
    setIsAlertVisible(false)
  }, [])

  const mins = Math.floor(totalSeconds / 60).toString().padStart(2, "0")
  const secs = (totalSeconds % 60).toString().padStart(2, "0")
  const progress = ((initialRef.current - totalSeconds) / initialRef.current) * 100

  return (
    <div className="flex items-center gap-[clamp(0.75rem,2vw,1.5rem)] w-full justify-between">
      <div className="flex flex-col gap-2 min-w-0 flex-1">
        <div className="flex items-end gap-2">
          <span className={`font-extralight tabular-nums font-mono tracking-tight leading-none ${
            isAlertVisible ? "text-destructive animate-pomodoro-blink" : "text-foreground"
          }`} style={{ fontSize: "var(--dock-big-number-size)" }}>
            {mins}:{secs}
          </span>
          {isAlertVisible && <CheckCircle2 className="size-4 text-destructive mb-1" />}
        </div>

        <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
          <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {TIMER_PRESETS.map((minutes) => (
            <button
              key={minutes}
              onClick={() => applyPreset(minutes)}
              className={`h-6 px-2 rounded-full text-[9px] font-medium transition-colors ${
                initialRef.current === minutes * 60
                  ? "bg-accent/20 text-accent"
                  : "bg-secondary/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              {minutes}m
            </button>
          ))}
        </div>

        {isAlertVisible && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-2 py-1.5 flex items-center justify-between gap-2" role="status" aria-live="polite">
            <span className="text-[10px] text-destructive-foreground/90 font-medium">Timer concluído.</span>
            <button
              onClick={reset}
              className="h-6 px-2 rounded-md text-[10px] bg-accent/20 text-accent hover:opacity-90 transition-opacity"
            >
              Reiniciar
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
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
    <div className="flex items-center gap-[clamp(0.75rem,2vw,1.5rem)] w-full justify-between">
      <span className="font-extralight text-foreground tabular-nums font-mono tracking-tight leading-none" style={{ fontSize: "var(--dock-big-number-size)" }}>
        {mins}:{secs}
      </span>

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
