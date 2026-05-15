export const PRODUCTIVITY_ALERT_SETTINGS_STORAGE_KEY = "focus-dock-productivity-alert-settings-v1"
export const PRODUCTIVITY_ALERT_SETTINGS_EVENT = "focus-dock-productivity-alert-settings"
export const POMODORO_DURATIONS_STORAGE_KEY = "focus-dock-pomodoro-durations"
export const POMODORO_DURATIONS_EVENT = "focus-dock-pomodoro-durations"

export type ProductivityAlertPreference = "visual" | "visual-vibration" | "visual-sound"
export type ProductivityAlertKind = "pomodoro" | "timer"
export type PomodoroMode = "focus" | "short-break" | "long-break"

export type ProductivityAlertSettings = {
  preference: ProductivityAlertPreference
}

export type PomodoroDurations = Record<PomodoroMode, number>

export const DEFAULT_PRODUCTIVITY_ALERT_SETTINGS: ProductivityAlertSettings = {
  preference: "visual-vibration",
}

export const DEFAULT_POMODORO_DURATIONS: PomodoroDurations = {
  "focus": 25 * 60,
  "short-break": 5 * 60,
  "long-break": 15 * 60,
}

const VALID_ALERT_PREFERENCES = new Set<ProductivityAlertPreference>([
  "visual",
  "visual-vibration",
  "visual-sound",
])

function normalizeStoredDuration(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback
  return Math.max(60, Math.min(10800, Math.round(value)))
}

export function readProductivityAlertSettings(): ProductivityAlertSettings {
  if (typeof window === "undefined") return DEFAULT_PRODUCTIVITY_ALERT_SETTINGS

  try {
    const rawValue = window.localStorage.getItem(PRODUCTIVITY_ALERT_SETTINGS_STORAGE_KEY)
    if (!rawValue) return DEFAULT_PRODUCTIVITY_ALERT_SETTINGS

    const parsed = JSON.parse(rawValue) as Partial<ProductivityAlertSettings>
    return {
      preference: VALID_ALERT_PREFERENCES.has(parsed.preference as ProductivityAlertPreference)
        ? parsed.preference as ProductivityAlertPreference
        : DEFAULT_PRODUCTIVITY_ALERT_SETTINGS.preference,
    }
  } catch {
    window.localStorage.removeItem(PRODUCTIVITY_ALERT_SETTINGS_STORAGE_KEY)
    return DEFAULT_PRODUCTIVITY_ALERT_SETTINGS
  }
}

export function writeProductivityAlertSettings(settings: ProductivityAlertSettings) {
  if (typeof window === "undefined") return

  window.localStorage.setItem(PRODUCTIVITY_ALERT_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  window.dispatchEvent(new CustomEvent(PRODUCTIVITY_ALERT_SETTINGS_EVENT, { detail: settings }))
}

export function readPomodoroDurations(): PomodoroDurations {
  if (typeof window === "undefined") return DEFAULT_POMODORO_DURATIONS

  try {
    const rawValue = window.localStorage.getItem(POMODORO_DURATIONS_STORAGE_KEY)
    if (!rawValue) return DEFAULT_POMODORO_DURATIONS

    const parsed = JSON.parse(rawValue) as Partial<Record<PomodoroMode, unknown>>
    return {
      "focus": normalizeStoredDuration(parsed["focus"], DEFAULT_POMODORO_DURATIONS["focus"]),
      "short-break": normalizeStoredDuration(parsed["short-break"], DEFAULT_POMODORO_DURATIONS["short-break"]),
      "long-break": normalizeStoredDuration(parsed["long-break"], DEFAULT_POMODORO_DURATIONS["long-break"]),
    }
  } catch {
    window.localStorage.removeItem(POMODORO_DURATIONS_STORAGE_KEY)
    return DEFAULT_POMODORO_DURATIONS
  }
}

export function writePomodoroDurations(durations: PomodoroDurations) {
  if (typeof window === "undefined") return

  window.localStorage.setItem(POMODORO_DURATIONS_STORAGE_KEY, JSON.stringify(durations))
  window.dispatchEvent(new CustomEvent(POMODORO_DURATIONS_EVENT, { detail: durations }))
}

export function triggerProductivityAlert(kind: ProductivityAlertKind, settings: ProductivityAlertSettings) {
  if (typeof window === "undefined") return

  if (settings.preference === "visual-vibration") {
    const pattern = kind === "pomodoro" ? [160, 70, 160, 70, 320] : [300, 100, 300]
    window.navigator.vibrate?.(pattern)
    return
  }

  if (settings.preference === "visual-sound") {
    playCompletionTone(kind)
  }
}

function playCompletionTone(kind: ProductivityAlertKind) {
  const AudioContextConstructor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextConstructor) return

  try {
    const audioContext = new AudioContextConstructor()
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()

    oscillator.type = "sine"
    oscillator.frequency.value = kind === "pomodoro" ? 880 : 660
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.36)

    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start()
    oscillator.stop(audioContext.currentTime + 0.38)

    oscillator.onended = () => {
      void audioContext.close()
    }
  } catch {
    // Audio can be blocked by the browser if the page has not received a user gesture.
  }
}
