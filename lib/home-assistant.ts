import { OperationFailure, upstreamError, validationError } from "@/lib/operations/errors"
import { parseAllowedHomeAssistantHosts, validateHomeAssistantUrl } from "@/lib/operations/home-assistant-policy"
import { z } from "zod"

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

const homeAssistantStateSchema: z.ZodType<HomeAssistantState> = z.object({
  entity_id: z.string(),
  state: z.string(),
  attributes: z.object({
    friendly_name: z.string().optional(),
    brightness: z.number().optional(),
    color_temp_kelvin: z.number().optional(),
    hs_color: z.tuple([z.number(), z.number()]).optional(),
    rgb_color: z.tuple([z.number(), z.number(), z.number()]).optional(),
    device_class: z.string().optional(),
    unit_of_measurement: z.string().optional(),
    supported_color_modes: z.array(z.string()).optional(),
    supported_features: z.number().optional(),
  }).passthrough().optional(),
}).passthrough()

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
  if (!config.token) throw new OperationFailure(validationError("Home Assistant is not configured"))
  const validatedUrl = validateHomeAssistantUrl(
    config.url,
    parseAllowedHomeAssistantHosts(process.env.HOME_ASSISTANT_ALLOWED_HOSTS),
  )
  if (!validatedUrl.ok) throw new OperationFailure(validatedUrl.error)

  const response = await fetch(`${validatedUrl.value}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    next: { revalidate: 0 },
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  })

  if (!response.ok) {
    throw new OperationFailure(upstreamError(
      response.status === 429 ? "HOME_ASSISTANT_RATE_LIMITED" : "HOME_ASSISTANT_REQUEST_FAILED",
      "Home Assistant request failed",
      { retryable: response.status === 429 || response.status >= 500 },
    ))
  }

  return response
}

export async function fetchHomeAssistantEntities(config: HomeAssistantConfig): Promise<HomeAssistantEntity[]> {
  const response = await homeAssistantFetch(config, "/api/states")
  const parsed = z.array(homeAssistantStateSchema).safeParse(await response.json())
  if (!parsed.success) {
    throw new OperationFailure(upstreamError("HOME_ASSISTANT_RESPONSE_INVALID", "Home Assistant returned an invalid states response", { retryable: false }))
  }
  const states = parsed.data
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
    throw new OperationFailure(validationError("Unsupported Home Assistant entity domain", ["entityId"]))
  }
  if (config.entityIds.length > 0 && !config.entityIds.includes(entityId)) {
    throw new OperationFailure({
      code: "HOME_ASSISTANT_ENTITY_NOT_ALLOWED",
      category: "authorization",
      message: "Home Assistant entity is not in the user's favorites",
      retryable: false,
    })
  }

  const allowedActions: Record<string, ReadonlySet<string>> = {
    light: new Set(["toggle", "turn_on", "turn_off"]),
    switch: new Set(["toggle", "turn_on", "turn_off"]),
    cover: new Set(["open_cover", "close_cover", "stop_cover"]),
    scene: new Set(["turn_on"]),
    script: new Set(["turn_on"]),
  }
  if (!allowedActions[domain]?.has(action)) {
    throw new OperationFailure(validationError("Action is not supported by this Home Assistant entity", ["action"]))
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
