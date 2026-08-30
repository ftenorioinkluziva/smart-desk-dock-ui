"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { z } from "zod"
import { DockDataSourceError, useDockDataSource } from "@/components/dock-runtime-provider"
import { AlertCircle, ArrowDown, ArrowUp, Blinds, Lamp, Lightbulb, RefreshCw, Square, ToggleLeft } from "lucide-react"

type HomeAssistantEntity = {
  entityId: string
  domain: string
  name: string
  state: string
  deviceClass: string | null
  unit: string | null
  brightness: number | null
  supportsBrightness: boolean
  supportsColor: boolean
  controllable: boolean
}

type ColorPreset = {
  label: string
  swatch: string
  colorTempKelvin?: number
  hsColor?: [number, number]
}

const DOMAIN_LABELS: Record<string, string> = {
  light: "Luz",
  switch: "Interruptor",
  scene: "Cena",
  script: "Script",
  cover: "Cobertura",
}

const LIGHT_COLOR_PRESETS: ColorPreset[] = [
  { label: "Laranja", swatch: "#ff8a1f", hsColor: [30, 100] },
  { label: "Pêssego", swatch: "#ffc08a", hsColor: [28, 45] },
  { label: "Branco quente", swatch: "#f4ddc6", colorTempKelvin: 2700 },
  { label: "Branco neutro", swatch: "#ffffff", colorTempKelvin: 4000 },
  { label: "Branco frio", swatch: "#dcebff", colorTempKelvin: 6500 },
  { label: "Azul", swatch: "#7aa7ff", hsColor: [220, 65] },
  { label: "Roxo", swatch: "#c47cff", hsColor: [275, 60] },
  { label: "Rosa", swatch: "#f084d8", hsColor: [315, 60] },
  { label: "Coral", swatch: "#ff715e", hsColor: [8, 80] },
]

const entitiesResponseSchema = z.object({
  entities: z.array(z.object({
    entityId: z.string(),
    domain: z.string(),
    name: z.string(),
    state: z.string(),
    deviceClass: z.string().nullable(),
    unit: z.string().nullable(),
    brightness: z.number().nullable(),
    supportsBrightness: z.boolean(),
    supportsColor: z.boolean(),
    controllable: z.boolean(),
  }).passthrough()),
  mock: z.boolean().optional(),
  error: z.string().optional(),
}).passthrough()

function formatSyncTime(timestamp: number | null) {
  if (!timestamp) return "aguardando atualização"
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(timestamp)
}

function getEntityDisplayName(entity: HomeAssistantEntity) {
  if (entity.entityId === "light.abajur") return "Abajur"
  if (entity.entityId === "switch.luz_escritorio_switch_1") return "Luz escritório"
  if (entity.entityId === "cover.teto_sala_door_1") return "Teto retrátil"
  return entity.name.replace(/\s+Switch 1$/i, "").trim()
}

function EntityIcon({ entity, active }: { entity: HomeAssistantEntity; active: boolean }) {
  const className = `size-[clamp(1.2rem,3vw,1.55rem)] ${active ? "text-accent" : "text-muted-foreground"}`
  if (entity.domain === "light" && entity.entityId.includes("abajur")) return <Lamp className={className} />
  if (entity.domain === "light") return <Lightbulb className={className} />
  if (entity.domain === "switch") return <ToggleLeft className={className} />
  if (entity.domain === "cover") return <Blinds className={className} />
  return <Lightbulb className={className} />
}

function getEntityStatus(entity: HomeAssistantEntity, pending: boolean) {
  if (pending) return "enviando"
  if (entity.state === "unavailable") return "indisponível"
  if (entity.state === "unknown") return "sem estado"
  if (entity.domain === "cover") {
    if (entity.state === "open") return "aberto"
    if (entity.state === "closed") return "fechado"
    if (entity.state === "opening") return "abrindo"
    if (entity.state === "closing") return "fechando"
  }
  if (entity.state === "on") return "ligado"
  if (entity.state === "off") return "desligado"
  return entity.state
}

async function sendCommand(
  entityId: string,
  action: "toggle" | "turn_on" | "turn_off" | "open_cover" | "close_cover" | "stop_cover",
  options?: { brightness?: number; color?: Pick<ColorPreset, "colorTempKelvin" | "hsColor"> },
) {
  const response = await fetch("/api/home-assistant/service", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entityId, action, brightness: options?.brightness, color: options?.color }),
  })
  if (!response.ok) throw new Error("Home Assistant command failed")
}

