"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import type { ZodType } from "zod"
import type { DockPanelId } from "@/lib/dock-panels"
import {
  DOCK_DATA_SOURCE_DEFINITIONS,
  dockDataSourceStateSchema,
  dockRuntimeEventSchema,
  type DockDataSourceId,
  type DockDataSourceState,
  type DockRuntimeEvent,
} from "@/lib/dock-runtime"

type DockDataFetcher<T> = () => Promise<T>

type DataSourceSubscriber = {
  panelId?: DockPanelId
  activeOnly: boolean
  fetcher: () => Promise<unknown>
  schema?: ZodType<unknown>
  notify: () => void
}

type DataSourceEntry = {
  id: DockDataSourceId
  state: DockDataSourceState
  subscribers: Map<number, DataSourceSubscriber>
  timer: ReturnType<typeof setTimeout> | null
  inFlight: Promise<void> | null
  refreshQueued: boolean
  nextSubscriberId: number
}

function createIdleState(id: DockDataSourceId): DockDataSourceState {
  return {
    id,
    status: "idle",
    data: null,
    updatedAt: null,
    staleAt: null,
    errorCode: null,
  }
}

export class DockDataSourceError extends Error {
  readonly code: string

  constructor(code: string) {
    super(code)
    this.name = "DockDataSourceError"
    this.code = code
  }
}

export class DockDataSourceCoordinator {
  private readonly entries = new Map<DockDataSourceId, DataSourceEntry>()
  private eventSequence = 0
  private activePanelId: DockPanelId | null = null
  private lowPowerMode = false

  constructor(private readonly onEvent: (event: DockRuntimeEvent) => void = () => undefined) {}

  recordEvent(source: string, text: string) {
    this.onEvent(dockRuntimeEventSchema.parse({
      id: `${Date.now()}-${this.eventSequence++}`,
      source,
      text,
      at: new Date().toISOString(),
    }))
  }

  getState(id: DockDataSourceId) {
    const entry = this.entries.get(id)
    if (!entry) return createIdleState(id)

    if (
      entry.state.status === "ready" &&
      entry.state.staleAt &&
      Date.parse(entry.state.staleAt) <= Date.now()
    ) {
      return { ...entry.state, status: "stale" as const }
    }

    return entry.state
  }

  subscribe(
    id: DockDataSourceId,
    subscriber: Omit<DataSourceSubscriber, "notify">,
    notify: () => void,
  ) {
    const entry = this.getOrCreateEntry(id)
    const subscriberId = entry.nextSubscriberId++
    entry.subscribers.set(subscriberId, { ...subscriber, notify })
    notify()
    this.reconcile(entry)

    return () => {
      const current = this.entries.get(id)
      if (!current) return
      current.subscribers.delete(subscriberId)
      if (current.subscribers.size === 0) {
        if (current.timer) clearTimeout(current.timer)
        this.entries.delete(id)
        return
      }
      this.reconcile(current)
    }
  }

  setRuntime(activePanelId: DockPanelId | null, lowPowerMode: boolean) {
    this.activePanelId = activePanelId
    this.lowPowerMode = lowPowerMode
    for (const entry of this.entries.values()) this.reconcile(entry)
  }

  refresh(id: DockDataSourceId) {
    const entry = this.entries.get(id)
    if (!entry) return

    if (entry.timer) {
      clearTimeout(entry.timer)
      entry.timer = null
    }
    if (entry.inFlight) {
      entry.refreshQueued = true
      return
    }

    void this.request(entry, true).finally(() => this.schedule(entry))
  }

  private getOrCreateEntry(id: DockDataSourceId) {
    const existing = this.entries.get(id)
    if (existing) return existing

    const created: DataSourceEntry = {
      id,
      state: createIdleState(id),
      subscribers: new Map(),
      timer: null,
      inFlight: null,
      refreshQueued: false,
      nextSubscriberId: 1,
    }
    this.entries.set(id, created)
    return created
  }

  private isAllowedToRun(entry: DataSourceEntry) {
    const definition = DOCK_DATA_SOURCE_DEFINITIONS[entry.id]
    if (this.lowPowerMode && definition.lowPowerRefreshIntervalMs === null) return false
    if (!definition.activeOnly) return true

    return Array.from(entry.subscribers.values()).some((subscriber) => (
      !subscriber.activeOnly || subscriber.panelId === this.activePanelId
    ))
  }

