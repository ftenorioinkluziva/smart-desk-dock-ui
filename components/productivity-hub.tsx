"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Play, Pause, RotateCcw, Square, Coffee, Brain, BellRing } from "lucide-react"
import {
  PRODUCTIVITY_CONTROL_EVENT,
  type ProductivityControlDetail,
} from "@/lib/productivity-actions"
import {
  PRODUCTIVITY_ALERT_SETTINGS_EVENT,
  POMODORO_DURATIONS_EVENT,
  DEFAULT_POMODORO_DURATIONS,
  readPomodoroDurations,
  readProductivityAlertSettings,
  triggerProductivityAlert,
  type PomodoroDurations,
  type PomodoroMode,
  type ProductivityAlertSettings,
} from "@/lib/productivity-settings"

type Tab = "pomodoro" | "timer" | "stopwatch"

const MODE_LABELS: Record<PomodoroMode, string> = {
  "focus": "Foco",
  "short-break": "Pausa",
  "long-break": "Pausa Longa",
}

const TAB_LABELS: Record<Tab, string> = {
  "pomodoro": "Pomodoro",
  "timer": "Timer",
  "stopwatch": "Cronômetro",
}

const TIMER_PRESETS = [5, 10, 15, 30]

function useProductivityAlertSettings() {
  const [alertSettings, setAlertSettings] = useState<ProductivityAlertSettings>(() => readProductivityAlertSettings())

  useEffect(() => {
    const handleSettingsChange = (event: Event) => {
      const detail = (event as CustomEvent<ProductivityAlertSettings>).detail
      setAlertSettings(detail ?? readProductivityAlertSettings())
    }

    window.addEventListener(PRODUCTIVITY_ALERT_SETTINGS_EVENT, handleSettingsChange)
    return () => window.removeEventListener(PRODUCTIVITY_ALERT_SETTINGS_EVENT, handleSettingsChange)
  }, [])

  return alertSettings
}

function usePomodoroDurations() {
  const [durations, setDurations] = useState<PomodoroDurations>(() => readPomodoroDurations())

  useEffect(() => {
    const handleDurationChange = (event: Event) => {
      const detail = (event as CustomEvent<PomodoroDurations>).detail
      setDurations(detail ?? readPomodoroDurations())
    }

    window.addEventListener(POMODORO_DURATIONS_EVENT, handleDurationChange)
    return () => window.removeEventListener(POMODORO_DURATIONS_EVENT, handleDurationChange)
  }, [])

  return durations
}

// ── Shared sub-components ──────────────────────────────────────────────────

function Divider() {
  return <div className="w-px self-stretch bg-border/30 shrink-0 my-1" aria-hidden="true" />
}

function ControlButton({
  onClick,
  label,
  variant = "primary",
  icon,
}: {
  onClick: () => void
  label: string
  variant?: "primary" | "secondary" | "alert"
  icon?: React.ReactNode
}) {
  const base = "flex items-center justify-center gap-2 w-full rounded-2xl font-medium transition-transform duration-150 active:scale-[0.96] select-none"
  const py = "py-[clamp(0.45rem,1.3vh,0.7rem)]"
  const size = "text-[clamp(0.65rem,1.9vw,0.85rem)]"

  const variants = {
    primary:   "bg-foreground text-background shadow-[0_1px_4px_rgba(0,0,0,0.6)] hover:bg-foreground/90",
    secondary: "bg-secondary/70 border border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary",
    alert:     "bg-accent/90 text-accent-foreground shadow-[0_1px_4px_rgba(0,0,0,0.4)] hover:bg-accent",
  }

  return (
    <button onClick={onClick} aria-label={label} className={`${base} ${py} ${size} ${variants[variant]} focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1`}>
      {icon && <span className="flex items-center [&>svg]:size-3.5">{icon}</span>}
      {label}
    </button>
  )
}

// ── Main hub ──────────────────────────────────────────────────────────────