export function HomeAssistantPanel() {
  const [entities, setEntities] = useState<HomeAssistantEntity[]>([])
  const [isMock, setIsMock] = useState(false)
  const [actionError, setActionError] = useState(false)
  const [pendingEntityId, setPendingEntityId] = useState<string | null>(null)

  const fetchEntities = useCallback(async () => {
    const response = await fetch("/api/home-assistant/entities")
    if (!response.ok) throw new DockDataSourceError("UPSTREAM_UNAVAILABLE")
    const parsed = entitiesResponseSchema.safeParse(await response.json())
    if (!parsed.success) throw new DockDataSourceError("INVALID_RESPONSE")
    return parsed.data
  }, [])

  const entitiesSource = useDockDataSource("home-assistant", fetchEntities, {
    panelId: "home-assistant",
    schema: entitiesResponseSchema,
  })

  useEffect(() => {
    if (!entitiesSource.data) return
    setEntities(entitiesSource.data.entities ?? [])
    setIsMock(Boolean(entitiesSource.data.mock))
    setActionError(false)
  }, [entitiesSource.data])

  const isLoading = entitiesSource.isLoading
  const isRefreshing = entitiesSource.state.status === "loading"
  const hasError = actionError || entitiesSource.state.status === "error"
  const lastSyncAt = entitiesSource.state.updatedAt ? Date.parse(entitiesSource.state.updatedAt) : null

  const visibleEntities = useMemo(() => entities.slice(0, 8), [entities])

  function handleRefresh() {
    setActionError(false)
    entitiesSource.refresh()
  }

  async function handleEntityPress(entity: HomeAssistantEntity) {
    if (isMock || pendingEntityId || !entity.controllable) return
    setPendingEntityId(entity.entityId)
    try {
      const action = entity.domain === "scene" || entity.domain === "script" ? "turn_on" : "toggle"
      await sendCommand(entity.entityId, action)
      window.setTimeout(() => entitiesSource.refresh(), 600)
    } catch {
      setActionError(true)
    } finally {
      setPendingEntityId(null)
    }
  }

  async function handleCoverCommand(entity: HomeAssistantEntity, action: "open_cover" | "close_cover" | "stop_cover") {
    if (isMock || pendingEntityId || entity.domain !== "cover") return
    setPendingEntityId(`${entity.entityId}:${action}`)
    try {
      await sendCommand(entity.entityId, action)
      window.setTimeout(() => entitiesSource.refresh(), 600)
    } catch {
      setActionError(true)
    } finally {
      setPendingEntityId(null)
    }
  }

  async function handleBrightness(entity: HomeAssistantEntity, brightness: number) {
    if (isMock || pendingEntityId || !entity.supportsBrightness) return
    setPendingEntityId(entity.entityId)
    try {
      await sendCommand(entity.entityId, brightness <= 0 ? "turn_off" : "turn_on", { brightness })
      window.setTimeout(() => entitiesSource.refresh(), 600)
    } catch {
      setActionError(true)
    } finally {
      setPendingEntityId(null)
    }
  }

  async function handleColor(entity: HomeAssistantEntity, preset: ColorPreset) {
    if (isMock || pendingEntityId || !entity.supportsColor) return
    setPendingEntityId(`${entity.entityId}:color`)
    try {
      await sendCommand(entity.entityId, "turn_on", {
        brightness: entity.brightness ?? 65,
        color: {
          colorTempKelvin: preset.colorTempKelvin,
          hsColor: preset.hsColor,
        },
      })
      window.setTimeout(() => entitiesSource.refresh(), 600)
    } catch {
      setActionError(true)
    } finally {
      setPendingEntityId(null)
    }
  }

  return (
    <section aria-labelledby="ha-heading" className="flex h-full min-h-0 w-full dock-px items-center overflow-hidden pb-[clamp(0.85rem,3vh,1.35rem)]">
      <h2 id="ha-heading" className="sr-only">Casa Inteligente</h2>
      <section className="grid h-full min-h-0 w-full min-w-0 grid-cols-3 grid-rows-[auto_minmax(0,1fr)_minmax(0,1fr)] gap-[clamp(0.3rem,0.9vh,0.55rem)]">
        {visibleEntities.length > 0 && (
          <div className="col-span-3 flex min-h-5 min-w-0 items-center justify-between gap-2 px-1 text-muted-foreground" aria-live="polite">
            <span className={`min-w-0 truncate ${hasError ? "text-destructive" : ""}`} style={{ fontSize: "clamp(0.55rem,1.35vw,0.68rem)" }}>
              {hasError
                ? "Comunicação indisponível · mostrando último estado"
                : isRefreshing
                  ? "Atualizando Home Assistant..."
                  : `Atualizado às ${formatSyncTime(lastSyncAt)}`}
            </span>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
              aria-label="Atualizar Home Assistant"
              title="Atualizar"
            >
              <RefreshCw className={isRefreshing ? "size-3.5 animate-spin" : "size-3.5"} />
            </button>
          </div>
        )}

        {isLoading && visibleEntities.length === 0 && (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-full min-h-0 rounded-lg border border-border/30 bg-secondary/20" />
          ))
        )}

        {!isLoading && visibleEntities.length === 0 && (
          <div className="col-span-3 flex h-[clamp(5rem,28vh,8rem)] items-center justify-center rounded-lg border border-border/35 bg-secondary/20 text-muted-foreground">
            <div className="flex items-center gap-2" style={{ fontSize: "clamp(0.72rem,1.8vw,0.9rem)" }}>
              {hasError ? <AlertCircle className="size-4 text-destructive" /> : <RefreshCw className="size-4" />}
              {hasError ? "Falha ao carregar Home Assistant" : "Nenhuma entidade favorita encontrada"}
              {hasError && (
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="rounded-md border border-border/45 px-2 py-1 text-foreground transition-colors hover:bg-secondary/70 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                >
                  Tentar novamente
                </button>
              )}
            </div>
          </div>
        )}

        {visibleEntities.map((entity) => {
          const active = entity.state === "on"
          const unavailable = entity.state === "unavailable" || entity.state === "unknown"
          const pending = pendingEntityId?.startsWith(entity.entityId) ?? false
          const brightnessValue = entity.supportsBrightness ? entity.brightness ?? (active ? 65 : 0) : 0

          return (
            <div
              key={entity.entityId}
              className={`flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border px-[clamp(0.6rem,1.4vw,0.9rem)] py-[clamp(0.4rem,1vh,0.6rem)] ${
                active ? "border-accent/45 bg-accent/10" : unavailable ? "border-destructive/25 bg-destructive/5" : "border-border/35 bg-secondary/20"
              }`}
            >
              <button
                onClick={() => entity.domain !== "cover" && handleEntityPress(entity)}
                disabled={isMock || pending || !entity.controllable || entity.domain === "cover"}
                className="flex min-h-0 min-w-0 flex-1 flex-col items-start overflow-hidden rounded-sm text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:opacity-60"
                aria-label={`Controlar ${getEntityDisplayName(entity)}`}
                title={getEntityDisplayName(entity)}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <EntityIcon entity={entity} active={active} />
                  <span className="font-mono uppercase text-muted-foreground/60" style={{ fontSize: "clamp(0.48rem,1.25vw,0.62rem)" }}>
                    {unavailable ? "indisponível" : DOMAIN_LABELS[entity.domain] ?? entity.domain}
                  </span>
                </div>
                <div className="mt-1.5 line-clamp-2 min-w-0 font-semibold leading-tight text-foreground" style={{ fontSize: "clamp(0.92rem,2.3vw,1.2rem)" }}>
                  {getEntityDisplayName(entity)}
                </div>
                <div className="mt-auto font-mono text-muted-foreground/70" style={{ fontSize: "clamp(0.58rem,1.45vw,0.72rem)" }}>
                  {getEntityStatus(entity, pending)}
                </div>
              </button>

              {entity.supportsBrightness && (
                <div className="mt-1">
                  <div className="mb-0.5 font-mono text-muted-foreground/70" style={{ fontSize: "clamp(0.52rem,1.35vw,0.66rem)" }}>
                    {brightnessValue}%
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={brightnessValue}
                    onChange={(event) => handleBrightness(entity, Number(event.target.value))}
                    className="h-4 w-full accent-[var(--accent)]"
                    aria-label={`Brilho de ${entity.name}`}
                  />
                </div>
              )}

              {entity.domain === "cover" && (
                <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => handleCoverCommand(entity, "open_cover")}
                    disabled={isMock || unavailable || Boolean(pendingEntityId)}
                    className="flex h-8 items-center justify-center rounded-md bg-secondary/70 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-35"
                    aria-label={`Abrir ${getEntityDisplayName(entity)}`}
                  >
                    <ArrowUp className="size-4" />
                  </button>
                  <button
                    onClick={() => handleCoverCommand(entity, "stop_cover")}
                    disabled={isMock || unavailable || Boolean(pendingEntityId)}
                    className="flex h-8 items-center justify-center rounded-md bg-secondary/70 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-35"
                    aria-label={`Parar ${getEntityDisplayName(entity)}`}
                  >
                    <Square className="size-3.5" />
                  </button>
                  <button
                    onClick={() => handleCoverCommand(entity, "close_cover")}
                    disabled={isMock || unavailable || Boolean(pendingEntityId)}
                    className="flex h-8 items-center justify-center rounded-md bg-secondary/70 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-35"
                    aria-label={`Fechar ${getEntityDisplayName(entity)}`}
                  >
                    <ArrowDown className="size-4" />
                  </button>
                </div>
              )}

              {entity.supportsColor && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {LIGHT_COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleColor(entity, preset)}
                      disabled={isMock || unavailable || Boolean(pendingEntityId)}
                      className="size-3.5 rounded-full border border-border/50 ring-offset-background transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                      style={{ backgroundColor: preset.swatch }}
                      aria-label={`${preset.label} em ${getEntityDisplayName(entity)}`}
                      title={preset.label}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </section>
    </section>
  )
}
