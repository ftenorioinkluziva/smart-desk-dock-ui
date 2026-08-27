export const PRODUCTIVITY_ALERT_SETTINGS_STORAGE_KEY = "focus-dock-productivity-alert-settings-v1"
export const PRODUCTIVITY_ALERT_SETTINGS_EVENT = "focus-dock-productivity-alert-settings"
export const PRODUCTIVITY_AUDIO_STATUS_EVENT = "focus-dock-productivity-audio-status"
export const LEGACY_POMODORO_DURATIONS_STORAGE_KEY = "focus-dock-pomodoro-durations"
export const POMODORO_DURATIONS_STORAGE_KEY = "focus-dock-pomodoro-durations-v1"
export const POMODORO_DURATIONS_EVENT = "focus-dock-pomodoro-durations"

export type ProductivityAlertPreference = "visual" | "visual-vibration" | "visual-sound"
export type ProductivityAlertKind = "pomodoro" | "timer"
export type ProductivityAudioStatus = "unsupported" | "needs-activation" | "ready"
export type PomodoroMode = "focus" | "short-break" | "long-break"

export type ProductivityAlertSettings = {
  preference: ProductivityAlertPreference
  notificationEnabled: boolean
}

export type PomodoroDurations = Record<PomodoroMode, number>

export const DEFAULT_PRODUCTIVITY_ALERT_SETTINGS: ProductivityAlertSettings = {
  preference: "visual-vibration",
  notificationEnabled: false,
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

let sharedAudioContext: AudioContext | null = null

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
      notificationEnabled: typeof parsed.notificationEnabled === "boolean"
        ? parsed.notificationEnabled
        : DEFAULT_PRODUCTIVITY_ALERT_SETTINGS.notificationEnabled,
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
      ?? window.localStorage.getItem(LEGACY_POMODORO_DURATIONS_STORAGE_KEY)
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

function getAudioContextConstructor() {
  if (typeof window === "undefined") return null

  return window.AudioContext
    ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    ?? null
}

function getSharedAudioContext() {
  const AudioContextConstructor = getAudioContextConstructor()
  if (!AudioContextConstructor) return null

  if (sharedAudioContext?.state === "closed") {
    sharedAudioContext = null
  }

  if (!sharedAudioContext) {
    sharedAudioContext = new AudioContextConstructor()
  }

  return sharedAudioContext
}

function publishProductivityAudioStatus(status: ProductivityAudioStatus) {
  if (typeof window === "undefined" || typeof window.CustomEvent !== "function") return
  window.dispatchEvent(new window.CustomEvent(PRODUCTIVITY_AUDIO_STATUS_EVENT, { detail: status }))
}

export function getProductivityAudioStatus(): ProductivityAudioStatus {
  if (!getAudioContextConstructor()) return "unsupported"
  return sharedAudioContext?.state === "running" ? "ready" : "needs-activation"
}

/**
 * Unlocks the shared Web Audio context from a direct user interaction.
 * Safari/iOS requires this before a later timer completion can emit sound.
 */
export async function primeProductivityAudio(): Promise<ProductivityAudioStatus> {
  if (typeof window === "undefined") return "unsupported"

  const audioContext = getSharedAudioContext()
  if (!audioContext) {
    publishProductivityAudioStatus("unsupported")
    return "unsupported"
  }

  try {
    if (audioContext.state !== "running") {
      await audioContext.resume()
    }

    if (audioContext.state !== "running") {
      publishProductivityAudioStatus("needs-activation")
      return "needs-activation"
    }

    // A near-silent oscillator makes the activation explicit without creating
    // an audible surprise when the user only opens the setting.
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime)
    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start()
    oscillator.stop(audioContext.currentTime + 0.01)

    publishProductivityAudioStatus("ready")
    return "ready"
  } catch {
    publishProductivityAudioStatus("needs-activation")
    return "needs-activation"
  }
}

export async function testProductivityAudio(): Promise<ProductivityAudioStatus> {
  const status = await primeProductivityAudio()
  if (status !== "ready") return status

  return playCompletionTone("timer")
}

export function triggerProductivityAlert(kind: ProductivityAlertKind, settings: ProductivityAlertSettings) {
  if (typeof window === "undefined") return

  showProductivityNotification(kind, settings)

  if (settings.preference === "visual-vibration") {
    const pattern = kind === "pomodoro" ? [160, 70, 160, 70, 320] : [300, 100, 300]
    window.navigator.vibrate?.(pattern)
    return
  }

  if (settings.preference === "visual-sound") {
    playCompletionTone(kind)
  }
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported"
  return window.Notification.permission
}

export function isStandaloneProductivityApp() {
  if (typeof window === "undefined") return false

  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean }
  return navigatorWithStandalone.standalone === true
    || window.matchMedia?.("(display-mode: standalone)").matches === true
}

export async function requestProductivityNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported"
  return window.Notification.requestPermission()
}

function showProductivityNotification(kind: ProductivityAlertKind, settings: ProductivityAlertSettings) {
  if (!settings.notificationEnabled || getNotificationPermission() !== "granted") return

  try {
    const title = kind === "pomodoro" ? "Pomodoro concluído" : "Timer concluído"
    const body = kind === "pomodoro" ? "Hora de trocar a fase." : "O tempo terminou."
    const notification = new window.Notification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      silent: settings.preference !== "visual-sound",
      tag: `focus-dock-${kind}-complete`,
    })

    window.setTimeout(() => notification.close(), 7000)
  } catch {
    // Browser notification support varies, especially outside installed PWAs on Apple platforms.
  }
}

function playCompletionTone(kind: ProductivityAlertKind) {
  const audioContext = getSharedAudioContext()
  if (!audioContext) {
    publishProductivityAudioStatus("unsupported")
    return "unsupported" as const
  }

  if (audioContext.state !== "running") {
    publishProductivityAudioStatus("needs-activation")
    return "needs-activation" as const
  }

  try {
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

    publishProductivityAudioStatus("ready")
    return "ready" as const
  } catch {
    publishProductivityAudioStatus("needs-activation")
    return "needs-activation" as const
  }
}
