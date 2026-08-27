import { z } from "zod"
import { OperationFailure, upstreamError } from "@/lib/operations/errors"
import { financeAuthUserSchema } from "@/lib/operations/contracts"

const FINANCE_API_URL = process.env.FINANCE_API_URL?.replace(/\/$/, "")

export const financeConfigured = Boolean(FINANCE_API_URL)

type FinanceAllocation = {
  id: string
  ticker: string
  label: string
  percentage: number
  targetPercentage: number
}

export type FinancePosition = {
  id: string
  ticker: string
  name: string
  shares: number | null
  currentPrice: number
  currentValue: number
  gain: number
  gainPercentage: number
  dailyChangePercentage?: number | null
}

export type FinanceFund = {
  id: string
  name: string
  indexTicker?: string
  currentValue: number
  gain: number
  gainPercentage: number
}

export type FinanceAssetSummary = {
  id: string
  ticker: string
  label: string
  shares: number | null
  percentage: number
  targetPercentage: number
  currentPrice: number | null
  currentValue: number
  gain: number
  gainPercentage: number
  dailyChangePercentage: number | null
}

export type FinanceSummary = {
  source?: "MANUAL" | "PLUGGY"
  observedAt?: string | null
  totalValue: number
  positionsValue: number
  fundsValue: number
  cashBalance: number
  positionCount: number
  basketDriftPercentage: number
  unrealizedGain: number
  targetBasketName?: string | null
  outsideStrategyValue?: number
  unresolvedValue?: number
  unresolvedCount?: number
  warnings?: string[]
  allocation: FinanceAllocation[]
  positions: FinancePosition[]
  funds?: FinanceFund[]
}

export type FinanceDockSummary = {
  source: "MANUAL" | "PLUGGY" | null
  observedAt: string | null
  fetchedAt: string
  targetBasketName: string | null
  totalValue: number
  positionsValue: number
  fundsValue: number
  cashBalance: number
  positionCount: number
  driftPercentage: number
  unrealizedGain: number
  outsideStrategyValue: number
  unresolvedValue: number
  unresolvedCount: number
  warnings: string[]
  assets: FinanceAssetSummary[]
  funds: FinanceFund[]
  prices: AssetPrice[]
  updatedAt: string
  mock?: boolean
}

export type AssetPrice = {
  ticker: string
  name: string
  price: number
  priceDate: string
  calculationType: string
}

const financeAuthResponseSchema = z.object({
  user: financeAuthUserSchema.optional(),
  session: z.unknown().optional(),
  token: z.string().nullable().optional(),
}).passthrough()

const financeSessionResponseSchema = z.object({
  user: financeAuthUserSchema.nullable().optional(),
  session: z.unknown().optional(),
}).passthrough()

const financePositionSchema = z.object({
  id: z.string(), ticker: z.string(), name: z.string(), shares: z.number().nullable(), currentPrice: z.number(),
  currentValue: z.number(), gain: z.number(), gainPercentage: z.number(), dailyChangePercentage: z.number().nullable().optional(),
}).passthrough()
const financeFundSchema = z.object({
  id: z.string(), name: z.string(), indexTicker: z.string().optional(), currentValue: z.number(), gain: z.number(), gainPercentage: z.number(),
}).passthrough()
const financeSummarySchema = z.object({
  source: z.enum(["MANUAL", "PLUGGY"]).optional(),
  observedAt: z.string().datetime({ offset: true }).nullable().optional(),
  totalValue: z.number(), positionsValue: z.number(), fundsValue: z.number(), cashBalance: z.number(),
  positionCount: z.number(), basketDriftPercentage: z.number(), unrealizedGain: z.number(),
  targetBasketName: z.string().nullable().optional(),
  outsideStrategyValue: z.number().optional(),
  unresolvedValue: z.number().optional(),
  unresolvedCount: z.number().int().nonnegative().optional(),
  warnings: z.array(z.string()).optional(),
  allocation: z.array(z.object({ id: z.string(), ticker: z.string(), label: z.string(), percentage: z.number(), targetPercentage: z.number() }).passthrough()),
  positions: z.array(financePositionSchema),
  funds: z.array(financeFundSchema).optional(),
}).passthrough()
const assetPriceSchema = z.object({
  ticker: z.string(), name: z.string(), price: z.number(), priceDate: z.string(), calculationType: z.string(),
}).passthrough()
const activeBasketSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
}).passthrough()