export function ProductivityHub() {
  const [activeTab, setActiveTab] = useState<Tab>("pomodoro")
  const [command, setCommand] = useState<ProductivityControlDetail | null>(null)

  useEffect(() => {
    const handleProductivityControl = (event: Event) => {
      const detail = (event as CustomEvent<ProductivityControlDetail>).detail
      if (!detail) return
      setActiveTab(detail.target)
      setCommand(detail)
    }

    window.addEventListener(PRODUCTIVITY_CONTROL_EVENT, handleProductivityControl)
    return () => window.removeEventListener(PRODUCTIVITY_CONTROL_EVENT, handleProductivityControl)
  }, [])

  return (
    <section aria-labelledby="productivity-heading" className="flex flex-col h-full w-full dock-px gap-[clamp(0.3rem,0.9vh,0.55rem)]">
      <h2 id="productivity-heading" className="sr-only">Produtividade</h2>
      {/* Tab bar — full width, readable tap targets */}
      <div className="flex items-stretch rounded-xl bg-secondary/30 border border-border/30 p-[clamp(0.15rem,0.4vh,0.25rem)] shrink-0 gap-[clamp(0.15rem,0.4vw,0.25rem)]">
        {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-[clamp(0.3rem,0.9vh,0.5rem)] rounded-lg text-center font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] ${
              activeTab === tab
                ? "bg-secondary text-foreground border border-border/60"
                : "text-muted-foreground hover:text-foreground/80"
            }`}
            style={{ fontSize: "clamp(0.62rem,1.9vw,0.82rem)" }}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="flex-1 flex items-center min-h-0 overflow-hidden">
        {activeTab === "pomodoro" && <PomodoroView command={command} />}
        {activeTab === "timer" && <TimerView command={command} />}
        {activeTab === "stopwatch" && <StopwatchView command={command} />}
      </div>
    </section>
  )
}

// ── Pomodoro ──────────────────────────────────────────────────────────────

function PomodoroView({ command }: { command: ProductivityControlDetail | null }) {
  const [mode, setMode] = useState<PomodoroMode>("focus")
  const [totalSeconds, setTotalSeconds] = useState(DEFAULT_POMODORO_DURATIONS["focus"])
  const [isRunning, setIsRunning] = useState(false)
  const [isAlertVisible, setIsAlertVisible] = useState(false)
  const [sessions, setSessions] = useState(0)
  const alertSettings = useProductivityAlertSettings()
  const durations = usePomodoroDurations()

  const duration = durations[mode]
  const progress = ((duration - totalSeconds) / duration) * 100
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  useEffect(() => {
    if (!isRunning) return
    if (totalSeconds <= 0) {
      setIsRunning(false)
      setIsAlertVisible(true)
      triggerProductivityAlert("pomodoro", alertSettings)
      if (mode === "focus") setSessions((p) => p + 1)
      return
    }
    const id = setInterval(() => {
      setTotalSeconds((p) => (p <= 1 ? (clearInterval(id), 0) : p - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [alertSettings, isRunning, totalSeconds, mode])

  useEffect(() => {
    if (isRunning || isAlertVisible) return
    setTotalSeconds(durations[mode])
  }, [durations, isAlertVisible, isRunning, mode])

  const switchMode = useCallback((m: PomodoroMode) => {
    setMode(m)
    setTotalSeconds(durations[m])
    setIsRunning(false)
    setIsAlertVisible(false)
  }, [durations])

  const reset = useCallback(() => {
    setIsRunning(false)
    setTotalSeconds(durations[mode])
    setIsAlertVisible(false)
  }, [durations, mode])

  const togglePlay = useCallback(() => {
    setIsAlertVisible(false)
    if (totalSeconds <= 0) {
      setTotalSeconds(durations[mode])
      setIsRunning(true)
      return
    }
    setIsRunning((p) => !p)
  }, [durations, mode, totalSeconds])

  useEffect(() => {
    if (!command || command.target !== "pomodoro") return

    setIsAlertVisible(false)
    if (command.action === "start") {
      if (totalSeconds <= 0) setTotalSeconds(durations[mode])
      setIsRunning(true)
      return
    }
    if (command.action === "pause") {
      setIsRunning(false)
      return
    }
    if (command.action === "reset") {
      reset()
    }
  }, [command, durations, mode, reset, totalSeconds])

  const startNextPhase = useCallback(() => {
    const next: PomodoroMode =
      mode === "focus"
        ? sessions > 0 && sessions % 4 === 0 ? "long-break" : "short-break"
        : "focus"
    setMode(next)
    setTotalSeconds(durations[next])
    setIsAlertVisible(false)
    setIsRunning(true)
  }, [durations, mode, sessions])

  const mins = Math.floor(totalSeconds / 60).toString().padStart(2, "0")
  const secs = (totalSeconds % 60).toString().padStart(2, "0")
  const arcColor = isAlertVisible ? "text-destructive" : mode === "focus" ? "text-accent" : "text-chart-2"

  return (
    <div className="w-full flex items-center gap-[clamp(0.75rem,2.5vw,1.5rem)]">
      <h3 className="sr-only">Pomodoro</h3>

      {/* Left: ring timer */}
      <div className="flex flex-col items-center justify-center flex-1">
        <div className="relative flex items-center justify-center">
          {isAlertVisible && (
            <div className="absolute -inset-3 rounded-full animate-productivity-complete pointer-events-none">
              <div className="h-full w-full rounded-full border-2 border-destructive/45 bg-destructive/5" />
            </div>
          )}

          <svg
            viewBox="0 0 120 120"
            className="w-[clamp(8.5rem,30vw,14rem)] h-[clamp(8.5rem,30vw,14rem)] -rotate-90"
          >
            <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth="4" className="text-secondary" />
            <circle
              cx="60" cy="60" r={radius}
              fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
               className={`transition-[stroke-dashoffset] duration-1000 ease-linear ${arcColor}`}
            />
          </svg>

          <div className="absolute flex flex-col items-center">
            <span
              className={`font-extralight tabular-nums font-mono leading-none ${isAlertVisible ? "text-destructive" : "text-foreground"}`}
              style={{ fontSize: "clamp(2rem,8.5vw,4rem)" }}
            >
              {mins}:{secs}
            </span>
            <span
              className={`uppercase font-medium leading-none mt-0.5 ${isAlertVisible ? "text-destructive/80" : "text-muted-foreground"}`}
              style={{ fontSize: "clamp(0.6rem,1.7vw,0.85rem)" }}
            >
              {isAlertVisible ? "Concluído!" : MODE_LABELS[mode]}
            </span>
          </div>
        </div>
      </div>

      <Divider />

      {/* Right: mode + sessions + controls */}
      <div className="flex flex-col justify-center gap-[clamp(0.35rem,1vh,0.6rem)]" style={{ width: "clamp(8rem,34%,13rem)" }}>

        {/* Mode selector */}
        {!isAlertVisible ? (
          <div className="grid grid-cols-1 gap-[clamp(0.18rem,0.5vh,0.3rem)]">
            {(Object.keys(durations) as PomodoroMode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex items-center justify-between gap-2 px-[clamp(0.45rem,1.2vw,0.65rem)] py-[clamp(0.26rem,0.7vh,0.38rem)] rounded-xl font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96] ${
                  mode === m
                    ? "bg-secondary/80 text-foreground border border-border/60"
                    : "text-muted-foreground hover:text-foreground/80 hover:bg-secondary/35"
                }`}
                style={{ fontSize: "clamp(0.55rem,1.5vw,0.72rem)" }}
              >
                <span className="flex items-center gap-1.5">
                  {m === "focus" ? <Brain className="size-2.5 shrink-0" /> : <Coffee className="size-2.5 shrink-0" />}
                  {MODE_LABELS[m]}
                </span>
                <span className="font-mono text-muted-foreground/75">{Math.round(durations[m] / 60)}m</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <BellRing className="size-3.5 text-destructive animate-alert-icon shrink-0" />
            <span className="text-destructive font-semibold" style={{ fontSize: "clamp(0.65rem,1.8vw,0.85rem)" }}>
              Fase concluída!
            </span>
          </div>
        )}

        {/* Sessions progress */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <span
              key={i}
              className={`size-2.5 rounded-full transition-colors duration-300 ${i < sessions % 4 ? "bg-accent" : "bg-secondary"}`}
              aria-hidden="true"
            />
          ))}
          <span className="text-muted-foreground font-mono tabular-nums ml-0.5" style={{ fontSize: "clamp(0.6rem,1.6vw,0.75rem)" }}>
            {sessions} sess.
          </span>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-[clamp(0.25rem,0.7vh,0.4rem)]">
          {isAlertVisible ? (
            <>
              <ControlButton
                onClick={startNextPhase}
                label="Próxima fase"
                variant="alert"
                icon={<Play className="size-3" fill="currentColor" />}
              />
              <ControlButton
                onClick={() => setIsAlertVisible(false)}
                label="Dispensar"
                variant="secondary"
              />
            </>
          ) : (
            <>
              <ControlButton
                onClick={togglePlay}
                label={isRunning ? "Pausar" : "Iniciar"}
                variant="primary"
                icon={isRunning
                  ? <Pause className="size-3" fill="currentColor" />
                  : <Play className="size-3 ml-0.5" fill="currentColor" />}
              />
              <ControlButton
                onClick={reset}
                label="Reiniciar"
                variant="secondary"
                icon={<RotateCcw className="size-3" />}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Timer ─────────────────────────────────────────────────────────────────

function TimerView({ command }: { command: ProductivityControlDetail | null }) {
  const [totalSeconds, setTotalSeconds] = useState(5 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [isAlertVisible, setIsAlertVisible] = useState(false)
  const initialRef = useRef(5 * 60)
  const alertSettings = useProductivityAlertSettings()

  useEffect(() => {
    if (!isRunning) return
    if (totalSeconds <= 0) {
      setIsRunning(false)
      setIsAlertVisible(true)
      triggerProductivityAlert("timer", alertSettings)
      return
    }
    const id = setInterval(() => {
      setTotalSeconds((p) => (p <= 1 ? (clearInterval(id), 0) : p - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [alertSettings, isRunning, totalSeconds])

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
    setIsRunning((p) => !p)
  }, [totalSeconds])

  const applyPreset = useCallback((minutes: number) => {
    const s = minutes * 60
    initialRef.current = s
    setTotalSeconds(s)
    setIsRunning(false)
    setIsAlertVisible(false)
  }, [])

  useEffect(() => {
    if (!command || command.target !== "timer") return

    setIsAlertVisible(false)
    if (typeof command.minutes === "number" && Number.isFinite(command.minutes)) {
      const seconds = Math.max(60, Math.min(10800, Math.round(command.minutes * 60)))
      initialRef.current = seconds
      setTotalSeconds(seconds)
    }

    if (command.action === "start") {
      setIsRunning(true)
      return
    }
    if (command.action === "pause") {
      setIsRunning(false)
      return
    }
    if (command.action === "reset") {
      reset()
    }
  }, [command, reset])

  const mins = Math.floor(totalSeconds / 60).toString().padStart(2, "0")
  const secs = (totalSeconds % 60).toString().padStart(2, "0")
  const progress = ((initialRef.current - totalSeconds) / initialRef.current) * 100
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (Math.max(0, Math.min(100, progress)) / 100) * circumference

  return (
    <div className="w-full flex items-center gap-[clamp(0.75rem,2.5vw,1.5rem)]">
      <h3 className="sr-only">Timer</h3>

      {/* Left: ring timer */}
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="relative flex items-center justify-center">
          {isAlertVisible && (
            <div className="absolute -inset-3 rounded-full animate-productivity-complete pointer-events-none">
              <div className="h-full w-full rounded-full border-2 border-destructive/45 bg-destructive/5" />
            </div>
          )}

          <svg
            viewBox="0 0 120 120"
            className="h-[clamp(8.5rem,30vw,14rem)] w-[clamp(8.5rem,30vw,14rem)] -rotate-90"
          >
            <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth="4" className="text-secondary" />
            <circle
              cx="60" cy="60" r={radius}
              fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
               className={`transition-[stroke-dashoffset,color] duration-1000 ease-linear ${isAlertVisible ? "text-destructive" : "text-accent"}`}
            />
          </svg>

          <div className="absolute flex flex-col items-center">
            <span
              className={`font-extralight tabular-nums font-mono leading-none transition-colors ${isAlertVisible ? "text-destructive" : "text-foreground"}`}
              style={{ fontSize: "clamp(2rem,8.5vw,4rem)" }}
            >
              {mins}:{secs}
            </span>
            <span
              className={`uppercase font-medium leading-none mt-0.5 ${isAlertVisible ? "text-destructive/80" : "text-muted-foreground"}`}
              style={{ fontSize: "clamp(0.6rem,1.7vw,0.85rem)" }}
            >
              {isAlertVisible ? "Concluído!" : isRunning ? "Timer" : "Pronto"}
            </span>
          </div>
        </div>
      </div>

      <Divider />

      {/* Right: presets + controls */}
      <div className="flex flex-col gap-[clamp(0.35rem,1vh,0.6rem)]" style={{ width: "clamp(8.5rem,38%,15rem)" }}>

        {/* Preset buttons */}
        <div className="grid grid-cols-4 gap-[clamp(0.2rem,0.6vw,0.35rem)]">
          {TIMER_PRESETS.map((m) => (
            <button
              key={m}
              onClick={() => applyPreset(m)}
               className={`py-[clamp(0.3rem,0.8vh,0.45rem)] rounded-xl font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96] ${
                initialRef.current === m * 60
                  ? "bg-secondary text-foreground border border-border/60"
                  : "bg-secondary/40 text-muted-foreground hover:text-foreground/80 hover:bg-secondary/70"
              }`}
              style={{ fontSize: "clamp(0.6rem,1.7vw,0.8rem)" }}
            >
              {m}m
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-[clamp(0.25rem,0.7vh,0.4rem)]">
          <ControlButton
            onClick={togglePlay}
            label={isRunning ? "Pausar" : "Iniciar"}
            variant="primary"
            icon={isRunning
              ? <Pause className="size-3" fill="currentColor" />
              : <Play className="size-3 ml-0.5" fill="currentColor" />}
          />
          <ControlButton
            onClick={reset}
            label="Reiniciar"
            variant="secondary"
            icon={<RotateCcw className="size-3" />}
          />
        </div>
      </div>
    </div>
  )
}

// ── Stopwatch ─────────────────────────────────────────────────────────────

function StopwatchView({ command }: { command: ProductivityControlDetail | null }) {
  const [elapsed, setElapsed] = useState(0)
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    if (!isRunning) return
    const id = setInterval(() => setElapsed((p) => p + 1), 1000)
    return () => clearInterval(id)
  }, [isRunning])

  const reset = useCallback(() => {
    setIsRunning(false)
    setElapsed(0)
  }, [])

  const togglePlay = useCallback(() => setIsRunning((p) => !p), [])

  useEffect(() => {
    if (!command || command.target !== "stopwatch") return

    if (command.action === "start") {
      setIsRunning(true)
      return
    }
    if (command.action === "pause") {
      setIsRunning(false)
      return
    }
    if (command.action === "reset") {
      reset()
    }
  }, [command, reset])

  const hrs = Math.floor(elapsed / 3600)
  const mins = Math.floor((elapsed % 3600) / 60).toString().padStart(2, "0")
  const secs = (elapsed % 60).toString().padStart(2, "0")

  return (
    <div className="w-full flex items-center gap-[clamp(0.75rem,2.5vw,1.5rem)]">
      <h3 className="sr-only">Cronômetro</h3>

      {/* Left: elapsed time */}
      <div className="flex-1 flex flex-col items-center justify-center gap-[clamp(0.35rem,0.9vh,0.55rem)]">
        <span
          className="font-extralight text-foreground tabular-nums font-mono leading-none"
          style={{ fontSize: "clamp(2.8rem,13vw,6rem)" }}
        >
          {hrs > 0 && `${hrs.toString().padStart(2, "0")}:`}{mins}:{secs}
        </span>

        {/* Thin animated bar when running */}
        <div className="h-[clamp(0.2rem,0.5vh,0.3rem)] w-full rounded-full bg-secondary overflow-hidden">
          {isRunning && (
          <div
            className="h-full rounded-full bg-accent/60 origin-left"
            style={{
              transform: `scaleX(${((elapsed % 60) / 60)})`,
              transition: "transform 1s linear",
            }}
          />
          )}
        </div>

        <span
          className="text-muted-foreground text-center"
          style={{ fontSize: "clamp(0.6rem,1.7vw,0.8rem)" }}
        >
          {isRunning ? "Em contagem…" : elapsed > 0 ? "Pausado" : "Pronto para iniciar"}
        </span>
      </div>

      <Divider />

      {/* Right: controls */}
      <div className="flex flex-col gap-[clamp(0.25rem,0.7vh,0.4rem)] justify-center" style={{ width: "clamp(8.5rem,38%,15rem)" }}>
        <ControlButton
          onClick={togglePlay}
          label={isRunning ? "Pausar" : "Iniciar"}
          variant="primary"
          icon={isRunning
            ? <Pause className="size-3" fill="currentColor" />
            : <Play className="size-3 ml-0.5" fill="currentColor" />}
        />
        <ControlButton
          onClick={reset}
          label="Zerar"
          variant="secondary"
          icon={<Square className="size-3" />}
        />
      </div>
    </div>
  )
}
