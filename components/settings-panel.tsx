"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { Bell, Check, Clock3, Eye, Settings, Volume2, Vibrate, X } from "lucide-react"
import { readSelectedCalendarIds, writeSelectedCalendarIds } from "@/lib/calendar-settings"
import { readNightModeSettings, writeNightModeSettings, type NightModeSettings } from "@/lib/dock-settings"
import {
  getNotificationPermission,
  readProductivityAlertSettings,
  readPomodoroDurations,
  requestProductivityNotificationPermission,
  writePomodoroDurations,
  writeProductivityAlertSettings,
  type PomodoroDurations,
  type PomodoroMode,
  type ProductivityAlertPreference,
  type ProductivityAlertSettings,
} from "@/lib/productivity-settings"

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

const ALERT_OPTIONS: Array<{ value: ProductivityAlertPreference; label: string; description: string; icon: ReactNode }> = [
  { value: "visual", label: "Visual", description: "Sem vibração ou som.", icon: <Eye className="size-3.5" /> },
  { value: "visual-vibration", label: "Vibração", description: "Usa vibração quando o aparelho suporta.", icon: <Vibrate className="size-3.5" /> },
  { value: "visual-sound", label: "Som", description: "Toca um aviso curto no navegador.", icon: <Volume2 className="size-3.5" /> },
]

const POMODORO_DURATION_FIELDS: Array<{ mode: PomodoroMode; label: string }> = [
  { mode: "focus", label: "Foco" },
  { mode: "short-break", label: "Pausa" },
  { mode: "long-break", label: "Longa" },
]

