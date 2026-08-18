import { z } from "zod"

export const operationErrorSchema = z.object({
  code: z.string().min(1),
  category: z.enum(["validation", "authorization", "conflict", "rate_limit", "upstream", "internal"]),
  message: z.string().min(1),
  hint: z.string().min(1).optional(),
  retryable: z.boolean(),
  invalidFields: z.array(z.string().min(1)).optional(),
}).strict()

export type OperationError = z.infer<typeof operationErrorSchema>

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: OperationError }

export class OperationFailure extends Error {
  readonly operationError: OperationError

  constructor(operationError: OperationError) {
    super(operationError.message)
    this.name = "OperationFailure"
    this.operationError = operationErrorSchema.parse(operationError)
  }
}

export function success<T>(value: T): Result<T> {
  return { ok: true, value }
}

export function failure<T = never>(error: OperationError): Result<T> {
  return { ok: false, error: operationErrorSchema.parse(error) }
}

export function validationError(message: string, invalidFields?: string[]): OperationError {
  return {
    code: "INVALID_INPUT",
    category: "validation",
    message,
    retryable: false,
    ...(invalidFields?.length ? { invalidFields } : {}),
  }
}

export function upstreamError(
  code: string,
  message: string,
  options?: { retryable?: boolean; hint?: string },
): OperationError {
  return {
    code,
    category: "upstream",
    message,
    retryable: options?.retryable ?? true,
    ...(options?.hint ? { hint: options.hint } : {}),
  }
}

export function internalError(message = "Unexpected operation failure"): OperationError {
  return {
    code: "INTERNAL_ERROR",
    category: "internal",
    message,
    retryable: false,
  }
}
