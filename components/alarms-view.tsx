"use client"

import { useState } from "react"
import { Plus, Trash2, BellOff } from "lucide-react"
import { DAY_LABELS, DAY_NAMES, SOUNDS } from "@/lib/alarms"
import type { Alarm, DayOfWeek } from "@/lib/alarms"
import { AlarmModal } from "@/components/alarm-modal"

type Props = {
  alarms: Alarm[]
  onAdd: (alarm: Omit<Alarm, "id">) => void
  onUpdate: (id: string, updates: Partial<Omit<Alarm, "id">>) => void
  onDelete: (id: string) => void
  onToggle: (id: string) => void
}

export function AlarmsView({ alarms, onAdd, onUpdate, onDelete, onToggle }: Props) {
  const [modal, setModal] = useState<"new" | Alarm | null>(null)

  function handleSave(data: Omit<Alarm, "id">) {
    if (modal === "new") {
      onAdd(data)
    } else if (modal) {
      onUpdate(modal.id, data)
    }
    setModal(null)
  }

  // Sort: enabled first, then by time
  const sorted = [...alarms].sort((a, b) => {
    if (a.enabled !== b.enabled) return a.enabled ? -1 : 1
    return a.hour * 60 + a.minute - (b.hour * 60 + b.minute)
  })

  return (
    <div className="flex flex-col h-full px-8 py-3">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 mb-3">
        <h2 className="text-[11px] font-semibold tracking-[0.25em] uppercase text-muted-foreground">
          Alarms
        </h2>
        <button
          onClick={() => setModal("new")}
          aria-label="Add alarm"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent text-background text-xs font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus className="size-3.5" />
          New
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <BellOff className="size-8 opacity-20" />
            <p className="text-xs text-center leading-relaxed">
              No alarms set.<br />Tap <strong>New</strong> to add one.
            </p>
          </div>
        ) : (
          sorted.map((alarm) => (
            <AlarmRow
              key={alarm.id}
              alarm={alarm}
              onToggle={() => onToggle(alarm.id)}
              onEdit={() => setModal(alarm)}
              onDelete={() => onDelete(alarm.id)}
            />
          ))
        )}
      </div>

      {/* Modal */}
      {modal !== null && (
        <AlarmModal
          initialAlarm={modal === "new" ? undefined : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

/* ---- Single alarm row ---- */
function AlarmRow({
  alarm, onToggle, onEdit, onDelete,
}: {
  alarm: Alarm
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const h = String(alarm.hour).padStart(2, "0")
  const m = String(alarm.minute).padStart(2, "0")
  const sound = SOUNDS.find((s) => s.id === alarm.sound)

  const daysLabel =
    alarm.days.length === 0 || alarm.days.length === 7
      ? "Every day"
      : alarm.days.map((d) => DAY_NAMES[d]).join(" · ")

  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-opacity ${
        alarm.enabled ? "bg-secondary/60" : "bg-secondary/20 opacity-50"
      }`}
    >
      {/* Time + metadata — tap to edit */}
      <button onClick={onEdit} className="flex flex-col items-start gap-1 flex-1 text-left min-w-0">
        <span
          className={`text-3xl font-extralight font-mono tabular-nums leading-none ${
            alarm.enabled ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          {h}:{m}
        </span>

        {/* Day chips — only shown when specific days selected */}
        {alarm.days.length > 0 && alarm.days.length < 7 ? (
          <div className="flex gap-0.5">
            {DAY_LABELS.map((label, i) => (
              <span
                key={i}
                className={`text-[9px] font-medium size-4 flex items-center justify-center rounded-full ${
                  alarm.days.includes(i as DayOfWeek)
                    ? "bg-accent text-background"
                    : "text-muted-foreground/30"
                }`}
              >
                {label}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-[10px] text-muted-foreground">{daysLabel}</span>
        )}

        {sound && (
          <span className="text-[10px] text-muted-foreground/60">{sound.label}</span>
        )}
      </button>

      {/* Delete */}
      <button
        onClick={onDelete}
        aria-label="Delete alarm"
        className="text-muted-foreground/30 hover:text-destructive transition-colors"
      >
        <Trash2 className="size-3.5" />
      </button>

      {/* Toggle switch */}
      <button
        onClick={onToggle}
        aria-label={alarm.enabled ? "Disable" : "Enable"}
        className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
          alarm.enabled ? "bg-accent" : "bg-secondary"
        }`}
      >
        <span
          className={`absolute top-[3px] size-[18px] rounded-full bg-background shadow-sm transition-transform ${
            alarm.enabled ? "translate-x-[19px]" : "translate-x-[3px]"
          }`}
        />
      </button>
    </div>
  )
}
