export const LEGACY_CALENDAR_IDS_STORAGE_KEY = "focus-dock-calendar-ids"
export const CALENDAR_IDS_STORAGE_KEY = "focus-dock-calendar-ids-v1"
export const CALENDAR_SETTINGS_EVENT = "focus-dock-calendar-settings"

function normalizeCalendarIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)))
}

export function readSelectedCalendarIds(): string[] {
  if (typeof window === "undefined") return []

  try {
    const rawValue = window.localStorage.getItem(CALENDAR_IDS_STORAGE_KEY)
      ?? window.localStorage.getItem(LEGACY_CALENDAR_IDS_STORAGE_KEY)
    if (!rawValue) return []
    const parsed = JSON.parse(rawValue) as unknown
    return normalizeCalendarIds(parsed)
  } catch {
    window.localStorage.removeItem(CALENDAR_IDS_STORAGE_KEY)
    return []
  }
}

export function writeSelectedCalendarIds(calendarIds: string[]) {
  if (typeof window === "undefined") return

  const normalized = Array.from(new Set(calendarIds.filter((value) => value.trim().length > 0)))
  window.localStorage.setItem(CALENDAR_IDS_STORAGE_KEY, JSON.stringify(normalized))
  window.dispatchEvent(new CustomEvent(CALENDAR_SETTINGS_EVENT, { detail: normalized }))
}

export function appendCalendarIds(params: URLSearchParams, calendarIds: string[]) {
  for (const calendarId of calendarIds) {
    params.append("calendarId", calendarId)
  }
}
