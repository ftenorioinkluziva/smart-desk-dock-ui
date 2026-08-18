import { describe, expect, it } from "vitest"
import {
  financeLoginInputSchema,
  homeAssistantServiceInputSchema,
  spotifyControlInputSchema,
  userProfilePatchSchema,
} from "@/lib/operations/contracts"

describe("operation input contracts", () => {
  it("accepts a bounded profile patch and rejects unknown fields", () => {
    expect(userProfilePatchSchema.safeParse({ weatherLat: -15.8 }).success).toBe(true)
    expect(userProfilePatchSchema.safeParse({ themePreset: "blue-hour", accentPreset: "cyan" }).success).toBe(true)
    expect(userProfilePatchSchema.safeParse({ themePreset: "neon-city" }).success).toBe(false)
    expect(userProfilePatchSchema.safeParse({ weatherLat: 200 }).success).toBe(false)
    expect(userProfilePatchSchema.safeParse({ admin: true }).success).toBe(false)
  })

  it("requires action-specific Spotify fields", () => {
    expect(spotifyControlInputSchema.safeParse({ action: "volume", volumePercent: 40 }).success).toBe(true)
    expect(spotifyControlInputSchema.safeParse({ action: "volume" }).success).toBe(false)
    expect(spotifyControlInputSchema.safeParse({ action: "play-context", contextUri: "https://example.com" }).success).toBe(false)
  })

  it("validates Home Assistant commands and finance credentials", () => {
    expect(homeAssistantServiceInputSchema.safeParse({ entityId: "light.desk", action: "turn_on", brightness: 50 }).success).toBe(true)
    expect(homeAssistantServiceInputSchema.safeParse({ entityId: "invalid", action: "turn_on" }).success).toBe(false)
    expect(financeLoginInputSchema.safeParse({ email: "invalid", password: "secret" }).success).toBe(false)
  })
})
