import { z } from "zod"
import { DOCK_ACCENT_IDS, DOCK_LAYOUT_IDS, DOCK_THEME_IDS } from "@/lib/dock-theme"
import { DOCK_PANEL_IDS } from "@/lib/dock-panels"
import { operationErrorSchema } from "@/lib/operations/errors"

const clockTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected HH:mm")
const entityIdSchema = z.string().trim().regex(/^[a-z0-9_]+\.[a-z0-9_]+$/, "Invalid Home Assistant entity id")

export const userProfileSchema = z.object({
  weatherLat: z.number().finite().min(-90).max(90),
  weatherLon: z.number().finite().min(-180).max(180),
  weatherTimezone: z.string().trim().min(1).max(100),
  weatherLocation: z.string().trim().min(1).max(120),
  googleCalendarIds: z.array(z.string().trim().min(1).max(512)).max(50),
  googleCalendarTimezone: z.string().trim().min(1).max(100),
  homeAssistantEntityIds: z.array(entityIdSchema).max(100),
  nightModeEnabled: z.boolean(),
  nightModeStart: clockTimeSchema,
  nightModeEnd: clockTimeSchema,
  productivityAlertPreference: z.enum(["visual", "visual-vibration", "visual-sound"]),
  productivityNotificationEnabled: z.boolean(),
  pomodoroFocusSeconds: z.number().int().min(60).max(24 * 60 * 60),
  pomodoroShortBreakSeconds: z.number().int().min(60).max(24 * 60 * 60),
  pomodoroLongBreakSeconds: z.number().int().min(60).max(24 * 60 * 60),
  themePreset: z.enum(DOCK_THEME_IDS),
  accentPreset: z.enum(DOCK_ACCENT_IDS),
  layoutPreset: z.enum(DOCK_LAYOUT_IDS),
  dockPanelOrder: z.array(z.enum(DOCK_PANEL_IDS)).length(DOCK_PANEL_IDS.length),
  dockHiddenPanelIds: z.array(z.enum(DOCK_PANEL_IDS)).max(DOCK_PANEL_IDS.length),
  dockInitialPanelId: z.enum(DOCK_PANEL_IDS),
  dockAutoRotate: z.boolean(),
  primaryClockLabel: z.string().trim().min(1).max(80),
  primaryClockTimezone: z.string().trim().min(1).max(100),
  secondaryClocks: z.array(z.object({
    label: z.string().trim().min(1).max(80),
    timezone: z.string().trim().min(1).max(100),
  }).strict()).max(2),
}).strict()

export const userProfilePatchSchema = userProfileSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "At least one profile field is required" },
)

export type UserProfile = z.infer<typeof userProfileSchema>
export type UserProfilePatch = z.infer<typeof userProfilePatchSchema>

export const homeAssistantSettingsSchema = z.object({
  url: z.string().trim().min(1).max(2048).optional(),
  token: z.string().trim().min(1).max(8192).optional(),
  entityIds: z.array(entityIdSchema).max(100).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "At least one Home Assistant setting is required",
})

export const homeAssistantColorCommandSchema = z.object({
  colorTempKelvin: z.number().finite().min(2000).max(6500).optional(),
  hsColor: z.tuple([
    z.number().finite().min(0).max(360),
    z.number().finite().min(0).max(100),
  ]).optional(),
}).strict()

export const homeAssistantServiceInputSchema = z.object({
  entityId: entityIdSchema,
  action: z.enum(["toggle", "turn_on", "turn_off", "open_cover", "close_cover", "stop_cover"]),
  brightness: z.number().finite().min(0).max(100).optional(),
  color: homeAssistantColorCommandSchema.optional(),
}).strict()

export type HomeAssistantServiceInput = z.infer<typeof homeAssistantServiceInputSchema>

const homeAssistantEntitySchema = z.object({
  entityId: z.string(),
  domain: z.string(),
  name: z.string(),
  state: z.string(),
  deviceClass: z.string().nullable(),
  unit: z.string().nullable(),
  brightness: z.number().nullable(),
  supportsBrightness: z.boolean(),
  supportsColor: z.boolean(),
  controllable: z.boolean(),
}).strict()

export const homeAssistantEntityCatalogApiResponseSchema = z.object({
  entities: z.array(homeAssistantEntitySchema),
  configured: z.boolean().optional(),
}).passthrough()

