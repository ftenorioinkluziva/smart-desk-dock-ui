"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { CalendarClock, Footprints, Moon, Sparkles, Sun, Umbrella } from "lucide-react"
import { appendCalendarIds, CALENDAR_SETTINGS_EVENT, readSelectedCalendarIds } from "@/lib/calendar-settings"

type WeatherData = {
  location: string
  temp: number
  high: number
  low: number
  condition: string
  hourly?: HourlyWeather[]
}

type HourlyWeather = {
  time: string
  temp: number
  precipitationProbability: number | null
  condition: string
}

type CalendarEvent = {
  id: string
  title: string
  date: string
  time: string
  startDateTime: string | null
  endDateTime: string | null
  isAllDay: boolean
}

type CalendarEventsResponse = {
  events: CalendarEvent[]
  mock?: boolean
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function getEventStatus(event: CalendarEvent, now: Date) {
  if (!event.startDateTime) return "Dia todo"

  const start = new Date(event.startDateTime).getTime()
  const end = event.endDateTime ? new Date(event.endDateTime).getTime() : null
  const current = now.getTime()

  if (end && current >= start && current < end) return "Em andamento"
  if (current > start) return "Encerrado"

  const minutes = Math.max(0, Math.round((start - current) / 60000))
  if (minutes < 60) return `Em ${minutes} min`

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `Em ${hours}h${String(remainingMinutes).padStart(2, "0")}` : `Em ${hours}h`
}

function weatherDescription(condition: string) {
  switch (condition) {
    case "rain":
      return "chuvoso"
    case "drizzle":
      return "com garoa"
    case "thunderstorm":
      return "com tempestade"
    case "clouds":
      return "nublado"
    case "partly-cloudy":
      return "parcialmente nublado"
    case "snow":
      return "frio"
    default:
      return "ensolarado"
  }
}

function toHourlyWeatherKey(date: Date) {
  const rounded = new Date(date)
  rounded.setMinutes(rounded.getMinutes() >= 30 ? 60 : 0, 0, 0)
  const year = rounded.getFullYear()
  const month = String(rounded.getMonth() + 1).padStart(2, "0")
  const day = String(rounded.getDate()).padStart(2, "0")
  const hour = String(rounded.getHours()).padStart(2, "0")
  return `${year}-${month}-${day}T${hour}:00`
}

function describeHourlyWeather(hourlyWeather: HourlyWeather | null) {
  if (!hourlyWeather) return null

  const rainText = hourlyWeather.precipitationProbability !== null
    ? hourlyWeather.precipitationProbability >= 60
      ? `alta chance de chuva (${hourlyWeather.precipitationProbability}%)`
      : hourlyWeather.precipitationProbability >= 30
      ? `${hourlyWeather.precipitationProbability}% de chance de chuva`
      : `baixa chance de chuva (${hourlyWeather.precipitationProbability}%)`
    : weatherDescription(hourlyWeather.condition)

  return `${hourlyWeather.temp} graus e ${rainText}`
}

export function TodayPanel() {
  const [now, setNow] = useState<Date | null>(null)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [calendarIds, setCalendarIds] = useState<string[]>([])

  const fetchWeather = useCallback(async () => {
    try {
      const response = await fetch("/api/weather?hourly=true")
      if (!response.ok) return
      setWeather(await response.json() as WeatherData)
    } catch {
      // Preserve previous data on transient failures.
    }
  }, [])

  const fetchEvents = useCallback(async () => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)

    try {
      const params = new URLSearchParams({
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
      })
      appendCalendarIds(params, calendarIds)
      const response = await fetch(`/api/calendar-events?${params.toString()}`)
      if (!response.ok) return
      const data = await response.json() as CalendarEventsResponse
      if (!data.mock) setEvents(data.events)
    } catch {
      // Keep the last known agenda visible.
    }
  }, [calendarIds])

  useEffect(() => {
    setNow(new Date())
    setCalendarIds(readSelectedCalendarIds())

    const clock = setInterval(() => setNow(new Date()), 30 * 1000)
    const handleCalendarSettings = () => setCalendarIds(readSelectedCalendarIds())
    window.addEventListener(CALENDAR_SETTINGS_EVENT, handleCalendarSettings)

    return () => {
      clearInterval(clock)
      window.removeEventListener(CALENDAR_SETTINGS_EVENT, handleCalendarSettings)
    }
  }, [])

  useEffect(() => {
    fetchWeather()
    const weatherRefresh = setInterval(fetchWeather, 15 * 60 * 1000)
    return () => clearInterval(weatherRefresh)
  }, [fetchWeather])

  useEffect(() => {
    fetchEvents()
    const calendarRefresh = setInterval(fetchEvents, 5 * 60 * 1000)
    return () => clearInterval(calendarRefresh)
  }, [fetchEvents])

  const todayKey = now ? formatDateKey(now) : ""
  const todayEvents = useMemo(
    () => events.filter((event) => event.date === todayKey),
    [events, todayKey],
  )
  const timedEvents = useMemo(
    () => todayEvents
      .filter((event) => !event.isAllDay && event.startDateTime)
      .sort((a, b) => new Date(a.startDateTime!).getTime() - new Date(b.startDateTime!).getTime()),
    [todayEvents],
  )
  const allDayEvents = useMemo(
    () => todayEvents.filter((event) => event.isAllDay),
    [todayEvents],
  )
  const nextEvent = useMemo(() => {
    return timedEvents.find((event) => {
      if (!now) return true
      const end = event.endDateTime ? new Date(event.endDateTime).getTime() : null
      const start = new Date(event.startDateTime!).getTime()
      return end ? end > now.getTime() : start >= now.getTime()
    }) ?? timedEvents[0] ?? allDayEvents[0] ?? null
  }, [allDayEvents, now, timedEvents])

  const hours = now ? now.getHours().toString().padStart(2, "0") : "--"
  const minutes = now ? now.getMinutes().toString().padStart(2, "0") : "--"
  const seconds = now ? now.getSeconds().toString().padStart(2, "0") : "--"
  const weekday = now ? now.toLocaleDateString("pt-BR", { weekday: "long" }) : ""
  const dateLabel = now ? now.toLocaleDateString("pt-BR", { day: "numeric", month: "long" }) : ""
  const nextEventStart = nextEvent?.startDateTime ? new Date(nextEvent.startDateTime).getTime() : null
  const nextEventEnd = nextEvent?.endDateTime ? new Date(nextEvent.endDateTime).getTime() : null
  const minutesUntilNextEvent = now && nextEventStart ? Math.round((nextEventStart - now.getTime()) / 60000) : null
  const eventWeather = useMemo(() => {
    if (!nextEvent?.startDateTime || !weather?.hourly?.length) return null
    const key = toHourlyWeatherKey(new Date(nextEvent.startDateTime))
    return weather.hourly.find((hour) => hour.time === key) ?? null
  }, [nextEvent?.startDateTime, weather?.hourly])
  const eventWeatherText = describeHourlyWeather(eventWeather)
  const hasUrgentEvent = Boolean(minutesUntilNextEvent !== null && minutesUntilNextEvent >= 0 && minutesUntilNextEvent <= 15)
  const hasCurrentEvent = Boolean(now && nextEventStart && nextEventEnd && now.getTime() >= nextEventStart && now.getTime() < nextEventEnd)
  const isNight = now ? now.getHours() >= 22 || now.getHours() < 6 : false
  const isHot = Boolean(weather && weather.temp >= 30)
  const isRainy = weather?.condition === "rain" || weather?.condition === "drizzle" || weather?.condition === "thunderstorm"

  const context = (() => {
    if (hasCurrentEvent) {
      return {
        Icon: CalendarClock,
        label: "Agora",
        title: "Em compromisso",
        sentence: nextEvent?.title
          ? eventWeatherText
            ? `Agora: ${nextEvent.title}. La fora, ${eventWeatherText}.`
            : `Agora: ${nextEvent.title}.`
          : "Voce esta em compromisso agora.",
        active: true,
      }
    }

    if (hasUrgentEvent) {
      return {
        Icon: CalendarClock,
        label: "Prepare-se",
        title: `${minutesUntilNextEvent} min`,
        sentence: nextEvent?.title
          ? eventWeatherText
            ? `${nextEvent.title} comeca em ${minutesUntilNextEvent} min. Na hora, ${eventWeatherText}.`
            : `${nextEvent.title} comeca em ${minutesUntilNextEvent} min.`
          : `Seu proximo evento comeca em ${minutesUntilNextEvent} min.`,
        active: true,
      }
    }

    if (isRainy) {
      return {
        Icon: Umbrella,
        label: "Saída",
        title: "Leve guarda-chuva",
        sentence: nextEventStart && minutesUntilNextEvent !== null && minutesUntilNextEvent > 0
          ? `Leve guarda-chuva. Voce tem ${minutesUntilNextEvent} min ate o proximo evento.`
          : "Leve guarda-chuva se for sair agora.",
        active: false,
      }
    }

    if (isHot) {
      return {
        Icon: Sun,
        label: "Clima",
        title: "Calor agora",
        sentence: nextEventStart && minutesUntilNextEvent !== null && minutesUntilNextEvent > 0
          ? `Esta quente agora. Voce tem ${minutesUntilNextEvent} min ate o proximo evento.`
          : "Esta quente agora. Hidrate-se.",
        active: false,
      }
    }

    if (isNight) {
      return {
        Icon: Moon,
        label: "Noite",
        title: "Baixa intensidade",
        sentence: nextEvent ? "Noite tranquila, com agenda sob controle." : "Noite tranquila, sem compromissos restantes.",
        active: false,
      }
    }

    if (nextEventStart && minutesUntilNextEvent !== null && minutesUntilNextEvent > 60) {
      const freeHours = Math.floor(minutesUntilNextEvent / 60)
      const freeMinutes = minutesUntilNextEvent % 60
      return {
        Icon: Sparkles,
        label: "Boa janela",
        title: freeMinutes > 0 ? `${freeHours}h${String(freeMinutes).padStart(2, "0")} livres` : `${freeHours}h livres`,
        sentence: nextEvent?.title
          ? eventWeatherText
            ? `Boa janela: ${freeMinutes > 0 ? `${freeHours}h${String(freeMinutes).padStart(2, "0")}` : `${freeHours}h`} livres ate ${nextEvent.title}. Na hora, ${eventWeatherText}.`
            : `Boa janela: ${freeMinutes > 0 ? `${freeHours}h${String(freeMinutes).padStart(2, "0")}` : `${freeHours}h`} livres ate ${nextEvent.title}.`
          : `Boa janela: ${freeMinutes > 0 ? `${freeHours}h${String(freeMinutes).padStart(2, "0")}` : `${freeHours}h`} livres.`,
        active: false,
      }
    }

    if (nextEventStart && minutesUntilNextEvent !== null && minutesUntilNextEvent > 0) {
      return {
        Icon: Footprints,
        label: "Agora",
        title: `${minutesUntilNextEvent} min livres`,
        sentence: nextEvent?.title
          ? eventWeatherText
            ? `Voce tem ${minutesUntilNextEvent} min livres ate ${nextEvent.title}. Na hora, ${eventWeatherText}.`
            : `Voce tem ${minutesUntilNextEvent} min livres ate ${nextEvent.title}.`
          : `Voce tem ${minutesUntilNextEvent} min livres agora.`,
        active: false,
      }
    }

    return {
      Icon: Sparkles,
      label: "Livre",
      title: "Dia aberto",
      sentence: weather
        ? `Dia livre, hoje estara ${weatherDescription(weather.condition)} em ${weather.location}, com minima de ${weather.low} e maxima de ${weather.high}.`
        : "Dia livre, sem compromissos hoje.",
      active: false,
    }
  })()

  return (
    <div className="grid h-full w-full dock-px items-center gap-[clamp(0.55rem,1.5vw,1rem)]" style={{ gridTemplateColumns: "minmax(0, 1.25fr) minmax(12rem, 0.75fr)" }}>
      <div className="flex min-w-0 flex-col justify-center">
        <div className="flex min-w-0 items-baseline leading-none">
          <span className="min-w-0 font-extralight text-foreground tabular-nums font-mono tracking-tight" style={{ fontSize: "clamp(4.3rem,15vw,8rem)" }}>
            {hours}:{minutes}
          </span>
          <span className="ml-[0.28em] font-extralight text-muted-foreground/50 tabular-nums font-mono leading-none" style={{ fontSize: "clamp(1.1rem,3.4vw,2rem)" }}>
            {seconds}
          </span>
        </div>
        <div className="mt-[clamp(0.15rem,0.35vh,0.25rem)] uppercase tracking-[0.28em] text-muted-foreground/65" style={{ fontSize: "clamp(0.78rem,2vw,1rem)" }}>
          {weekday} <span className="tracking-[0.18em] text-muted-foreground/45">{dateLabel}</span>
        </div>
        <span
          className="mt-[clamp(0.45rem,1.1vh,0.75rem)] max-w-[min(100%,34rem)] leading-snug text-muted-foreground/75"
          style={{ fontSize: "clamp(0.78rem,1.9vw,1rem)" }}
        >
          {context.sentence}
        </span>
      </div>

      <div className="flex min-w-0 justify-end">
        <section className={`w-full max-w-[16rem] min-w-0 rounded-xl border px-[clamp(0.65rem,1.55vw,0.95rem)] py-[clamp(0.55rem,1.25vh,0.8rem)] ${hasUrgentEvent ? "border-accent/60 bg-accent/10" : isNight ? "border-border/20 bg-transparent" : "border-border/35 bg-secondary/20"}`}>
          <div className="flex items-center gap-1.5 text-muted-foreground" style={{ fontSize: "clamp(0.62rem,1.6vw,0.76rem)" }}>
            <CalendarClock className="size-3.5 shrink-0" />
            <span className="uppercase tracking-[0.12em]">{nextEvent && now ? getEventStatus(nextEvent, now) : "Agenda"}</span>
          </div>
          <div className="mt-1.5 line-clamp-2 font-medium leading-tight text-foreground" style={{ fontSize: "clamp(0.98rem,2.45vw,1.2rem)" }}>
            {nextEvent?.title ?? "Sem eventos hoje"}
          </div>
          <div className="mt-1.5 text-muted-foreground/65 font-mono tabular-nums truncate" style={{ fontSize: "clamp(0.76rem,1.9vw,0.95rem)" }}>
            {nextEvent?.time ?? "Dia livre"}
          </div>
        </section>
      </div>
    </div>
  )
}
