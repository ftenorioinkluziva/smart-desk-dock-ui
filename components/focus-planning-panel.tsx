"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { CalendarClock, Loader2, RefreshCw, Target } from "lucide-react"
import { DockDataSourceError, useDockDataSource } from "@/components/dock-runtime-provider"
import { TodayTasks } from "@/components/today-tasks"
import { appendCalendarIds, CALENDAR_SETTINGS_EVENT, readSelectedCalendarIds } from "@/lib/calendar-settings"
import { calendarEventsApiResponseSchema } from "@/lib/operations/contracts"

type CalendarEvent = {
  id: string
  title: string
  date: string
  time: string
  startDateTime: string | null
  endDateTime: string | null
  isAllDay: boolean
}

function eventTime(event: CalendarEvent) {
  if (event.isAllDay || !event.startDateTime) return "Dia todo"
  return event.time
}

function relativeEventLabel(event: CalendarEvent, now: Date) {
  if (event.isAllDay || !event.startDateTime) return "Dia todo"

  const start = new Date(event.startDateTime).getTime()
  const end = event.endDateTime ? new Date(event.endDateTime).getTime() : null
  if (end && now.getTime() >= start && now.getTime() < end) return "Agora"
  if (start <= now.getTime()) return "Em andamento"

  const minutes = Math.max(0, Math.round((start - now.getTime()) / 60000))
  if (minutes < 60) return `Em ${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `Em ${hours}h${String(remainingMinutes).padStart(2, "0")}` : `Em ${hours}h`
}

function UpcomingCommitment() {
  const [now, setNow] = useState(() => new Date())
  const [calendarIds, setCalendarIds] = useState<string[]>([])

  useEffect(() => {
    setCalendarIds(readSelectedCalendarIds())
    const handleCalendarSettings = () => setCalendarIds(readSelectedCalendarIds())
    window.addEventListener(CALENDAR_SETTINGS_EVENT, handleCalendarSettings)
    const clock = window.setInterval(() => setNow(new Date()), 30_000)

    return () => {
      window.removeEventListener(CALENDAR_SETTINGS_EVENT, handleCalendarSettings)
      window.clearInterval(clock)
    }
  }, [])

  const fetchEvents = useCallback(async () => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    const params = new URLSearchParams({
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
    })
    appendCalendarIds(params, calendarIds)

    const response = await fetch(`/api/calendar-events?${params.toString()}`)
    const parsed = calendarEventsApiResponseSchema.safeParse(await response.json())
    if (!parsed.success) throw new DockDataSourceError("INVALID_RESPONSE")
    if (!response.ok) throw new DockDataSourceError(response.status === 401 ? "UNAUTHORIZED" : "UPSTREAM_UNAVAILABLE")
    return parsed.data
  }, [calendarIds])

  const source = useDockDataSource("today-calendar", fetchEvents, {
    panelId: "productivity",
    schema: calendarEventsApiResponseSchema,
  })

  const upcomingEvents = useMemo(() => {
    const events = (source.data?.events ?? []) as CalendarEvent[]
    return [...events]
      .sort((a, b) => {
        if (!a.startDateTime) return 1
        if (!b.startDateTime) return -1
        return new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
      })
      .filter((event) => {
        if (!event.startDateTime) return true
        const end = event.endDateTime ? new Date(event.endDateTime).getTime() : null
        return end ? end > now.getTime() : new Date(event.startDateTime).getTime() >= now.getTime()
      })
  }, [now, source.data])

  const isLoading = source.isLoading && !source.data
  const isUnauthorized = source.state.status === "unauthorized"
  const hasError = source.state.status === "error"
  const visibleUpcomingEvents = upcomingEvents.slice(0, 2)

  return (
    <section aria-labelledby="focus-agenda-heading" className="flex h-full min-h-0 min-w-0 flex-col rounded-xl border border-border/35 bg-secondary/20 px-[clamp(0.65rem,1.55vw,0.95rem)] py-[clamp(0.5rem,1.15vh,0.7rem)]">
      <div className="flex items-center justify-between gap-2 text-muted-foreground" style={{ fontSize: "clamp(0.58rem,1.45vw,0.7rem)" }}>
        <div className="flex min-w-0 items-center gap-1.5">
          <CalendarClock className="size-3.5 shrink-0" />
          <h2 id="focus-agenda-heading" className="truncate uppercase tracking-[0.12em]">Próximos compromissos</h2>
          {upcomingEvents.length > 0 && <span className="font-mono tabular-nums text-muted-foreground/55">{upcomingEvents.length}</span>}
        </div>
        <button
          type="button"
          onClick={() => source.refresh()}
          disabled={source.isLoading}
          aria-label="Atualizar próximo compromisso"
          className="flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground/65 transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
        >
          <RefreshCw className={`size-3 ${source.isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {isUnauthorized ? (
        <p className="mt-2 text-muted-foreground/65" style={{ fontSize: "clamp(0.62rem,1.5vw,0.72rem)" }}>
          Conecte o Google Agenda para acompanhar seus compromissos.
        </p>
      ) : isLoading ? (
        <div className="mt-2 flex items-center gap-1.5 text-muted-foreground/60" style={{ fontSize: "clamp(0.62rem,1.5vw,0.72rem)" }}>
          <Loader2 className="size-3 animate-spin" />
          Carregando agenda
        </div>
      ) : upcomingEvents.length > 0 ? (
        <div
          className="mt-1.5 min-h-0 flex-1 overflow-hidden pr-1"
          aria-label="Lista de próximos compromissos"
        >
          <div className="flex flex-col">
            {visibleUpcomingEvents.map((event, index) => (
              <article key={event.id} className="min-w-0 border-b border-border/20 py-1.5 first:pt-0 last:border-b-0 last:pb-0">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[clamp(0.54rem,1.3vw,0.64rem)] uppercase tracking-[0.1em] text-muted-foreground/60">
                      {index === 0 ? relativeEventLabel(event, now) : event.isAllDay ? "Dia todo" : event.date}
                    </div>
                    <p className="mt-0.5 line-clamp-2 break-words font-medium leading-tight text-foreground" title={event.title} style={{ fontSize: "clamp(0.72rem,1.75vw,0.9rem)" }}>
                      {event.title}
                    </p>
                  </div>
                  <span className="shrink-0 pt-0.5 font-mono tabular-nums text-muted-foreground/65" style={{ fontSize: "clamp(0.58rem,1.4vw,0.7rem)" }}>
                    {eventTime(event)}
                  </span>
                </div>
              </article>
            ))}
            {upcomingEvents.length > visibleUpcomingEvents.length && (
              <span className="pt-0.5 text-muted-foreground/50" style={{ fontSize: "clamp(0.58rem,1.35vw,0.68rem)" }}>
                +{upcomingEvents.length - visibleUpcomingEvents.length} compromissos hoje
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-1.5 text-muted-foreground/65" style={{ fontSize: "clamp(0.62rem,1.5vw,0.72rem)" }}>
          <Target className="size-3 shrink-0" />
          Sem compromissos restantes hoje.
        </div>
      )}

      {hasError && (
        <p className="mt-1 text-destructive/80" style={{ fontSize: "clamp(0.54rem,1.25vw,0.64rem)" }}>
          Agenda indisponível; mantendo o último valor.
        </p>
      )}
    </section>
  )
}

export function FocusPlanningPanel() {
  return (
    <aside aria-label="Planejamento do foco" className="flex h-full min-h-0 min-w-0 flex-col gap-[clamp(0.4rem,1vh,0.65rem)] overflow-hidden">
      <div className="flex items-center gap-1.5 text-muted-foreground/55" style={{ fontSize: "clamp(0.55rem,1.3vw,0.66rem)" }}>
        <Target className="size-3" />
        <span className="uppercase tracking-[0.16em]">Planejamento do foco</span>
      </div>
      <div className="grid min-h-0 min-w-0 flex-1 grid-rows-[minmax(0,1.35fr)_minmax(0,1fr)] gap-[clamp(0.45rem,1.2vw,0.8rem)]">
        <TodayTasks variant="focus" panelId="productivity" />
        <UpcomingCommitment />
      </div>
    </aside>
  )
}
