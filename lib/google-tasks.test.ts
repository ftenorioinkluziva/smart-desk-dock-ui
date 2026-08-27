import { afterEach, describe, expect, it, vi } from "vitest"
import { fetchGoogleTasks, updateGoogleTaskStatus } from "@/lib/google-tasks"

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("Google Tasks gateway", () => {
  it("loads task lists and keeps only pending tasks", async () => {
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes("/users/@me/lists")) {
        return new Response(JSON.stringify({
          items: [{ id: "list-1", title: "Meu dia" }],
        }), { status: 200, headers: { "Content-Type": "application/json" } })
      }

      return new Response(JSON.stringify({
        items: [
          { id: "task-1", title: "Enviar relatório", status: "needsAction", due: "2026-08-25T12:00:00.000Z" },
          { id: "task-2", title: "Concluída", status: "completed" },
          { id: "task-3", title: "Removida", status: "needsAction", deleted: true },
        ],
      }), { status: 200, headers: { "Content-Type": "application/json" } })
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await fetchGoogleTasks("test-token")

    expect(result.taskLists).toEqual([{ id: "list-1", title: "Meu dia" }])
    expect(result.tasks).toEqual([expect.objectContaining({
      id: "task-1",
      taskListId: "list-1",
      taskListTitle: "Meu dia",
      title: "Enviar relatório",
      completed: false,
    })])
    expect(fetchMock.mock.calls.every(([, init]) => (init as RequestInit).headers && JSON.stringify((init as RequestInit).headers).includes("test-token"))).toBe(true)
  })

  it("updates completion without retrying a write", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: "task-1",
      title: "Enviar relatório",
      status: "completed",
    }), { status: 200, headers: { "Content-Type": "application/json" } }))
    vi.stubGlobal("fetch", fetchMock)

    const result = await updateGoogleTaskStatus({
      accessToken: "test-token",
      taskListId: "list-1",
      taskId: "task-1",
      completed: true,
    })

    expect(result.status).toBe("completed")
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(JSON.parse((fetchMock.mock.calls[0]?.[1] as RequestInit).body as string)).toEqual({ status: "completed" })
  })
})
