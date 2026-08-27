export const DOCK_THEME_IDS = ["cockpit", "blue-hour", "warm-desk", "paper-light"] as const
export const DOCK_ACCENT_IDS = ["green", "cyan", "blue", "amber", "magenta"] as const
export const DOCK_LAYOUT_IDS = ["balanced", "compact", "focus"] as const

export type DockThemeId = (typeof DOCK_THEME_IDS)[number]
export type DockAccentId = (typeof DOCK_ACCENT_IDS)[number]
export type DockLayoutId = (typeof DOCK_LAYOUT_IDS)[number]

export type DockAppearance = {
  themePreset: DockThemeId
  accentPreset: DockAccentId
  layoutPreset: DockLayoutId
}

export const DEFAULT_DOCK_APPEARANCE: DockAppearance = {
  themePreset: "cockpit",
  accentPreset: "green",
  layoutPreset: "balanced",
}

export const DOCK_APPEARANCE_STORAGE_KEY = "focus-dock:appearance:v1"

export const DOCK_THEMES: Array<{
  id: DockThemeId
  label: string
  description: string
  browserColor: string
  preview: { background: string; surface: string; foreground: string }
}> = [
  {
    id: "cockpit",
    label: "Cockpit",
    description: "Neutro e discreto",
    browserColor: "#0b0b0b",
    preview: {
      background: "oklch(0.07 0 0)",
      surface: "oklch(0.2 0 0)",
      foreground: "oklch(0.95 0 0)",
    },
  },
  {
    id: "blue-hour",
    label: "Blue Hour",
    description: "Frio para pouca luz",
    browserColor: "#0b1018",
    preview: {
      background: "oklch(0.1 0.018 255)",
      surface: "oklch(0.23 0.025 255)",
      foreground: "oklch(0.94 0.01 245)",
    },
  },
  {
    id: "warm-desk",
    label: "Warm Desk",
    description: "Quente e confortável",
    browserColor: "#17120f",
    preview: {
      background: "oklch(0.11 0.014 55)",
      surface: "oklch(0.24 0.022 55)",
      foreground: "oklch(0.94 0.018 75)",
    },
  },
  {
    id: "paper-light",
    label: "Paper Light",
    description: "Claro para o dia",
    browserColor: "#f4f0e7",
    preview: {
      background: "oklch(0.96 0.012 85)",
      surface: "oklch(0.87 0.018 85)",
      foreground: "oklch(0.22 0.012 65)",
    },
  },
]

export const DOCK_ACCENTS: Array<{ id: DockAccentId; label: string; color: string }> = [
  { id: "green", label: "Verde sinal", color: "oklch(0.72 0.19 155)" },
  { id: "cyan", label: "Ciano", color: "oklch(0.74 0.14 205)" },
  { id: "blue", label: "Azul", color: "oklch(0.67 0.18 255)" },
  { id: "amber", label: "Âmbar", color: "oklch(0.78 0.16 75)" },
  { id: "magenta", label: "Magenta", color: "oklch(0.68 0.2 330)" },
]

export const DOCK_LAYOUTS: Array<{ id: DockLayoutId; label: string; description: string }> = [
  { id: "balanced", label: "Equilibrado", description: "Leitura completa" },
  { id: "compact", label: "Compacto", description: "Mais conteúdo" },
  { id: "focus", label: "Foco", description: "Hora e próximo passo" },
]

export function isDockThemeId(value: unknown): value is DockThemeId {
  return typeof value === "string" && DOCK_THEME_IDS.includes(value as DockThemeId)
}

export function isDockAccentId(value: unknown): value is DockAccentId {
  return typeof value === "string" && DOCK_ACCENT_IDS.includes(value as DockAccentId)
}

export function isDockLayoutId(value: unknown): value is DockLayoutId {
  return typeof value === "string" && DOCK_LAYOUT_IDS.includes(value as DockLayoutId)
}

export function normalizeDockAppearance(value: unknown): DockAppearance {
  if (!value || typeof value !== "object") return DEFAULT_DOCK_APPEARANCE

  const candidate = value as Partial<DockAppearance>
  return {
    themePreset: isDockThemeId(candidate.themePreset)
      ? candidate.themePreset
      : DEFAULT_DOCK_APPEARANCE.themePreset,
    accentPreset: isDockAccentId(candidate.accentPreset)
      ? candidate.accentPreset
      : DEFAULT_DOCK_APPEARANCE.accentPreset,
    layoutPreset: isDockLayoutId(candidate.layoutPreset)
      ? candidate.layoutPreset
      : DEFAULT_DOCK_APPEARANCE.layoutPreset,
  }
}
