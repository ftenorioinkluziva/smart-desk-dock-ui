"use client"

import { z } from "zod"
import { readUserCache, writeUserCache } from "@/lib/user-cache"
import {
  productivitySessionSchema,
  type ProductivitySession,
  type ProductivitySessionTarget,
} from "@/lib/productivity-session-contract"

export function readProductivitySessionCache(userId: string | undefined, target: ProductivitySessionTarget) {
  return readUserCache(userId, `productivity-session-${target}`, productivitySessionSchema)
}

export function writeProductivitySessionCache(userId: string | undefined, value: ProductivitySession) {
  writeUserCache(userId, `productivity-session-${value.target}`, value)
}

export async function fetchProductivitySession(target: ProductivitySessionTarget) {
  const response = await fetch(`/api/productivity/session?target=${encodeURIComponent(target)}`)
  if (!response.ok) return null
  const parsed = z.object({ session: productivitySessionSchema.nullable() }).safeParse(await response.json())
  return parsed.success ? parsed.data.session : null
}

export async function saveProductivitySessionRemote(value: ProductivitySession) {
  await fetch("/api/productivity/session", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  }).catch(() => {})
}
