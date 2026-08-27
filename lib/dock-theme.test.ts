import { describe, expect, it } from "vitest"
import { DEFAULT_DOCK_APPEARANCE, normalizeDockAppearance } from "@/lib/dock-theme"

describe("dock appearance", () => {
  it("accepts known theme, accent, and layout presets", () => {
    expect(normalizeDockAppearance({ themePreset: "blue-hour", accentPreset: "cyan" })).toEqual({
      themePreset: "blue-hour",
      accentPreset: "cyan",
      layoutPreset: "balanced",
    })
    expect(normalizeDockAppearance({ layoutPreset: "focus" }).layoutPreset).toBe("focus")
  })

  it("falls back field by field for unknown presets", () => {
    expect(normalizeDockAppearance({ themePreset: "unknown", accentPreset: "amber" })).toEqual({
      themePreset: DEFAULT_DOCK_APPEARANCE.themePreset,
      accentPreset: "amber",
      layoutPreset: DEFAULT_DOCK_APPEARANCE.layoutPreset,
    })
  })
})
