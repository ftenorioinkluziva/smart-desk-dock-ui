type HomeAssistantState = {
  entity_id: string
  state: string
  attributes?: {
    friendly_name?: string
    brightness?: number
    color_temp_kelvin?: number
    hs_color?: [number, number]
    rgb_color?: [number, number, number]
    device_class?: string
    unit_of_measurement?: string
    supported_color_modes?: string[]
    supported_features?: number
    [key: string]: unknown
  }
}

export type HomeAssistantEntity = {
  entityId: string
  domain: string
  name: string
  state: string
  deviceClass: string | null
  unit: string | null
  brightness: number | null
  supportsBrightness: boolean
  supportsColor: boolean
  controllable: boolean
}

export type HomeAssistantColorCommand = {
  colorTempKelvin?: number
  hsColor?: [number, number]
}

export type HomeAssistantConfig = {
  url: string
  token: string
  entityIds: string[]
}

function normalizeEntity(entity: HomeAssistantState): HomeAssistantEntity {
  const [domain] = entity.entity_id.split(".")
  const brightness = typeof entity.attributes?.brightness === "number"
    ? Math.round((entity.attributes.brightness / 255) * 100)
    : null

  return {
    entityId: entity.entity_id,
    domain: domain ?? "unknown",
    name: entity.attributes?.friendly_name ?? entity.entity_id,
    state: entity.state,
    deviceClass: typeof entity.attributes?.device_class === "string" ? entity.attributes.device_class : null,
    unit: typeof entity.attributes?.unit_of_measurement === "string" ? entity.attributes.unit_of_measurement : null,
    brightness,
    supportsBrightness: domain === "light",
    supportsColor: domain === "light" && Array.isArray(entity.attributes?.supported_color_modes)
      ? entity.attributes.supported_color_modes.some((mode) => mode === "hs" || mode === "rgb" || mode === "xy")
      : false,
    controllable: ["light", "switch", "scene", "script", "cover"].includes(domain ?? ""),
  }
}

async function homeAssistantFetch(config: HomeAssistantConfig, path: string, init?: RequestInit) {
  const url = config.url.replace(/\/$/, "")
  if (!url || !config.token) {
    throw new Error("Home Assistant is not configured")
  }

  const response = await fetch(`${url}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    next: { revalidate: 0 },
  })

  if (!response.ok) {
    throw new Error(`Home Assistant request failed: ${response.status}`)
  }

  return response
}

export async function fetchHomeAssistantEntities(config: HomeAssistantConfig): Promise<HomeAssistantEntity[]> {
  const response = await homeAssistantFetch(config, "/api/states")
  const states = await response.json() as HomeAssistantState[]
  const favoriteEntityIds = config.entityIds
  const allowedDomains = new Set(["light", "switch", "scene", "script", "cover"])

  return states
    .filter((entity) => {
      if (favoriteEntityIds.length > 0) return favoriteEntityIds.includes(entity.entity_id)
      const [domain] = entity.entity_id.split(".")
      return allowedDomains.has(domain ?? "")
    })
    .map(normalizeEntity)
    .sort((a, b) => {
      const favoriteA = favoriteEntityIds.indexOf(a.entityId)
      const favoriteB = favoriteEntityIds.indexOf(b.entityId)
      if (favoriteA !== -1 || favoriteB !== -1) return (favoriteA === -1 ? 999 : favoriteA) - (favoriteB === -1 ? 999 : favoriteB)
      return a.name.localeCompare(b.name, "pt-BR")
    })
    .slice(0, 12)
}

export async function callHomeAssistantService(
  config: HomeAssistantConfig,
  {
    entityId,
    action,
    brightness,
    color,
  }: {
    entityId: string
    action: "toggle" | "turn_on" | "turn_off" | "open_cover" | "close_cover" | "stop_cover"
    brightness?: number
    color?: HomeAssistantColorCommand
  },
) {
  const [domain] = entityId.split(".")
  if (!domain || !["light", "switch", "scene", "script", "cover"].includes(domain)) {
    throw new Error("Unsupported Home Assistant entity domain")
  }

  const service = domain === "scene" || domain === "script"
    ? "turn_on"
    : action

  const body: Record<string, unknown> = { entity_id: entityId }
  if (domain === "light" && action === "turn_on" && typeof brightness === "number") {
    body.brightness_pct = Math.max(1, Math.min(100, Math.round(brightness)))
  }
  if (domain === "light" && action === "turn_on" && typeof color?.colorTempKelvin === "number") {
    body.color_temp_kelvin = Math.max(2000, Math.min(6500, Math.round(color.colorTempKelvin)))
  }
  if (domain === "light" && action === "turn_on" && Array.isArray(color?.hsColor)) {
    const [hue, saturation] = color.hsColor
    body.hs_color = [
      Math.max(0, Math.min(360, Math.round(hue))),
      Math.max(0, Math.min(100, Math.round(saturation))),
    ]
  }

  await homeAssistantFetch(config, `/api/services/${domain}/${service}`, {
    method: "POST",
    body: JSON.stringify(body),
  })
}