  private reconcile(entry: DataSourceEntry) {
    const wasPaused = entry.state.status === "paused"
    if (entry.timer) {
      clearTimeout(entry.timer)
      entry.timer = null
    }

    if (!this.isAllowedToRun(entry)) {
      if (!entry.inFlight && entry.state.status !== "idle" && entry.state.status !== "paused") {
        this.setState(entry, { ...entry.state, status: "paused" })
      }
      return
    }

    if (wasPaused) {
      this.setState(entry, {
        ...entry.state,
        status: entry.state.data === null ? "idle" : "stale",
      })
      if (!entry.inFlight) {
        void this.request(entry).finally(() => this.schedule(entry))
        return
      }
    }

    if (entry.state.data === null && !entry.inFlight) {
      void this.request(entry).finally(() => this.schedule(entry))
      return
    }
    this.schedule(entry)
  }

  private schedule(entry: DataSourceEntry) {
    if (!this.isAllowedToRun(entry) || entry.timer || entry.inFlight) return

    if (entry.refreshQueued) {
      entry.refreshQueued = false
      void this.request(entry, true).finally(() => this.schedule(entry))
      return
    }

    const definition = DOCK_DATA_SOURCE_DEFINITIONS[entry.id]
    const interval = this.lowPowerMode
      ? definition.lowPowerRefreshIntervalMs
      : definition.refreshIntervalMs
    if (interval === null) return

    entry.timer = setTimeout(() => {
      entry.timer = null
      void this.request(entry).finally(() => this.schedule(entry))
    }, interval)
  }

  private setState(entry: DataSourceEntry, nextState: DockDataSourceState) {
    const previousStatus = entry.state.status
    entry.state = dockDataSourceStateSchema.parse(nextState)
    if (entry.state.status === "error" && previousStatus !== "error") {
      this.recordEvent(DOCK_DATA_SOURCE_DEFINITIONS[entry.id].label, "Fonte indisponível; mantendo o último valor.")
    }
    if (entry.state.status === "unauthorized" && previousStatus !== "unauthorized") {
      this.recordEvent(DOCK_DATA_SOURCE_DEFINITIONS[entry.id].label, "Autorização necessária para atualizar.")
    }
    for (const subscriber of entry.subscribers.values()) subscriber.notify()
  }

  private async request(entry: DataSourceEntry, force = false) {
    if (entry.inFlight || (!force && !this.isAllowedToRun(entry))) return
    const subscriber = entry.subscribers.values().next().value as DataSourceSubscriber | undefined
    if (!subscriber) return

    const request = (async () => {
      const currentState = this.getState(entry.id)
      this.setState(entry, { ...currentState, status: "loading", errorCode: null })

      try {
        const value = await subscriber.fetcher()
        const parsed = subscriber.schema?.safeParse(value)
        if (parsed && !parsed.success) throw new DockDataSourceError("INVALID_RESPONSE")

        const now = new Date()
        const staleAt = new Date(now.getTime() + DOCK_DATA_SOURCE_DEFINITIONS[entry.id].staleAfterMs)
        this.setState(entry, {
          id: entry.id,
          status: "ready",
          data: parsed?.success ? parsed.data : value,
          updatedAt: now.toISOString(),
          staleAt: staleAt.toISOString(),
          errorCode: null,
        })
      } catch (error) {
        const errorCode = error instanceof DockDataSourceError
          ? error.code
          : "UPSTREAM_UNAVAILABLE"
        const currentState = this.getState(entry.id)
        this.setState(entry, {
          ...currentState,
          status: errorCode === "UNAUTHORIZED" ? "unauthorized" : "error",
          errorCode,
        })
      }
    })()

    entry.inFlight = request
    try {
      await request
    } finally {
      entry.inFlight = null
    }
  }
}

type DockRuntimeContextValue = {
  activePanelId: DockPanelId | null
  lowPowerMode: boolean
  events: readonly DockRuntimeEvent[]
  setActivePanel: (panelId: DockPanelId | null) => void
  setLowPowerMode: (enabled: boolean) => void
  recordEvent: (source: string, text: string) => void
  getDataSourceState: (id: DockDataSourceId) => DockDataSourceState
  subscribeDataSource: (
    id: DockDataSourceId,
    subscriber: Omit<DataSourceSubscriber, "notify">,
    notify: () => void,
  ) => () => void
  refreshDataSource: (id: DockDataSourceId) => void
}

const DockRuntimeContext = createContext<DockRuntimeContextValue | null>(null)

