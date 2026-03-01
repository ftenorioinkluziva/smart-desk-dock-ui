"use client"

import { useState } from "react"
import { Play, Pause, RotateCcw, Square, Plus, Minus } from "lucide-react"
import type { PomodoroReturn } from "@/hooks/use-pomodoro"

type Tab = "pomodoro" | "timer" | "stopwatch"

type ProductivityHubProps = {
  // Pomodoro — full hook result
  pomodoro: PomodoroReturn
  // Free Timer
  timerSeconds: number
  timerIsRunning: boolean
  timerInitial: number
  onTimerToggle: () => void
  onTimerReset: () => void
  onTimerChange: (seconds: number) => void
  // Stopwatch
  stopwatchElapsed: number
  stopwatchIsRunning: boolean
  onStopwatchToggle: () => void
  onStopwatchReset: () => void
}

export function ProductivityHub({
  pomodoro,
  timerSeconds,
  timerIsRunning,
  timerInitial,
  onTimerToggle,
  onTimerReset,
  onTimerChange,
  stopwatchElapsed,
  stopwatchIsRunning,
  onStopwatchToggle,
  onStopwatchReset,
}: ProductivityHubProps) {
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
        {activeTab === "pomodoro" && <PomodoroView pomodoro={pomodoro} />}
        {activeTab === "timer" && (
          <TimerView
            seconds={timerSeconds}
            isRunning={timerIsRunning}
            initial={timerInitial}
            onToggle={onTimerToggle}
            onReset={onTimerReset}
            onChange={onTimerChange}
          />
        )}
        {activeTab === "stopwatch" && (
          <StopwatchView
            elapsed={stopwatchElapsed}
            isRunning={stopwatchIsRunning}
            onToggle={onStopwatchToggle}
            onReset={onStopwatchReset}
          />
        )}
      </div>
    </div>
  )
}

// ── Pomodoro ──────────────────────────────────────────────────────────────────
const RING_RADIUS = 58
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

const PHASE_LABEL: Record<string, string> = {
  focus:         "Focus",
  "short-break": "Short Break",
  "long-break":  "Long Break",
}

function nextPhaseLabel(phase: string, focusRound: number): string {
  if (phase === "long-break")  return "Start Over"
  if (phase === "focus")       return focusRound >= 4 ? "Start Long Break (30 min)" : "Start Short Break"
  return "Start Focus"
}

function PomodoroView({ pomodoro }: { pomodoro: PomodoroReturn }) {
  const { phase, status, focusRound, seconds, maxSeconds,
          start, pause, beginNextPhase, reset } = pomodoro

  const mins = Math.floor(seconds / 60).toString().padStart(2, "0")
  const secs = (seconds % 60).toString().padStart(2, "0")

  const progress = maxSeconds > 0 ? (maxSeconds - seconds) / maxSeconds : 1
  const strokeDashoffset = RING_CIRCUMFERENCE * (1 - progress)

  const ringClass = phase === "focus" ? "text-accent" : "text-emerald-400"
  const isRunning = status === "running"
  const isDone    = status === "finished"

  return (
    <div className="flex items-center gap-6 w-full">
      {/* Left: circular timer */}
      <div className="relative flex items-center justify-center shrink-0">
        <svg
          width="140"
          height="140"
          viewBox="0 0 140 140"
          className="transform -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx="70" cy="70" r={RING_RADIUS}
            fill="none" stroke="currentColor" strokeWidth="3"
            className="text-secondary"
          />
          <circle
            cx="70" cy="70" r={RING_RADIUS}
            fill="none" stroke="currentColor" strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            className={`transition-all duration-1000 ease-linear ${ringClass}`}
          />
        </svg>

        <div className="absolute flex flex-col items-center gap-0.5">
          <span className="text-4xl font-extralight text-foreground tabular-nums font-mono tracking-tight leading-none">
            {mins}:{secs}
          </span>
          <span className="text-[8px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
            {isDone ? "done \u2713" : PHASE_LABEL[phase]}
          </span>
        </div>
      </div>

      {/* Right: progress dots + controls */}
      <div className="flex flex-col items-start gap-3 flex-1 min-w-0">
        {/* Round progress dots */}
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4].map((r) => {
            const done    = r < focusRound || (r === focusRound && (phase !== "focus" || isDone))
            const current = r === focusRound && phase === "focus" && !isDone
            return (
              <span
                key={r}
                className={`rounded-full transition-all duration-500 ${
                  done    ? "size-2 bg-accent" :
                  current ? "size-2 bg-accent/40 ring-1 ring-accent" :
                            "size-1.5 bg-secondary"
                }`}
              />
            )
          })}
        </div>

        {/* Controls */}
        {isDone ? (
          <div className="flex items-center gap-2">
            <button
              onClick={beginNextPhase}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent text-background text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              <Play className="size-3 ml-0.5" />
              {nextPhaseLabel(phase, focusRound)}
            </button>
            <button
              onClick={reset}
              aria-label="Reset cycle"
              className="flex items-center justify-center size-9 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <RotateCcw className="size-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <button
              onClick={isRunning ? pause : start}
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
              aria-label="Reset"
              className="flex items-center justify-center size-9 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <RotateCcw className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Free Timer ────────────────────────────────────────────────────────────────
const TIMER_STEP = 5 * 60
const TIMER_MIN  = 1 * 60
const TIMER_MAX  = 120 * 60

function TimerView({
  seconds, isRunning, initial, onToggle, onReset, onChange,
}: {
  seconds: number; isRunning: boolean; initial: number
  onToggle: () => void; onReset: () => void; onChange: (s: number) => void
}) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0")
  const secs = (seconds % 60).toString().padStart(2, "0")
  const isSetup = !isRunning && seconds === initial

  return (
    <div className="flex items-center gap-6 w-full justify-center">
      <div className="flex items-center gap-3">
        {isSetup && (
          <button
            onClick={() => onChange(Math.max(TIMER_MIN, initial - TIMER_STEP))}
            aria-label="Decrease 5 minutes"
            className="flex items-center justify-center size-8 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Minus className="size-3.5" />
          </button>
        )}
        <span className="text-6xl font-extralight text-foreground tabular-nums font-mono tracking-tight leading-none">
          {mins}:{secs}
        </span>
        {isSetup && (
          <button
            onClick={() => onChange(Math.min(TIMER_MAX, initial + TIMER_STEP))}
            aria-label="Increase 5 minutes"
            className="flex items-center justify-center size-8 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Plus className="size-3.5" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-2.5">
        <button
          onClick={onToggle}
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
          onClick={onReset}
          aria-label="Reset"
          className="flex items-center justify-center size-9 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <RotateCcw className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Stopwatch ─────────────────────────────────────────────────────────────────
function StopwatchView({
  elapsed, isRunning, onToggle, onReset,
}: {
  elapsed: number; isRunning: boolean; onToggle: () => void; onReset: () => void
}) {
  const mins = Math.floor(elapsed / 60).toString().padStart(2, "0")
  const secs = (elapsed % 60).toString().padStart(2, "0")
  return (
    <div className="flex items-center gap-6 w-full justify-center">
      <span className="text-6xl font-extralight text-foreground tabular-nums font-mono tracking-tight leading-none">
        {mins}:{secs}
      </span>
      <div className="flex items-center gap-2.5">
        <button
          onClick={onToggle}
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
          onClick={onReset}
          aria-label="Stop"
          className="flex items-center justify-center size-9 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <Square className="size-3.5" />
        </button>
      </div>
    </div>
  )
}
