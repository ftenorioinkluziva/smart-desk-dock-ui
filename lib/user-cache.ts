import { z } from "zod"

const CACHE_PREFIX = "focus-dock:user-cache:v1:"

const cacheEnvelopeSchema = z.object({
  userId: z.string().min(1),
  savedAt: z.string().datetime({ offset: true }),
  data: z.unknown(),
}).strict()

function getCacheKey(userId: string, namespace: string) {
  return `${CACHE_PREFIX}${encodeURIComponent(userId)}:${encodeURIComponent(namespace)}`
}

export function readUserCache<T>(userId: string | undefined, namespace: string, schema: z.ZodType<T>) {
  if (typeof window === "undefined" || !userId) return null

  try {
    const raw = window.localStorage.getItem(getCacheKey(userId, namespace))
    if (!raw) return null
    const envelope = cacheEnvelopeSchema.safeParse(JSON.parse(raw))
    if (!envelope.success || envelope.data.userId !== userId) return null
    const parsed = schema.safeParse(envelope.data.data)
    if (!parsed.success) return null
    return { data: parsed.data, savedAt: envelope.data.savedAt }
  } catch {
    return null
  }
}

export function writeUserCache(userId: string | undefined, namespace: string, data: unknown) {
  if (typeof window === "undefined" || !userId) return

  try {
    window.localStorage.setItem(getCacheKey(userId, namespace), JSON.stringify({
      userId,
      savedAt: new Date().toISOString(),
      data,
    }))
  } catch {
    // Cache is optional and must never block the live request.
  }
}

export function clearFocusDockLocalState(userId?: string) {
  if (typeof window === "undefined") return

  try {
    const keysToRemove: string[] = []
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (!key) continue
      if (key.startsWith(CACHE_PREFIX) && (!userId || key.startsWith(`${CACHE_PREFIX}${encodeURIComponent(userId)}:`))) {
        keysToRemove.push(key)
      }
      if (key.startsWith("focus-dock:") || key.startsWith("focus-dock-")) keysToRemove.push(key)
    }

    Array.from(new Set(keysToRemove)).forEach((key) => window.localStorage.removeItem(key))
  } catch {
    // Storage access can be blocked by the browser; logout still proceeds.
  }
}
