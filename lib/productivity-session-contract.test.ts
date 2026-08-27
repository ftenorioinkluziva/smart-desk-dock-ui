import { describe, expect, it } from "vitest"
import { productivitySessionSchema } from "@/lib/productivity-session-contract"

describe("productivity session contract", () => {
  it("accepts an absolute end time for a running timer", () => {
    const result = productivitySessionSchema.safeParse({
      target: "timer",
      mode: null,
      totalSeconds: 300,
      isRunning: true,
      isAlertVisible: false,
      sessions: 0,
      endAt: "2026-08-25T15:00:00.000Z",
    })

    expect(result.success).toBe(true)
  })

  it("rejects an unbounded or invalid session target", () => {
    const result = productivitySessionSchema.safeParse({
      target: "stopwatch",
      mode: null,
      totalSeconds: -1,
      isRunning: false,
      isAlertVisible: false,
      sessions: 0,
      endAt: null,
    })

    expect(result.success).toBe(false)
  })
})
