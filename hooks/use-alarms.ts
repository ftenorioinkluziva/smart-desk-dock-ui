"use client"

import { useState, useEffect } from "react"
import type { Alarm, DayOfWeek } from "@/lib/alarms"

const STORAGE_KEY = "focus-dock-alarms"

export function useAlarms() {
  const [alarms, setAlarms] = useState<Alarm[]>([])
  const [loaded, setLoaded] = useState(false)

  // Hydrate from localStorage once on mount (avoids SSR mismatch)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setAlarms(JSON.parse(stored) as Alarm[])
    } catch {}
    setLoaded(true)
  }, [])

  // Persist every time alarms change (after initial load)
  useEffect(() => {
    if (!loaded) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alarms))
  }, [alarms, loaded])

  function addAlarm(alarm: Omit<Alarm, "id">) {
    setAlarms((prev) => [...prev, { ...alarm, id: crypto.randomUUID() }])
  }

  function updateAlarm(id: string, updates: Partial<Omit<Alarm, "id">>) {
    setAlarms((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    )
  }

  function deleteAlarm(id: string) {
    setAlarms((prev) => prev.filter((a) => a.id !== id))
  }

  function toggleAlarm(id: string) {
    setAlarms((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    )
  }

  return { alarms, addAlarm, updateAlarm, deleteAlarm, toggleAlarm }
}
