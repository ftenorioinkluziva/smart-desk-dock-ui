"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { authClient } from "@/lib/auth-client"
import {
  DEFAULT_DOCK_PANEL_CONFIG,
  DOCK_PANEL_DEFINITIONS,
  getVisibleDockPanelIds,
  normalizeDockPanelConfig,
  type DockPanelConfig,
  type DockPanelId,
} from "@/lib/dock-panels"

type DockPanelContextValue = {
  config: DockPanelConfig
  visiblePanelIds: DockPanelId[]
  setPanelVisibility: (panelId: DockPanelId, visible: boolean) => void
  movePanel: (panelId: DockPanelId, direction: -1 | 1) => void
  setInitialPanel: (panelId: DockPanelId) => void
  setAutoRotate: (enabled: boolean) => void
}

const DockPanelContext = createContext<DockPanelContextValue | null>(null)

async function persistPanelConfig(config: DockPanelConfig) {
  await fetch("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dockPanelOrder: config.panelOrder,
      dockHiddenPanelIds: config.hiddenPanelIds,
      dockInitialPanelId: config.initialPanelId,
      dockAutoRotate: config.autoRotate,
    }),
  }).catch(() => {})
}

export function DockPanelProvider({ children }: { children: ReactNode }) {
  const { data: session } = authClient.useSession()
  const [config, setConfig] = useState<DockPanelConfig>(DEFAULT_DOCK_PANEL_CONFIG)

  useEffect(() => {
    if (!session?.user?.id) {
      setConfig(DEFAULT_DOCK_PANEL_CONFIG)
      return
    }

    let cancelled = false
    async function loadProfile() {
      const response = await fetch("/api/profile").catch(() => null)
      if (!response?.ok || cancelled) return
      const data = await response.json() as { profile?: {
        dockPanelOrder?: unknown
        dockHiddenPanelIds?: unknown
        dockInitialPanelId?: unknown
        dockAutoRotate?: unknown
      } }
      if (cancelled) return
      setConfig(normalizeDockPanelConfig({
        panelOrder: data.profile?.dockPanelOrder,
        hiddenPanelIds: data.profile?.dockHiddenPanelIds,
        initialPanelId: data.profile?.dockInitialPanelId,
        autoRotate: data.profile?.dockAutoRotate,
      }))
    }

    void loadProfile()
    return () => { cancelled = true }
  }, [session?.user?.id])

  const updateConfig = useCallback((nextValue: DockPanelConfig) => {
    const next = normalizeDockPanelConfig(nextValue)
    setConfig(next)
    void persistPanelConfig(next)
  }, [])

  const setPanelVisibility = useCallback((panelId: DockPanelId, visible: boolean) => {
    updateConfig({
      ...config,
      hiddenPanelIds: visible
        ? config.hiddenPanelIds.filter((id) => id !== panelId)
        : [...config.hiddenPanelIds, panelId],
    })
  }, [config, updateConfig])

  const movePanel = useCallback((panelId: DockPanelId, direction: -1 | 1) => {
    const currentIndex = config.panelOrder.indexOf(panelId)
    const nextIndex = currentIndex + direction
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= config.panelOrder.length) return

    const panelOrder = [...config.panelOrder]
    const [moved] = panelOrder.splice(currentIndex, 1)
    panelOrder.splice(nextIndex, 0, moved)
    updateConfig({ ...config, panelOrder })
  }, [config, updateConfig])

  const setInitialPanel = useCallback((panelId: DockPanelId) => {
    updateConfig({ ...config, initialPanelId: panelId })
  }, [config, updateConfig])

  const setAutoRotate = useCallback((enabled: boolean) => {
    updateConfig({ ...config, autoRotate: enabled })
  }, [config, updateConfig])

  const value = useMemo(() => ({
    config,
    visiblePanelIds: getVisibleDockPanelIds(config),
    setPanelVisibility,
    movePanel,
    setInitialPanel,
    setAutoRotate,
  }), [config, movePanel, setAutoRotate, setInitialPanel, setPanelVisibility])

  return <DockPanelContext.Provider value={value}>{children}</DockPanelContext.Provider>
}

export function useDockPanels() {
  const context = useContext(DockPanelContext)
  if (!context) throw new Error("useDockPanels must be used within DockPanelProvider")
  return context
}

export { DOCK_PANEL_DEFINITIONS }
