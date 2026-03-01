"use client"

import { useState } from "react"
import { Play, Pause, RotateCcw, Square, Plus, Minus } from "lucide-react"

type Tab = "pomodoro" | "timer" | "stopwatch"

type ProductivityHubProps = {
  // Pomodoro
  pomodoroSeconds: number
  pomodoroIsRunning: boolean
  onPomodoroToggle: () => void
  onPomodoroReset: () => void
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
  pomodoroSeconds,
  pomodoroIsRunning,
  onPomodoroToggle,
  onPomodoroReset,
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
    <div className="flex flex-col items-center justify-center h-full gap-4 px-6">
      {/* Segmented Control */}
      <div className="flex items-center rounded-full bg-secondary/60 p-0.5">
        {(["pomodoro", "timer", "stopwatch"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1 text-[11px] font-medium tracking-wide uppercase rounded-full transition-all ${
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
      {activeTab === "pomodoro" && (
        <PomodoroView
          seconds={pomodoroSeconds}
          isRunning={pomodoroIsRunning}
          onToggle={onPomodoroToggle}
          onReset={onPomodoroReset}
        />
      )}
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

// --- Pomodoro with circular SVG ring ---
const POMODORO_DURATION = 25 * 60
const RING_RADIUS = 44
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

function PomodoroView({
  seconds,
  isRunning,
  onToggle,
  onReset,
}: {
  seconds: number
  isRunning: boolean
  onToggle: () => void
  onReset: () => void
}) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0")
  const secs = (seconds % 60).toString().padStart(2, "0")
  const progress = (POMODORO_DURATION - seconds) / POMODORO_DURATION
  const strokeDashoffset = RING_CIRCUMFERENCE * (1 - progress)

  return (
    <>
      {/* Circular ring with time centered */}
      <div className="relative flex items-center justify-center">
        <svg
          viewBox="0 0 100 100"
          className="size-36"
          aria-hidden="true"
        >
          {/* Track */}
          <circle
            cx="50"
            cy="50"
            r={RING_RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-secondary"
          />
          {/* Progress arc */}
          <circle
            cx="50"
            cy="50"
            r={RING_RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 50 50)"
            className="text-accent"
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        {/* Time overlay */}
        <div className="absolute flex flex-col items-center gap-0.5">
          <span className="text-4xl font-extralight text-foreground tabular-nums font-mono tracking-tight leading-none">
            {mins}:{secs}
          </span>
          <span className="text-[9px] font-medium tracking-[0.2em] uppercase text-muted-foreground">
            {seconds > 0 ? "focus" : "done"}
          </span>
        </div>
      </div>

      <ControlButtons isRunning={isRunning} onToggle={onToggle} onReset={onReset} />
    </>
  )
}

// --- Free Timer with +/- duration adjustment ---
const TIMER_STEP = 5 * 60 // 5-minute steps
const TIMER_MIN = 1 * 60
const TIMER_MAX = 120 * 60

function TimerView({
  seconds,
  isRunning,
  initial,
  onToggle,
  onReset,
  onChange,
}: {
  seconds: number
  isRunning: boolean
  initial: number
  onToggle: () => void
  onReset: () => void
  onChange: (seconds: number) => void
}) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0")
  const secs = (seconds % 60).toString().padStart(2, "0")

  // Show adjustment controls only when timer is in setup state (paused and at initial value)
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

// --- Stopwatch ---
function StopwatchView({
  elapsed,
  isRunning,
  onToggle,
  onReset,
}: {
  elapsed: number
  isRunning: boolean
  onToggle: () => void
  onReset: () => void
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

// --- Shared control buttons ---
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
