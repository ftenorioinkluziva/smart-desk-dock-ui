import { ClockDate } from "@/components/clock-date"
import { Agenda } from "@/components/agenda"
import { PomodoroTimer } from "@/components/pomodoro-timer"
import { SpotifyPlayer } from "@/components/spotify-player"

export default function Page() {
  return (
    <main className="h-dvh w-dvw overflow-hidden bg-background flex flex-col p-3 gap-2.5">
      {/* Time & Date */}
      <section className="rounded-2xl bg-card border border-border flex items-center justify-center flex-[1.2]">
        <ClockDate />
      </section>

      {/* Agenda */}
      <section className="rounded-2xl bg-card border border-border flex-1 flex flex-col justify-center overflow-hidden">
        <Agenda />
      </section>

      {/* Pomodoro Timer */}
      <section className="rounded-2xl bg-card border border-border flex items-center justify-center flex-1">
        <PomodoroTimer />
      </section>

      {/* Spotify Player */}
      <section className="rounded-2xl bg-card border border-border flex flex-col justify-center flex-[0.85]">
        <SpotifyPlayer />
      </section>
    </main>
  )
}
