"use client"

import { appendCalendarIds, readSelectedCalendarIds } from "@/lib/calendar-settings"
import { dispatchProductivityControl, type ProductivityAction, type ProductivityTarget } from "@/lib/productivity-actions"
import type { z } from "zod"
import {
  calendarEventsApiResponseSchema,
  financeSummaryApiResponseSchema,
  homeAssistantEntitiesApiResponseSchema,
  realtimeProductivityControlInputSchema,
  realtimeSpotifyControlInputSchema,
  realtimeToolArgumentsSchema,
  spotifyStatusApiResponseSchema,
  weatherApiResponseSchema,
  type RealtimeToolResult,
} from "@/lib/operations/contracts"
import { OperationFailure, internalError, operationErrorSchema, upstreamError, validationError } from "@/lib/operations/errors"

export type RealtimeToolName =
  | "get_current_weather"
  | "get_today_events"
  | "get_spotify_status"
  | "get_home_status"
  | "get_finance_summary"
  | "spotify_control"
  | "productivity_control"

type ToolResult = RealtimeToolResult

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

async function readJson<T>(url: string, schema: z.ZodType<T>) {
  const response = await fetch(url)
  const body = await response.json().catch(() => null) as unknown
  if (!response.ok) {
    const parsedError = operationErrorSchema.safeParse(
      body && typeof body === "object" && "operationError" in body ? body.operationError : null,
    )
    if (parsedError.success) throw new OperationFailure(parsedError.data)
    throw new OperationFailure(upstreamError("DOCK_API_REQUEST_FAILED", `Dock API request failed: ${response.status}`, {
      retryable: response.status === 429 || response.status >= 500,
    }))
  }
  const embeddedError = operationErrorSchema.safeParse(
    body && typeof body === "object" && "operationError" in body ? body.operationError : null,
  )
  if (embeddedError.success) throw new OperationFailure(embeddedError.data)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw new OperationFailure(upstreamError("DOCK_API_RESPONSE_INVALID", "Dock API returned an invalid response", { retryable: false }))
  return parsed.data
}

function compactNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value * 10) / 10 : null
}

async function getCurrentWeather(): Promise<ToolResult> {
  const data = await readJson("/api/weather", weatherApiResponseSchema)

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
      mock: data.mock ?? false,
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

  const data = await readJson(`/api/calendar-events?${params.toString()}`, calendarEventsApiResponseSchema)
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
  const data = await readJson("/api/spotify-now-playing", spotifyStatusApiResponseSchema)

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
  const data = await readJson("/api/home-assistant/entities", homeAssistantEntitiesApiResponseSchema)

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
  const data = await readJson("/api/finance/summary", financeSummaryApiResponseSchema)

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
    return realtimeToolArgumentsSchema.safeParse(parsed).data ?? {}
  } catch {
    return {}
  }
}

async function spotifyControl(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = realtimeSpotifyControlInputSchema.safeParse(args)
  if (!parsed.success) {
    const operationError = validationError("Acao Spotify invalida", ["action"])
    return { ok: false, error: operationError.message, operationError }
  }
  const { action } = parsed.data

  const response = await fetch("/api/spotify-control", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { operationError?: unknown } | null
    const parsedError = operationErrorSchema.safeParse(body?.operationError)
    if (parsedError.success) throw new OperationFailure(parsedError.data)
    throw new OperationFailure(upstreamError("SPOTIFY_CONTROL_FAILED", "Spotify control failed", {
      retryable: response.status === 429 || response.status >= 500,
    }))
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
  const parsed = realtimeProductivityControlInputSchema.safeParse(args)
  if (!parsed.success) {
    const operationError = validationError("Comando de produtividade invalido", parsed.error.issues.map((issue) => issue.path.join(".")))
    return { ok: false, error: operationError.message, operationError }
  }
  const { target, action, minutes } = parsed.data

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
        return { ok: false, error: `Ferramenta desconhecida: ${name}`, operationError: validationError("Ferramenta desconhecida", ["name"]) }
    }
  } catch (error) {
    const operationError = error instanceof OperationFailure
      ? error.operationError
      : internalError("Falha ao executar ferramenta")
    return { ok: false, error: operationError.message, operationError }
  }
}
