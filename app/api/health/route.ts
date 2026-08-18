import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { operationErrorResponse } from "@/lib/http/operation-response"
import { upstreamError } from "@/lib/operations/errors"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    await db.query("SELECT 1")
    return NextResponse.json({ status: "ok", database: "ok" })
  } catch {
    return operationErrorResponse(
      upstreamError("DATABASE_UNAVAILABLE", "Database is unavailable"),
      { status: 503, extra: { status: "degraded", database: "unavailable" } },
    )
  }
}
