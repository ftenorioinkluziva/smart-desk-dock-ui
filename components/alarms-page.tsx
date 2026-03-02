"use client"

import { useState, useCallback } from "react"
import { Plus, Trash2, X } from "lucide-react"

interface AlarmItem {
  id: string
  time: string
  label: string
  enabled: boolean
  days: string[]
}

const WEEKDAYS = ["S", "T", "Q", "Q", "S", "S", "D"]
const WEEKDAY_FULL = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"]

function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

export function AlarmsPage() {
  const [alarms, setAlarms] = useState<AlarmItem[]>([
    { id: "1", time: "06:30", label: "Wake up", enabled: true, days: ["Seg", "Ter", "Qua", "Qui", "Sex"] },
    { id: "2", time: "07:00", label: "Morning routine", enabled: true, days: ["Seg", "Ter", "Qua", "Qui", "Sex"] },
    { id: "3", time: "09:00", label: "Weekend", enabled: false, days: ["Sab", "Dom"] },
  ])
  const [showAdd, setShowAdd] = useState(false)
  const [newTime, setNewTime] = useState("07:00")
  const [newLabel, setNewLabel] = useState("")
  const [newDays, setNewDays] = useState<string[]>([])

  const toggleAlarm = useCallback((id: string) => {
    setAlarms((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    )
  }, [])

  const deleteAlarm = useCallback((id: string) => {
    setAlarms((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const toggleDay = useCallback((day: string) => {
    setNewDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }, [])

  const addAlarm = useCallback(() => {
    if (!newTime) return
    setAlarms((prev) => [
      ...prev,
      {
        id: generateId(),
        time: newTime,
        label: newLabel.trim() || "Alarm",
        enabled: true,
        days: newDays.length > 0 ? newDays : WEEKDAY_FULL.slice(),
      },
    ])
    setNewTime("07:00")
    setNewLabel("")
    setNewDays([])
    setShowAdd(false)
  }, [newTime, newLabel, newDays])

  return (
    <div className="flex h-full w-full dock-px py-[clamp(0.35rem,1vh,0.75rem)] overflow-hidden" style={{ gap: "var(--dock-gap)" }}>
      <div className="flex flex-col gap-2.5 shrink-0 w-[min(39vw,15rem)] justify-center">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-semibold tracking-[0.25em] uppercase text-muted-foreground">
            {"Alarms"}
          </h2>
          <button
            onClick={() => setShowAdd(!showAdd)}
            aria-label={showAdd ? "Cancel" : "Add alarm"}
            className="size-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            {showAdd ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
          </button>
        </div>

        {/* Add alarm form */}
        {showAdd && (
          <div className="flex flex-col gap-2 p-2.5 rounded-lg bg-secondary/40 border border-border/50">
            <div className="flex items-center gap-1.5">
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="bg-secondary/80 text-foreground text-sm font-mono tabular-nums rounded px-2 py-1 outline-none focus:ring-1 focus:ring-ring appearance-none w-[clamp(3.8rem,10vw,5rem)]"
                style={{ colorScheme: "dark" }}
              />
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Label"
                className="flex-1 bg-secondary/80 text-foreground text-xs rounded px-2 py-1 outline-none placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-ring"
                onKeyDown={(e) => e.key === "Enter" && addAlarm()}
              />
            </div>
            <div className="flex items-center gap-0.5">
              {WEEKDAY_FULL.map((day, i) => (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`size-5 flex items-center justify-center rounded-full text-[8px] font-medium transition-colors ${
                    newDays.includes(day)
                      ? "bg-accent text-accent-foreground"
                      : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {WEEKDAYS[i]}
                </button>
              ))}
              <button
                onClick={addAlarm}
                className="ml-auto text-[10px] font-medium text-accent hover:text-accent/80 px-2 py-0.5"
              >
                {"Save"}
              </button>
            </div>
          </div>
        )}

        {!showAdd && (
          <p className="text-[10px] text-muted-foreground/50">
            {alarms.length} {alarms.length === 1 ? "alarm" : "alarms"} {"set"}
          </p>
        )}
      </div>

      <div className="flex-1 flex flex-col gap-2 overflow-y-auto scrollbar-hide justify-center min-w-0">
        {alarms.length === 0 && (
          <div className="flex items-center justify-center flex-1">
            <span className="text-xs text-muted-foreground">{"No alarms set"}</span>
          </div>
        )}
        <div className="grid grid-cols-1 min-[600px]:grid-cols-2 gap-2">
          {alarms.map((alarm) => (
            <div
              key={alarm.id}
              className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-colors ${
                alarm.enabled
                  ? "border-border/50 bg-secondary/20"
                  : "border-border/20 bg-secondary/5 opacity-50"
              }`}
            >
              {/* Time + info */}
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xl font-light text-foreground font-mono tabular-nums leading-tight">
                  {alarm.time}
                </span>
                <span className="text-[9px] text-muted-foreground truncate leading-tight mt-0.5">
                  {alarm.label}
                </span>
                <div className="flex items-center gap-0.5 mt-0.5">
                  {WEEKDAY_FULL.map((day, i) => (
                    <span
                      key={day}
                      className={`text-[7px] font-medium ${
                        alarm.days.includes(day) ? "text-accent" : "text-muted-foreground/30"
                      }`}
                    >
                      {WEEKDAYS[i]}
                    </span>
                  ))}
                </div>
              </div>

              {/* Toggle + delete */}
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <button
                  onClick={() => toggleAlarm(alarm.id)}
                  aria-label={alarm.enabled ? "Disable alarm" : "Enable alarm"}
                  className={`relative w-8 h-4.5 rounded-full transition-colors ${
                    alarm.enabled ? "bg-accent" : "bg-secondary"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 size-3.5 rounded-full bg-foreground transition-transform ${
                      alarm.enabled ? "translate-x-3.5" : "translate-x-0"
                    }`}
                  />
                </button>
                <button
                  onClick={() => deleteAlarm(alarm.id)}
                  aria-label="Delete alarm"
                  className="size-5 flex items-center justify-center text-muted-foreground/40 hover:text-destructive transition-colors"
                >
                  <Trash2 className="size-2.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
