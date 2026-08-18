import { NextResponse } from "next/server"
import { financeMe } from "@/lib/finance"
import { deleteIntegrationProvider, getIntegrationSecret } from "@/lib/integration-secrets"
import { isAuthResponse, requireCurrentUser } from "@/lib/current-user"
import { operationErrorResponse, unexpectedUpstreamOperationError } from "@/lib/http/operation-response"

export async function GET(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user

  const token = await getIntegrationSecret(user.id, "finance", "access_token")
  if (!token) {
    return NextResponse.json({ financeAuthRequired: true }, { status: 401 })
  }

  try {
    const financeUser = await financeMe(token)
    return NextResponse.json({ user: financeUser })
  } catch (error) {
    const operationError = unexpectedUpstreamOperationError(error, "Finance authentication check failed")
    console.error("Finance me error", { code: operationError.code, retryable: operationError.retryable })
    if (operationError.category === "authorization") {
      await deleteIntegrationProvider(user.id, "finance")
      return operationErrorResponse(operationError, { status: 401, extra: { financeAuthRequired: true } })
    }
    return operationErrorResponse(operationError)
  }
}

export async function DELETE(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user

  await deleteIntegrationProvider(user.id, "finance")
  return NextResponse.json({ financeAuthRequired: true })
}
