import { NextResponse } from "next/server"
import { fetchFinanceDockSummary, financeConfigured, getMockFinanceDockSummary } from "@/lib/finance"

export async function GET() {
  if (!financeConfigured) {
    return NextResponse.json(getMockFinanceDockSummary())
  }

  try {
    const summary = await fetchFinanceDockSummary()
    return NextResponse.json(summary)
  } catch (error) {
    console.error("Finance summary API error:", error)
    return NextResponse.json({ ...getMockFinanceDockSummary(), error: "Finance API fetch failed" }, { status: 502 })
  }
}
