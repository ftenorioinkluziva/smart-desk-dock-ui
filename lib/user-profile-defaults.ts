import { DEFAULT_DOCK_APPEARANCE } from "@/lib/dock-theme"
import { DEFAULT_DOCK_PANEL_CONFIG } from "@/lib/dock-panels"
import type { UserProfile } from "@/lib/operations/contracts"

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
