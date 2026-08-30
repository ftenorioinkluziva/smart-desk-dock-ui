"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Banknote, BriefcaseBusiness, Target } from "lucide-react"
import { DockDataSourceError, useDockDataSource, useDockRuntime } from "@/components/dock-runtime-provider"
import { financeAuthUserResponseSchema, financeDockSummaryApiResponseSchema, type FinanceAuthUser } from "@/lib/operations/contracts"
import { FINANCE_AUTH_CHANGED_EVENT } from "@/lib/finance-auth"

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
  assets: FinanceAsset[]
  funds: { id: string; name: string; indexTicker?: string; currentValue: number; gain: number; gainPercentage: number }[]
  prices: { ticker: string; name: string; price: number; priceDate: string; calculationType: string }[]
  updatedAt: string
  mock?: boolean
  error?: string
}

const FALLBACK: FinanceDockSummary = {
  source: null,
  observedAt: null,
  fetchedAt: new Date().toISOString(),
  targetBasketName: "Carteira neutra (exemplo)",
  totalValue: 0,
  positionsValue: 0,
  fundsValue: 0,
  cashBalance: 0,
  positionCount: 0,
  driftPercentage: 0,
  unrealizedGain: 0,
  outsideStrategyValue: 0,
  unresolvedValue: 0,
  unresolvedCount: 0,
  warnings: [],
  assets: [],
  funds: [],
  prices: [],
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

function formatQuote(value: number | null | undefined, calculationType?: string) {
  if (typeof value !== "number" || Number.isNaN(value)) return "sem cotação"
  if (calculationType === "PERCENTUAL") {
    return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`
  }
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

function formatUpdateTime(value: string) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return "sem horário"
  return date.toLocaleTimeString("pt-BR", {
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

export function FinancePanel() {
  const { activePanelId } = useDockRuntime()
  const [financeUser, setFinanceUser] = useState<FinanceAuthUser | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [financeAuthError, setFinanceAuthError] = useState<string | null>(null)

  useEffect(() => {
    if (activePanelId !== "finance") return

    let cancelled = false
    setAuthReady(false)

    async function loadFinanceUser() {
      try {
        const response = await fetch("/api/finance/auth/me")
        if (cancelled) return

        if (response.ok) {
          const parsed = financeAuthUserResponseSchema.safeParse(await response.json())
          if (parsed.success) {
            setFinanceUser(parsed.data.user)
            setFinanceAuthError(null)
          } else {
            setFinanceUser(null)
            setFinanceAuthError("Resposta inválida do serviço financeiro")
          }
        } else if (response.status === 401) {
          setFinanceUser(null)
          setFinanceAuthError(null)
        } else {
          setFinanceUser(null)
          setFinanceAuthError("Serviço financeiro indisponível no momento")
        }
      } catch {
        if (!cancelled) {
          setFinanceUser(null)
          setFinanceAuthError("Não foi possível consultar a carteira")
        }
      } finally {
        if (!cancelled) setAuthReady(true)
      }
    }

    void loadFinanceUser()
    const handleFinanceAuthChanged = () => { void loadFinanceUser() }
    window.addEventListener(FINANCE_AUTH_CHANGED_EVENT, handleFinanceAuthChanged)
    return () => {
      cancelled = true
      window.removeEventListener(FINANCE_AUTH_CHANGED_EVENT, handleFinanceAuthChanged)
    }
  }, [activePanelId])

  const fetchSummary = useCallback(async () => {
    if (!financeUser) return FALLBACK
    const response = await fetch("/api/finance/summary")
    if (response.status === 401) {
      throw new DockDataSourceError("UNAUTHORIZED")
    }
    if (!response.ok) throw new DockDataSourceError("UPSTREAM_UNAVAILABLE")
    const parsed = financeDockSummaryApiResponseSchema.safeParse(await response.json())
    if (!parsed.success) throw new DockDataSourceError("INVALID_RESPONSE")
    return parsed.data
  }, [financeUser])

  const financeSource = useDockDataSource("finance", fetchSummary, {
    panelId: "finance",
    schema: financeDockSummaryApiResponseSchema,
  })

  const isLoading = financeSource.isLoading && Boolean(financeUser)
  const hasError = financeSource.state.status === "error"
  const summary = financeSource.data ?? FALLBACK

  if (!authReady) {
    return null
  }

  if (!financeUser) {
    return (
      <section aria-labelledby="finance-heading" className="dock-px flex h-full w-full items-center justify-center overflow-hidden py-[clamp(0.45rem,1.4vh,0.95rem)] pb-[clamp(1rem,3vh,1.8rem)]">
        <div className="max-w-[clamp(18rem,44vw,28rem)] text-center">
          <BriefcaseBusiness className="mx-auto mb-2 size-[clamp(1.2rem,3vw,1.6rem)] text-muted-foreground" />
          <h2 id="finance-heading" className="text-[clamp(0.85rem,2vw,1.1rem)] font-semibold">Carteira</h2>
          <p className="mt-1 text-[clamp(0.6rem,1.4vw,0.72rem)] text-muted-foreground">
            Configure o acesso ao Paridade Risco em Configurações para carregar sua carteira.
          </p>
          {financeAuthError && (
            <p role="alert" className="mt-2 text-[clamp(0.58rem,1.35vw,0.68rem)] text-destructive">{financeAuthError}</p>
          )}
        </div>
      </section>
    )
  }

  const investedValue = summary.positionsValue + summary.fundsValue
  const gainPositive = summary.unrealizedGain >= 0
  const visibleAssets = summary.assets.slice(0, 4)
  const remainingAssetCount = Math.max(0, summary.assets.length - visibleAssets.length)
  const reviewNotes = [
    summary.unresolvedCount > 0 ? `${summary.unresolvedCount} aguardando classificação` : null,
    summary.outsideStrategyValue > 0 ? `${formatCompactCurrency(summary.outsideStrategyValue)} fora da estratégia` : null,
    summary.unresolvedValue > 0 ? `${formatCompactCurrency(summary.unresolvedValue)} sem mapeamento` : null,
  ].filter((note): note is string => Boolean(note))
  const dataCaveat = reviewNotes[0] ?? (summary.warnings.length > 0 ? "Há observações sobre a atualização" : null)
  const statusLabel = hasError
    ? "Falha ao atualizar"
    : summary.mock
      ? "Modo exemplo"
      : summary.observedAt
        ? `Observado ${formatUpdateTime(summary.observedAt)}`
        : "Sem data observada"
  const sourceLabel = summary.source === "PLUGGY" ? "Pluggy" : summary.source === "MANUAL" ? "Manual" : "sem fonte"
  const positionLabel = `${summary.positionCount} ${summary.positionCount === 1 ? "posição" : "posições"}`
  const fundLabel = `${summary.funds.length} ${summary.funds.length === 1 ? "fundo" : "fundos"}`
  const fundsPreview = summary.funds.slice(0, 2).map((fund) => `${fund.name} ${formatCompactCurrency(fund.currentValue)}`).join(" · ")
  const remainingFundCount = Math.max(0, summary.funds.length - 2)

  return (
    <section aria-labelledby="finance-heading" className="dock-px flex h-full min-h-0 w-full items-center overflow-hidden py-[clamp(0.45rem,1.4vh,0.95rem)] pb-[clamp(1rem,3vh,1.8rem)]">
      <section className="relative grid h-full min-h-0 w-full min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-[clamp(0.3rem,0.9vh,0.55rem)] overflow-hidden">
        <h2 id="finance-heading" className="sr-only">Finanças</h2>

        <header className="flex min-w-0 items-center justify-between gap-3 border-b border-border/25 pb-[clamp(0.35rem,1vh,0.6rem)]">
          <div className="flex min-w-0 items-center gap-2">
            <BriefcaseBusiness className="size-[clamp(0.8rem,1.8vw,1rem)] shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <div className="text-[clamp(0.55rem,1.2vw,0.68rem)] font-medium uppercase tracking-[0.12em] text-muted-foreground">Carteira</div>
              <div className="truncate text-[clamp(0.72rem,1.8vw,0.9rem)] font-semibold text-foreground">{summary.targetBasketName ?? "Sem cesta ativa"}</div>
            </div>
          </div>
          <div className={`shrink-0 text-right text-[clamp(0.52rem,1.2vw,0.64rem)] uppercase tracking-[0.08em] ${hasError ? "text-destructive" : "text-muted-foreground"}`}>
            <div>{sourceLabel}</div>
            <div>{statusLabel}</div>
          </div>
        </header>

        <div className="grid min-h-0 min-w-0 w-full grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-[clamp(0.65rem,2vw,1.2rem)] overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-col justify-center gap-[clamp(0.45rem,1.2vh,0.75rem)] overflow-hidden">
          {dataCaveat && (
            <div className="flex items-center gap-1.5 text-[clamp(0.56rem,1.3vw,0.66rem)] text-destructive/80">
              <AlertTriangle className="size-3 shrink-0" />
              <span className="truncate">{dataCaveat}</span>
            </div>
          )}

          <div className="min-w-0">
            <div className="text-[clamp(0.62rem,1.45vw,0.72rem)] font-medium uppercase tracking-normal text-muted-foreground">
              Patrimônio atual
            </div>
            <div className="mt-1 whitespace-nowrap text-[clamp(2rem,6.2vw,3.8rem)] font-semibold leading-none tracking-normal">
              {isLoading ? "..." : formatCurrency(summary.totalValue)}
            </div>
            <div className={`mt-2 flex items-center gap-1.5 text-[clamp(0.9rem,2.2vw,1.15rem)] font-medium ${gainPositive ? "text-accent" : "text-destructive"}`}>
              {gainPositive ? <ArrowUpRight className="size-[clamp(1rem,2.2vw,1.25rem)]" /> : <ArrowDownRight className="size-[clamp(1rem,2.2vw,1.25rem)]" />}
              <span>{formatSignedCurrency(summary.unrealizedGain)}</span>
              <span className="text-muted-foreground">resultado aberto</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-[clamp(0.35rem,1vw,0.6rem)]">
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
              <div className="mt-1 whitespace-nowrap font-mono text-[clamp(0.72rem,1.7vw,0.92rem)] font-semibold">
                {formatCompactCurrency(summary.cashBalance)}
              </div>
            </div>
            <div className="rounded-lg border border-border/35 bg-secondary/25 px-[clamp(0.55rem,1.4vw,0.8rem)] py-[clamp(0.45rem,1.1vh,0.65rem)]">
              <div className="text-[clamp(0.58rem,1.35vw,0.68rem)] text-muted-foreground">Investido</div>
              <div className="mt-1 whitespace-nowrap font-mono text-[clamp(0.72rem,1.7vw,0.92rem)] font-semibold">
                {formatCompactCurrency(investedValue)}
              </div>
            </div>
            <div className="rounded-lg border border-border/35 bg-secondary/25 px-[clamp(0.55rem,1.4vw,0.8rem)] py-[clamp(0.45rem,1.1vh,0.65rem)]">
              <div className="text-[clamp(0.58rem,1.35vw,0.68rem)] text-muted-foreground">Ativos</div>
              <div className="mt-1 whitespace-nowrap font-mono text-[clamp(0.82rem,1.9vw,1rem)] font-semibold">
                {summary.positionCount}
              </div>
              <div className="truncate text-[clamp(0.48rem,1.05vw,0.56rem)] text-muted-foreground">{positionLabel} · {fundLabel}</div>
            </div>
          </div>

          <div className="min-w-0 text-[clamp(0.52rem,1.2vw,0.62rem)] text-muted-foreground">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <span className="shrink-0 uppercase tracking-[0.1em]">Leitura</span>
              <span className="truncate text-right">{summary.observedAt ? `observado às ${formatUpdateTime(summary.observedAt)}` : "horário não informado"}</span>
            </div>
            {reviewNotes.length > 1 && <div className="mt-0.5 truncate text-destructive/80">+{reviewNotes.length - 1} ponto(s) para revisar</div>}
            {fundsPreview && <div className="mt-0.5 truncate">Fundos: {fundsPreview}{remainingFundCount > 0 ? ` +${remainingFundCount}` : ""}</div>}
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-border/35 bg-secondary/20 p-[clamp(0.45rem,1.1vw,0.65rem)]">
            <div className="mb-[clamp(0.3rem,0.8vh,0.5rem)] shrink-0">
              <h3 className="text-[clamp(0.72rem,1.75vw,0.9rem)] font-semibold">Alocação por ativo</h3>
              <div className="text-[clamp(0.58rem,1.35vw,0.68rem)] text-muted-foreground">
                {hasError ? "Falha ao carregar dados financeiros" : "Atual · alvo · resultado"}
              </div>
            </div>
            <div className="min-h-0 min-w-0 flex-1 space-y-[clamp(0.15rem,0.5vh,0.25rem)] overflow-hidden pr-1">
              {visibleAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="min-w-0 rounded-md border border-border/15 bg-background/45 px-[clamp(0.4rem,1vw,0.55rem)] py-[clamp(0.18rem,0.6vh,0.3rem)]"
                  title={`${asset.ticker}: ${formatCurrency(asset.currentValue)}, ${formatPercentage(asset.percentage)}, ${formatSignedCurrency(asset.gain)}`}
                >
                  <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                    <div className="flex min-w-0 items-baseline gap-2">
                      <span className="truncate font-mono text-[clamp(0.7rem,1.65vw,0.84rem)] font-semibold">{asset.ticker}</span>
                      <span className="shrink-0 text-[clamp(0.5rem,1.1vw,0.58rem)] text-muted-foreground">qtd {formatQuantity(asset.shares)}</span>
                    </div>
                    <div className="min-w-[5.7rem] shrink-0 whitespace-nowrap text-right font-mono text-[clamp(0.58rem,1.25vw,0.68rem)] font-semibold">
                      {formatCompactCurrency(asset.currentValue)} <span>{formatPercentage(asset.percentage)}</span>
                    </div>
                  </div>
                  <div className="mt-1 flex min-w-0 items-center gap-1.5">
                    <div className="min-w-0 flex-1">
                      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, Math.max(0, asset.percentage))}%` }} />
                      </div>
                    </div>
                    <span className="shrink-0 text-[clamp(0.5rem,1.1vw,0.58rem)] text-muted-foreground">
                      alvo {formatPercentage(asset.targetPercentage)}
                    </span>
                    <span className={`shrink-0 font-mono text-[clamp(0.52rem,1.15vw,0.62rem)] ${asset.gain >= 0 ? "text-accent" : "text-destructive"}`}>
                      {formatSignedCurrency(asset.gain)}
                    </span>
                  </div>
                </div>
              ))}
              {remainingAssetCount > 0 && (
                <div className="pt-0.5 text-[clamp(0.5rem,1.1vw,0.58rem)] text-muted-foreground">
                  +{remainingAssetCount} ativo(s) disponíveis no Paridade Risco
                </div>
              )}
              {summary.assets.length === 0 && (
                <div className="text-[clamp(0.56rem,1.3vw,0.66rem)] text-muted-foreground">
                  Nenhum ativo disponível para exibição.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="min-w-0 overflow-hidden">
          <div className="finance-ticker-track flex w-max items-center py-1">
            {[0, 1].map((group) => (
              <div key={group} className="flex shrink-0 items-center gap-[clamp(0.9rem,2.5vw,1.4rem)] pr-[clamp(0.9rem,2.5vw,1.4rem)]">
                {summary.prices.map((p) => (
                  <div key={`${group}-${p.ticker}`} className="flex shrink-0 items-center gap-2 font-mono text-[clamp(0.58rem,1.35vw,0.68rem)]">
                    <span className="font-semibold text-foreground">{p.ticker}</span>
                    <span className="text-muted-foreground">{formatQuote(p.price, p.calculationType)}</span>
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
