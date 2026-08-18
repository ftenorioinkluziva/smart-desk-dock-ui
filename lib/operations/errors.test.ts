import { describe, expect, it } from "vitest"
import { failure, operationErrorSchema, upstreamError, validationError } from "@/lib/operations/errors"

describe("OperationError", () => {
  it("keeps stable validation metadata", () => {
    const error = validationError("Invalid input", ["email"])
    expect(operationErrorSchema.parse(error)).toEqual({
      code: "INVALID_INPUT",
      category: "validation",
      message: "Invalid input",
      retryable: false,
      invalidFields: ["email"],
    })
    expect(failure(error)).toEqual({ ok: false, error })
  })

  it("marks transient upstream failures as retryable explicitly", () => {
    expect(upstreamError("RATE_LIMITED", "Try later")).toMatchObject({ category: "upstream", retryable: true })
    expect(upstreamError("BAD_RESPONSE", "Invalid", { retryable: false })).toMatchObject({ retryable: false })
  })
})
