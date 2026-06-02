import { eq, sql } from "drizzle-orm"
import { userProfiles } from "@/db/schema"
import { drizzleDb } from "@/lib/drizzle"

export type UserProfile = {
  weatherLat: number
  weatherLon: number
  weatherTimezone: string
  weatherLocation: string
  googleCalendarIds: string[]
  googleCalendarTimezone: string
  homeAssistantEntityIds: string[]
  nightModeEnabled: boolean
  nightModeStart: string
  nightModeEnd: string
  productivityAlertPreference: "visual" | "visual-vibration" | "visual-sound"
  productivityNotificationEnabled: boolean
  pomodoroFocusSeconds: number
  pomodoroShortBreakSeconds: number
  pomodoroLongBreakSeconds: number
}

export const DEFAULT_USER_PROFILE: UserProfile = {
  weatherLat: -15.886953,
  weatherLon: -47.813873,
  weatherTimezone: "America/Sao_Paulo",
  weatherLocation: "Brasília",
  googleCalendarIds: ["primary"],
  googleCalendarTimezone: "America/Sao_Paulo",
  homeAssistantEntityIds: [],
  nightModeEnabled: true,
  nightModeStart: "22:00",
  nightModeEnd: "06:00",
  productivityAlertPreference: "visual-vibration",
  productivityNotificationEnabled: false,
  pomodoroFocusSeconds: 25 * 60,
  pomodoroShortBreakSeconds: 5 * 60,
  pomodoroLongBreakSeconds: 15 * 60,
}

type UserProfileRow = {
  weatherLat: number | null
  weatherLon: number | null
  weatherTimezone: string | null
  weatherLocation: string | null
  googleCalendarIds: unknown
  googleCalendarTimezone: string | null
  homeAssistantEntityIds: unknown
  nightModeEnabled: boolean | null
  nightModeStart: string | null
  nightModeEnd: string | null
  productivityAlertPreference: string | null
  productivityNotificationEnabled: boolean | null
  pomodoroFocusSeconds: number | null
  pomodoroShortBreakSeconds: number | null
  pomodoroLongBreakSeconds: number | null
}

function normalizeStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback
  const normalized = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
  return normalized.length > 0 ? Array.from(new Set(normalized)) : fallback
}

function normalizeOptionalStringArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)))
}

function normalizeAlertPreference(value: string | null): UserProfile["productivityAlertPreference"] {
  if (value === "visual" || value === "visual-vibration" || value === "visual-sound") return value
  return DEFAULT_USER_PROFILE.productivityAlertPreference
}

function mapProfile(row?: UserProfileRow): UserProfile {
  if (!row) return DEFAULT_USER_PROFILE

  return {
    weatherLat: typeof row.weatherLat === "number" ? row.weatherLat : DEFAULT_USER_PROFILE.weatherLat,
    weatherLon: typeof row.weatherLon === "number" ? row.weatherLon : DEFAULT_USER_PROFILE.weatherLon,
    weatherTimezone: row.weatherTimezone ?? DEFAULT_USER_PROFILE.weatherTimezone,
    weatherLocation: row.weatherLocation ?? DEFAULT_USER_PROFILE.weatherLocation,
    googleCalendarIds: normalizeStringArray(row.googleCalendarIds, DEFAULT_USER_PROFILE.googleCalendarIds),
    googleCalendarTimezone: row.googleCalendarTimezone ?? row.weatherTimezone ?? DEFAULT_USER_PROFILE.googleCalendarTimezone,
    homeAssistantEntityIds: normalizeOptionalStringArray(row.homeAssistantEntityIds),
    nightModeEnabled: typeof row.nightModeEnabled === "boolean" ? row.nightModeEnabled : DEFAULT_USER_PROFILE.nightModeEnabled,
    nightModeStart: row.nightModeStart ?? DEFAULT_USER_PROFILE.nightModeStart,
    nightModeEnd: row.nightModeEnd ?? DEFAULT_USER_PROFILE.nightModeEnd,
    productivityAlertPreference: normalizeAlertPreference(row.productivityAlertPreference),
    productivityNotificationEnabled: typeof row.productivityNotificationEnabled === "boolean"
      ? row.productivityNotificationEnabled
      : DEFAULT_USER_PROFILE.productivityNotificationEnabled,
    pomodoroFocusSeconds: row.pomodoroFocusSeconds ?? DEFAULT_USER_PROFILE.pomodoroFocusSeconds,
    pomodoroShortBreakSeconds: row.pomodoroShortBreakSeconds ?? DEFAULT_USER_PROFILE.pomodoroShortBreakSeconds,
    pomodoroLongBreakSeconds: row.pomodoroLongBreakSeconds ?? DEFAULT_USER_PROFILE.pomodoroLongBreakSeconds,
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile> {
  const rows = await drizzleDb.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1)
  return mapProfile(rows[0])
}

export async function updateUserProfile(userId: string, patch: Partial<UserProfile>): Promise<UserProfile> {
  const current = await getUserProfile(userId)
  const next: UserProfile = {
    ...current,
    ...patch,
    googleCalendarIds: patch.googleCalendarIds
      ? normalizeStringArray(patch.googleCalendarIds, current.googleCalendarIds)
      : current.googleCalendarIds,
    homeAssistantEntityIds: patch.homeAssistantEntityIds
      ? normalizeOptionalStringArray(patch.homeAssistantEntityIds)
      : current.homeAssistantEntityIds,
  }

  await drizzleDb
    .insert(userProfiles)
    .values({
      userId,
      weatherLat: next.weatherLat,
      weatherLon: next.weatherLon,
      weatherTimezone: next.weatherTimezone,
      weatherLocation: next.weatherLocation,
      googleCalendarIds: next.googleCalendarIds,
      googleCalendarTimezone: next.googleCalendarTimezone,
      homeAssistantEntityIds: next.homeAssistantEntityIds,
      nightModeEnabled: next.nightModeEnabled,
      nightModeStart: next.nightModeStart,
      nightModeEnd: next.nightModeEnd,
      productivityAlertPreference: next.productivityAlertPreference,
      productivityNotificationEnabled: next.productivityNotificationEnabled,
      pomodoroFocusSeconds: next.pomodoroFocusSeconds,
      pomodoroShortBreakSeconds: next.pomodoroShortBreakSeconds,
      pomodoroLongBreakSeconds: next.pomodoroLongBreakSeconds,
      updatedAt: sql`NOW()`,
    })
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: {
        weatherLat: next.weatherLat,
        weatherLon: next.weatherLon,
        weatherTimezone: next.weatherTimezone,
        weatherLocation: next.weatherLocation,
        googleCalendarIds: next.googleCalendarIds,
        googleCalendarTimezone: next.googleCalendarTimezone,
        homeAssistantEntityIds: next.homeAssistantEntityIds,
        nightModeEnabled: next.nightModeEnabled,
        nightModeStart: next.nightModeStart,
        nightModeEnd: next.nightModeEnd,
        productivityAlertPreference: next.productivityAlertPreference,
        productivityNotificationEnabled: next.productivityNotificationEnabled,
        pomodoroFocusSeconds: next.pomodoroFocusSeconds,
        pomodoroShortBreakSeconds: next.pomodoroShortBreakSeconds,
        pomodoroLongBreakSeconds: next.pomodoroLongBreakSeconds,
        updatedAt: sql`NOW()`,
      },
    })

  return next
}
