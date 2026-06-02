import { Pool } from "pg"

const globalForDb = globalThis as unknown as {
  focusDockPool?: Pool
}

export const db = globalForDb.focusDockPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
})

if (process.env.NODE_ENV !== "production") {
  globalForDb.focusDockPool = db
}

