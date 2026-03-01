"use client"

import { useState, useRef, useEffect } from "react"
import { X, ChevronUp, ChevronDown, Volume2 } from "lucide-react"
import { SOUNDS, DAY_LABELS } from "@/lib/alarms"
import type { Alarm, DayOfWeek } from "@/lib/alarms"

type Props = {
  initialAlarm?: Alarm
  onSave: (alarm: Omit<Alarm, "id">) => void
  onClose: () => void
}

export function AlarmModal({ initialAlarm, onSave, onClose }: Props) {
  const [hour, setHour]     = useState(initialAlarm?.hour   ?? 7)
  const [minute, setMinute] = useState(initialAlarm?.minute ?? 0)
  const [days, setDays]     = useState<DayOfWeek[]>(initialAlarm?.days ?? [])
  const [sound, setSound]   = useState(initialAlarm?.sound  ?? "beep")
  const previewRef = useRef<HTMLAudioElement | null>(null)

  // Stop any preview when modal unmounts
  useEffect(() => () => { previewRef.current?.pause() }, [])

  function toggleDay(d: DayOfWeek) {
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)
    )
  }

  function previewSound(id: string) {
    previewRef.current?.pause()
    const s = SOUNDS.find((s) => s.id === id)
    if (!s) return
    const audio = new Audio(s.file)
    audio.volume = 0.5
    audio.play().catch(() => {})
    previewRef.current = audio
  }

  function handleSave() {
    onSave({ hour, minute, days, enabled: initialAlarm?.enabled ?? true, sound })
  }

  return (
    /* Backdrop — click outside to close */
    <div
      className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-secondary rounded-2xl p-5 w-full max-w-sm mx-4 flex flex-col gap-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            {initialAlarm ? "Edit Alarm" : "New Alarm"}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Time picker */}
        <div className="flex items-center justify-center gap-3">
          <TimeSpinner value={hour}   min={0} max={23} onChange={setHour}   />
          <span className="text-5xl font-extralight text-foreground select-none">:</span>
          <TimeSpinner value={minute} min={0} max={59} onChange={setMinute} />
        </div>

        {/* Day selector */}
        <div>
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-2 text-center">
            Repeat
          </p>
          <div className="flex justify-center gap-1.5">
            {DAY_LABELS.map((label, i) => {
              const day = i as DayOfWeek
              const active = days.includes(day)
              return (
                <button
                  key={i}
                  onClick={() => toggleDay(day)}
                  aria-label={`Toggle ${label}`}
                  className={`size-7 rounded-full text-[11px] font-medium transition-colors ${
                    active
                      ? "bg-accent text-background"
                      : "border border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-1.5">
            {days.length === 0 ? "Fires every day" : days.length === 7 ? "Every day" : `${days.length} day${days.length > 1 ? "s" : ""} selected`}
          </p>
        </div>

        {/* Sound picker — horizontal scroll with preview on tap */}
        <div>
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-2 text-center">
            Sound
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {SOUNDS.map((s) => {
              const active = sound === s.id
              return (
                <button
                  key={s.id}
                  onClick={() => { setSound(s.id); previewSound(s.id) }}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    active
                      ? "bg-accent text-background"
                      : "border border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Volume2 className="size-3" />
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-full border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-full bg-accent text-background text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---- Time spinner (up/down arrows + display) ---- */
function TimeSpinner({
  value, min, max, onChange,
}: {
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  const range = max - min + 1
  const inc = () => onChange(((value - min + 1) % range) + min)
  const dec = () => onChange(((value - min - 1 + range) % range) + min)

  return (
    <div className="flex flex-col items-center gap-0.5">
      <button
        onClick={inc}
        aria-label="Increase"
        className="p-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronUp className="size-5" />
      </button>
      <span className="text-5xl font-extralight font-mono tabular-nums w-16 text-center text-foreground leading-none">
        {String(value).padStart(2, "0")}
      </span>
      <button
        onClick={dec}
        aria-label="Decrease"
        className="p-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronDown className="size-5" />
      </button>
    </div>
  )
}
