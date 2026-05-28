"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { Plus, Check, Trash2, Edit3, ChevronLeft, ChevronRight, Calendar, Clock } from "lucide-react"
import { appendCalendarIds, CALENDAR_SETTINGS_EVENT, readSelectedCalendarIds } from "@/lib/calendar-settings"

interface CalendarEvent {
  id: string
  title: string
  date: string
  time: string
  startDateTime: string | null
  endDateTime: string | null
  isAllDay: boolean
  color: string
  completed: boolean
}

interface CalendarEventsResponse {
  events: CalendarEvent[]
  mock?: boolean
}

const EVENT_COLORS = [
  "bg-accent",
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-4",
  "bg-chart-5",
]

const WEEKDAY_LABELS = ["S", "T", "Q", "Q", "S", "S", "D"]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

const MONTH_NAMES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

const WEEKDAY_PT_SHORT: Record<number, string> = {
  0: "Domingo", 1: "Segunda", 2: "Terça", 3: "Quarta",
  4: "Quinta", 5: "Sexta", 6: "Sábado",
}

function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

function formatDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function sortByStartTime(a: CalendarEvent, b: CalendarEvent) {
  const aTime = a.startDateTime ? new Date(a.startDateTime).getTime() : Number.MAX_SAFE_INTEGER
  const bTime = b.startDateTime ? new Date(b.startDateTime).getTime() : Number.MAX_SAFE_INTEGER
  return aTime - bTime
}

function getRelativeEventLabel(event: CalendarEvent, now: Date) {
  if (!event.startDateTime) return "Dia todo"

  const start = new Date(event.startDateTime)
  const end = event.endDateTime ? new Date(event.endDateTime) : null
  const nowTime = now.getTime()
  const startTime = start.getTime()
  const endTime = end?.getTime()

  if (endTime && nowTime >= startTime && nowTime < endTime) return "Em andamento"
  if (nowTime > startTime) return "Encerrado"

  const minutes = Math.max(0, Math.round((startTime - nowTime) / 60000))
  if (minutes < 60) return `Em ${minutes} min`

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours < 24) return remainingMinutes > 0 ? `Em ${hours}h${String(remainingMinutes).padStart(2, "0")}` : `Em ${hours}h`

  return event.time
}

