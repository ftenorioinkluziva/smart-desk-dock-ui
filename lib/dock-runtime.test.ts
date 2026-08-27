import { describe, expect, it } from "vitest"
import { DockDataSourceCoordinator } from "@/components/dock-runtime-provider"
import { DOCK_DATA_SOURCE_DEFINITIONS } from "@/lib/dock-runtime"

describe("dock data runtime", () => {
  it("pauses active-only sources when their panel is not visible", async () => {
    const coordinator = new DockDataSourceCoordinator()
    let calls = 0

    coordinator.setRuntime("today", false)
    const unsubscribe = coordinator.subscribe("tasks", {
      panelId: "today",
      activeOnly: true,
      fetcher: async () => {
        calls += 1
        return { tasks: [] }
      },
    }, () => undefined)

    await Promise.resolve()
    await Promise.resolve()
    expect(calls).toBe(1)

    coordinator.setRuntime("agenda", false)
    expect(coordinator.getState("tasks").status).toBe("paused")

    coordinator.setRuntime("today", false)
    await Promise.resolve()
    await Promise.resolve()
    expect(calls).toBe(2)

    unsubscribe()
  })

  it("pauses normal sources during low power and resumes them afterward", async () => {
    const coordinator = new DockDataSourceCoordinator()

    coordinator.setRuntime("weather", false)
    const unsubscribe = coordinator.subscribe("weather", {
      panelId: "weather",
      activeOnly: true,
      fetcher: async () => ({ location: "Brasília" }),
    }, () => undefined)

    await Promise.resolve()
    await Promise.resolve()
    coordinator.setRuntime("weather", true)
    expect(coordinator.getState("weather").status).toBe("paused")

    coordinator.setRuntime("weather", false)
    await Promise.resolve()
    await Promise.resolve()
    expect(coordinator.getState("weather").status).toBe("ready")

    unsubscribe()
  })

  it("queues an explicit refresh requested while a source is loading", async () => {
    const coordinator = new DockDataSourceCoordinator()
    let calls = 0
    let resolveFirst: (value: { version: number }) => void = () => undefined
    const firstRequest = new Promise<{ version: number }>((resolve) => {
      resolveFirst = resolve
    })

    coordinator.setRuntime("home-assistant", false)
    const unsubscribe = coordinator.subscribe("home-assistant", {
      panelId: "home-assistant",
      activeOnly: true,
      fetcher: async () => {
        calls += 1
        return calls === 1 ? firstRequest : { version: calls }
      },
    }, () => undefined)

    await Promise.resolve()
    expect(calls).toBe(1)

    coordinator.refresh("home-assistant")
    expect(calls).toBe(1)

    resolveFirst({ version: 1 })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(calls).toBe(2)
    expect(coordinator.getState("home-assistant").data).toEqual({ version: 2 })
    unsubscribe()
  })

  it("refreshes Spotify now-playing every second", () => {
    expect(DOCK_DATA_SOURCE_DEFINITIONS["spotify-now-playing"].refreshIntervalMs).toBe(1000)
  })
})
