"use client"

import { useState, useCallback } from "react"
import { Plus, Check, Trash2, Edit3, X, ChevronLeft, ChevronRight } from "lucide-react"

interface CalendarEvent {
  id: string
  title: string
  time: string
  color: string
  completed: boolean
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
  // Convert Sunday=0 to Monday-first: Mon=0, ..., Sun=6
  return day === 0 ? 6 : day - 1
}

const MONTH_NAMES_PT = [
  "JANEIRO", "FEVEREIRO", "MARCO", "ABRIL", "MAIO", "JUNHO",
  "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO",
]

const WEEKDAY_PT_SHORT: Record<number, string> = {
  0: "DOM.", 1: "SEG.", 2: "TER.", 3: "QUA.", 4: "QUI.", 5: "SEX.", 6: "SAB.",
}

function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

export function CalendarPage() {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDay, setSelectedDay] = useState(today.getDate())
  const [events, setEvents] = useState<CalendarEvent[]>([
    { id: "1", title: "In California", time: "All day", color: "bg-chart-2", completed: false },
    { id: "2", title: "Morning Meeting", time: "06-07", color: "bg-accent", completed: false },
  ])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editTime, setEditTime] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newTime, setNewTime] = useState("")
  const [newColorIdx, setNewColorIdx] = useState(0)

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)

  const isToday = (day: number) =>
    day === today.getDate() &&
    currentMonth === today.getMonth() &&
    currentYear === today.getFullYear()

  const prevMonth = useCallback(() => {
    setCurrentMonth((m) => {
      if (m === 0) {
        setCurrentYear((y) => y - 1)
        return 11
      }
      return m - 1
    })
  }, [])

  const nextMonth = useCallback(() => {
    setCurrentMonth((m) => {
      if (m === 11) {
        setCurrentYear((y) => y + 1)
        return 0
      }
      return m + 1
    })
  }, [])

  const addEvent = useCallback(() => {
    if (!newTitle.trim()) return
    setEvents((prev) => [
      ...prev,
      {
        id: generateId(),
        title: newTitle.trim(),
        time: newTime.trim() || "All day",
        color: EVENT_COLORS[newColorIdx % EVENT_COLORS.length],
        completed: false,
      },
    ])
    setNewTitle("")
    setNewTime("")
    setNewColorIdx(0)
    setShowAdd(false)
  }, [newTitle, newTime, newColorIdx])

  const deleteEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const toggleComplete = useCallback((id: string) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, completed: !e.completed } : e))
    )
  }, [])

  const startEdit = useCallback((event: CalendarEvent) => {
    setEditingId(event.id)
    setEditTitle(event.title)
    setEditTime(event.time)
  }, [])

  const saveEdit = useCallback(() => {
    if (!editTitle.trim() || !editingId) return
    setEvents((prev) =>
      prev.map((e) =>
        e.id === editingId
          ? { ...e, title: editTitle.trim(), time: editTime.trim() || "All day" }
          : e
      )
    )
    setEditingId(null)
    setEditTitle("")
    setEditTime("")
  }, [editingId, editTitle, editTime])

  const dayOfWeek = WEEKDAY_PT_SHORT[today.getDay()] || "DOM."

  return (
    <div className="flex flex-col h-full px-5 py-4 gap-3 overflow-hidden">
      {/* Header: date + mini calendar */}
      <div className="flex gap-4 items-start">
        {/* Left: day events */}
        <div className="flex-1 min-w-0">
          <div className="text-lg font-bold text-foreground tracking-tight leading-tight">
            {dayOfWeek}{" "}
            <span className="uppercase">
              {MONTH_NAMES_PT[currentMonth]} {selectedDay}
            </span>
          </div>

          {/* Events list */}
          <div className="flex flex-col gap-1.5 mt-2.5">
            {events.length === 0 && (
              <span className="text-xs text-muted-foreground">{"No events"}</span>
            )}
            {events.map((event) => (
              <div key={event.id} className="flex items-center gap-2 group">
                {editingId === event.id ? (
                  <div className="flex flex-col gap-1 flex-1">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="flex-1 bg-secondary/80 text-foreground text-xs rounded px-2 py-1 outline-none focus:ring-1 focus:ring-ring"
                        autoFocus
                        onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                      />
                      <input
                        type="text"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        placeholder="Time"
                        className="w-14 bg-secondary/80 text-foreground text-xs rounded px-2 py-1 outline-none focus:ring-1 focus:ring-ring"
                        onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={saveEdit}
                        className="text-[10px] text-accent hover:text-accent/80 font-medium"
                        aria-label="Save edit"
                      >
                        {"Save"}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-[10px] text-muted-foreground hover:text-foreground"
                        aria-label="Cancel edit"
                      >
                        {"Cancel"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => toggleComplete(event.id)}
                      className={`size-3.5 shrink-0 rounded-sm border flex items-center justify-center transition-colors ${
                        event.completed
                          ? "bg-accent border-accent"
                          : "border-muted-foreground/40 hover:border-accent"
                      }`}
                      aria-label={event.completed ? "Mark incomplete" : "Mark complete"}
                    >
                      {event.completed && <Check className="size-2.5 text-accent-foreground" />}
                    </button>
                    <span
                      className={`w-0.5 h-4 shrink-0 rounded-full ${event.color}`}
                      aria-hidden="true"
                    />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span
                        className={`text-xs font-medium truncate leading-tight ${
                          event.completed ? "line-through text-muted-foreground" : "text-foreground"
                        }`}
                      >
                        {event.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground leading-tight font-mono">
                        {event.time}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEdit(event)}
                        aria-label="Edit event"
                        className="size-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
                      >
                        <Edit3 className="size-2.5" />
                      </button>
                      <button
                        onClick={() => deleteEvent(event.id)}
                        aria-label="Delete event"
                        className="size-5 flex items-center justify-center text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-2.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: mini calendar */}
        <div className="shrink-0 w-[170px]">
          <div className="flex items-center justify-between mb-1.5">
            <button onClick={prevMonth} aria-label="Previous month" className="size-5 flex items-center justify-center text-muted-foreground hover:text-foreground">
              <ChevronLeft className="size-3" />
            </button>
            <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
              {MONTH_NAMES_PT[currentMonth]}
            </span>
            <button onClick={nextMonth} aria-label="Next month" className="size-5 flex items-center justify-center text-muted-foreground hover:text-foreground">
              <ChevronRight className="size-3" />
            </button>
          </div>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-0">
            {WEEKDAY_LABELS.map((label, i) => (
              <span key={i} className="text-center text-[9px] text-muted-foreground/60 font-medium py-0.5">
                {label}
              </span>
            ))}
          </div>
          {/* Days grid */}
          <div className="grid grid-cols-7 gap-0">
            {Array.from({ length: firstDay }).map((_, i) => (
              <span key={`empty-${i}`} className="size-5" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const selected = day === selectedDay
              const todayMark = isToday(day)
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`size-5 flex items-center justify-center text-[10px] rounded-full transition-colors ${
                    selected
                      ? "bg-foreground text-background font-bold"
                      : todayMark
                      ? "text-accent font-semibold"
                      : "text-foreground/70 hover:text-foreground"
                  }`}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Add event section */}
      {showAdd ? (
        <div className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-secondary/40 border border-border/50">
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Event title"
              className="flex-1 bg-secondary/80 text-foreground text-xs rounded px-2 py-1.5 outline-none placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-ring"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && addEvent()}
            />
            <input
              type="text"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              placeholder="Time"
              className="w-16 bg-secondary/80 text-foreground text-xs rounded px-2 py-1.5 outline-none placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-ring"
              onKeyDown={(e) => e.key === "Enter" && addEvent()}
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {EVENT_COLORS.map((color, i) => (
                <button
                  key={color}
                  onClick={() => setNewColorIdx(i)}
                  className={`size-3.5 rounded-full ${color} transition-transform ${
                    newColorIdx === i ? "scale-125 ring-1 ring-foreground/50" : "opacity-50 hover:opacity-80"
                  }`}
                  aria-label={`Color ${i + 1}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={addEvent}
                className="text-[10px] font-medium text-accent hover:text-accent/80 px-2 py-0.5"
              >
                {"Add"}
              </button>
              <button
                onClick={() => { setShowAdd(false); setNewTitle(""); setNewTime("") }}
                className="text-[10px] text-muted-foreground hover:text-foreground px-1 py-0.5"
              >
                {"Cancel"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors self-start"
        >
          <Plus className="size-3" />
          <span>{"Add event"}</span>
        </button>
      )}
    </div>
  )
}