export function SettingsPanel({ showTrigger = true }: { showTrigger?: boolean }) {
  const [isOpen, setIsOpen] = useState(false)
  const [calendars, setCalendars] = useState<CalendarOption[]>([])
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([])
  const [nightModeSettings, setNightModeSettings] = useState<NightModeSettings>(() => readNightModeSettings())
  const [alertSettings, setAlertSettings] = useState<ProductivityAlertSettings>(() => readProductivityAlertSettings())
  const [pomodoroDurations, setPomodoroDurations] = useState<PomodoroDurations>(() => readPomodoroDurations())
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">(() => getNotificationPermission())
  const panelRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      panelRef.current?.querySelector<HTMLElement>("button, input, [tabindex]:not([tabindex='-1'])")?.focus()
    }
  }, [isOpen])

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
      setAlertSettings(readProductivityAlertSettings())
      setPomodoroDurations(readPomodoroDurations())
      setNotificationPermission(getNotificationPermission())
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

  function updateAlertPreference(preference: ProductivityAlertPreference) {
    const nextSettings = { ...alertSettings, preference }
    setAlertSettings(nextSettings)
    writeProductivityAlertSettings(nextSettings)
  }

  async function enableBrowserNotifications() {
    const permission = await requestProductivityNotificationPermission()
    setNotificationPermission(permission)

    const nextSettings = {
      ...alertSettings,
      notificationEnabled: permission === "granted",
    }
    setAlertSettings(nextSettings)
    writeProductivityAlertSettings(nextSettings)
  }

  function disableBrowserNotifications() {
    const nextSettings = {
      ...alertSettings,
      notificationEnabled: false,
    }
    setAlertSettings(nextSettings)
    writeProductivityAlertSettings(nextSettings)
  }

  function updatePomodoroDuration(mode: PomodoroMode, value: string) {
    const parsedMinutes = Number(value.replace(",", "."))
    const minutes = Number.isFinite(parsedMinutes)
      ? Math.max(1, Math.min(180, Math.round(parsedMinutes)))
      : Math.round(pomodoroDurations[mode] / 60)

    const nextDurations = {
      ...pomodoroDurations,
      [mode]: minutes * 60,
    }

    setPomodoroDurations(nextDurations)
    writePomodoroDurations(nextDurations)
  }

  return (
    <>
      {showTrigger && (
        <button
          onClick={() => setIsOpen(true)}
          className="absolute right-[calc(var(--dock-pad-x)+var(--dock-safe-right))] bottom-[calc(var(--dock-pad-y)+var(--dock-safe-bottom)+clamp(2.65rem,6.6vh,3.2rem))] z-20 flex size-[clamp(1.7rem,4vw,2.1rem)] items-center justify-center rounded-lg text-muted-foreground/70 transition-colors hover:bg-secondary/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Configurações"
        >
          <Settings className="size-[clamp(0.9rem,2vw,1.1rem)]" />
        </button>
      )}

      {isOpen && (
        <div
          className="absolute inset-0 z-30 flex items-start justify-end bg-background/35 backdrop-blur-[2px] p-[calc(var(--dock-pad-y)+0.25rem)]"
          onKeyDown={(e) => { if (e.key === "Escape") setIsOpen(false) }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false) }}
        >
          <div ref={panelRef} className="w-[min(20rem,92vw)] rounded-xl border border-border/50 bg-background/95 p-3 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-foreground" style={{ fontSize: "clamp(0.82rem,2vw,1rem)" }}>
                  Configurações
                </div>
                <div className="text-muted-foreground" style={{ fontSize: "clamp(0.62rem,1.5vw,0.75rem)" }}>
                  Dock e agenda
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Fechar configurações"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-3 flex max-h-[12rem] flex-col gap-1 overflow-y-auto">
              <section className="mb-2 rounded-lg border border-border/35 bg-secondary/20 p-2">
                <div className="mb-2 flex items-center gap-1.5 text-foreground" style={{ fontSize: "clamp(0.7rem,1.75vw,0.84rem)" }}>
                  <Clock3 className="size-3.5 text-muted-foreground" />
                  Produtividade
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {POMODORO_DURATION_FIELDS.map((field) => (
                    <label key={field.mode} className="flex flex-col gap-1 text-muted-foreground" style={{ fontSize: "clamp(0.56rem,1.4vw,0.68rem)" }}>
                      {field.label}
                      <input
                        type="number"
                        min={1}
                        max={180}
                        step={1}
                        inputMode="numeric"
                        value={Math.round(pomodoroDurations[field.mode] / 60)}
                        onChange={(event) => updatePomodoroDuration(field.mode, event.target.value)}
                         className="rounded-md border border-border/50 bg-background px-2 py-1 text-center text-foreground outline-none focus-visible:border-ring"
                         aria-label={`Duração de ${field.label.toLowerCase()} em minutos`}
                      />
                    </label>
                  ))}
                </div>

                <div className="mt-2 flex items-center gap-1.5 text-muted-foreground" style={{ fontSize: "clamp(0.58rem,1.45vw,0.7rem)" }}>
                  <Bell className="size-3" />
                  Alerta
                </div>
                <div className="mt-1 grid grid-cols-3 gap-1.5">
                  {ALERT_OPTIONS.map((option) => {
                    const selected = alertSettings.preference === option.value
                    return (
                      <button
                        key={option.value}
                        onClick={() => updateAlertPreference(option.value)}
                       className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
                         selected
                           ? "border-border/70 bg-background text-foreground"
                           : "border-border/30 bg-secondary/20 text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                       }`}
                        title={option.description}
                        aria-pressed={selected}
                      >
                        {option.icon}
                        <span className="font-medium" style={{ fontSize: "clamp(0.58rem,1.45vw,0.7rem)" }}>
                          {option.label}
                        </span>
                      </button>
                    )
                  })}
                </div>

                <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-border/30 bg-background/45 px-2 py-1.5">
                  <div className="min-w-0">
                    <div className="text-foreground" style={{ fontSize: "clamp(0.6rem,1.5vw,0.72rem)" }}>
                      Notificação do sistema
                    </div>
                    <div className="truncate text-muted-foreground" style={{ fontSize: "clamp(0.52rem,1.25vw,0.62rem)" }}>
                      {notificationPermission === "unsupported"
                        ? "Indisponível neste navegador"
                        : notificationPermission === "denied"
                          ? "Bloqueada no navegador"
                          : alertSettings.notificationEnabled && notificationPermission === "granted"
                            ? "Ativa para Pomodoro e Timer"
                            : "Opcional, com permissão explícita"}
                    </div>
                  </div>

                  {alertSettings.notificationEnabled && notificationPermission === "granted" ? (
                    <button
                      onClick={disableBrowserNotifications}
                      className="shrink-0 rounded-lg border border-border/40 bg-secondary/40 px-2 py-1 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                      style={{ fontSize: "clamp(0.56rem,1.35vw,0.66rem)" }}
                    >
                      Desativar
                    </button>
                  ) : (
                    <button
                      onClick={enableBrowserNotifications}
                      disabled={notificationPermission === "unsupported" || notificationPermission === "denied"}
                      className="shrink-0 rounded-lg border border-border/50 bg-secondary/60 px-2 py-1 text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-45"
                      style={{ fontSize: "clamp(0.56rem,1.35vw,0.66rem)" }}
                    >
                      Ativar
                    </button>
                  )}
                </div>
              </section>

              <section className="mb-2 rounded-lg border border-border/35 bg-secondary/20 p-2">
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
                       className="rounded-md border border-border/50 bg-background px-2 py-1 text-foreground outline-none focus-visible:border-ring"
                     />
                   </label>
                   <label className="flex flex-col gap-1 text-muted-foreground" style={{ fontSize: "clamp(0.58rem,1.45vw,0.7rem)" }}>
                     Fim
                     <input
                       type="time"
                       value={nightModeSettings.end}
                       onChange={(event) => updateNightModeSettings({ ...nightModeSettings, end: event.target.value })}
                       className="rounded-md border border-border/50 bg-background px-2 py-1 text-foreground outline-none focus-visible:border-ring"
                    />
                  </label>
                </div>
              </section>

              <div className="mb-1 text-muted-foreground" style={{ fontSize: "clamp(0.6rem,1.5vw,0.72rem)" }}>
                Agendas exibidas
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
                    className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
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
