import { createHash } from "node:crypto"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const migrationsDir = path.join(process.cwd(), "drizzle")

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
      "id" serial PRIMARY KEY NOT NULL,
      "hash" text NOT NULL,
      "created_at" bigint
    )
  `)

  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort()
  for (const file of files) {
    const contents = await readFile(path.join(migrationsDir, file))
    const hash = createHash("sha256").update(contents).digest("hex")
    const applied = await pool.query(`SELECT 1 FROM "__drizzle_migrations" WHERE "hash" = $1 LIMIT 1`, [hash])
    if (applied.rowCount) continue

    const client = await pool.connect()
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
    } finally {
      client.release()
    }
  }
} finally {
  await pool.end()
}
