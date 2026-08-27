import { z } from "zod"
import type { DockDataSourceId } from "@/lib/dock-runtime"

export const DOCK_PANEL_IDS = [
  "today",
  "voice",
  "weather",
  "productivity",
  "agenda",
  "home-assistant",
  "finance",
  "spotify",
  "windy-map",
] as const

export type DockPanelId = (typeof DOCK_PANEL_IDS)[number]

export type DockPanelDefinition = {
  id: DockPanelId
  label: string
  description: string
  dataSources: readonly DockDataSourceId[]
}

export const DOCK_PANEL_DEFINITIONS: DockPanelDefinition[] = [
  { id: "today", label: "Hoje", description: "Relógio, agenda e contexto", dataSources: ["today-weather", "today-calendar", "tasks"] },
  { id: "voice", label: "Voz", description: "Agente Realtime", dataSources: [] },
  { id: "weather", label: "Clima", description: "Previsão detalhada", dataSources: ["weather"] },
  { id: "productivity", label: "Produtividade", description: "Pomodoro, tarefas e agenda", dataSources: ["tasks", "today-calendar"] },
  { id: "agenda", label: "Agenda", description: "Calendário mensal", dataSources: ["calendar"] },
  { id: "home-assistant", label: "Casa", description: "Dispositivos favoritos", dataSources: ["home-assistant"] },
  { id: "finance", label: "Finanças", description: "Carteira e alocação", dataSources: ["finance"] },
  { id: "spotify", label: "Spotify", description: "Reprodução expandida", dataSources: ["spotify-now-playing", "spotify-devices"] },
  { id: "windy-map", label: "Mapa", description: "Mapa meteorológico", dataSources: [] },
]

export const dockPanelConfigSchema = z.object({
  panelOrder: z.array(z.enum(DOCK_PANEL_IDS)).length(DOCK_PANEL_IDS.length),
  hiddenPanelIds: z.array(z.enum(DOCK_PANEL_IDS)).max(DOCK_PANEL_IDS.length),
  initialPanelId: z.enum(DOCK_PANEL_IDS),
  autoRotate: z.boolean(),
}).strict()

export type DockPanelConfig = z.infer<typeof dockPanelConfigSchema>

export const DEFAULT_DOCK_PANEL_CONFIG: DockPanelConfig = {
  panelOrder: [...DOCK_PANEL_IDS],
  hiddenPanelIds: [],
  initialPanelId: "today",
  autoRotate: false,
}

function isDockPanelId(value: unknown): value is DockPanelId {
  return typeof value === "string" && DOCK_PANEL_IDS.includes(value as DockPanelId)
}

function normalizePanelOrder(value: unknown) {
  const candidate = Array.isArray(value) ? value : []
  const unique = candidate.filter((item, index): item is DockPanelId => isDockPanelId(item) && candidate.indexOf(item) === index)
  return [...unique, ...DOCK_PANEL_IDS.filter((id) => !unique.includes(id))]
}

export function normalizeDockPanelConfig(value: unknown): DockPanelConfig {
  const candidate = value && typeof value === "object" ? value as Partial<DockPanelConfig> : {}
  const panelOrder = normalizePanelOrder(candidate.panelOrder)
  const requestedHidden = Array.isArray(candidate.hiddenPanelIds)
    ? candidate.hiddenPanelIds.filter((item): item is DockPanelId => isDockPanelId(item))
    : []
  const hiddenPanelIds = Array.from(new Set(requestedHidden))
  const visiblePanelIds = panelOrder.filter((id) => !hiddenPanelIds.includes(id))
  const requestedInitial = isDockPanelId(candidate.initialPanelId) ? candidate.initialPanelId : DEFAULT_DOCK_PANEL_CONFIG.initialPanelId
  const initialPanelId = visiblePanelIds.includes(requestedInitial)
    ? requestedInitial
    : visiblePanelIds[0] ?? DEFAULT_DOCK_PANEL_CONFIG.initialPanelId

  if (visiblePanelIds.length === 0) {
    return {
      panelOrder,
      hiddenPanelIds: panelOrder.filter((id) => id !== DEFAULT_DOCK_PANEL_CONFIG.initialPanelId),
      initialPanelId: DEFAULT_DOCK_PANEL_CONFIG.initialPanelId,
      autoRotate: Boolean(candidate.autoRotate),
    }
  }

  return {
    panelOrder,
    hiddenPanelIds,
    initialPanelId,
    autoRotate: Boolean(candidate.autoRotate),
  }
}

export function getVisibleDockPanelIds(config: DockPanelConfig) {
  return config.panelOrder.filter((id) => !config.hiddenPanelIds.includes(id))
}
