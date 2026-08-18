import { NextResponse } from "next/server"
import { financeLogin } from "@/lib/finance"
import { setIntegrationSecret } from "@/lib/integration-secrets"
import { isAuthResponse, requireCurrentUser } from "@/lib/current-user"
import { operationErrorResponse, parseJsonBody, unexpectedUpstreamOperationError } from "@/lib/http/operation-response"
import { financeLoginInputSchema } from "@/lib/operations/contracts"

export async function POST(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user

  try {
    const parsed = await parseJsonBody(request, financeLoginInputSchema)
    if (!parsed.ok) return operationErrorResponse(parsed.error)

    const result = await financeLogin(parsed.value.email, parsed.value.password)
    await setIntegrationSecret(user.id, "finance", "access_token", result.token)
    await setIntegrationSecret(user.id, "finance", "user_email", result.user.email)

    return NextResponse.json({ user: result.user })
  } catch (error) {
    console.error("Finance login error:", error)
    const operationError = unexpectedUpstreamOperationError(error, "Falha na autenticação")
    return operationErrorResponse(operationError, {
      status: operationError.category === "authorization" ? 401 : undefined,
    })
  }
}
