import { NextResponse } from "next/server"
import type { ZodType } from "zod"
import { OperationFailure, type OperationError, type Result, upstreamError, validationError } from "@/lib/operations/errors"

const STATUS_BY_CATEGORY: Record<OperationError["category"], number> = {
  validation: 400,
  authorization: 403,
  conflict: 409,
  rate_limit: 429,
  upstream: 502,
  internal: 500,
}

export function operationErrorResponse(error: OperationError, init?: { status?: number; extra?: Record<string, unknown> }) {
  return NextResponse.json({
    ...init?.extra,
    error: error.message,
    operationError: error,
  }, { status: init?.status ?? STATUS_BY_CATEGORY[error.category] })
}

export async function parseJsonBody<T>(request: Request, schema: ZodType<T>): Promise<Result<T>> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return { ok: false, error: validationError("Request body must be valid JSON", ["body"]) }
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    const fields = Array.from(new Set(parsed.error.issues.map((issue) => issue.path.join(".") || "body")))
    return { ok: false, error: validationError("Request body is invalid", fields) }
  }

  return { ok: true, value: parsed.data }
}

export function unexpectedUpstreamOperationError(error: unknown, message: string): OperationError {
  if (error instanceof OperationFailure) return error.operationError
  return upstreamError("UPSTREAM_CONNECTION_FAILED", message, { retryable: true })
}
