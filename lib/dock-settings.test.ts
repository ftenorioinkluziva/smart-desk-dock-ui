import { describe, expect, it } from "vitest"
import { DEFAULT_NIGHT_MODE_SETTINGS, isLowPowerDockActive, isNightDockActive } from "@/lib/dock-settings"

describe("dock night mode power policy", () => {
  it("enables low power automatically inside the configured night window", () => {
    const settings = { ...DEFAULT_NIGHT_MODE_SETTINGS, start: "22:00", end: "06:00" }
    const now = new Date(2026, 7, 25, 23, 30)

    expect(isNightDockActive(now, settings)).toBe(true)
    expect(isLowPowerDockActive(now, settings)).toBe(true)
  })

  it("allows the user to keep night mode without low power", () => {
    const settings = { ...DEFAULT_NIGHT_MODE_SETTINGS, lowPowerWithNightMode: false }
    const now = new Date(2026, 7, 25, 23, 30)

    expect(isNightDockActive(now, settings)).toBe(true)
    expect(isLowPowerDockActive(now, settings)).toBe(false)
  })
})
