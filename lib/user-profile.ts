import { eq, sql } from "drizzle-orm"
import { userProfiles } from "@/db/schema"
import { drizzleDb } from "@/lib/drizzle"
import { DEFAULT_DOCK_APPEARANCE, isDockAccentId, isDockLayoutId, isDockThemeId } from "@/lib/dock-theme"
import { DEFAULT_DOCK_PANEL_CONFIG, normalizeDockPanelConfig } from "@/lib/dock-panels"
import { userProfileSchema, type UserProfile, type UserProfilePatch } from "@/lib/operations/contracts"

export type { UserProfile } from "@/lib/operations/contracts"

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
  themePreset: DEFAULT_DOCK_APPEARANCE.themePreset,
  accentPreset: DEFAULT_DOCK_APPEARANCE.accentPreset,
  layoutPreset: DEFAULT_DOCK_APPEARANCE.layoutPreset,
  dockPanelOrder: DEFAULT_DOCK_PANEL_CONFIG.panelOrder,
  dockHiddenPanelIds: DEFAULT_DOCK_PANEL_CONFIG.hiddenPanelIds,
  dockInitialPanelId: DEFAULT_DOCK_PANEL_CONFIG.initialPanelId,
  dockAutoRotate: DEFAULT_DOCK_PANEL_CONFIG.autoRotate,
  primaryClockLabel: "Brasília",
  primaryClockTimezone: "America/Sao_Paulo",
  secondaryClocks: [
    { label: "Lisboa", timezone: "Europe/Lisbon" },
    { label: "Nova York", timezone: "America/New_York" },
  ],
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
  themePreset: string | null
  accentPreset: string | null
  layoutPreset: string | null
  dockPanelOrder: unknown
  dockHiddenPanelIds: unknown
  dockInitialPanelId: string | null
  dockAutoRotate: boolean | null
  primaryClockLabel: string | null
  primaryClockTimezone: string | null
  secondaryClocks: unknown
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

  const panelConfig = normalizeDockPanelConfig({
    panelOrder: row.dockPanelOrder,
    hiddenPanelIds: row.dockHiddenPanelIds,
    initialPanelId: row.dockInitialPanelId,
    autoRotate: row.dockAutoRotate,
  })
  const secondaryClocks = Array.isArray(row.secondaryClocks)
    ? row.secondaryClocks.filter((item): item is { label: string; timezone: string } => Boolean(
      item && typeof item === "object" &&
      typeof (item as { label?: unknown }).label === "string" &&
      typeof (item as { timezone?: unknown }).timezone === "string",
    )).slice(0, 2)
    : DEFAULT_USER_PROFILE.secondaryClocks

  return userProfileSchema.parse({
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
    themePreset: isDockThemeId(row.themePreset) ? row.themePreset : DEFAULT_USER_PROFILE.themePreset,
    accentPreset: isDockAccentId(row.accentPreset) ? row.accentPreset : DEFAULT_USER_PROFILE.accentPreset,
    layoutPreset: isDockLayoutId(row.layoutPreset) ? row.layoutPreset : DEFAULT_USER_PROFILE.layoutPreset,
    dockPanelOrder: panelConfig.panelOrder,
    dockHiddenPanelIds: panelConfig.hiddenPanelIds,
    dockInitialPanelId: panelConfig.initialPanelId,
    dockAutoRotate: panelConfig.autoRotate,
    primaryClockLabel: row.primaryClockLabel ?? DEFAULT_USER_PROFILE.primaryClockLabel,
    primaryClockTimezone: row.primaryClockTimezone ?? row.weatherTimezone ?? DEFAULT_USER_PROFILE.primaryClockTimezone,
    secondaryClocks: secondaryClocks.length > 0 ? secondaryClocks : DEFAULT_USER_PROFILE.secondaryClocks,
  })
}

export async function getUserProfile(userId: string): Promise<UserProfile> {
  const rows = await drizzleDb.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1)
  return mapProfile(rows[0])
}

export async function updateUserProfile(userId: string, patch: UserProfilePatch): Promise<UserProfile> {
  const current = await getUserProfile(userId)
  const next = userProfileSchema.parse({
    ...current,
    ...patch,
    googleCalendarIds: patch.googleCalendarIds
      ? normalizeStringArray(patch.googleCalendarIds, current.googleCalendarIds)
      : current.googleCalendarIds,
    homeAssistantEntityIds: patch.homeAssistantEntityIds
      ? normalizeOptionalStringArray(patch.homeAssistantEntityIds)
      : current.homeAssistantEntityIds,
  })

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
      themePreset: next.themePreset,
      accentPreset: next.accentPreset,
      layoutPreset: next.layoutPreset,
      dockPanelOrder: next.dockPanelOrder,
      dockHiddenPanelIds: next.dockHiddenPanelIds,
      dockInitialPanelId: next.dockInitialPanelId,
      dockAutoRotate: next.dockAutoRotate,
      primaryClockLabel: next.primaryClockLabel,
      primaryClockTimezone: next.primaryClockTimezone,
      secondaryClocks: next.secondaryClocks,
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
        themePreset: next.themePreset,
        accentPreset: next.accentPreset,
        layoutPreset: next.layoutPreset,
        dockPanelOrder: next.dockPanelOrder,
        dockHiddenPanelIds: next.dockHiddenPanelIds,
        dockInitialPanelId: next.dockInitialPanelId,
        dockAutoRotate: next.dockAutoRotate,
        primaryClockLabel: next.primaryClockLabel,
        primaryClockTimezone: next.primaryClockTimezone,
        secondaryClocks: next.secondaryClocks,
        updatedAt: sql`NOW()`,
      },
    })

  return next
}
