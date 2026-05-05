"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, Settings, X } from "lucide-react"
import { readSelectedCalendarIds, writeSelectedCalendarIds } from "@/lib/calendar-settings"
import { readNightModeSettings, writeNightModeSettings, type NightModeSettings } from "@/lib/dock-settings"

type CalendarOption = {
  id: string
  name: string
  primary: boolean
  color: string | null
}

type CalendarListResponse = {
  calendars: CalendarOption[]
  mock?: boolean
}

export function SettingsPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [calendars, setCalendars] = useState<CalendarOption[]>([])
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([])
  const [nightModeSettings, setNightModeSettings] = useState<NightModeSettings>(() => readNightModeSettings())
  const [isLoading, setIsLoading] = useState(false)

  const fetchCalendars = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/calendar-list")
      if (!response.ok) return

      const data = await response.json() as CalendarListResponse
      setCalendars(data.calendars)

      const stored = readSelectedCalendarIds()
      if (stored.length > 0) {
        setSelectedCalendarIds(stored)
        return
      }

      const primary = data.calendars.find((calendar) => calendar.primary)
      const fallback = primary ? [primary.id] : data.calendars[0] ? [data.calendars[0].id] : []
      setSelectedCalendarIds(fallback)
      if (fallback.length > 0) {
        window.setTimeout(() => writeSelectedCalendarIds(fallback), 0)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      setNightModeSettings(readNightModeSettings())
      fetchCalendars()
    }
  }, [fetchCalendars, isOpen])

  function toggleCalendar(calendarId: string) {
    const next = selectedCalendarIds.includes(calendarId)
      ? selectedCalendarIds.filter((id) => id !== calendarId)
      : [...selectedCalendarIds, calendarId]
    const normalized = next.length > 0 ? next : [calendarId]

    setSelectedCalendarIds(normalized)
    writeSelectedCalendarIds(normalized)
  }

  function updateNightModeSettings(nextSettings: NightModeSettings) {
    setNightModeSettings(nextSettings)
    writeNightModeSettings(nextSettings)
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="absolute right-[calc(var(--dock-pad-x)+var(--dock-safe-right))] bottom-[calc(var(--dock-pad-y)+var(--dock-safe-bottom)+clamp(2.65rem,6.6vh,3.2rem))] z-20 flex size-[clamp(1.7rem,4vw,2.1rem)] items-center justify-center rounded-lg text-muted-foreground/70 transition-colors hover:bg-secondary/60 hover:text-foreground"
        aria-label="Configurações"
      >
        <Settings className="size-[clamp(0.9rem,2vw,1.1rem)]" />
      </button>

      {isOpen && (
        <div className="absolute inset-0 z-30 flex items-start justify-end bg-background/35 backdrop-blur-[2px] p-[calc(var(--dock-pad-y)+0.25rem)]">
          <div className="w-[min(20rem,92vw)] rounded-xl border border-border/50 bg-background/95 p-3 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-foreground" style={{ fontSize: "clamp(0.82rem,2vw,1rem)" }}>
                  Configurações
                </div>
                <div className="text-muted-foreground" style={{ fontSize: "clamp(0.62rem,1.5vw,0.75rem)" }}>
                  Agendas exibidas
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Fechar configurações"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-3 flex max-h-[12rem] flex-col gap-1 overflow-y-auto">
              <div className="mb-2 rounded-lg border border-border/35 bg-secondary/20 p-2">
                <label className="flex items-center justify-between gap-3">
                  <span className="text-foreground" style={{ fontSize: "clamp(0.7rem,1.75vw,0.86rem)" }}>
                    Modo noturno automático
                  </span>
                  <input
                    type="checkbox"
                    checked={nightModeSettings.enabled}
                    onChange={(event) => updateNightModeSettings({ ...nightModeSettings, enabled: event.target.checked })}
                    className="size-4 accent-[var(--accent)]"
                  />
                </label>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1 text-muted-foreground" style={{ fontSize: "clamp(0.58rem,1.45vw,0.7rem)" }}>
                    Início
                    <input
                      type="time"
                      value={nightModeSettings.start}
                      onChange={(event) => updateNightModeSettings({ ...nightModeSettings, start: event.target.value })}
                      className="rounded-md border border-border/50 bg-background px-2 py-1 text-foreground outline-none focus:border-ring"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-muted-foreground" style={{ fontSize: "clamp(0.58rem,1.45vw,0.7rem)" }}>
                    Fim
                    <input
                      type="time"
                      value={nightModeSettings.end}
                      onChange={(event) => updateNightModeSettings({ ...nightModeSettings, end: event.target.value })}
                      className="rounded-md border border-border/50 bg-background px-2 py-1 text-foreground outline-none focus:border-ring"
                    />
                  </label>
                </div>
              </div>

              {isLoading && (
                <div className="text-muted-foreground" style={{ fontSize: "clamp(0.68rem,1.7vw,0.82rem)" }}>
                  Carregando agendas...
                </div>
              )}

              {!isLoading && calendars.length === 0 && (
                <div className="text-muted-foreground" style={{ fontSize: "clamp(0.68rem,1.7vw,0.82rem)" }}>
                  Nenhuma agenda disponível
                </div>
              )}

              {calendars.map((calendar) => {
                const selected = selectedCalendarIds.includes(calendar.id)
                return (
                  <button
                    key={calendar.id}
                    onClick={() => toggleCalendar(calendar.id)}
                    className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
                      selected ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    }`}
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: calendar.color ?? "var(--accent)" }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate" style={{ fontSize: "clamp(0.7rem,1.75vw,0.86rem)" }}>
                      {calendar.name}
                    </span>
                    {selected && <Check className="size-3.5 shrink-0 text-accent" />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
