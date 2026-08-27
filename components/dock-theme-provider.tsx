"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { authClient } from "@/lib/auth-client"
import {
  DEFAULT_DOCK_APPEARANCE,
  DOCK_APPEARANCE_STORAGE_KEY,
  DOCK_THEMES,
  normalizeDockAppearance,
  type DockAccentId,
  type DockAppearance,
  type DockLayoutId,
  type DockThemeId,
} from "@/lib/dock-theme"

type DockThemeContextValue = {
  appearance: DockAppearance
  setTheme: (themePreset: DockThemeId) => void
  setAccent: (accentPreset: DockAccentId) => void
  setLayout: (layoutPreset: DockLayoutId) => void
}

const DockThemeContext = createContext<DockThemeContextValue | null>(null)

function applyAppearance(appearance: DockAppearance) {
  const root = document.documentElement
  root.dataset.dockTheme = appearance.themePreset
  root.dataset.dockAccent = appearance.accentPreset
  root.dataset.dockLayout = appearance.layoutPreset
  root.style.colorScheme = appearance.themePreset === "paper-light" ? "light" : "dark"

  const theme = DOCK_THEMES.find((item) => item.id === appearance.themePreset)
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute(
    "content",
    theme?.browserColor ?? DOCK_THEMES[0].browserColor,
  )
}

function cacheAppearance(appearance: DockAppearance) {
  try {
    localStorage.setItem(DOCK_APPEARANCE_STORAGE_KEY, JSON.stringify(appearance))
  } catch {
    // Appearance still works for this session when storage is unavailable.
  }
}

async function persistAppearance(patch: Partial<DockAppearance>) {
  await fetch("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  }).catch(() => {})
}

export function DockThemeProvider({ children }: { children: ReactNode }) {
  const { data: session } = authClient.useSession()
  const [appearance, setAppearance] = useState<DockAppearance>(DEFAULT_DOCK_APPEARANCE)
  const interactionVersionRef = useRef(0)

  const setTheme = useCallback((themePreset: DockThemeId) => {
    interactionVersionRef.current += 1
    setAppearance((current) => {
      const next = { ...current, themePreset }
      applyAppearance(next)
      cacheAppearance(next)
      void persistAppearance({ themePreset })
      return next
    })
  }, [])

  const setAccent = useCallback((accentPreset: DockAccentId) => {
    interactionVersionRef.current += 1
    setAppearance((current) => {
      const next = { ...current, accentPreset }
      applyAppearance(next)
      cacheAppearance(next)
      void persistAppearance({ accentPreset })
      return next
    })
  }, [])

  const setLayout = useCallback((layoutPreset: DockLayoutId) => {
    interactionVersionRef.current += 1
    setAppearance((current) => {
      const next = { ...current, layoutPreset }
      applyAppearance(next)
      cacheAppearance(next)
      void persistAppearance({ layoutPreset })
      return next
    })
  }, [])

  useEffect(() => {
    try {
      const cached = normalizeDockAppearance(JSON.parse(localStorage.getItem(DOCK_APPEARANCE_STORAGE_KEY) ?? "{}"))
      setAppearance(cached)
      applyAppearance(cached)
    } catch {
      applyAppearance(DEFAULT_DOCK_APPEARANCE)
    }
  }, [])

  useEffect(() => {
    if (!session?.user?.id) return

    let cancelled = false
    const interactionVersion = interactionVersionRef.current

    async function syncProfile() {
      const response = await fetch("/api/profile").catch(() => null)
      if (!response?.ok || cancelled) return

      const data = await response.json() as { profile?: unknown }
      if (cancelled || !data.profile || interactionVersion !== interactionVersionRef.current) return

      const next = normalizeDockAppearance(data.profile)
      setAppearance(next)
      applyAppearance(next)
      cacheAppearance(next)
    }

    void syncProfile()
    return () => { cancelled = true }
  }, [session?.user?.id])

  const value = useMemo(() => ({ appearance, setTheme, setAccent, setLayout }), [appearance, setAccent, setLayout, setTheme])

  return <DockThemeContext.Provider value={value}>{children}</DockThemeContext.Provider>
}

export function useDockTheme() {
  const context = useContext(DockThemeContext)
  if (!context) throw new Error("useDockTheme must be used within DockThemeProvider")
  return context
}