function financeOperationFailure(status: number, operation: string) {
  if (status === 401 && operation === "Finance login") {
    return new OperationFailure({
      code: "FINANCE_INVALID_CREDENTIALS",
      category: "authorization",
      message: "E-mail ou senha inválidos no Paridade de Risco",
      hint: "Use uma conta existente no ambiente configurado do Paridade Risco.",
      retryable: false,
    })
  }

  if (status === 401 || status === 403) {
    return new OperationFailure({
      code: "FINANCE_AUTH_REQUIRED",
      category: "authorization",
      message: "Autenticação financeira necessária",
      hint: "Conecte novamente sua conta financeira.",
      retryable: false,
    })
  }
  return new OperationFailure(upstreamError(
    status === 429 ? "FINANCE_RATE_LIMITED" : "FINANCE_UPSTREAM_FAILED",
    `${operation} failed`,
    { retryable: status === 429 || status >= 500 },
  ))
}

async function parseFinanceResponse<T>(response: Response, schema: z.ZodType<T>, operation: string): Promise<T> {
  if (!response.ok) throw financeOperationFailure(response.status, operation)
  const parsed = schema.safeParse(await response.json())
  if (!parsed.success) {
    throw new OperationFailure(upstreamError("FINANCE_RESPONSE_INVALID", "Finance API returned an invalid response", { retryable: false }))
  }
  return parsed.data
}

function readSetCookieHeaders(headers: Headers): string[] {
  const headersWithGetSetCookie = headers as Headers & { getSetCookie?: () => string[] }
  const cookies = headersWithGetSetCookie.getSetCookie?.() ?? []
  if (cookies.length > 0) return cookies

  const fallback = headers.get("set-cookie")
  return fallback ? [fallback] : []
}

function getSessionCookie(headers: Headers): string {
  return readSetCookieHeaders(headers)
    .map((cookie) => cookie.split(";", 1)[0]?.trim() ?? "")
    .filter(Boolean)
    .join("; ")
}

