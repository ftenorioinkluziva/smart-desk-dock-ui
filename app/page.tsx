import { ClockDate } from "@/components/clock-date"
import { Agenda } from "@/components/agenda"
import { PomodoroTimer } from "@/components/pomodoro-timer"
import { SpotifyPlayer } from "@/components/spotify-player"

export default function Page() {
  return (
    <main className="h-dvh w-dvw overflow-hidden bg-background grid grid-cols-2 p-2.5 gap-2">
      {/* Left Column */}
      <div className="flex flex-col gap-2 min-h-0">
        <section className="rounded-2xl bg-card border border-border flex items-center justify-center flex-1">
          <ClockDate />
        </section>
        <section className="rounded-2xl bg-card border border-border flex-1 flex flex-col justify-center overflow-hidden">
          <Agenda />
        </section>
      </div>

      {/* Right Column */}
      <div className="flex flex-col gap-2 min-h-0">
        <section className="rounded-2xl bg-card border border-border flex items-center justify-center flex-1">
          <PomodoroTimer />
        </section>
        <section className="rounded-2xl bg-card border border-border flex flex-col justify-center flex-1 overflow-hidden">
          <SpotifyPlayer />
        </section>
      </div>
    </main>
  )
}
