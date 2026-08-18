import { describe, expect, it } from "vitest"
import { REALTIME_AGENT_INSTRUCTIONS, REALTIME_TOOLS } from "@/lib/realtime-agent"

describe("Realtime agent contracts", () => {
  it("publishes closed schemas for mutating tools", () => {
    const mutating = REALTIME_TOOLS.filter((tool) => tool.name.endsWith("_control"))
    expect(mutating).toHaveLength(2)
    for (const tool of mutating) {
      expect(tool.parameters).toMatchObject({ type: "object", additionalProperties: false })
    }
  })

  it("documents explicit-request policy for low-risk effects", () => {
    expect(REALTIME_AGENT_INSTRUCTIONS).toContain("pedido for explicito")
    expect(REALTIME_AGENT_INSTRUCTIONS).toContain("Nao peca confirmacao para esses comandos simples de midia")
  })
})
