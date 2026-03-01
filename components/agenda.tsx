export function Agenda() {
  const events = [
    { time: "10:00", title: "SaaS Architecture Sync", color: "bg-accent", isNext: true },
    { time: "12:30", title: "Design Review", color: "bg-chart-1", isNext: false },
    { time: "15:00", title: "Sprint Planning", color: "bg-chart-2", isNext: false },
    { time: "17:00", title: "Team Retrospective", color: "bg-chart-4", isNext: false },
  ]

  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 px-10">
      <h2 className="text-[11px] font-semibold tracking-[0.25em] uppercase text-muted-foreground">
        {"Daily Agenda"}
      </h2>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {events.map((event) => (
          <div
            key={event.title}
            className={`flex items-center gap-3.5 ${event.isNext ? "opacity-100" : "opacity-50"}`}
          >
            <span
              className={`size-2 shrink-0 rounded-full ${event.color}`}
              aria-hidden="true"
            />
            <span className="text-xs text-muted-foreground w-11 shrink-0 font-mono tabular-nums">
              {event.time}
            </span>
            <span
              className={`truncate ${
                event.isNext ? "text-sm font-medium text-foreground" : "text-sm text-foreground/70"
              }`}
            >
              {event.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
