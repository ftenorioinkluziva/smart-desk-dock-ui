import { NextResponse } from "next/server"
import { fetchGoogleTasks, updateGoogleTaskStatus } from "@/lib/google-tasks"
import { getGoogleAccessToken } from "@/lib/google-oauth"
import { isAuthResponse, requireCurrentUser } from "@/lib/current-user"
import { operationErrorResponse, parseJsonBody, unexpectedUpstreamOperationError } from "@/lib/http/operation-response"
import { googleTasksPatchSchema } from "@/lib/operations/contracts"

export async function GET(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user

  const accessToken = await getGoogleAccessToken(request, user.id)
  if (!accessToken) {
    return operationErrorResponse({
      code: "GOOGLE_TASKS_AUTH_REQUIRED",
      category: "authorization",
      message: "A autorização do Google Tasks é necessária",
      hint: "Autorize o acesso ao Google Tasks e tente novamente",
      retryable: false,
    }, { status: 403, extra: { taskLists: [], tasks: [], tasksAuthRequired: true } })
  }

  try {
    const data = await fetchGoogleTasks(accessToken)
    return NextResponse.json(data)
  } catch (error) {
    const operationError = unexpectedUpstreamOperationError(error, "Google Tasks fetch failed")
    console.error("Google Tasks API error", { code: operationError.code, retryable: operationError.retryable })
    return operationErrorResponse(operationError, {
      extra: {
        taskLists: [],
        tasks: [],
        tasksAuthRequired: operationError.code === "GOOGLE_TASKS_AUTH_REQUIRED",
      },
    })
  }
}

export async function PATCH(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user

  const accessToken = await getGoogleAccessToken(request, user.id)
  if (!accessToken) {
    return operationErrorResponse({
      code: "GOOGLE_TASKS_AUTH_REQUIRED",
      category: "authorization",
      message: "A autorização do Google Tasks é necessária",
      retryable: false,
    }, { status: 403 })
  }

  const parsed = await parseJsonBody(request, googleTasksPatchSchema)
  if (!parsed.ok) return operationErrorResponse(parsed.error)

  try {
    await updateGoogleTaskStatus({ accessToken, ...parsed.value })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const operationError = unexpectedUpstreamOperationError(error, "Google Tasks update failed")
    console.error("Google Tasks update API error", { code: operationError.code, retryable: operationError.retryable })
    return operationErrorResponse(operationError)
  }
}
