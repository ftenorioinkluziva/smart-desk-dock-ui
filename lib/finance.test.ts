import { afterEach, describe, expect, it, vi } from "vitest"

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe("Paridade Risco finance contract", () => {
  it("uses the remote Better Auth session cookie for login and session checks", async () => {
    vi.resetModules()
    vi.stubEnv("FINANCE_API_URL", "https://paridade.test")

    const user = { id: "user-1", email: "user@example.com", name: "User", role: "user" }
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith("/api/auth/sign-in/email")) {
        expect(JSON.parse(String(init?.body))).toEqual({ email: "user@example.com", password: "password" })
        expect(new Headers(init?.headers).get("Origin")).toBe("https://paridade.test")
        return new Response(JSON.stringify({ user }), {
          status: 200,
          headers: { "Content-Type": "application/json", "Set-Cookie": "better-auth.session_token=session-value; Path=/; HttpOnly" },
        })
      }
      if (url.endsWith("/api/auth/get-session")) {
        expect(new Headers(init?.headers).get("Cookie")).toBe("better-auth.session_token=session-value")
        return new Response(JSON.stringify({ user, session: { id: "session-1" } }), { status: 200 })
      }
      return new Response("not found", { status: 404 })
    })
    vi.stubGlobal("fetch", fetchMock)

    const { financeLogin, financeMe } = await import("@/lib/finance")
    const login = await financeLogin("user@example.com", "password")
    const sessionUser = await financeMe(login.sessionCookie)

    expect(login).toEqual({ sessionCookie: "better-auth.session_token=session-value", user })
    expect(sessionUser).toEqual(user)
  })

  it("distinguishes invalid finance credentials from an expired session", async () => {
    vi.resetModules()
    vi.stubEnv("FINANCE_API_URL", "https://paridade.test")
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      code: "INVALID_EMAIL_OR_PASSWORD",
      message: "Invalid password",
    }), { status: 401 })))

    const { financeLogin } = await import("@/lib/finance")

    await expect(financeLogin("user@example.com", "wrong-password"))
      .rejects.toMatchObject({
        operationError: expect.objectContaining({
          code: "FINANCE_INVALID_CREDENTIALS",
          message: "E-mail ou senha inválidos no Paridade de Risco",
          retryable: false,
        }),
      })
  })

  it("accepts Pluggy positions without quantity and preserves data provenance", async () => {
    vi.resetModules()
    vi.stubEnv("FINANCE_API_URL", "https://paridade.test")

    const summary = {
      source: "PLUGGY",
      observedAt: "2026-08-25T18:00:00.000Z",
      totalValue: 1000,
      positionsValue: 900,
      fundsValue: 0,
      cashBalance: 100,
      positionCount: 1,
      basketDriftPercentage: 2.5,
      unrealizedGain: 42,
      outsideStrategyValue: 75,
      unresolvedValue: 10,
      unresolvedCount: 1,
      warnings: ["Uma posição aguarda classificação"],
      allocation: [{ id: "asset-1", ticker: "BOVA11", label: "Brasil", percentage: 90, targetPercentage: 100 }],
      positions: [{
        id: "position-1",
        ticker: "BOVA11",
        name: "BOVA11",
        shares: null,
        averagePrice: 0,
        currentPrice: 100,
        currentValue: 900,
        gain: 42,
        gainPercentage: 4.9,
        dailyChangePercentage: null,
      }],
      funds: [{ id: "fund-1", name: "Fundo Renda Fixa", currentValue: 100, gain: 5, gainPercentage: 5 }],
    }
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith("/api/portfolio/summary")) {
        return new Response(JSON.stringify(summary), { status: 200 })
      }
      if (url.endsWith("/api/assets/prices")) {
        return new Response("[]", { status: 200 })
      }
      if (url.endsWith("/api/baskets/active")) {
        return new Response(JSON.stringify({ id: "basket-1", name: "Carteira Neutra", description: null }), { status: 200 })
      }
      return new Response("not found", { status: 404 })
    })
    vi.stubGlobal("fetch", fetchMock)

    const { fetchFinanceDockSummary } = await import("@/lib/finance")
    const result = await fetchFinanceDockSummary("better-auth.session_token=token")

    expect(result).toEqual(expect.objectContaining({
      source: "PLUGGY",
      observedAt: "2026-08-25T18:00:00.000Z",
      targetBasketName: "Carteira Neutra",
      unresolvedCount: 1,
      outsideStrategyValue: 75,
    }))
    expect(result.assets[0]?.shares).toBeNull()
    expect(result.funds).toEqual([{ id: "fund-1", name: "Fundo Renda Fixa", currentValue: 100, gain: 5, gainPercentage: 5 }])
    expect(fetchMock).toHaveBeenCalledWith(
      "https://paridade.test/api/portfolio/summary",
      expect.objectContaining({
        cache: "no-store",
        headers: expect.objectContaining({ Cookie: "better-auth.session_token=token" }),
      }),
    )
  })
})
