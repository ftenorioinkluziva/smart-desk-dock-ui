import { describe, expect, it } from "vitest"
import { parseAllowedHomeAssistantHosts, validateHomeAssistantUrl } from "@/lib/operations/home-assistant-policy"

describe("Home Assistant URL policy", () => {
  it("normalizes an allowed URL", () => {
    const result = validateHomeAssistantUrl(
      "http://homeassistant.local:8123/",
      parseAllowedHomeAssistantHosts("homeassistant.local"),
    )
    expect(result).toEqual({ ok: true, value: "http://homeassistant.local:8123" })
  })

  it("rejects credentials, metadata endpoints, and hosts outside the allowlist", () => {
    expect(validateHomeAssistantUrl("http://user:pass@homeassistant.local", new Set()).ok).toBe(false)
    expect(validateHomeAssistantUrl("http://169.254.169.254", new Set()).ok).toBe(false)
    expect(validateHomeAssistantUrl("http://other.local:8123", new Set(["homeassistant.local"])).ok).toBe(false)
  })
})