function EventRow({
  event,
  isGoogleCalendarConnected,
  editingId,
  editTitle,
  editTime,
  onEditTitleChange,
  onEditTimeChange,
  onSaveEdit,
  onCancelEdit,
  onToggleComplete,
  onStartEdit,
  onDeleteEvent,
}: {
  event: CalendarEvent
  isGoogleCalendarConnected: boolean
  editingId: string | null
  editTitle: string
  editTime: string
  onEditTitleChange: (value: string) => void
  onEditTimeChange: (value: string) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onToggleComplete: (id: string) => void
  onStartEdit: (event: CalendarEvent) => void
  onDeleteEvent: (id: string) => void
}) {
  if (editingId === event.id) {
    return (
      <div className="flex flex-col gap-1 p-[clamp(0.25rem,0.7vh,0.4rem)] rounded-lg bg-secondary/50 border border-border/40">
        <input
          type="text"
          value={editTitle}
          onChange={(e) => onEditTitleChange(e.target.value)}
          placeholder="Título"
          className="w-full bg-secondary text-foreground rounded px-1.5 py-0.5 outline-none focus-visible:ring-1 focus-visible:ring-ring/60 placeholder:text-muted-foreground/40"
          style={{ fontSize: "clamp(0.6rem,1.5vw,0.72rem)" }}
          autoFocus
          aria-label="Título do evento"
          onKeyDown={(e) => e.key === "Enter" && onSaveEdit()}
        />
        <input
          type="text"
          value={editTime}
          onChange={(e) => onEditTimeChange(e.target.value)}
          placeholder="Horário"
          className="w-full bg-secondary text-foreground rounded px-1.5 py-0.5 outline-none focus-visible:ring-1 focus-visible:ring-ring/60 placeholder:text-muted-foreground/40"
          style={{ fontSize: "clamp(0.6rem,1.5vw,0.72rem)" }}
          aria-label="Horário do evento"
          onKeyDown={(e) => e.key === "Enter" && onSaveEdit()}
        />
        <div className="flex gap-1.5">
          <button
            onClick={onSaveEdit}
            className="px-2 py-0.5 rounded bg-accent/20 text-accent font-medium transition-colors hover:bg-accent/30 focus-visible:ring-2 focus-visible:ring-ring"
            style={{ fontSize: "clamp(0.55rem,1.4vw,0.68rem)" }}
          >
            Salvar
          </button>
          <button
            onClick={onCancelEdit}
            className="text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring"
            style={{ fontSize: "clamp(0.55rem,1.4vw,0.68rem)" }}
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 group">
      <button
        onClick={() => {
          if (!isGoogleCalendarConnected) onToggleComplete(event.id)
        }}
        disabled={isGoogleCalendarConnected}
        className={`size-[clamp(0.8rem,2vw,1rem)] shrink-0 rounded border-[1.5px] flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
          event.completed
            ? "bg-accent border-accent"
            : isGoogleCalendarConnected
            ? "border-border/40 opacity-60"
            : "border-border/60 hover:border-accent/70"
        }`}
        aria-label={event.completed ? "Desmarcar" : "Concluir"}
      >
        {event.completed && <Check className="size-2 text-accent-foreground" />}
      </button>

      <span className={`w-[2.5px] h-[clamp(1.4rem,4vh,1.9rem)] rounded-full shrink-0 ${event.color}`} aria-hidden="true" />

      <div className="flex flex-col min-w-0 flex-1">
        <span
          className={`font-medium truncate leading-snug ${event.completed ? "line-through text-muted-foreground/50" : "text-foreground"}`}
          style={{ fontSize: "clamp(0.75rem,2vw,0.9rem)" }}
        >
          {event.title}
        </span>
        <span
          className="text-muted-foreground/60 font-mono leading-none tabular-nums"
          style={{ fontSize: "clamp(0.62rem,1.6vw,0.74rem)" }}
        >
          {event.time}
        </span>
      </div>

      {!isGoogleCalendarConnected && (
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onStartEdit(event)}
            className="size-[clamp(1rem,2.5vw,1.3rem)] flex items-center justify-center text-muted-foreground/50 hover:text-foreground transition-colors rounded hover:bg-secondary/60 focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Editar"
          >
            <Edit3 className="size-2.5" />
          </button>
          <button
            onClick={() => onDeleteEvent(event.id)}
            className="size-[clamp(1rem,2.5vw,1.3rem)] flex items-center justify-center text-muted-foreground/50 hover:text-destructive transition-colors rounded hover:bg-secondary/60 focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Remover"
          >
            <Trash2 className="size-2.5" />
          </button>
        </div>
      )}
    </div>
  )
}

