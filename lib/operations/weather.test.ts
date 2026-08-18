import { describe, expect, it } from "vitest"
import { getWeatherForecast } from "@/lib/operations/weather"

const profile = {
  weatherLat: -15.8,
  weatherLon: -47.8,
  weatherTimezone: "America/Sao_Paulo",
  weatherLocation: "Brasília",
  googleCalendarIds: ["primary"],
  googleCalendarTimezone: "America/Sao_Paulo",
  homeAssistantEntityIds: [],
  nightModeEnabled: true,
  nightModeStart: "22:00",
  nightModeEnd: "06:00",
  productivityAlertPreference: "visual-vibration" as const,
  productivityNotificationEnabled: false,
  pomodoroFocusSeconds: 1500,
  pomodoroShortBreakSeconds: 300,
  pomodoroLongBreakSeconds: 900,
  themePreset: "cockpit" as const,
  accentPreset: "green" as const,
}

const validWeatherResponse = {
  current: { temperature_2m: 24.6, weather_code: 2 },
  daily: {
    time: ["2026-08-14"],
    weather_code: [2],
    temperature_2m_max: [28.2],
    temperature_2m_min: [18.4],
  },
}

describe("weather operation", () => {
  it("validates and normalizes provider output", async () => {
    const fetcher = async () => new Response(JSON.stringify(validWeatherResponse), { status: 200 })
    const result = await getWeatherForecast(profile, false, fetcher as typeof fetch)
    expect(result).toMatchObject({ temp: 25, high: 28, low: 18, condition: "clouds" })
  })

  it("rejects an unexpected provider response", async () => {
    const fetcher = async () => new Response(JSON.stringify({ current: {} }), { status: 200 })
    await expect(getWeatherForecast(profile, false, fetcher as typeof fetch)).rejects.toMatchObject({
      operationError: { code: "WEATHER_RESPONSE_INVALID", retryable: false },
    })
  })
})
