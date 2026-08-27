import { OperationFailure, upstreamError, validationError } from "@/lib/operations/errors"
import { parseAllowedHomeAssistantHosts, validateHomeAssistantUrl } from "@/lib/operations/home-assistant-policy"
import { z } from "zod"

type HomeAssistantState = {
  entity_id: string
  state: string
  attributes?: {
    friendly_name?: string | null
    brightness?: number | null
    color_temp_kelvin?: number | null
    hs_color?: [number, number] | null
    rgb_color?: [number, number, number] | null
    device_class?: string | null
    unit_of_measurement?: string | null
    supported_color_modes?: string[] | null
    supported_features?: number | null
    [key: string]: unknown
  }
}

const homeAssistantStateSchema: z.ZodType<HomeAssistantState> = z.object({
  entity_id: z.string(),
  state: z.string(),
  attributes: z.object({
    friendly_name: z.string().nullable().optional(),
    brightness: z.number().nullable().optional(),
    color_temp_kelvin: z.number().nullable().optional(),
    hs_color: z.tuple([z.number(), z.number()]).nullable().optional(),
    rgb_color: z.tuple([z.number(), z.number(), z.number()]).nullable().optional(),
    device_class: z.string().nullable().optional(),
    unit_of_measurement: z.string().nullable().optional(),
    supported_color_modes: z.array(z.string()).nullable().optional(),
    supported_features: z.number().nullable().optional(),
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

type FetchHomeAssistantEntitiesOptions = {
  includeAll?: boolean
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

  const method = (init?.method ?? "GET").toUpperCase()
  const canRetry = method === "GET"
  const maxAttempts = canRetry ? 2 : 1
  let response: Response | undefined
  let lastError: unknown

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      response = await fetch(`${validatedUrl.value}${path}`, {
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

      const retryableStatus = response.status === 429 || response.status >= 500
      if (response.ok || !canRetry || !retryableStatus || attempt === maxAttempts - 1) break
      await new Promise((resolve) => setTimeout(resolve, 250))
    } catch (error) {
      lastError = error
      if (!canRetry || attempt === maxAttempts - 1) throw error
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  }

  if (!response) throw lastError ?? new Error("Home Assistant request did not return a response")

  if (!response.ok) {
    throw new OperationFailure(upstreamError(
      response.status === 429 ? "HOME_ASSISTANT_RATE_LIMITED" : "HOME_ASSISTANT_REQUEST_FAILED",
      "Home Assistant request failed",
      { retryable: response.status === 429 || response.status >= 500 },
    ))
  }

  return response
}

export async function fetchHomeAssistantEntities(
  config: HomeAssistantConfig,
  options: FetchHomeAssistantEntitiesOptions = {},
): Promise<HomeAssistantEntity[]> {
  const response = await homeAssistantFetch(config, "/api/states")
  const parsed = z.array(homeAssistantStateSchema).safeParse(await response.json())
  if (!parsed.success) {
    throw new OperationFailure(upstreamError("HOME_ASSISTANT_RESPONSE_INVALID", "Home Assistant returned an invalid states response", { retryable: false }))
  }
  const states = parsed.data
  const favoriteEntityIds = config.entityIds
  const allowedDomains = new Set(["light", "switch", "scene", "script", "cover"])

  const entities = states
    .filter((entity) => {
      if (options.includeAll) {
        const [domain] = entity.entity_id.split(".")
        return allowedDomains.has(domain ?? "")
      }
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

  return options.includeAll ? entities : entities.slice(0, 12)
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