export function CalendarPage() {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDay, setSelectedDay] = useState(today.getDate())
  const [now, setNow] = useState(today)
  const todayDateKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate())
  const [events, setEvents] = useState<CalendarEvent[]>([
    { id: "1", title: "In California", date: todayDateKey, time: "Dia todo", startDateTime: null, endDateTime: null, isAllDay: true, color: "bg-chart-2", completed: false },
    { id: "2", title: "Morning Meeting", date: todayDateKey, time: "06:00 - 07:00", startDateTime: null, endDateTime: null, isAllDay: false, color: "bg-accent", completed: false },
  ])
  const [isGoogleCalendarConnected, setIsGoogleCalendarConnected] = useState(false)
  const [hasCalendarError, setHasCalendarError] = useState(false)
  const [calendarIds, setCalendarIds] = useState<string[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editTime, setEditTime] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newTime, setNewTime] = useState("")
  const [newColorIdx, setNewColorIdx] = useState(0)

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
  const selectedDateKey = formatDateKey(currentYear, currentMonth, selectedDay)
  const selectedEvents = useMemo(
    () => events.filter((event) => event.date === selectedDateKey),
    [events, selectedDateKey],
  )
  const allDayEvents = useMemo(
    () => selectedEvents.filter((event) => event.isAllDay),
    [selectedEvents],
  )
  const timedEvents = useMemo(
    () => selectedEvents.filter((event) => !event.isAllDay).sort(sortByStartTime),
    [selectedEvents],
  )
  const eventPresence = useMemo(() => {
    const presence = new Map<string, { allDay: boolean; timed: boolean }>()
    for (const event of events) {
      const current = presence.get(event.date) ?? { allDay: false, timed: false }
      if (event.isAllDay) current.allDay = true
      else current.timed = true
      presence.set(event.date, current)
    }
    return presence
  }, [events])
  const nextTimedEvent = useMemo(() => {
    const upcoming = timedEvents.find((event) => {
      if (!event.startDateTime) return false
      const end = event.endDateTime ? new Date(event.endDateTime).getTime() : null
      return end ? end > now.getTime() : new Date(event.startDateTime).getTime() >= now.getTime()
    })
    return upcoming ?? timedEvents[0] ?? null
  }, [now, timedEvents])

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    setCalendarIds(readSelectedCalendarIds())

    const handleCalendarSettings = () => setCalendarIds(readSelectedCalendarIds())
    window.addEventListener(CALENDAR_SETTINGS_EVENT, handleCalendarSettings)

    return () => window.removeEventListener(CALENDAR_SETTINGS_EVENT, handleCalendarSettings)
  }, [])

  useEffect(() => {
    let cancelled = false
    const timeMin = new Date(currentYear, currentMonth, 1).toISOString()
    const timeMax = new Date(currentYear, currentMonth + 1, 1).toISOString()

    async function fetchCalendarEvents() {
      try {
        const params = new URLSearchParams({ timeMin, timeMax })
        appendCalendarIds(params, calendarIds)
        const response = await fetch(`/api/calendar-events?${params.toString()}`)

        if (!response.ok) {
          if (!cancelled) setHasCalendarError(true)
          return
        }

        const data = await response.json() as CalendarEventsResponse
        if (cancelled) return

        if (data.mock) {
          setIsGoogleCalendarConnected(false)
          setHasCalendarError(false)
          return
        }

        setEvents(data.events)
        setIsGoogleCalendarConnected(true)
        setHasCalendarError(false)
      } catch (error) {
        if (!cancelled) {
          setIsGoogleCalendarConnected(false)
          setHasCalendarError(true)
        }
      }
    }

    fetchCalendarEvents()
    const interval = setInterval(fetchCalendarEvents, 5 * 60 * 1000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [calendarIds, currentMonth, currentYear])

  const isToday = (day: number) =>
    day === today.getDate() &&
    currentMonth === today.getMonth() &&
    currentYear === today.getFullYear()

  const prevMonth = useCallback(() => {
    setCurrentMonth((m) => {
      if (m === 0) { setCurrentYear((y) => y - 1); return 11 }
      return m - 1
    })
  }, [])

  const nextMonth = useCallback(() => {
    setCurrentMonth((m) => {
      if (m === 11) { setCurrentYear((y) => y + 1); return 0 }
      return m + 1
    })
  }, [])

  const addEvent = useCallback(() => {
    if (!newTitle.trim()) return
    setEvents((prev) => [...prev, {
      id: generateId(),
      title: newTitle.trim(),
      date: selectedDateKey,
      time: newTime.trim() || "Dia todo",
      startDateTime: null,
      endDateTime: null,
      isAllDay: !newTime.trim(),
      color: EVENT_COLORS[newColorIdx % EVENT_COLORS.length],
      completed: false,
    }])
    setNewTitle(""); setNewTime(""); setNewColorIdx(0); setShowAdd(false)
  }, [newTitle, selectedDateKey, newTime, newColorIdx])

  const deleteEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const toggleComplete = useCallback((id: string) => {
    setEvents((prev) => prev.map((e) => e.id === id ? { ...e, completed: !e.completed } : e))
  }, [])

  const startEdit = useCallback((event: CalendarEvent) => {
    setEditingId(event.id); setEditTitle(event.title); setEditTime(event.time)
  }, [])

  const saveEdit = useCallback(() => {
    if (!editTitle.trim() || !editingId) return
    setEvents((prev) => prev.map((e) =>
      e.id === editingId ? { ...e, title: editTitle.trim(), time: editTime.trim() || "Dia todo" } : e
    ))
    setEditingId(null); setEditTitle(""); setEditTime("")
  }, [editingId, editTitle, editTime])

  const selectedDate = new Date(currentYear, currentMonth, selectedDay)
  const weekdayName = WEEKDAY_PT_SHORT[selectedDate.getDay()] ?? "Domingo"

  return (
    <section
      aria-labelledby="agenda-heading"
      className="flex h-full w-full dock-px py-[clamp(0.3rem,0.9vh,0.6rem)] overflow-hidden"
      style={{ gap: "var(--dock-gap)" }}
    >
      <h2 id="agenda-heading" className="sr-only">Agenda</h2>
      {/* ── Left 1/3: date header + events ── */}
      <div
        className="flex flex-col h-full shrink-0"
        style={{ width: "clamp(9rem,38%,13rem)" }}
      >
        {/* Compact date block */}
        <div className="shrink-0 pb-[clamp(0.25rem,0.7vh,0.4rem)]">
          <span
            className="font-medium tracking-[0.18em] uppercase text-muted-foreground leading-none block"
            style={{ fontSize: "clamp(0.65rem,1.7vw,0.82rem)" }}
          >
            {weekdayName}
          </span>
          <div className="flex items-baseline gap-[0.25em] leading-none">
            <span
              className="font-extralight text-foreground tabular-nums font-mono leading-none"
              style={{ fontSize: "clamp(2.6rem,9vw,4.2rem)" }}
            >
              {selectedDay}
            </span>
            <span
              className="font-light text-muted-foreground leading-none"
              style={{ fontSize: "clamp(0.85rem,2.7vw,1.2rem)" }}
            >
              {MONTH_NAMES_PT[currentMonth]}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-border/25 shrink-0" />

        {/* Events list — fills remaining space */}
        <div className="flex flex-col flex-1 min-h-0 pt-[clamp(0.25rem,0.7vh,0.4rem)]">
          <div className="flex flex-col gap-[clamp(0.25rem,0.7vh,0.45rem)] overflow-y-auto scrollbar-hide flex-1 min-h-0">
            {hasCalendarError && (
              <div className="rounded-lg border border-destructive/25 bg-destructive/10 px-2 py-1 text-destructive/90" style={{ fontSize: "clamp(0.58rem,1.5vw,0.7rem)" }}>
                Agenda indisponível
              </div>
            )}

            {nextTimedEvent && (
              <div className="rounded-lg border border-border/35 bg-secondary/25 px-2 py-1.5">
                <div className="flex items-center gap-1.5 text-muted-foreground" style={{ fontSize: "clamp(0.55rem,1.45vw,0.68rem)" }}>
                  <Clock className="size-3 shrink-0" />
                  <span className="uppercase tracking-[0.12em]">{getRelativeEventLabel(nextTimedEvent, now)}</span>
                </div>
                <div className="truncate font-medium text-foreground mt-0.5" style={{ fontSize: "clamp(0.7rem,1.8vw,0.84rem)" }}>
                  {nextTimedEvent.title}
                </div>
                <div className="text-muted-foreground/65 font-mono tabular-nums" style={{ fontSize: "clamp(0.58rem,1.5vw,0.7rem)" }}>
                  {nextTimedEvent.time}
                </div>
              </div>
            )}

            {selectedEvents.length === 0 && (
              <div className="flex items-center gap-1.5 py-1">
                <Calendar className="size-3 text-muted-foreground/40 shrink-0" />
                <span
                  className="text-muted-foreground/50"
                  style={{ fontSize: "clamp(0.7rem,1.8vw,0.85rem)" }}
                >
                  Sem eventos
                </span>
              </div>
            )}

            {allDayEvents.length > 0 && (
              <div className="flex flex-col gap-[clamp(0.25rem,0.7vh,0.45rem)]">
                <span className="text-muted-foreground/50 uppercase tracking-[0.12em] font-medium" style={{ fontSize: "clamp(0.52rem,1.4vw,0.65rem)" }}>
                  Dia todo
                </span>
                {allDayEvents.map((event) => (
                  <EventRow
                    key={event.id}
                    event={event}
                    isGoogleCalendarConnected={isGoogleCalendarConnected}
                    editingId={editingId}
                    editTitle={editTitle}
                    editTime={editTime}
                    onEditTitleChange={setEditTitle}
                    onEditTimeChange={setEditTime}
                    onSaveEdit={saveEdit}
                    onCancelEdit={() => setEditingId(null)}
                    onToggleComplete={toggleComplete}
                    onStartEdit={startEdit}
                    onDeleteEvent={deleteEvent}
                  />
                ))}
              </div>
            )}

            {timedEvents.length > 0 && (
              <div className="flex flex-col gap-[clamp(0.25rem,0.7vh,0.45rem)]">
                <span className="text-muted-foreground/50 uppercase tracking-[0.12em] font-medium" style={{ fontSize: "clamp(0.52rem,1.4vw,0.65rem)" }}>
                  Horários
                </span>
                {timedEvents.map((event) => (
                  <EventRow
                    key={event.id}
                    event={event}
                    isGoogleCalendarConnected={isGoogleCalendarConnected}
                    editingId={editingId}
                    editTitle={editTitle}
                    editTime={editTime}
                    onEditTitleChange={setEditTitle}
                    onEditTimeChange={setEditTime}
                    onSaveEdit={saveEdit}
                    onCancelEdit={() => setEditingId(null)}
                    onToggleComplete={toggleComplete}
                    onStartEdit={startEdit}
                    onDeleteEvent={deleteEvent}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Add event — anchored to bottom */}
          {!isGoogleCalendarConnected && (
          <div className="shrink-0 pt-[clamp(0.2rem,0.5vh,0.35rem)]">
            {showAdd ? (
              <div className="flex flex-col gap-1 p-[clamp(0.25rem,0.7vh,0.4rem)] rounded-lg bg-secondary/40 border border-border/40">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Título"
          className="w-full bg-secondary text-foreground rounded px-1.5 py-0.5 outline-none placeholder:text-muted-foreground/40 focus-visible:ring-1 focus-visible:ring-ring/60"
          style={{ fontSize: "clamp(0.6rem,1.5vw,0.72rem)" }}
          autoFocus
          aria-label="Novo título"
          onKeyDown={(e) => e.key === "Enter" && addEvent()}
        />
        <input
          type="text"
          value={newTime}
          onChange={(e) => setNewTime(e.target.value)}
          placeholder="Horário"
          className="w-full bg-secondary text-foreground rounded px-1.5 py-0.5 outline-none placeholder:text-muted-foreground/40 focus-visible:ring-1 focus-visible:ring-ring/60"
                  style={{ fontSize: "clamp(0.6rem,1.5vw,0.72rem)" }}
                  aria-label="Novo horário"
                  onKeyDown={(e) => e.key === "Enter" && addEvent()}
                />
                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-1 flex-1">
                    {EVENT_COLORS.map((color, i) => (
                      <button
                        key={color}
                        onClick={() => setNewColorIdx(i)}
                        className={`size-3 rounded-full ${color} transition-transform focus-visible:ring-2 focus-visible:ring-ring ${
                          newColorIdx === i ? "scale-125 ring-1 ring-foreground/40" : "opacity-50 hover:opacity-80"
                        }`}
                        aria-label={`Cor ${i + 1}`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={addEvent}
                    className="px-2 py-0.5 rounded bg-accent/20 text-accent font-medium transition-colors hover:bg-accent/30 focus-visible:ring-2 focus-visible:ring-ring"
                    style={{ fontSize: "clamp(0.55rem,1.4vw,0.65rem)" }}
                  >
                    OK
                  </button>
                  <button
                    onClick={() => { setShowAdd(false); setNewTitle(""); setNewTime("") }}
                    className="text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                    style={{ fontSize: "clamp(0.55rem,1.4vw,0.65rem)" }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-1 text-muted-foreground/60 hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                style={{ fontSize: "clamp(0.68rem,1.8vw,0.82rem)" }}
              >
                <Plus className="size-3.5" />
                Adicionar
              </button>
            )}
          </div>
          )}
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="w-px self-stretch bg-border/25 shrink-0 my-[clamp(0.25rem,0.8vh,0.5rem)]" />

      {/* ── Right 2/3: big calendar ── */}
      <div className="flex-1 flex flex-col justify-center gap-[clamp(0.2rem,0.55vh,0.35rem)] min-w-0">
        {/* Month nav */}
        <div className="flex items-center justify-between shrink-0">
          <button
            onClick={prevMonth}
            aria-label="Mês anterior"
            className="size-[clamp(1.4rem,3.5vw,1.8rem)] flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span
            className="font-medium tracking-[0.12em] uppercase text-foreground"
            style={{ fontSize: "clamp(0.78rem,2.2vw,1rem)" }}
          >
            {MONTH_NAMES_PT[currentMonth]} {currentYear}
          </span>
          <button
            onClick={nextMonth}
            aria-label="Próximo mês"
            className="size-[clamp(1.4rem,3.5vw,1.8rem)] flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 shrink-0">
          {WEEKDAY_LABELS.map((label, i) => (
            <span
              key={i}
              className="text-center text-muted-foreground/50 font-medium"
              style={{ fontSize: "clamp(0.68rem,1.8vw,0.85rem)" }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Days grid — cells expand to fill height */}
        <div className="grid grid-cols-7 flex-1 min-h-0" style={{ gap: "clamp(0.1rem,0.3vh,0.2rem) 0" }}>
          {Array.from({ length: firstDay }).map((_, i) => (
            <span key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const selected = day === selectedDay
            const todayMark = isToday(day)
            const dateKey = formatDateKey(currentYear, currentMonth, day)
            const markers = eventPresence.get(dateKey)
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`relative w-full h-full flex items-center justify-center rounded-xl transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-90 font-mono tabular-nums ${
                  selected
                    ? "bg-foreground text-background font-semibold"
                    : todayMark
                    ? "text-accent font-semibold"
                    : "text-foreground/65 hover:text-foreground hover:bg-secondary/50"
                }`}
                style={{ fontSize: "clamp(0.72rem,1.9vw,0.92rem)" }}
                aria-label={`Dia ${day} de ${MONTH_NAMES_PT[currentMonth]} de ${currentYear}${selected ? ', selecionado' : ''}`}
              >
                <span>{day}</span>
                {markers && (
                  <span className="absolute bottom-[clamp(0.12rem,0.35vh,0.25rem)] left-1/2 flex -translate-x-1/2 items-center gap-0.5" aria-hidden="true">
                    {markers.timed && (
                      <span className={`size-[clamp(0.18rem,0.55vw,0.28rem)] rounded-full ${selected ? "bg-background" : "bg-accent"}`} />
                    )}
                    {markers.allDay && (
                      <span className={`h-[clamp(0.15rem,0.45vw,0.22rem)] w-[clamp(0.38rem,0.9vw,0.5rem)] rounded-full ${selected ? "bg-background/60" : "bg-chart-2"}`} />
                    )}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export { CalendarPage as Agenda }
