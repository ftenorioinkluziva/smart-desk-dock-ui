"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Play, Pause, RotateCcw, Square } from "lucide-react"

type Tab = "pomodoro" | "timer" | "stopwatch"

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
      {activeTab === "pomodoro" && <PomodoroView />}
      {activeTab === "timer" && <TimerView />}
      {activeTab === "stopwatch" && <StopwatchView />}
    </div>
  )
}

function PomodoroView() {
  const [totalSeconds, setTotalSeconds] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    if (!isRunning || totalSeconds <= 0) return
    const interval = setInterval(() => {
      setTotalSeconds((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [isRunning, totalSeconds])

  const reset = useCallback(() => {
    setIsRunning(false)
    setTotalSeconds(25 * 60)
  }, [])

  const togglePlay = useCallback(() => {
    setIsRunning((prev) => !prev)
  }, [])

  const mins = Math.floor(totalSeconds / 60).toString().padStart(2, "0")
  const secs = (totalSeconds % 60).toString().padStart(2, "0")
  const progress = ((25 * 60 - totalSeconds) / (25 * 60)) * 100

  return (
    <>
      <div className="flex flex-col items-center gap-2">
        <div className="text-6xl font-extralight text-foreground tabular-nums font-mono tracking-tight leading-none">
          {mins}:{secs}
        </div>
        <div className="h-0.5 w-40 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <ControlButtons
        isRunning={isRunning}
        onToggle={togglePlay}
        onReset={reset}
      />
    </>
  )
}

function TimerView() {
  const [totalSeconds, setTotalSeconds] = useState(5 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const initialRef = useRef(5 * 60)

  useEffect(() => {
    if (!isRunning || totalSeconds <= 0) return
    const interval = setInterval(() => {
      setTotalSeconds((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [isRunning, totalSeconds])

  const reset = useCallback(() => {
    setIsRunning(false)
    setTotalSeconds(initialRef.current)
  }, [])

  const togglePlay = useCallback(() => {
    setIsRunning((prev) => !prev)
  }, [])

  const mins = Math.floor(totalSeconds / 60).toString().padStart(2, "0")
  const secs = (totalSeconds % 60).toString().padStart(2, "0")

  return (
    <>
      <div className="text-6xl font-extralight text-foreground tabular-nums font-mono tracking-tight leading-none">
        {mins}:{secs}
      </div>
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
      <div className="text-6xl font-extralight text-foreground tabular-nums font-mono tracking-tight leading-none">
        {mins}:{secs}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          aria-label={isRunning ? "Pause" : "Start"}
          className="flex items-center justify-center size-10 rounded-full border border-border text-foreground hover:bg-secondary transition-colors"
        >
          {isRunning ? <Pause className="size-4" /> : <Play className="size-4 ml-0.5" />}
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
