"use client"

import { appendCalendarIds, readSelectedCalendarIds } from "@/lib/calendar-settings"
import { dispatchProductivityControl, type ProductivityAction, type ProductivityTarget } from "@/lib/productivity-actions"

export type RealtimeToolName =
  | "get_current_weather"
  | "get_today_events"
  | "get_spotify_status"
  | "get_home_status"
  | "get_finance_summary"
  | "spotify_control"
  | "productivity_control"

type CalendarEvent = {
  id: string
  title: string
  date: string
  time: string
  startDateTime: string | null
  endDateTime: string | null
  isAllDay: boolean
}

type ToolResult = {
  ok: boolean
  data?: unknown
  error?: string
}

type SpotifyControlAction = "play" | "pause" | "next" | "previous"

const SPOTIFY_ACTION_LABELS: Record<SpotifyControlAction, string> = {
  play: "tocar",
  pause: "pausar",
  next: "pular para a proxima faixa",
  previous: "voltar para a faixa anterior",
}

function todayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start, end }
}

async function readJson<T>(url: string) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }
  return await response.json() as T
}

function compactNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value * 10) / 10 : null
}

async function getCurrentWeather(): Promise<ToolResult> {
  const data = await readJson<{
    location?: string
    temp?: number
    high?: number
    low?: number
    description?: string
    condition?: string
    forecast?: Array<{ day: string; date: string; low: number; high: number; condition: string }>
  }>("/api/weather")

  return {
    ok: true,
    data: {
      location: data.location,
      temp: data.temp,
      high: data.high,
      low: data.low,
      description: data.description,
      condition: data.condition,
      forecast: data.forecast?.slice(0, 3),
    },
  }
}

async function getTodayEvents(): Promise<ToolResult> {
  const { start, end } = todayRange()
  const params = new URLSearchParams({
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
  })
  appendCalendarIds(params, readSelectedCalendarIds())

  const data = await readJson<{ events?: CalendarEvent[]; mock?: boolean }>(`/api/calendar-events?${params.toString()}`)
  const now = Date.now()
  const events = (data.events ?? [])
    .map((event) => ({
      title: event.title,
      time: event.time,
      isAllDay: event.isAllDay,
      startDateTime: event.startDateTime,
      endDateTime: event.endDateTime,
      status: event.endDateTime && new Date(event.endDateTime).getTime() > now && event.startDateTime && new Date(event.startDateTime).getTime() <= now
        ? "em_andamento"
        : event.startDateTime && new Date(event.startDateTime).getTime() > now
        ? "proximo"
        : "passado",
    }))
    .slice(0, 8)

  return {
    ok: true,
    data: {
      mock: data.mock ?? false,
      date: start.toLocaleDateString("pt-BR"),
      events,
    },
  }
}

async function getSpotifyStatus(): Promise<ToolResult> {
  const data = await readJson<Record<string, unknown>>("/api/spotify-now-playing")

  return {
    ok: true,
    data: {
      mock: Boolean(data.mock),
      isPlaying: Boolean(data.isPlaying),
      track: data.track ?? null,
      artist: data.artist ?? null,
      album: data.album ?? null,
      deviceName: data.deviceName ?? null,
      deviceType: data.deviceType ?? null,
      volumePercent: data.volumePercent ?? null,
      shuffle: Boolean(data.shuffle),
      repeat: data.repeat ?? "off",
    },
  }
}

async function getHomeStatus(): Promise<ToolResult> {
  const data = await readJson<{
    entities?: Array<{
      entityId: string
      domain: string
      name: string
      state: string
      brightness: number | null
      controllable: boolean
    }>
    mock?: boolean
  }>("/api/home-assistant/entities")

  return {
    ok: true,
    data: {
      mock: data.mock ?? false,
      entities: (data.entities ?? []).slice(0, 12).map((entity) => ({
        name: entity.name,
        domain: entity.domain,
        state: entity.state,
        brightness: entity.brightness,
        controllable: entity.controllable,
      })),
    },
  }
}

async function getFinanceSummary(): Promise<ToolResult> {
  const data = await readJson<{
    totalValue?: number
    cashBalance?: number
    driftPercentage?: number
    unrealizedGain?: number
    assets?: Array<{
      ticker: string
      label: string
      percentage: number
      targetPercentage: number
      gainPercentage: number
      dailyChangePercentage: number | null
    }>
    mock?: boolean
  }>("/api/finance/summary")

  return {
    ok: true,
    data: {
      mock: data.mock ?? false,
      totalValue: compactNumber(data.totalValue),
      cashBalance: compactNumber(data.cashBalance),
      driftPercentage: compactNumber(data.driftPercentage),
      unrealizedGain: compactNumber(data.unrealizedGain),
      assets: (data.assets ?? []).slice(0, 6).map((asset) => ({
        ticker: asset.ticker,
        label: asset.label,
        percentage: compactNumber(asset.percentage),
        targetPercentage: compactNumber(asset.targetPercentage),
        gainPercentage: compactNumber(asset.gainPercentage),
        dailyChangePercentage: compactNumber(asset.dailyChangePercentage),
      })),
    },
  }
}

function parseToolArguments(rawArguments: string | undefined): Record<string, unknown> {
  if (!rawArguments) return {}
  try {
    const parsed = JSON.parse(rawArguments) as unknown
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {}
  } catch {
    return {}
  }
}

async function spotifyControl(args: Record<string, unknown>): Promise<ToolResult> {
  const action = args.action
  if (action !== "play" && action !== "pause" && action !== "next" && action !== "previous") {
    return { ok: false, error: "Acao Spotify invalida" }
  }

  const response = await fetch("/api/spotify-control", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  })

  if (!response.ok) {
    throw new Error(`Spotify control failed: ${response.status}`)
  }

  return {
    ok: true,
    data: {
      executed: true,
      action,
      label: SPOTIFY_ACTION_LABELS[action],
    },
  }
}

function productivityControl(args: Record<string, unknown>): ToolResult {
  const target = args.target
  const action = args.action

  if (target !== "pomodoro" && target !== "timer" && target !== "stopwatch") {
    return { ok: false, error: "Alvo de produtividade invalido" }
  }

  if (action !== "start" && action !== "pause" && action !== "reset") {
    return { ok: false, error: "Acao de produtividade invalida" }
  }

  const minutes = typeof args.minutes === "number" && Number.isFinite(args.minutes)
    ? Math.max(1, Math.min(180, Math.round(args.minutes)))
    : undefined

  dispatchProductivityControl({
    target: target as ProductivityTarget,
    action: action as ProductivityAction,
    ...(target === "timer" && minutes ? { minutes } : {}),
  })

  return {
    ok: true,
    data: {
      executed: true,
      target,
      action,
      minutes: target === "timer" ? minutes ?? null : null,
    },
  }
}

export async function executeRealtimeTool(name: string, rawArguments?: string): Promise<ToolResult> {
  const args = parseToolArguments(rawArguments)

  try {
    switch (name as RealtimeToolName) {
      case "get_current_weather":
        return await getCurrentWeather()
      case "get_today_events":
        return await getTodayEvents()
      case "get_spotify_status":
        return await getSpotifyStatus()
      case "get_home_status":
        return await getHomeStatus()
      case "get_finance_summary":
        return await getFinanceSummary()
      case "spotify_control":
        return await spotifyControl(args)
      case "productivity_control":
        return productivityControl(args)
      default:
        return { ok: false, error: `Ferramenta desconhecida: ${name}` }
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Falha ao executar ferramenta",
    }
  }
}
