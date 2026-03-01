"use client"

import { useState, useEffect } from "react"

type Event = {
  time: string
  title: string
  color: string
}

// Static mock events — ready to be replaced by a Calendar API in V2
const MOCK_EVENTS: Event[] = [
  { time: "10:00", title: "SaaS Architecture Sync", color: "bg-accent" },
  { time: "12:30", title: "Design Review — Mobile & Desktop Breakpoints", color: "bg-chart-1" },
  { time: "15:00", title: "Sprint Planning Q2", color: "bg-chart-2" },
  { time: "17:00", title: "Team Retrospective", color: "bg-chart-4" },
]

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

export function Agenda() {
  // Re-evaluate the "next event" every minute
  const [nowMinutes, setNowMinutes] = useState(-1)

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setNowMinutes(now.getHours() * 60 + now.getMinutes())
    }
    update()
    const interval = setInterval(update, 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Find the index of the next upcoming event
  const nextIdx = nowMinutes >= 0
    ? MOCK_EVENTS.findIndex((e) => toMinutes(e.time) >= nowMinutes)
    : 0

  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 px-10">
      <h2 className="text-[11px] font-semibold tracking-[0.25em] uppercase text-muted-foreground">
        {"Daily Agenda"}
      </h2>

      <div className="flex flex-col gap-4 w-full max-w-lg">
        {MOCK_EVENTS.map((event, idx) => {
          const isNext = idx === nextIdx
          const isPast = nowMinutes >= 0 && toMinutes(event.time) < nowMinutes

          return (
            <div
              key={event.time}
              className={`flex items-center gap-3.5 transition-opacity ${
                isNext ? "opacity-100" : isPast ? "opacity-25" : "opacity-50"
              }`}
            >
              {/* Color dot — accent ring on next event */}
              <span
                className={`size-2.5 shrink-0 rounded-full ${event.color} ${
                  isNext ? "ring-1 ring-offset-1 ring-offset-background ring-current" : ""
                }`}
                aria-hidden="true"
              />

              {/* Time */}
              <span className="text-sm text-muted-foreground w-12 shrink-0 font-mono tabular-nums">
                {event.time}
              </span>

              {/* Title — truncated with ellipsis on overflow */}
              <span
                className={`truncate ${
                  isNext
                    ? "text-base font-medium text-foreground"
                    : "text-base text-foreground/70"
                }`}
              >
                {event.title}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
