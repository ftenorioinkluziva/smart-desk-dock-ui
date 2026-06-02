import { NextRequest, NextResponse } from "next/server"
import { fetchFinanceDockSummary, financeConfigured, getMockFinanceDockSummary } from "@/lib/finance"
import { deleteIntegrationProvider, getIntegrationSecret } from "@/lib/integration-secrets"
import { isAuthResponse, requireCurrentUser } from "@/lib/current-user"

export async function GET(request: NextRequest) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user

  if (!financeConfigured) {
    return NextResponse.json(getMockFinanceDockSummary())
  }

  const token = await getIntegrationSecret(user.id, "finance", "access_token")

  if (!token) {
    return NextResponse.json({ financeAuthRequired: true, error: "Autenticação financeira necessária" }, { status: 401 })
  }

  try {
    const summary = await fetchFinanceDockSummary(token)
    return NextResponse.json(summary)
  } catch (error) {
    console.error("Finance summary API error:", error)
    await deleteIntegrationProvider(user.id, "finance")
    return NextResponse.json({ financeAuthRequired: true, error: "Finance API fetch failed" }, { status: 401 })
  }
}
