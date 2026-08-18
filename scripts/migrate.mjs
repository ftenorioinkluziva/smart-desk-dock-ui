import { createHash } from "node:crypto"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const migrationsDir = path.join(process.cwd(), "drizzle")
const MAX_CONNECTION_ATTEMPTS = 12
const MIGRATION_LOCK_ID = 734_621_991

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function connectWithRetry() {
  for (let attempt = 1; attempt <= MAX_CONNECTION_ATTEMPTS; attempt += 1) {
    try {
      return await pool.connect()
    } catch (error) {
      if (attempt === MAX_CONNECTION_ATTEMPTS) throw error
      const waitMs = Math.min(500 * 2 ** (attempt - 1), 5_000)
      console.warn(`Database unavailable for migrations; retrying in ${waitMs}ms (${attempt}/${MAX_CONNECTION_ATTEMPTS})`)
      await delay(waitMs)
    }
  }
  throw new Error("Unable to connect to the database")
}

const client = await connectWithRetry()
try {
  await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_ID])
  await client.query(`
    CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
      "id" serial PRIMARY KEY NOT NULL,
      "hash" text NOT NULL,
      "created_at" bigint
    )
  `)
  await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "__drizzle_migrations_hash_unique" ON "__drizzle_migrations" ("hash")`)

  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort()
  for (const file of files) {
    const contents = await readFile(path.join(migrationsDir, file))
    const hash = createHash("sha256").update(contents).digest("hex")
    const applied = await client.query(`SELECT 1 FROM "__drizzle_migrations" WHERE "hash" = $1 LIMIT 1`, [hash])
    if (applied.rowCount) continue

    try {
      await client.query("BEGIN")
      for (const statement of contents.toString().split("--> statement-breakpoint")) {
        if (statement.trim()) await client.query(statement)
      }
      await client.query(`INSERT INTO "__drizzle_migrations" ("hash", "created_at") VALUES ($1, $2)`, [hash, Date.now()])
      await client.query("COMMIT")
      console.log(`Applied migration ${file}`)
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    }
  }
} finally {
  await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_ID]).catch(() => undefined)
  client.release()
  await pool.end()
}
