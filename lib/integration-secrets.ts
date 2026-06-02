import { and, eq, sql } from "drizzle-orm"
import { userIntegrationSecrets } from "@/db/schema"
import { decryptSecret, encryptSecret } from "@/lib/crypto"
import { drizzleDb } from "@/lib/drizzle"

export async function getIntegrationSecret(userId: string, provider: string, key: string) {
  const rows = await drizzleDb
    .select({ encryptedValue: userIntegrationSecrets.encryptedValue })
    .from(userIntegrationSecrets)
    .where(
      and(
        eq(userIntegrationSecrets.userId, userId),
        eq(userIntegrationSecrets.provider, provider),
        eq(userIntegrationSecrets.key, key),
      ),
    )
    .limit(1)

  const encrypted = rows[0]?.encryptedValue
  return encrypted ? decryptSecret(encrypted) : null
}

export async function setIntegrationSecret(userId: string, provider: string, key: string, value: string) {
  const encryptedValue = encryptSecret(value)

  await drizzleDb
    .insert(userIntegrationSecrets)
    .values({
      userId,
      provider,
      key,
      encryptedValue,
      updatedAt: sql`NOW()`,
    })
    .onConflictDoUpdate({
      target: [
        userIntegrationSecrets.userId,
        userIntegrationSecrets.provider,
        userIntegrationSecrets.key,
      ],
      set: {
        encryptedValue,
        updatedAt: sql`NOW()`,
      },
    })
}

export async function deleteIntegrationSecret(userId: string, provider: string, key: string) {
  await drizzleDb
    .delete(userIntegrationSecrets)
    .where(
      and(
        eq(userIntegrationSecrets.userId, userId),
        eq(userIntegrationSecrets.provider, provider),
        eq(userIntegrationSecrets.key, key),
      ),
    )
}

export async function deleteIntegrationProvider(userId: string, provider: string) {
  await drizzleDb
    .delete(userIntegrationSecrets)
    .where(
      and(
        eq(userIntegrationSecrets.userId, userId),
        eq(userIntegrationSecrets.provider, provider),
      ),
    )
}

export async function getIntegrationStatus(userId: string, provider: string) {
  const rows = await drizzleDb
    .select({ key: userIntegrationSecrets.key })
    .from(userIntegrationSecrets)
    .where(
      and(
        eq(userIntegrationSecrets.userId, userId),
        eq(userIntegrationSecrets.provider, provider),
      ),
    )

  return new Set(rows.map((row) => row.key))
}
