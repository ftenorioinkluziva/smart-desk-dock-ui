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
  shares: number
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
  totalValue: number
  positionsValue: number
  fundsValue: number
  cashBalance: number
  positionCount: number
  basketDriftPercentage: number
  unrealizedGain: number
  allocation: FinanceAllocation[]
  positions: FinancePosition[]
  funds?: FinanceFund[]
}

export type FinanceDockSummary = {
  totalValue: number
  positionsValue: number
  fundsValue: number
  cashBalance: number
  driftPercentage: number
  unrealizedGain: number
  assets: FinanceAssetSummary[]
  updatedAt: string
  mock?: boolean
}

export async function financeLogin(email: string, password: string) {
  if (!FINANCE_API_URL) throw new Error("Finance API URL is not configured")

  const response = await fetch(`${FINANCE_API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`)
  }

  return await response.json() as { token: string; user: { id: string; email: string; role: string } }
}

export async function financeMe(token: string) {
  if (!FINANCE_API_URL) throw new Error("Finance API URL is not configured")

  const response = await fetch(`${FINANCE_API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    throw new Error(`Auth check failed: ${response.status}`)
  }

  return await response.json() as { id: string; email: string; name?: string; role: string }
}

async function financeFetch<T>(path: string, token?: string): Promise<T> {
  if (!FINANCE_API_URL) {
    throw new Error("Finance API URL is not configured")
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${FINANCE_API_URL}${path}`, {
    headers,
    next: { revalidate: 300 },
  })

  if (!response.ok) {
    throw new Error(`Finance API request failed: ${response.status}`)
  }

  return await response.json() as T
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

export async function fetchFinanceDockSummary(token?: string): Promise<FinanceDockSummary> {
  const summary = await financeFetch<FinanceSummary>("/api/portfolio/summary", token)

  return {
    totalValue: summary.totalValue,
    positionsValue: summary.positionsValue,
    fundsValue: summary.fundsValue,
    cashBalance: summary.cashBalance,
    driftPercentage: summary.basketDriftPercentage,
    unrealizedGain: summary.unrealizedGain,
    assets: buildAssets(summary),
    updatedAt: new Date().toISOString(),
  }
}

export function getMockFinanceDockSummary(): FinanceDockSummary {
  return {
    totalValue: 128430.25,
    positionsValue: 102800.1,
    fundsValue: 18400,
    cashBalance: 7230.15,
    driftPercentage: 3.8,
    unrealizedGain: 6420.4,
    assets: [
      { id: "mock-asset-1", ticker: "IVVB11", label: "S&P 500", shares: 214, percentage: 31.5, targetPercentage: 30, currentPrice: 189.06, currentValue: 40458, gain: 3610, gainPercentage: 9.8, dailyChangePercentage: 0.8 },
      { id: "mock-asset-2", ticker: "BOVA11", label: "Brasil", shares: 196, percentage: 21.4, targetPercentage: 25, currentPrice: 140.22, currentValue: 27484, gain: -920, gainPercentage: -3.2, dailyChangePercentage: -0.4 },
      { id: "mock-asset-3", ticker: "IMAB11", label: "Inflação", shares: 251, percentage: 24.8, targetPercentage: 25, currentPrice: 126.91, currentValue: 31855, gain: 1240, gainPercentage: 4.1, dailyChangePercentage: 0.2 },
      { id: "mock-asset-4", ticker: "GOLD11", label: "Ouro", shares: 180, percentage: 12.1, targetPercentage: 10, currentPrice: 86.33, currentValue: 15540, gain: 1280, gainPercentage: 9, dailyChangePercentage: 1.1 },
      { id: "mock-asset-5", ticker: "CASH", label: "Caixa", shares: null, percentage: 5.6, targetPercentage: 5, currentPrice: null, currentValue: 7230, gain: 0, gainPercentage: 0, dailyChangePercentage: null },
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
