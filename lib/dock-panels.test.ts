import { describe, expect, it } from "vitest"
import { DEFAULT_DOCK_PANEL_CONFIG, getVisibleDockPanelIds, normalizeDockPanelConfig } from "@/lib/dock-panels"

describe("dock panel configuration", () => {
  it("completes a partial order without duplicates and preserves the requested prefix", () => {
    const config = normalizeDockPanelConfig({
      panelOrder: ["finance", "finance", "today"],
      hiddenPanelIds: ["weather"],
      initialPanelId: "finance",
      autoRotate: true,
    })

    expect(config.panelOrder.slice(0, 2)).toEqual(["finance", "today"])
    expect(config.panelOrder).toHaveLength(9)
    expect(getVisibleDockPanelIds(config)).not.toContain("weather")
    expect(config.initialPanelId).toBe("finance")
    expect(config.autoRotate).toBe(true)
  })

  it("keeps Today available when every panel is hidden", () => {
    const config = normalizeDockPanelConfig({
      ...DEFAULT_DOCK_PANEL_CONFIG,
      hiddenPanelIds: [...DEFAULT_DOCK_PANEL_CONFIG.panelOrder],
      initialPanelId: "finance",
    })

    expect(getVisibleDockPanelIds(config)).toEqual(["today"])
    expect(config.initialPanelId).toBe("today")
  })
})