export async function financeLogin(email: string, password: string) {
  if (!FINANCE_API_URL) throw new OperationFailure(upstreamError("FINANCE_NOT_CONFIGURED", "Finance API URL is not configured", { retryable: false }))

  const financeOrigin = new URL(FINANCE_API_URL).origin
  const response = await fetch(`${FINANCE_API_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: financeOrigin },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(10_000),
  })
  const data = await parseFinanceResponse(response, financeAuthResponseSchema, "Finance login")
  const sessionCookie = getSessionCookie(response.headers)
  if (!data.user || !sessionCookie) {
    throw new OperationFailure(upstreamError("FINANCE_RESPONSE_INVALID", "Finance login did not return a session", { retryable: false }))
  }

  return { sessionCookie, user: data.user }
}

export async function financeMe(sessionCookie: string) {
  if (!FINANCE_API_URL) throw new OperationFailure(upstreamError("FINANCE_NOT_CONFIGURED", "Finance API URL is not configured", { retryable: false }))

  const response = await fetch(`${FINANCE_API_URL}/api/auth/get-session`, {
    headers: { Cookie: sessionCookie },
    signal: AbortSignal.timeout(10_000),
  })
  const data = await parseFinanceResponse(response, financeSessionResponseSchema, "Finance authentication check")
  if (!data.user) {
    throw new OperationFailure({
      code: "FINANCE_AUTH_REQUIRED",
      category: "authorization",
      message: "Autenticação financeira necessária",
      hint: "Conecte novamente sua conta financeira.",
      retryable: false,
    })
  }
  return data.user
}

async function financeFetch<T>(path: string, schema: z.ZodType<T>, sessionCookie?: string): Promise<T> {
  if (!FINANCE_API_URL) {
    throw new OperationFailure(upstreamError("FINANCE_NOT_CONFIGURED", "Finance API URL is not configured", { retryable: false }))
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  if (sessionCookie) {
    headers.Cookie = sessionCookie
  }

  const response = await fetch(`${FINANCE_API_URL}${path}`, {
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  })
  return parseFinanceResponse(response, schema, "Finance API request")
}

function buildAssets(summary: FinanceSummary): FinanceAssetSummary[] {
  const positionsByTicker = new Map(summary.positions.map((position) => [position.ticker, position]))
  const fundsByTicker = (summary.funds ?? []).reduce<Map<string, FinanceFund>>((acc, fund) => {
    if (!fund.indexTicker) return acc
    const current = acc.get(fund.indexTicker)
    if (!current) {
      acc.set(fund.indexTicker, fund)
      return acc
    }

    acc.set(fund.indexTicker, {
      ...current,
      currentValue: current.currentValue + fund.currentValue,
      gain: current.gain + fund.gain,
      gainPercentage: current.currentValue + fund.currentValue > 0
        ? ((current.gain + fund.gain) / (current.currentValue + fund.currentValue - current.gain - fund.gain)) * 100
        : 0,
    })
    return acc
  }, new Map<string, FinanceFund>())

  return summary.allocation.map((item) => {
    const position = positionsByTicker.get(item.ticker)
    const fund = fundsByTicker.get(item.ticker)
    const currentValue = (position?.currentValue ?? 0) + (fund?.currentValue ?? 0)
    const gain = (position?.gain ?? 0) + (fund?.gain ?? 0)
    const invested = currentValue - gain

    return {
      id: item.id,
      ticker: item.ticker,
      label: item.label,
      shares: position?.shares ?? null,
      percentage: item.percentage,
      targetPercentage: item.targetPercentage,
      currentPrice: position?.currentPrice ?? null,
      currentValue,
      gain,
      gainPercentage: invested > 0 ? (gain / invested) * 100 : 0,
      dailyChangePercentage: position?.dailyChangePercentage ?? null,
    }
  })
}

function stripSuffix(ticker: string): string {
  return ticker.replace(/\.SA$/, "")
}

export async function fetchAssetPrices(sessionCookie: string): Promise<AssetPrice[]> {
  return financeFetch("/api/assets/prices", z.array(assetPriceSchema), sessionCookie)
}

export async function fetchFinanceDockSummary(sessionCookie?: string): Promise<FinanceDockSummary> {
  if (!sessionCookie) throw new OperationFailure({
    code: "FINANCE_AUTH_REQUIRED",
    category: "authorization",
    message: "Autenticação financeira necessária",
    retryable: false,
  })

  const [summary, prices, activeBasket] = await Promise.all([
    financeFetch("/api/portfolio/summary", financeSummarySchema, sessionCookie),
    fetchAssetPrices(sessionCookie).catch(() => [] as AssetPrice[]),
    financeFetch("/api/baskets/active", activeBasketSchema, sessionCookie).catch(() => null),
  ])

  const pricesByTicker = new Map<string, number>()
  for (const p of prices) {
    pricesByTicker.set(stripSuffix(p.ticker), p.price)
  }

  const assets = buildAssets(summary)

  for (const asset of assets) {
    const livePrice = pricesByTicker.get(asset.ticker)
    if (livePrice !== undefined) {
      asset.currentPrice = livePrice
    }
  }

  return {
    source: summary.source ?? null,
    observedAt: summary.observedAt ?? null,
    fetchedAt: new Date().toISOString(),
    targetBasketName: summary.targetBasketName ?? activeBasket?.name ?? null,
    totalValue: summary.totalValue,
    positionsValue: summary.positionsValue,
    fundsValue: summary.fundsValue,
    cashBalance: summary.cashBalance,
    positionCount: summary.positionCount,
    driftPercentage: summary.basketDriftPercentage,
    unrealizedGain: summary.unrealizedGain,
    outsideStrategyValue: summary.outsideStrategyValue ?? 0,
    unresolvedValue: summary.unresolvedValue ?? 0,
    unresolvedCount: summary.unresolvedCount ?? 0,
    warnings: summary.warnings ?? [],
    assets,
    funds: summary.funds ?? [],
    prices,
    updatedAt: new Date().toISOString(),
  }
}

export function getMockFinanceDockSummary(): FinanceDockSummary {
  return {
    source: null,
    observedAt: null,
    fetchedAt: new Date().toISOString(),
    targetBasketName: "Carteira neutra (exemplo)",
    totalValue: 128430.25,
    positionsValue: 102800.1,
    fundsValue: 18400,
    cashBalance: 7230.15,
    positionCount: 4,
    driftPercentage: 3.8,
    unrealizedGain: 6420.4,
    outsideStrategyValue: 0,
    unresolvedValue: 0,
    unresolvedCount: 0,
    warnings: [],
    assets: [
      { id: "mock-asset-1", ticker: "IVVB11", label: "S&P 500", shares: 214, percentage: 31.5, targetPercentage: 30, currentPrice: 189.06, currentValue: 40458, gain: 3610, gainPercentage: 9.8, dailyChangePercentage: 0.8 },
      { id: "mock-asset-2", ticker: "BOVA11", label: "Brasil", shares: 196, percentage: 21.4, targetPercentage: 25, currentPrice: 140.22, currentValue: 27484, gain: -920, gainPercentage: -3.2, dailyChangePercentage: -0.4 },
      { id: "mock-asset-3", ticker: "IMAB11", label: "Inflação", shares: 251, percentage: 24.8, targetPercentage: 25, currentPrice: 126.91, currentValue: 31855, gain: 1240, gainPercentage: 4.1, dailyChangePercentage: 0.2 },
      { id: "mock-asset-4", ticker: "GOLD11", label: "Ouro", shares: 180, percentage: 12.1, targetPercentage: 10, currentPrice: 86.33, currentValue: 15540, gain: 1280, gainPercentage: 9, dailyChangePercentage: 1.1 },
      { id: "mock-asset-5", ticker: "CASH", label: "Caixa", shares: null, percentage: 5.6, targetPercentage: 5, currentPrice: null, currentValue: 7230, gain: 0, gainPercentage: 0, dailyChangePercentage: null },
    ],
    funds: [],
    prices: [
      { ticker: "IVVB11.SA", name: "ETF IVVB11", price: 189.06, priceDate: new Date().toISOString(), calculationType: "PRECO" },
      { ticker: "BOVA11.SA", name: "ETF BOVA11", price: 140.22, priceDate: new Date().toISOString(), calculationType: "PRECO" },
      { ticker: "IMAB11.SA", name: "ETF IMAB11", price: 126.91, priceDate: new Date().toISOString(), calculationType: "PRECO" },
      { ticker: "GOLD11.SA", name: "ETF GOLD11", price: 86.33, priceDate: new Date().toISOString(), calculationType: "PRECO" },
      { ticker: "BTC-USD", name: "Bitcoin", price: 73498.54, priceDate: new Date().toISOString(), calculationType: "PRECO" },
      { ticker: "BNB-USD", name: "BNB", price: 640.08, priceDate: new Date().toISOString(), calculationType: "PRECO" },
      { ticker: "B5P211.SA", name: "ETF B5P211", price: 108.01, priceDate: new Date().toISOString(), calculationType: "PRECO" },
      { ticker: "USDBRL", name: "Dólar", price: 5.82, priceDate: new Date().toISOString(), calculationType: "PRECO" },
    ],
    updatedAt: new Date().toISOString(),
    mock: true,
  }
}

export function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  })
}