export type HomeAssistantEntityCatalogEntry = z.infer<typeof homeAssistantEntitySchema>

export const homeAssistantIntegrationStatusSchema = z.object({
  configured: z.boolean(),
  hasUrl: z.boolean(),
  hasToken: z.boolean(),
  entityIds: z.array(entityIdSchema),
}).strict()

export const openAiSettingsSchema = z.object({
  apiKey: z.string().trim().min(1).max(512),
}).strict()

export const financeLoginInputSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(1).max(1024),
}).strict()

export const financeAuthUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  role: z.string(),
}).passthrough()

export const financeAuthUserResponseSchema = z.object({
  user: financeAuthUserSchema,
}).passthrough()

export type FinanceAuthUser = z.infer<typeof financeAuthUserSchema>

const isoDateTimeSchema = z.string().refine((value) => Number.isFinite(Date.parse(value)), "Invalid date-time")
export const calendarEventsQuerySchema = z.object({
  timeMin: isoDateTimeSchema,
  timeMax: isoDateTimeSchema,
  calendarIds: z.array(z.string().trim().min(1).max(512)).max(50),
}).strict().refine((value) => Date.parse(value.timeMin) < Date.parse(value.timeMax), {
  path: ["timeMax"],
  message: "timeMax must be after timeMin",
})

export const spotifyControlInputSchema = z.object({
  action: z.enum(["play", "pause", "next", "previous", "shuffle", "repeat", "volume", "transfer", "play-context"]),
  state: z.boolean().optional(),
  repeatState: z.enum(["track", "context", "off"]).optional(),
  volumePercent: z.number().finite().min(0).max(100).optional(),
  deviceId: z.string().trim().min(1).max(512).optional(),
  play: z.boolean().optional(),
  contextUri: z.string().trim().regex(/^spotify:playlist:[A-Za-z0-9]+$/).optional(),
}).strict().superRefine((value, context) => {
  if (value.action === "repeat" && value.repeatState === undefined) {
    context.addIssue({ code: "custom", path: ["repeatState"], message: "repeatState is required" })
  }
  if (value.action === "volume" && value.volumePercent === undefined) {
    context.addIssue({ code: "custom", path: ["volumePercent"], message: "volumePercent is required" })
  }
  if (value.action === "transfer" && value.deviceId === undefined) {
    context.addIssue({ code: "custom", path: ["deviceId"], message: "deviceId is required" })
  }
  if (value.action === "play-context" && value.contextUri === undefined) {
    context.addIssue({ code: "custom", path: ["contextUri"], message: "contextUri is required" })
  }
})

export type SpotifyControlInput = z.infer<typeof spotifyControlInputSchema>

export const realtimeToolArgumentsSchema = z.record(z.string(), z.unknown())

export const realtimeSpotifyControlInputSchema = z.object({
  action: z.enum(["play", "pause", "next", "previous"]),
}).strict()

export const realtimeProductivityControlInputSchema = z.object({
  target: z.enum(["pomodoro", "timer", "stopwatch"]),
  action: z.enum(["start", "pause", "reset"]),
  minutes: z.number().finite().int().min(1).max(180).optional(),
}).strict()

export const realtimeToolResultSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), data: z.unknown() }).strict(),
  z.object({ ok: z.literal(false), error: z.string(), operationError: operationErrorSchema }).strict(),
])

export type RealtimeToolResult = z.infer<typeof realtimeToolResultSchema>

export const weatherApiResponseSchema = z.object({
  location: z.string(), temp: z.number(), high: z.number(), low: z.number(), description: z.string(), condition: z.string(),
  forecast: z.array(z.object({ day: z.string(), date: z.string(), low: z.number(), high: z.number(), condition: z.string() }).passthrough()),
  mock: z.boolean().optional(),
}).passthrough()

export const calendarEventsApiResponseSchema = z.object({
  events: z.array(z.object({
    id: z.string(), title: z.string(), date: z.string(), time: z.string(), startDateTime: z.string().nullable(),
    endDateTime: z.string().nullable(), isAllDay: z.boolean(),
  }).passthrough()).optional(),
  mock: z.boolean().optional(),
}).passthrough()

export const googleTasksPatchSchema = z.object({
  taskListId: z.string().trim().min(1).max(512),
  taskId: z.string().trim().min(1).max(512),
  completed: z.boolean(),
}).strict()

