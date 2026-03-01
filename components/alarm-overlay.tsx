"use client"

import { useRef, useEffect, useState } from "react"
import { SOUNDS } from "@/lib/alarms"
import type { Alarm } from "@/lib/alarms"

type Props = {
  alarm: Alarm
  onStop: () => void
  onSnooze: () => void
}

export function AlarmOverlay({ alarm, onStop, onSnooze }: Props) {
  const [visible, setVisible] = useState(true) // drives blink
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Play alarm sound on loop
  useEffect(() => {
    const sound = SOUNDS.find((s) => s.id === alarm.sound)
    if (!sound) return
    const audio = new Audio(sound.file)
    audio.loop = true
    audio.play().catch(() => {})
    audioRef.current = audio
    return () => {
      audio.pause()
      audioRef.current = null
    }
  }, [alarm])

  // Blinking colon / digits
  useEffect(() => {
    const interval = setInterval(() => setVisible((v) => !v), 600)
    return () => clearInterval(interval)
  }, [])

  const h = String(alarm.hour).padStart(2, "0")
  const m = String(alarm.minute).padStart(2, "0")

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center gap-6">
      {/* Blinking time */}
      <div
        className="text-9xl font-extralight font-mono tabular-nums leading-none text-accent transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0.15 }}
      >
        {h}:{m}
      </div>

      <p className="text-xs font-semibold tracking-[0.3em] uppercase text-muted-foreground">
        Alarm
      </p>

      {/* Action buttons */}
      <div className="flex gap-4 mt-2">
        <button
          onClick={onSnooze}
          className="px-7 py-3 rounded-full border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Snooze 10 min
        </button>
        <button
          onClick={onStop}
          className="px-10 py-3 rounded-full bg-accent text-background text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Stop
        </button>
      </div>
    </div>
  )
}
