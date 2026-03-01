export function Agenda() {
  const events = [
    { time: "10:00 AM", title: "SaaS Architecture Sync", color: "bg-accent" },
    { time: "12:30 PM", title: "Design Review", color: "bg-chart-1" },
    { time: "3:00 PM", title: "Sprint Planning", color: "bg-chart-2" },
  ]

  return (
    <div className="flex flex-col gap-3 px-5 py-4">
      <h2 className="text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground">
        {"Next Up"}
      </h2>
      <div className="flex flex-col gap-2.5">
        {events.map((event) => (
          <div key={event.title} className="flex items-center gap-3">
            <span
              className={`size-2 shrink-0 rounded-full ${event.color}`}
              aria-hidden="true"
            />
            <span className="text-xs text-muted-foreground w-16 shrink-0 font-mono tabular-nums">
              {event.time}
            </span>
            <span className="text-sm text-foreground truncate">
              {event.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