export const googleTasksApiResponseSchema = z.object({
  taskLists: z.array(z.object({
    id: z.string(),
    title: z.string(),
  }).passthrough()).optional(),
  tasks: z.array(z.object({
    id: z.string(),
    taskListId: z.string(),
    taskListTitle: z.string(),
    title: z.string(),
    notes: z.string().nullable(),
    due: z.string().nullable(),
    completed: z.boolean(),
    updated: z.string().nullable(),
  }).passthrough()).optional(),
  tasksAuthRequired: z.boolean().optional(),
  mock: z.boolean().optional(),
}).passthrough()

export const spotifyStatusApiResponseSchema = z.object({
  mock: z.boolean().optional(), isPlaying: z.boolean().optional(), track: z.unknown().optional(), artist: z.unknown().optional(),
  album: z.unknown().optional(), deviceName: z.unknown().optional(), deviceType: z.unknown().optional(), volumePercent: z.unknown().optional(),
  shuffle: z.boolean().optional(), repeat: z.unknown().optional(),
}).passthrough()

export const homeAssistantEntitiesApiResponseSchema = z.object({
  entities: z.array(z.object({
    entityId: z.string(), domain: z.string(), name: z.string(), state: z.string(), deviceClass: z.string().nullable(), unit: z.string().nullable(), brightness: z.number().nullable(), supportsBrightness: z.boolean(), supportsColor: z.boolean(), controllable: z.boolean(),
  }).passthrough()).optional(),
  mock: z.boolean().optional(),
}).passthrough()

export const financeSummaryApiResponseSchema = z.object({
  source: z.enum(["MANUAL", "PLUGGY"]).nullable().optional(),
  observedAt: z.string().datetime({ offset: true }).nullable().optional(),
  fetchedAt: z.string().datetime({ offset: true }).optional(),
  targetBasketName: z.string().nullable().optional(),
  totalValue: z.number().optional(), cashBalance: z.number().optional(), driftPercentage: z.number().optional(), unrealizedGain: z.number().optional(),
  outsideStrategyValue: z.number().optional(), unresolvedValue: z.number().optional(), unresolvedCount: z.number().int().nonnegative().optional(),
  warnings: z.array(z.string()).optional(),
  assets: z.array(z.object({
    ticker: z.string(), label: z.string(), percentage: z.number(), targetPercentage: z.number(), gainPercentage: z.number(),
    dailyChangePercentage: z.number().nullable(),
  }).passthrough()).optional(),
  funds: z.array(z.object({
    id: z.string(), name: z.string(), indexTicker: z.string().optional(), currentValue: z.number(), gain: z.number(), gainPercentage: z.number(),
  }).passthrough()).optional(),
  mock: z.boolean().optional(),
}).passthrough()

export const financeDockSummaryApiResponseSchema = z.object({
  source: z.enum(["MANUAL", "PLUGGY"]).nullable(),
  observedAt: z.string().datetime({ offset: true }).nullable(),
  fetchedAt: z.string().datetime({ offset: true }),
  targetBasketName: z.string().nullable(),
  totalValue: z.number(),
  positionsValue: z.number(),
  fundsValue: z.number(),
  cashBalance: z.number(),
  positionCount: z.number().int().nonnegative(),
  driftPercentage: z.number(),
  unrealizedGain: z.number(),
  outsideStrategyValue: z.number(),
  unresolvedValue: z.number(),
  unresolvedCount: z.number().int().nonnegative(),
  warnings: z.array(z.string()),
  assets: z.array(z.object({
    id: z.string(), ticker: z.string(), label: z.string(), shares: z.number().nullable(),
    percentage: z.number(), targetPercentage: z.number(), currentPrice: z.number().nullable(),
    currentValue: z.number(), gain: z.number(), gainPercentage: z.number(), dailyChangePercentage: z.number().nullable(),
  }).passthrough()),
  funds: z.array(z.object({
    id: z.string(), name: z.string(), indexTicker: z.string().optional(), currentValue: z.number(), gain: z.number(), gainPercentage: z.number(),
  }).passthrough()),
  prices: z.array(z.object({
    ticker: z.string(), name: z.string(), price: z.number(), priceDate: z.string(), calculationType: z.string(),
  }).passthrough()),
  updatedAt: z.string().datetime({ offset: true }),
  mock: z.boolean().optional(),
  error: z.string().optional(),
}).passthrough()
