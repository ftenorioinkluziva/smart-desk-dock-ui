import { z } from "zod"
import type { DockPanelId } from "@/lib/dock-panels"

export const DOCK_DATA_SOURCE_IDS = [
  "weather",
  "today-weather",
  "calendar",
  "today-calendar",
  "tasks",
  "home-assistant",
  "finance",
  "spotify-now-playing",
  "spotify-devices",
  "night-weather",
] as const

export type DockDataSourceId = (typeof DOCK_DATA_SOURCE_IDS)[number]

export const DOCK_DATA_SOURCE_STATUSES = [
  "idle",
  "loading",
  "ready",
  "stale",
  "error",
  "paused",
  "unauthorized",
] as const

export const dockDataSourceStatusSchema = z.enum(DOCK_DATA_SOURCE_STATUSES)

export const dockDataSourceStateSchema = z.object({
  id: z.string().min(1),
  status: dockDataSourceStatusSchema,
  data: z.unknown().nullable(),
  updatedAt: z.string().datetime({ offset: true }).nullable(),
  staleAt: z.string().datetime({ offset: true }).nullable(),
  errorCode: z.string().min(1).nullable(),
}).strict()

export type DockDataSourceState = z.infer<typeof dockDataSourceStateSchema>

export const dockRuntimeEventSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  text: z.string().min(1),
  at: z.string().datetime({ offset: true }),
}).strict()

export type DockRuntimeEvent = z.infer<typeof dockRuntimeEventSchema>

export type DockDataSourceDefinition = {
  label: string
  panelIds: readonly DockPanelId[]
  refreshIntervalMs: number
  lowPowerRefreshIntervalMs: number | null
  staleAfterMs: number
  activeOnly: boolean
}

export const DOCK_DATA_SOURCE_DEFINITIONS: Record<DockDataSourceId, DockDataSourceDefinition> = {
  weather: {
    label: "Clima",
    panelIds: ["weather"],
    refreshIntervalMs: 15 * 60 * 1000,
    lowPowerRefreshIntervalMs: null,
    staleAfterMs: 30 * 60 * 1000,
    activeOnly: true,
  },
  "today-weather": {
    label: "Clima do Hoje",
    panelIds: ["today"],
    refreshIntervalMs: 15 * 60 * 1000,
    lowPowerRefreshIntervalMs: null,
    staleAfterMs: 30 * 60 * 1000,
    activeOnly: true,
  },
  calendar: {
    label: "Agenda",
    panelIds: ["agenda"],
    refreshIntervalMs: 5 * 60 * 1000,
    lowPowerRefreshIntervalMs: null,
    staleAfterMs: 15 * 60 * 1000,
    activeOnly: true,
  },
  "today-calendar": {
    label: "Agenda do Hoje",
    panelIds: ["today", "productivity"],
    refreshIntervalMs: 5 * 60 * 1000,
    lowPowerRefreshIntervalMs: null,
    staleAfterMs: 15 * 60 * 1000,
    activeOnly: true,
  },
  tasks: {
    label: "Google Tasks",
    panelIds: ["today", "productivity"],
    refreshIntervalMs: 60 * 1000,
    lowPowerRefreshIntervalMs: null,
    staleAfterMs: 3 * 60 * 1000,
    activeOnly: true,
  },
  "home-assistant": {
    label: "Home Assistant",
    panelIds: ["home-assistant"],
    refreshIntervalMs: 30 * 1000,
    lowPowerRefreshIntervalMs: null,
    staleAfterMs: 2 * 60 * 1000,
    activeOnly: true,
  },
  finance: {
    label: "Finanças",
    panelIds: ["finance"],
    refreshIntervalMs: 5 * 60 * 1000,
    lowPowerRefreshIntervalMs: null,
    staleAfterMs: 15 * 60 * 1000,
    activeOnly: true,
  },
  "spotify-now-playing": {
    label: "Spotify",
    panelIds: ["spotify"],
    refreshIntervalMs: 1 * 1000,
    lowPowerRefreshIntervalMs: null,
    staleAfterMs: 30 * 1000,
    activeOnly: true,
  },
  "spotify-devices": {
    label: "Dispositivos Spotify",
    panelIds: ["spotify"],
    refreshIntervalMs: 30 * 1000,
    lowPowerRefreshIntervalMs: null,
    staleAfterMs: 2 * 60 * 1000,
    activeOnly: true,
  },
  "night-weather": {
    label: "Clima do modo noturno",
    panelIds: [],
    refreshIntervalMs: 15 * 60 * 1000,
    lowPowerRefreshIntervalMs: 30 * 60 * 1000,
    staleAfterMs: 60 * 60 * 1000,
    activeOnly: false,
  },
}

export function getDockDataSourceDefinition(id: DockDataSourceId) {
  return DOCK_DATA_SOURCE_DEFINITIONS[id]
}
