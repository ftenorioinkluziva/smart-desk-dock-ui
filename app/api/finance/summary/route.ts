import { NextRequest, NextResponse } from "next/server"
import { fetchFinanceDockSummary, financeConfigured, getMockFinanceDockSummary } from "@/lib/finance"

export async function GET(request: NextRequest) {
  if (!financeConfigured) {
    return NextResponse.json(getMockFinanceDockSummary())
  }

  const authHeader = request.headers.get("authorization")
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined

  if (!token) {
    return NextResponse.json({ error: "Autenticação necessária" }, { status: 401 })
  }

  try {
    const summary = await fetchFinanceDockSummary(token)
    return NextResponse.json(summary)
  } catch (error) {
    console.error("Finance summary API error:", error)
    return NextResponse.json({ ...getMockFinanceDockSummary(), error: "Finance API fetch failed" }, { status: 502 })
  }
}
