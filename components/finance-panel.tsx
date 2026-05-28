"use client"

import { useCallback, useEffect, useState } from "react"
import { ArrowDownRight, ArrowUpRight, Banknote, BriefcaseBusiness, LogOut, Target } from "lucide-react"
import { readFinanceAuth, saveFinanceAuth, clearFinanceAuth, type FinanceAuth } from "@/lib/finance-auth"

type FinanceAsset = {
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

type FinanceDockSummary = {
  totalValue: number
  positionsValue: number
  fundsValue: number
  cashBalance: number
  driftPercentage: number
  unrealizedGain: number
  assets: FinanceAsset[]
  updatedAt: string
  mock?: boolean
  error?: string
}

const FALLBACK: FinanceDockSummary = {
  totalValue: 0,
  positionsValue: 0,
  fundsValue: 0,
  cashBalance: 0,
  driftPercentage: 0,
  unrealizedGain: 0,
  assets: [],
  updatedAt: new Date().toISOString(),
  mock: true,
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  })
}

function formatSignedCurrency(value: number) {
  return `${value >= 0 ? "+" : "-"}${formatCurrency(Math.abs(value))}`
}

function formatCompactCurrency(value: number) {
  if (Math.abs(value) >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`
  }
  if (Math.abs(value) >= 1_000) {
    return `R$ ${Math.round(value / 1_000).toLocaleString("pt-BR")} mil`
  }
  return formatCurrency(value)
}

function formatQuote(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "sem cotação"
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatPercentage(value: number) {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`
}

function formatSignedPercentage(value: number) {
  return `${value >= 0 ? "+" : ""}${formatPercentage(value)}`
}

function formatDailyChange(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "--"
  return formatSignedPercentage(value)
}

function formatUpdateTime(value: string) {
  return new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatQuantity(value: number | null) {
  if (value === null) return "vinculado"
  return value.toLocaleString("pt-BR", {
    maximumFractionDigits: value >= 100 ? 0 : 4,
  })
}

function FinanceLoginForm({ onLogin }: { onLogin: (auth: FinanceAuth) => void }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const data = await response.json() as { error?: string }
        throw new Error(data.error ?? "Falha na autenticação")
      }

      const data = await response.json() as FinanceAuth
      saveFinanceAuth(data)
      onLogin(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao conectar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section aria-labelledby="finance-heading" className="dock-px flex h-full w-full items-center justify-center py-[clamp(0.45rem,1.4vh,0.95rem)] pb-[clamp(1rem,3vh,1.8rem)]">
      <div className="w-full max-w-[clamp(16rem,40vw,22rem)]">
        <div className="mb-[clamp(0.75rem,2vh,1.25rem)] text-center">
          <BriefcaseBusiness className="mx-auto mb-2 size-[clamp(1.2rem,3vw,1.6rem)] text-muted-foreground" />
          <h2 id="finance-heading" className="text-[clamp(0.85rem,2vw,1.1rem)] font-semibold">Carteira</h2>
          <p className="mt-1 text-[clamp(0.6rem,1.4vw,0.72rem)] text-muted-foreground">Conecte-se ao Paridade Risco</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-[clamp(0.5rem,1.2vh,0.75rem)]">
          <div>
            <label htmlFor="finance-email" className="sr-only">Email</label>
            <input
              id="finance-email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border/35 bg-secondary/25 px-[clamp(0.6rem,1.5vw,0.85rem)] py-[clamp(0.45rem,1.1vh,0.65rem)] text-[clamp(0.72rem,1.6vw,0.85rem)] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="finance-password" className="sr-only">Senha</label>
            <input
              id="finance-password"
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border/35 bg-secondary/25 px-[clamp(0.6rem,1.5vw,0.85rem)] py-[clamp(0.45rem,1.1vh,0.65rem)] text-[clamp(0.72rem,1.6vw,0.85rem)] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-center text-[clamp(0.6rem,1.4vw,0.72rem)] text-destructive">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent px-[clamp(0.6rem,1.5vw,0.85rem)] py-[clamp(0.45rem,1.1vh,0.65rem)] text-[clamp(0.72rem,1.6vw,0.85rem)] font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-[clamp(0.6rem,1.5vh,1rem)] text-center text-[clamp(0.5rem,1.1vw,0.6rem)] text-muted-foreground/60">
          Use as credenciais fornecidas pelo Paridade Risco
        </p>
      </div>
    </section>
  )
}

export function FinancePanel() {
  const [auth, setAuth] = useState<FinanceAuth | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [summary, setSummary] = useState<FinanceDockSummary>(FALLBACK)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const stored = readFinanceAuth()
    setAuth(stored)
    setAuthReady(true)
  }, [])

  const fetchSummary = useCallback(async (token: string) => {
    try {
      setHasError(false)
      setIsLoading(true)
      const response = await fetch("/api/finance/summary", {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.status === 401) {
        clearFinanceAuth()
        setAuth(null)
        return
      }

      if (!response.ok) {
        setHasError(true)
        return
      }

      setSummary(await response.json() as FinanceDockSummary)
    } catch {
      setHasError(true)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (auth) {
      fetchSummary(auth.token)
    }
  }, [auth, fetchSummary])

  useEffect(() => {
    if (!auth) return
    const refresh = setInterval(() => fetchSummary(auth.token), 5 * 60 * 1000)
    return () => clearInterval(refresh)
  }, [auth, fetchSummary])

  const handleLogin = (newAuth: FinanceAuth) => {
    setAuth(newAuth)
  }

  const handleLogout = () => {
    clearFinanceAuth()
    setAuth(null)
    setSummary(FALLBACK)
  }

  if (!authReady) {
    return null
  }

  if (!auth) {
    return <FinanceLoginForm onLogin={handleLogin} />
  }

  const investedValue = summary.positionsValue + summary.fundsValue
  const gainPositive = summary.unrealizedGain >= 0
  const statusLabel = hasError
    ? "Falha ao atualizar"
    : summary.mock
      ? "Modo exemplo"
      : `Atualizado ${formatUpdateTime(summary.updatedAt)}`

  return (
    <section aria-labelledby="finance-heading" className="dock-px flex h-full w-full items-center overflow-hidden py-[clamp(0.45rem,1.4vh,0.95rem)] pb-[clamp(1rem,3vh,1.8rem)]">
      <section className="relative grid h-full min-h-0 w-full grid-rows-[minmax(0,1fr)_auto] gap-[clamp(0.45rem,1.4vh,0.8rem)]">
        <h2 id="finance-heading" className="sr-only">Finanças</h2>

        <button
          onClick={handleLogout}
          className="absolute right-0 top-0 z-10 flex items-center gap-1 rounded-md px-2 py-1 text-[clamp(0.5rem,1.1vw,0.6rem)] text-muted-foreground/50 transition-colors hover:text-muted-foreground"
          title="Desconectar"
        >
          <LogOut className="size-[clamp(0.6rem,1.3vw,0.75rem)]" />
          <span className="hidden sm:inline">{auth.user.name ?? auth.user.email}</span>
        </button>

        <div className="grid min-h-0 w-full grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-[clamp(0.65rem,2vw,1.2rem)]">
        <div className="flex min-w-0 flex-col justify-center gap-[clamp(0.55rem,1.6vh,0.9rem)]">
          <div className="flex items-center gap-2 text-[clamp(0.62rem,1.55vw,0.78rem)] font-medium uppercase tracking-normal text-muted-foreground">
            <BriefcaseBusiness className="size-[clamp(0.8rem,1.8vw,1rem)]" />
            <span>Carteira</span>
            <span className="truncate text-muted-foreground/70">{statusLabel}</span>
          </div>

          <div className="min-w-0">
            <div className="text-[clamp(0.62rem,1.45vw,0.72rem)] font-medium uppercase tracking-normal text-muted-foreground">
              Patrimônio atual
            </div>
            <div className="mt-1 truncate text-[clamp(2.2rem,7vw,4.2rem)] font-semibold leading-none tracking-normal">
              {isLoading ? "..." : formatCurrency(summary.totalValue)}
            </div>
            <div className={`mt-2 flex items-center gap-1.5 text-[clamp(0.9rem,2.2vw,1.15rem)] font-medium ${gainPositive ? "text-accent" : "text-destructive"}`}>
              {gainPositive ? <ArrowUpRight className="size-[clamp(1rem,2.2vw,1.25rem)]" /> : <ArrowDownRight className="size-[clamp(1rem,2.2vw,1.25rem)]" />}
              <span>{formatSignedCurrency(summary.unrealizedGain)}</span>
              <span className="text-muted-foreground">resultado aberto</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-[clamp(0.45rem,1.4vw,0.7rem)]">
            <div className="rounded-lg border border-border/35 bg-secondary/25 px-[clamp(0.55rem,1.4vw,0.8rem)] py-[clamp(0.45rem,1.1vh,0.65rem)]">
              <div className="flex items-center gap-1.5 text-[clamp(0.58rem,1.35vw,0.68rem)] text-muted-foreground">
                <Target className="size-3.5" />
                <span>Desvio</span>
              </div>
              <div className="mt-1 font-mono text-[clamp(0.9rem,2.2vw,1.15rem)] font-semibold">
                {formatPercentage(summary.driftPercentage)}
              </div>
            </div>
            <div className="rounded-lg border border-border/35 bg-secondary/25 px-[clamp(0.55rem,1.4vw,0.8rem)] py-[clamp(0.45rem,1.1vh,0.65rem)]">
              <div className="flex items-center gap-1.5 text-[clamp(0.58rem,1.35vw,0.68rem)] text-muted-foreground">
                <Banknote className="size-3.5" />
                <span>Caixa</span>
              </div>
              <div className="mt-1 truncate font-mono text-[clamp(0.9rem,2.2vw,1.15rem)] font-semibold">
                {formatCurrency(summary.cashBalance)}
              </div>
            </div>
            <div className="rounded-lg border border-border/35 bg-secondary/25 px-[clamp(0.55rem,1.4vw,0.8rem)] py-[clamp(0.45rem,1.1vh,0.65rem)]">
              <div className="text-[clamp(0.58rem,1.35vw,0.68rem)] text-muted-foreground">Investido</div>
              <div className="mt-1 truncate font-mono text-[clamp(0.8rem,1.9vw,1rem)] font-semibold">
                {formatCompactCurrency(investedValue)}
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-0 min-w-0 rounded-lg border border-border/35 bg-secondary/20 p-[clamp(0.5rem,1.25vw,0.75rem)]">
            <div className="mb-[clamp(0.45rem,1.3vh,0.7rem)]">
              <h3 className="text-[clamp(0.72rem,1.75vw,0.9rem)] font-semibold">Alocação por Ativo</h3>
              <div className="text-[clamp(0.58rem,1.35vw,0.68rem)] text-muted-foreground">
                {hasError ? "Falha ao carregar dados financeiros" : "Distribuição percentual do portfolio"}
              </div>
            </div>
            <div className="max-h-[calc(100%-2.4rem)] min-w-0 space-y-[clamp(0.35rem,1vh,0.5rem)] overflow-y-auto pr-1 scrollbar-hide">
              {summary.assets.map((asset) => (
                <div
                  key={asset.id}
                  className="min-w-0 rounded-md border border-border/15 bg-background/45 px-[clamp(0.45rem,1.2vw,0.65rem)] py-[clamp(0.35rem,0.95vh,0.5rem)]"
                >
                  <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-baseline gap-2">
                        <span className="truncate font-mono text-[clamp(0.7rem,1.65vw,0.84rem)] font-semibold">{asset.ticker}</span>
                        <span className="shrink-0 text-[clamp(0.5rem,1.1vw,0.58rem)] text-muted-foreground">qtd {formatQuantity(asset.shares)}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, Math.max(0, asset.percentage))}%` }} />
                      </div>
                      <div className="mt-1 truncate text-[clamp(0.5rem,1.1vw,0.58rem)] text-muted-foreground">
                        alvo {formatPercentage(asset.targetPercentage)}
                      </div>
                    </div>
                    <div className="min-w-[5.7rem] shrink-0 text-right font-mono">
                      <div className="text-[clamp(0.64rem,1.45vw,0.74rem)] font-semibold">
                        {formatCurrency(asset.currentValue)} <span>{formatPercentage(asset.percentage)}</span>
                      </div>
                      <span className={`font-mono text-[clamp(0.58rem,1.35vw,0.68rem)] ${asset.gain >= 0 ? "text-accent" : "text-destructive"}`}>
                        {formatSignedCurrency(asset.gain)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="min-w-0 overflow-hidden">
          <div className="finance-ticker-track flex w-max items-center py-1">
            {[0, 1].map((group) => (
              <div key={group} className="flex shrink-0 items-center gap-[clamp(0.9rem,2.5vw,1.4rem)] pr-[clamp(0.9rem,2.5vw,1.4rem)]">
                {summary.assets.map((asset) => (
                  <div key={`${group}-${asset.id}`} className="flex shrink-0 items-center gap-2 font-mono text-[clamp(0.58rem,1.35vw,0.68rem)]">
                    <span className="font-semibold text-foreground">{asset.ticker}</span>
                    <span className="text-muted-foreground">{formatQuote(asset.currentPrice)}</span>
                    <span className={typeof asset.dailyChangePercentage === "number" && asset.dailyChangePercentage < 0 ? "text-destructive" : "text-accent"}>
                      {formatDailyChange(asset.dailyChangePercentage)}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
    </section>
  )
}
