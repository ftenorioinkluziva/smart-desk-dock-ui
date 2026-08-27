import { afterEach, describe, expect, it, vi } from "vitest"
import { callHomeAssistantService, fetchHomeAssistantEntities } from "@/lib/home-assistant"

const config = {
  url: "http://homeassistant.local:8123",
  token: "test-token",
  entityIds: [],
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("Home Assistant communication resilience", () => {
  it("retries a transient read once and normalizes the successful response", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("temporarily unavailable", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([
        {
          entity_id: "light.desk",
          state: "on",
          attributes: {
            friendly_name: "Desk light",
            brightness: 128,
            supported_color_modes: ["hs"],
          },
        },
      ]), { status: 200, headers: { "Content-Type": "application/json" } }))
    vi.stubGlobal("fetch", fetchMock)

    const entities = await fetchHomeAssistantEntities(config)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(entities).toEqual([expect.objectContaining({
      entityId: "light.desk",
      name: "Desk light",
      brightness: 50,
      supportsColor: true,
    })])
  })

  it("never retries a service command after a transient failure", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("temporarily unavailable", { status: 503 }))
    vi.stubGlobal("fetch", fetchMock)

    await expect(callHomeAssistantService(config, {
      entityId: "light.desk",
      action: "turn_on",
    })).rejects.toMatchObject({
      operationError: { code: "HOME_ASSISTANT_REQUEST_FAILED", retryable: true },
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("accepts nullable optional Home Assistant attributes", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify([
      {
        entity_id: "light.desk",
        state: "off",
        attributes: {
          friendly_name: "Desk light",
          brightness: null,
          color_temp_kelvin: null,
          hs_color: null,
          rgb_color: null,
          supported_color_modes: ["brightness"],
          supported_features: null,
        },
      },
    ]), { status: 200, headers: { "Content-Type": "application/json" } })))

    await expect(fetchHomeAssistantEntities(config)).resolves.toEqual([expect.objectContaining({
      entityId: "light.desk",
      brightness: null,
      supportsColor: false,
    })])
  })

  it("can load the complete controllable catalog without changing favorite filtering", async () => {
    const states = [
      {
        entity_id: "light.desk",
        state: "on",
        attributes: { friendly_name: "Desk light" },
      },
      {
        entity_id: "switch.office",
        state: "off",
        attributes: { friendly_name: "Office switch" },
      },
      {
        entity_id: "sensor.temperature",
        state: "23",
        attributes: { friendly_name: "Temperature" },
      },
    ]
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => new Response(JSON.stringify(states), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })))

    const favoriteEntities = await fetchHomeAssistantEntities({ ...config, entityIds: ["light.desk"] })
    const catalog = await fetchHomeAssistantEntities({ ...config, entityIds: ["light.desk"] }, { includeAll: true })

    expect(favoriteEntities.map((entity) => entity.entityId)).toEqual(["light.desk"])
    expect(catalog.map((entity) => entity.entityId)).toEqual(["light.desk", "switch.office"])
  })
})
