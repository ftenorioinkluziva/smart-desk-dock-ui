export const CALENDAR_IDS_STORAGE_KEY = "focus-dock-calendar-ids"
export const CALENDAR_SETTINGS_EVENT = "focus-dock-calendar-settings"

export function readSelectedCalendarIds(): string[] {
  if (typeof window === "undefined") return []

  try {
    const rawValue = window.localStorage.getItem(CALENDAR_IDS_STORAGE_KEY)
    if (!rawValue) return []
    const parsed = JSON.parse(rawValue) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
  } catch {
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
