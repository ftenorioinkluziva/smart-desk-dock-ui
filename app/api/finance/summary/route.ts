import { NextRequest, NextResponse } from "next/server"
import { fetchFinanceDockSummary, financeConfigured, getMockFinanceDockSummary } from "@/lib/finance"
import { deleteIntegrationProvider, getIntegrationSecret } from "@/lib/integration-secrets"
import { isAuthResponse, requireCurrentUser } from "@/lib/current-user"
import { operationErrorResponse, unexpectedUpstreamOperationError } from "@/lib/http/operation-response"

export async function GET(request: NextRequest) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user

  if (!financeConfigured) {
    return NextResponse.json(getMockFinanceDockSummary())
  }

  const token = await getIntegrationSecret(user.id, "finance", "access_token")

  if (!token) {
    return operationErrorResponse({
      code: "FINANCE_AUTH_REQUIRED",
      category: "authorization",
      message: "Autenticação financeira necessária",
      retryable: false,
    }, { status: 401, extra: { financeAuthRequired: true } })
  }

  try {
    const summary = await fetchFinanceDockSummary(token)
    return NextResponse.json(summary)
  } catch (error) {
    const operationError = unexpectedUpstreamOperationError(error, "Finance summary failed")
    console.error("Finance summary API error", { code: operationError.code, retryable: operationError.retryable })
    if (operationError.category === "authorization") {
      await deleteIntegrationProvider(user.id, "finance")
      return operationErrorResponse(operationError, { status: 401, extra: { financeAuthRequired: true } })
    }
    return operationErrorResponse(operationError)
  }
}
