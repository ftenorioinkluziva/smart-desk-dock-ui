export const NIGHT_MODE_SETTINGS_STORAGE_KEY = "focus-dock-night-mode-settings"
export const NIGHT_MODE_SETTINGS_EVENT = "focus-dock-night-mode-settings"

export type NightModeSettings = {
  enabled: boolean
  start: string
  end: string
}

export const DEFAULT_NIGHT_MODE_SETTINGS: NightModeSettings = {
  enabled: true,
  start: "22:00",
  end: "06:00",
}

function isValidTime(value: unknown): value is string {
  return typeof value === "string" && /^\d{2}:\d{2}$/.test(value)
}

export function readNightModeSettings(): NightModeSettings {
  if (typeof window === "undefined") return DEFAULT_NIGHT_MODE_SETTINGS

  try {
    const rawValue = window.localStorage.getItem(NIGHT_MODE_SETTINGS_STORAGE_KEY)
    if (!rawValue) return DEFAULT_NIGHT_MODE_SETTINGS
    const parsed = JSON.parse(rawValue) as Partial<NightModeSettings>

    return {
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : DEFAULT_NIGHT_MODE_SETTINGS.enabled,
      start: isValidTime(parsed.start) ? parsed.start : DEFAULT_NIGHT_MODE_SETTINGS.start,
      end: isValidTime(parsed.end) ? parsed.end : DEFAULT_NIGHT_MODE_SETTINGS.end,
    }
  } catch {
    return DEFAULT_NIGHT_MODE_SETTINGS
  }
}

export function writeNightModeSettings(settings: NightModeSettings) {
  if (typeof window === "undefined") return

  window.localStorage.setItem(NIGHT_MODE_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  window.dispatchEvent(new CustomEvent(NIGHT_MODE_SETTINGS_EVENT, { detail: settings }))
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number)
  return hours * 60 + minutes
}

export function isWithinNightMode(now: Date, settings: NightModeSettings) {
  if (!settings.enabled) return false

  const current = now.getHours() * 60 + now.getMinutes()
  const start = timeToMinutes(settings.start)
  const end = timeToMinutes(settings.end)

  if (start === end) return false
  if (start < end) return current >= start && current < end
  return current >= start || current < end
}