export function DockRuntimeProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<DockRuntimeEvent[]>([])
  const coordinatorRef = useRef<DockDataSourceCoordinator | null>(null)
  if (!coordinatorRef.current) {
    coordinatorRef.current = new DockDataSourceCoordinator((event) => {
      setEvents((current) => [event, ...current].slice(0, 20))
    })
  }

  const [activePanelId, setActivePanelId] = useState<DockPanelId | null>(null)
  const [lowPowerMode, setLowPowerMode] = useState(false)
  const coordinator = coordinatorRef.current

  useEffect(() => {
    coordinator.setRuntime(activePanelId, lowPowerMode)
  }, [activePanelId, coordinator, lowPowerMode])

  useEffect(() => {
    document.documentElement.dataset.dockPower = lowPowerMode ? "low" : "normal"
    return () => {
      delete document.documentElement.dataset.dockPower
    }
  }, [lowPowerMode])

  const getDataSourceState = useCallback((id: DockDataSourceId) => coordinator.getState(id), [coordinator])
  const subscribeDataSource = useCallback<DockRuntimeContextValue["subscribeDataSource"]>(
    (id, subscriber, notify) => coordinator.subscribe(id, subscriber, notify),
    [coordinator],
  )
  const refreshDataSource = useCallback((id: DockDataSourceId) => coordinator.refresh(id), [coordinator])
  const recordEvent = useCallback((source: string, text: string) => coordinator.recordEvent(source, text), [coordinator])

  const value = useMemo(() => ({
    activePanelId,
    lowPowerMode,
    events,
    setActivePanel: setActivePanelId,
    setLowPowerMode,
    recordEvent,
    getDataSourceState,
    subscribeDataSource,
    refreshDataSource,
  }), [activePanelId, events, getDataSourceState, lowPowerMode, recordEvent, refreshDataSource, subscribeDataSource])

  return <DockRuntimeContext.Provider value={value}>{children}</DockRuntimeContext.Provider>
}

export function useDockRuntime() {
  const context = useContext(DockRuntimeContext)
  if (!context) throw new Error("useDockRuntime must be used within DockRuntimeProvider")
  return context
}

export function useDockDataSource<T>(
  id: DockDataSourceId,
  fetcher: DockDataFetcher<T>,
  options: { panelId?: DockPanelId; activeOnly?: boolean; schema?: ZodType<T> } = {},
) {
  const runtime = useDockRuntime()
  const { getDataSourceState, subscribeDataSource, refreshDataSource } = runtime
  const fetcherRef = useRef(fetcher)
  const schemaRef = useRef<ZodType<T> | undefined>(options.schema)
  fetcherRef.current = fetcher
  schemaRef.current = options.schema

  const [state, setState] = useState(() => getDataSourceState(id))

  useEffect(() => subscribeDataSource(
    id,
    {
      panelId: options.panelId,
      activeOnly: options.activeOnly ?? DOCK_DATA_SOURCE_DEFINITIONS[id].activeOnly,
      fetcher: () => fetcherRef.current(),
      schema: schemaRef.current as ZodType<unknown> | undefined,
    },
    () => setState(getDataSourceState(id)),
  ), [fetcher, getDataSourceState, id, options.activeOnly, options.panelId, subscribeDataSource])

  const prevDataRef = useRef(state.data)
  const parsedDataRef = useRef<T | null>(
    options.schema && state.data !== null
      ? options.schema.safeParse(state.data).data ?? null
      : (state.data as T | null),
  )

  if (state.data !== prevDataRef.current) {
    prevDataRef.current = state.data
    parsedDataRef.current = options.schema && state.data !== null
      ? options.schema.safeParse(state.data).data ?? null
      : (state.data as T | null)
  }

  const data = parsedDataRef.current

  const [, setStaleTick] = useState(0)
  useEffect(() => {
    if (!state.staleAt) return
    const delay = Math.max(0, Date.parse(state.staleAt) - Date.now())
    const timeout = window.setTimeout(() => setStaleTick((value) => value + 1), delay + 1)
    return () => window.clearTimeout(timeout)
  }, [state.staleAt])

  const isStale = state.status === "stale"
    || state.status === "error"
    || (state.staleAt !== null && Date.parse(state.staleAt) <= Date.now())
  const refresh = useCallback(() => refreshDataSource(id), [id, refreshDataSource])

  return {
    data,
    state,
    isLoading: state.status === "loading" || state.status === "idle",
    isStale,
    refresh,
  }
}
