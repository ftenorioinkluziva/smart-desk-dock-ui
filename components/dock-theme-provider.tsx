"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { useUserProfile } from "@/components/user-profile-provider"
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

export function DockThemeProvider({ children }: { children: ReactNode }) {
  const { profile, userId, hasProfileData, updateProfile } = useUserProfile()
  const [appearance, setAppearance] = useState<DockAppearance>(DEFAULT_DOCK_APPEARANCE)

  const setTheme = useCallback((themePreset: DockThemeId) => {
    setAppearance((current) => {
      const next = { ...current, themePreset }
      applyAppearance(next)
      cacheAppearance(next)
      return next
    })
    updateProfile({ themePreset })
  }, [updateProfile])

  const setAccent = useCallback((accentPreset: DockAccentId) => {
    setAppearance((current) => {
      const next = { ...current, accentPreset }
      applyAppearance(next)
      cacheAppearance(next)
      return next
    })
    updateProfile({ accentPreset })
  }, [updateProfile])

  const setLayout = useCallback((layoutPreset: DockLayoutId) => {
    setAppearance((current) => {
      const next = { ...current, layoutPreset }
      applyAppearance(next)
      cacheAppearance(next)
      return next
    })
    updateProfile({ layoutPreset })
  }, [updateProfile])

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
    if (!userId) {
      setAppearance(DEFAULT_DOCK_APPEARANCE)
      applyAppearance(DEFAULT_DOCK_APPEARANCE)
      return
    }
    if (!hasProfileData) return

    const next = normalizeDockAppearance(profile)
    setAppearance(next)
    applyAppearance(next)
    cacheAppearance(next)
  }, [hasProfileData, profile, userId])

  const value = useMemo(() => ({ appearance, setTheme, setAccent, setLayout }), [appearance, setAccent, setLayout, setTheme])

  return <DockThemeContext.Provider value={value}>{children}</DockThemeContext.Provider>
}

export function useDockTheme() {
  const context = useContext(DockThemeContext)
  if (!context) throw new Error("useDockTheme must be used within DockThemeProvider")
  return context
}
