"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { useUserProfile } from "@/components/user-profile-provider"
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

export function DockPanelProvider({ children }: { children: ReactNode }) {
  const { profile, userId, hasProfileData, updateProfile } = useUserProfile()
  const [config, setConfig] = useState<DockPanelConfig>(DEFAULT_DOCK_PANEL_CONFIG)

  useEffect(() => {
    if (!userId) {
      setConfig(DEFAULT_DOCK_PANEL_CONFIG)
      return
    }

    if (!hasProfileData) return
    setConfig(normalizeDockPanelConfig({
      panelOrder: profile.dockPanelOrder,
      hiddenPanelIds: profile.dockHiddenPanelIds,
      initialPanelId: profile.dockInitialPanelId,
      autoRotate: profile.dockAutoRotate,
    }))
  }, [hasProfileData, profile, userId])

  const updateConfig = useCallback((nextValue: DockPanelConfig) => {
    const next = normalizeDockPanelConfig(nextValue)
    setConfig(next)
    updateProfile({
      dockPanelOrder: next.panelOrder,
      dockHiddenPanelIds: next.hiddenPanelIds,
      dockInitialPanelId: next.initialPanelId,
      dockAutoRotate: next.autoRotate,
    })
  }, [updateProfile])

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
