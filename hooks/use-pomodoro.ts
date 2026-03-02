"use client"

import { useState, useEffect, useCallback } from "react"

export type PomodoroPhase = "focus" | "short-break" | "long-break"
export type PomodoroStatus = "idle" | "running" | "finished"

/** Seconds for each phase */
const DURATIONS: Record<PomodoroPhase, number> = {
  focus:       25 * 60,
  "short-break": 5 * 60,
  "long-break": 30 * 60,
}

export type PomodoroReturn = {
  phase: PomodoroPhase
  status: PomodoroStatus
  /** 1–4: which focus session we're on */
  focusRound: number
  seconds: number
  maxSeconds: number
  /** Start / resume the current phase */
  start: () => void
  /** Pause the current phase */
  pause: () => void
  /** Called by the user to begin the NEXT phase after a finish notification */
  beginNextPhase: () => void
  /** Hard reset to beginning of cycle */
  reset: () => void
}

export function usePomodoro(): PomodoroReturn {
  const [phase,      setPhase]      = useState<PomodoroPhase>("focus")
  const [status,     setStatus]     = useState<PomodoroStatus>("idle")
  const [focusRound, setFocusRound] = useState(1)
  const [seconds,    setSeconds]    = useState(DURATIONS["focus"])

  // ── Tick: counts down every second while running ──────────────────────────
  useEffect(() => {
    if (status !== "running") return
    const id = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [status])

  // ── Completion: fires when seconds hits 0 while running ───────────────────
  useEffect(() => {
    if (status !== "running" || seconds !== 0) return
    setStatus("finished")
  }, [seconds, status])

  // ── Actions ───────────────────────────────────────────────────────────────
  const start = useCallback(() => setStatus("running"), [])

  const pause = useCallback(() => setStatus("idle"), [])

  const beginNextPhase = useCallback(() => {
    // Determine what comes next
    let nextPhase: PomodoroPhase
    let nextRound = focusRound

    if (phase === "focus") {
      if (focusRound >= 4) {
        nextPhase = "long-break"
      } else {
        nextPhase = "short-break"
      }
    } else if (phase === "short-break") {
      nextPhase = "focus"
      nextRound = focusRound + 1
    } else {
      // long-break finished → restart cycle
      setPhase("focus")
      setFocusRound(1)
      setSeconds(DURATIONS["focus"])
      setStatus("idle")
      return
    }

    setPhase(nextPhase)
    setFocusRound(nextRound)
    setSeconds(DURATIONS[nextPhase])
    // User tapping the button IS the start action, so begin immediately
    setStatus("running")
  }, [phase, focusRound])

  const reset = useCallback(() => {
    setPhase("focus")
    setFocusRound(1)
    setSeconds(DURATIONS["focus"])
    setStatus("idle")
  }, [])

  return {
    phase,
    status,
    focusRound,
    seconds,
    maxSeconds: DURATIONS[phase],
    start,
    pause,
    beginNextPhase,
    reset,
  }
}
