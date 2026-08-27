import { describe, expect, it } from "vitest"
import { getRemainingPomodoroSeconds, persistedPomodoroSessionSchema } from "@/lib/pomodoro-session"

describe("pomodoro session persistence", () => {
  it("reconstructs remaining seconds from an absolute end time", () => {
    expect(getRemainingPomodoroSeconds(10_000, 8_501)).toBe(2)
    expect(getRemainingPomodoroSeconds(10_000, 10_001)).toBe(0)
  })

  it("rejects malformed persisted session data", () => {
    expect(persistedPomodoroSessionSchema.safeParse({ version: 1, mode: "focus" }).success).toBe(false)
  })
})
