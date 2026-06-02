import { drizzle } from "drizzle-orm/node-postgres"
import * as schema from "@/db/schema"
import { db } from "@/lib/db"

export const drizzleDb = drizzle(db, { schema })
