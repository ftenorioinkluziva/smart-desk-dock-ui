import { z } from "zod"

export const POMODORO_SESSION_STORAGE_KEY = "focus-dock-pomodoro-session-v1"

export const persistedPomodoroSessionSchema = z.object({
  version: z.literal(1),
  mode: z.enum(["focus", "short-break", "long-break"]),
  totalSeconds: z.number().int().min(0).max(24 * 60 * 60),
  isRunning: z.boolean(),
  isAlertVisible: z.boolean(),
  sessions: z.number().int().min(0).max(100000),
  endAt: z.number().int().positive().nullable(),
}).strict()

export type PersistedPomodoroSession = z.infer<typeof persistedPomodoroSessionSchema>

export function readPomodoroSession(): PersistedPomodoroSession | null {
  if (typeof window === "undefined") return null

  try {
    const rawValue = window.localStorage.getItem(POMODORO_SESSION_STORAGE_KEY)
    if (!rawValue) return null

    const parsed = persistedPomodoroSessionSchema.safeParse(JSON.parse(rawValue))
    if (!parsed.success) {
      window.localStorage.removeItem(POMODORO_SESSION_STORAGE_KEY)
      return null
    }

    return parsed.data
  } catch {
    window.localStorage.removeItem(POMODORO_SESSION_STORAGE_KEY)
    return null
  }
}

export function writePomodoroSession(session: PersistedPomodoroSession) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(POMODORO_SESSION_STORAGE_KEY, JSON.stringify(session))
}

export function getRemainingPomodoroSeconds(endAt: number, now = Date.now()) {
  return Math.max(0, Math.ceil((endAt - now) / 1000))
}
