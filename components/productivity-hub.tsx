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

  // Short labels so the pill fits on a landscape phone screen
  const TAB_LABELS: Record<Tab, string> = { pomodoro: "Pomo", timer: "Timer", stopwatch: "Watch" }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 px-6">
      {/* Segmented Control */}
      <div className="flex items-center rounded-full bg-secondary/60 p-0.5 shrink-0">
        {(["pomodoro", "timer", "stopwatch"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-0.5 text-[11px] font-medium uppercase rounded-full transition-all ${
              activeTab === tab
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Content */}
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
  )
}

// ── Pomodoro ──────────────────────────────────────────────────────────────────
// Ring sized for landscape phone (~303 px usable height)
const RING_RADIUS = 44
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

const PHASE_LABEL: Record<string, string> = {
  focus:         "Focus",
  "short-break": "Short Break",
  "long-break":  "Long Break",
}

/** Label of the button that starts the NEXT phase */
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
  const dashOffset = RING_CIRCUMFERENCE * (1 - progress)

  // Ring colour: warm for focus, cool-green for breaks
  const ringClass = phase === "focus" ? "text-accent" : "text-emerald-400"

  const isRunning = status === "running"
  const isDone    = status === "finished"

  return (
    // Own flex column with tight gap so the whole view fits in ~260 px
    <div className="flex flex-col items-center gap-2">
      {/* Round progress dots — 4 circles, filled as focus rounds complete */}
      <div className="flex items-center gap-2">
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

      {/* Circular ring with time centred — size-36 = 144 px fits landscape */}
      <div className="relative flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="size-36" aria-hidden="true">
          {/* Track */}
          <circle
            cx="50" cy="50" r={RING_RADIUS}
            fill="none" stroke="currentColor" strokeWidth="5"
            className="text-secondary"
          />
          {/* Progress arc */}
          <circle
            cx="50" cy="50" r={RING_RADIUS}
            fill="none" stroke="currentColor" strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 50 50)"
            className={ringClass}
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>

        {/* Time + phase label */}
        <div className="absolute flex flex-col items-center gap-0.5">
          <span className="text-4xl font-extralight text-foreground tabular-nums font-mono tracking-tight leading-none">
            {mins}:{secs}
          </span>
          <span className="text-[9px] font-medium tracking-[0.2em] uppercase text-muted-foreground">
            {isDone ? "done ✓" : PHASE_LABEL[phase]}
          </span>
        </div>
      </div>

      {/* Controls */}
      {isDone ? (
        /* Phase finished: user confirms what to do next */
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
        /* Running or idle: play/pause + reset */
        <div className="flex items-center gap-3">
          <button
            onClick={isRunning ? pause : start}
            aria-label={isRunning ? "Pause" : "Start"}
            className="flex items-center justify-center size-10 rounded-full border border-border text-foreground hover:bg-secondary transition-colors"
          >
            {isRunning ? <Pause className="size-4" /> : <Play className="size-4 ml-0.5" />}
          </button>
          <button
            onClick={reset}
            aria-label="Reset"
            className="flex items-center justify-center size-10 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <RotateCcw className="size-4" />
          </button>
        </div>
      )}
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
    <>
      <div className="flex items-center gap-5">
        {isSetup && (
          <button
            onClick={() => onChange(Math.max(TIMER_MIN, initial - TIMER_STEP))}
            aria-label="Decrease 5 minutes"
            className="flex items-center justify-center size-8 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Minus className="size-3.5" />
          </button>
        )}
        <div className="text-6xl font-extralight text-foreground tabular-nums font-mono tracking-tight leading-none">
          {mins}:{secs}
        </div>
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
      <ControlButtons isRunning={isRunning} onToggle={onToggle} onReset={onReset} />
    </>
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
    <>
      <div className="text-6xl font-extralight text-foreground tabular-nums font-mono tracking-tight leading-none">
        {mins}:{secs}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onToggle}
          aria-label={isRunning ? "Pause" : "Start"}
          className="flex items-center justify-center size-10 rounded-full border border-border text-foreground hover:bg-secondary transition-colors"
        >
          {isRunning ? <Pause className="size-4" /> : <Play className="size-4 ml-0.5" />}
        </button>
        <button
          onClick={onReset}
          aria-label="Reset"
          className="flex items-center justify-center size-10 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <Square className="size-4" />
        </button>
      </div>
    </>
  )
}

// ── Shared play/pause + reset row ─────────────────────────────────────────────
function ControlButtons({
  isRunning, onToggle, onReset,
}: {
  isRunning: boolean; onToggle: () => void; onReset: () => void
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onToggle}
        aria-label={isRunning ? "Pause" : "Start"}
        className="flex items-center justify-center size-10 rounded-full border border-border text-foreground hover:bg-secondary transition-colors"
      >
        {isRunning ? <Pause className="size-4" /> : <Play className="size-4 ml-0.5" />}
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
