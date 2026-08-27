import { and, eq } from "drizzle-orm"
import { productivitySessions } from "@/db/schema"
import { drizzleDb } from "@/lib/drizzle"
import {
  productivitySessionSchema,
  type ProductivitySession,
  type ProductivitySessionTarget,
} from "@/lib/productivity-session-contract"

function mapRow(row: typeof productivitySessions.$inferSelect): ProductivitySession {
  return productivitySessionSchema.parse({
    target: row.target,
    mode: row.mode,
    totalSeconds: row.totalSeconds,
    isRunning: row.isRunning,
    isAlertVisible: row.isAlertVisible,
    sessions: row.sessions,
    endAt: row.endAt?.toISOString() ?? null,
  })
}

export async function getProductivitySession(userId: string, target: ProductivitySessionTarget) {
  const rows = await drizzleDb
    .select()
    .from(productivitySessions)
    .where(and(eq(productivitySessions.userId, userId), eq(productivitySessions.target, target)))
    .limit(1)

  return rows[0] ? mapRow(rows[0]) : null
}

export async function saveProductivitySession(userId: string, value: ProductivitySession) {
  const parsed = productivitySessionSchema.parse(value)
  await drizzleDb
    .insert(productivitySessions)
    .values({
      userId,
      target: parsed.target,
      mode: parsed.mode,
      totalSeconds: parsed.totalSeconds,
      isRunning: parsed.isRunning,
      isAlertVisible: parsed.isAlertVisible,
      sessions: parsed.sessions,
      endAt: parsed.endAt ? new Date(parsed.endAt) : null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [productivitySessions.userId, productivitySessions.target],
      set: {
        mode: parsed.mode,
        totalSeconds: parsed.totalSeconds,
        isRunning: parsed.isRunning,
        isAlertVisible: parsed.isAlertVisible,
        sessions: parsed.sessions,
        endAt: parsed.endAt ? new Date(parsed.endAt) : null,
        updatedAt: new Date(),
      },
    })

  return parsed
}

export async function deleteProductivitySession(userId: string, target: ProductivitySessionTarget) {
  await drizzleDb
    .delete(productivitySessions)
    .where(and(eq(productivitySessions.userId, userId), eq(productivitySessions.target, target)))
}
