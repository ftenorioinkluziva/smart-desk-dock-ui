"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { Bell, BriefcaseBusiness, Check, ChevronDown, ChevronUp, Clock3, Eye, EyeOff, KeyRound, LayoutDashboard, LogOut, Palette, RefreshCw, Search, Settings, Volume2, Vibrate, X } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { writeSelectedCalendarIds } from "@/lib/calendar-settings"
import { isWithinNightMode, readNightModeSettings, writeNightModeSettings, type NightModeSettings } from "@/lib/dock-settings"
import { DOCK_ACCENTS, DOCK_LAYOUTS, DOCK_THEMES } from "@/lib/dock-theme"
import { useDockTheme } from "@/components/dock-theme-provider"
import { DOCK_PANEL_DEFINITIONS, useDockPanels } from "@/components/dock-panel-provider"
import { useDockRuntime } from "@/components/dock-runtime-provider"
import { useUserProfile } from "@/components/user-profile-provider"
import type { DockPanelId } from "@/lib/dock-panels"
import { clearFocusDockLocalState } from "@/lib/user-cache"
import {
  financeAuthUserResponseSchema,
  financeLoginInputSchema,
  homeAssistantEntityCatalogApiResponseSchema,
  homeAssistantIntegrationStatusSchema,
  type UserProfile,
  type UserProfilePatch,
  type HomeAssistantEntityCatalogEntry,
  type FinanceAuthUser,
} from "@/lib/operations/contracts"
import { FINANCE_AUTH_CHANGED_EVENT } from "@/lib/finance-auth"
import {
  getNotificationPermission,
  getProductivityAudioStatus,
  isStandaloneProductivityApp,
  PRODUCTIVITY_AUDIO_STATUS_EVENT,
  readProductivityAlertSettings,
  readPomodoroDurations,
  requestProductivityNotificationPermission,
  testProductivityAudio,
  writePomodoroDurations,
  writeProductivityAlertSettings,
  type PomodoroDurations,
  type PomodoroMode,
  type ProductivityAudioStatus,
  type ProductivityAlertPreference,
  type ProductivityAlertSettings,
} from "@/lib/productivity-settings"

type CalendarOption = {
  id: string
  name: string
  primary: boolean
  color: string | null
}

type CalendarListResponse = {
  calendars: CalendarOption[]
  mock?: boolean
}

type HomeAssistantStatus = {
  configured: boolean
  hasUrl: boolean
  hasToken: boolean
  entityIds: string[]
}

const ALERT_OPTIONS: Array<{ value: ProductivityAlertPreference; label: string; description: string; icon: ReactNode }> = [
  { value: "visual", label: "Visual", description: "Sem vibração ou som.", icon: <Eye className="size-3.5" /> },
  { value: "visual-vibration", label: "Vibração", description: "Usa vibração quando o aparelho suporta.", icon: <Vibrate className="size-3.5" /> },
  { value: "visual-sound", label: "Som", description: "Toca um aviso curto no navegador.", icon: <Volume2 className="size-3.5" /> },
]

const POMODORO_DURATION_FIELDS: Array<{ mode: PomodoroMode; label: string }> = [
  { mode: "focus", label: "Foco" },
  { mode: "short-break", label: "Pausa" },
  { mode: "long-break", label: "Longa" },
]

const SETTINGS_FIELD_LABEL_CLASS = "mb-1 block text-muted-foreground uppercase tracking-[0.08em]"
const SETTINGS_INPUT_CLASS = "min-h-9 min-w-0 w-full rounded-lg border border-border/50 bg-background px-2.5 py-2 text-[clamp(0.66rem,1.5vw,0.76rem)] leading-none text-foreground outline-none placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
const SETTINGS_SECTION_CLASS = "rounded-xl border border-border/35 bg-secondary/20 p-[clamp(0.7rem,1.35vh,1rem)]"
const SETTINGS_SECTION_TITLE_CLASS = "mb-2 flex items-center gap-1.5 text-[clamp(0.75rem,1.75vw,0.9rem)] font-medium leading-tight text-foreground"
const SETTINGS_ACTION_CLASS = "inline-flex min-h-9 items-center justify-center rounded-lg border border-border/50 bg-secondary/60 px-3 py-1.5 text-[clamp(0.64rem,1.4vw,0.74rem)] font-medium text-foreground transition-[background-color,color,transform] duration-150 active:scale-[0.96] hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
const SETTINGS_ICON_BUTTON_CLASS = "flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-[background-color,color,transform] duration-150 active:scale-[0.96] hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"

export function SettingsPanel({ showTrigger = true }: { showTrigger?: boolean }) {
  const { data: session } = authClient.useSession()
  const { profile, hasProfileData, updateProfile } = useUserProfile()
  const { appearance, setAccent, setLayout, setTheme } = useDockTheme()
  const { config: dockPanelConfig, setPanelVisibility, movePanel, setInitialPanel, setAutoRotate } = useDockPanels()
  const { events: runtimeEvents, refreshDataSource } = useDockRuntime()
  const [isOpen, setIsOpen] = useState(false)
  const [calendars, setCalendars] = useState<CalendarOption[]>([])
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([])
  const [nightModeSettings, setNightModeSettings] = useState<NightModeSettings>(() => readNightModeSettings())
  const [alertSettings, setAlertSettings] = useState<ProductivityAlertSettings>(() => readProductivityAlertSettings())
  const [pomodoroDurations, setPomodoroDurations] = useState<PomodoroDurations>(() => readPomodoroDurations())
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">(() => getNotificationPermission())
  const [audioStatus, setAudioStatus] = useState<ProductivityAudioStatus>(() => getProductivityAudioStatus())
  const [weatherLocation, setWeatherLocation] = useState("Brasília")
  const [weatherLat, setWeatherLat] = useState("-15.886953")
  const [weatherLon, setWeatherLon] = useState("-47.813873")
  const [weatherTimezone, setWeatherTimezone] = useState("America/Sao_Paulo")
  const [primaryClockLabel, setPrimaryClockLabel] = useState("Brasília")
  const [primaryClockTimezone, setPrimaryClockTimezone] = useState("America/Sao_Paulo")
  const [secondaryClocks, setSecondaryClocks] = useState([
    { label: "Lisboa", timezone: "Europe/Lisbon" },
    { label: "Nova York", timezone: "America/New_York" },
  ])
  const [openAiConfigured, setOpenAiConfigured] = useState(false)
  const [openAiKey, setOpenAiKey] = useState("")
  const [spotifyStatus, setSpotifyStatus] = useState<{ appConfigured: boolean; connected: boolean; displayName: string | null } | null>(null)
  const [financeUser, setFinanceUser] = useState<FinanceAuthUser | null>(null)
  const [financeEmail, setFinanceEmail] = useState("")
  const [financePassword, setFinancePassword] = useState("")
  const [financeAuthLoading, setFinanceAuthLoading] = useState(false)
  const [financeAuthError, setFinanceAuthError] = useState<string | null>(null)
  const [homeAssistantStatus, setHomeAssistantStatus] = useState<HomeAssistantStatus | null>(null)
  const [homeAssistantUrl, setHomeAssistantUrl] = useState("")
  const [homeAssistantToken, setHomeAssistantToken] = useState("")
  const [homeAssistantEntityIds, setHomeAssistantEntityIds] = useState("")
  const [homeAssistantCatalog, setHomeAssistantCatalog] = useState<HomeAssistantEntityCatalogEntry[]>([])
  const [homeAssistantCatalogSearch, setHomeAssistantCatalogSearch] = useState("")
  const [homeAssistantCatalogLoading, setHomeAssistantCatalogLoading] = useState(false)
  const [homeAssistantError, setHomeAssistantError] = useState<string | null>(null)
  const homeAssistantPatchQueueRef = useRef<Promise<void>>(Promise.resolve())
  const panelRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(false)

  const patchProfile = useCallback((patch: UserProfilePatch) => {
    updateProfile(patch)
  }, [updateProfile])

  const patchHomeAssistant = useCallback((body: Record<string, unknown>) => {
    const run = homeAssistantPatchQueueRef.current.then(async () => {
      const response = await fetch("/api/integrations/home-assistant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).catch(() => null)

      const payload: unknown = await response?.json().catch(() => null) ?? null
      if (!response?.ok) {
        const message = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
          ? payload.error
          : `Não foi possível salvar o Home Assistant${response ? ` (${response.status})` : ""}`
        setHomeAssistantError(message)
        return false
      }

      const parsed = homeAssistantIntegrationStatusSchema.safeParse(payload)
      if (!parsed.success) {
        setHomeAssistantError("O Home Assistant retornou uma configuração inválida")
        return false
      }

      setHomeAssistantStatus(parsed.data)
      setHomeAssistantEntityIds(parsed.data.entityIds.join(","))
      setHomeAssistantError(null)
      refreshDataSource("home-assistant")
      return true
    })

    homeAssistantPatchQueueRef.current = run.then(() => undefined, () => undefined)
    return run
  }, [refreshDataSource])

  const applyProfile = useCallback((nextProfile: UserProfile) => {
    setWeatherLocation(nextProfile.weatherLocation)
    setWeatherLat(String(nextProfile.weatherLat))
    setWeatherLon(String(nextProfile.weatherLon))
    setWeatherTimezone(nextProfile.weatherTimezone)
    setNightModeSettings((current) => ({
      enabled: nextProfile.nightModeEnabled,
      start: nextProfile.nightModeStart,
      end: nextProfile.nightModeEnd,
      manualActive: current.manualActive,
      lowPowerWithNightMode: current.lowPowerWithNightMode,
    }))
    setAlertSettings({
      preference: nextProfile.productivityAlertPreference,
      notificationEnabled: nextProfile.productivityNotificationEnabled,
    })
    setPomodoroDurations({
      "focus": nextProfile.pomodoroFocusSeconds,
      "short-break": nextProfile.pomodoroShortBreakSeconds,
      "long-break": nextProfile.pomodoroLongBreakSeconds,
    })
    setSelectedCalendarIds(nextProfile.googleCalendarIds)
    setHomeAssistantEntityIds(nextProfile.homeAssistantEntityIds.join(","))
    setPrimaryClockLabel(nextProfile.primaryClockLabel)
    setPrimaryClockTimezone(nextProfile.primaryClockTimezone)
    setSecondaryClocks(nextProfile.secondaryClocks)
  }, [])

  const fetchIntegrationStatuses = useCallback(async () => {
    const [openAiResponse, spotifyResponse, homeAssistantResponse, financeResponse] = await Promise.all([
      fetch("/api/integrations/openai").catch(() => null),
      fetch("/api/spotify/auth/status").catch(() => null),
      fetch("/api/integrations/home-assistant").catch(() => null),
      fetch("/api/finance/auth/me").catch(() => null),
    ])

    if (openAiResponse?.ok) {
      const data = await openAiResponse.json() as { configured: boolean }
      setOpenAiConfigured(data.configured)
    }
    if (spotifyResponse?.ok) {
      setSpotifyStatus(await spotifyResponse.json() as { appConfigured: boolean; connected: boolean; displayName: string | null })
    }
    if (financeResponse?.ok) {
      const parsed = financeAuthUserResponseSchema.safeParse(await financeResponse.json())
      setFinanceUser(parsed.success ? parsed.data.user : null)
    } else if (financeResponse?.status === 401) {
      setFinanceUser(null)
    }
    if (homeAssistantResponse?.ok) {
      const parsed = homeAssistantIntegrationStatusSchema.safeParse(await homeAssistantResponse.json())
      if (parsed.success) {
        setHomeAssistantStatus(parsed.data)
        setHomeAssistantEntityIds(parsed.data.entityIds.join(","))
        if (!parsed.data.configured) setHomeAssistantCatalog([])
      }
    }
  }, [])

  const fetchHomeAssistantCatalog = useCallback(async () => {
    setHomeAssistantCatalogLoading(true)
    try {
      const response = await fetch("/api/home-assistant/catalog")
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        setHomeAssistantCatalog([])
        setHomeAssistantError("Não foi possível listar os dispositivos do Home Assistant")
        return
      }

      const parsed = homeAssistantEntityCatalogApiResponseSchema.safeParse(payload)
      if (!parsed.success) {
        setHomeAssistantCatalog([])
        setHomeAssistantError("O Home Assistant retornou uma lista inválida de dispositivos")
        return
      }

      setHomeAssistantCatalog(parsed.data.entities)
      setHomeAssistantError(null)
    } catch {
      setHomeAssistantCatalog([])
      setHomeAssistantError("Não foi possível conectar ao Home Assistant")
    } finally {
      setHomeAssistantCatalogLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      panelRef.current?.querySelector<HTMLElement>("button, input, [tabindex]:not([tabindex='-1'])")?.focus()
    }
  }, [isOpen])

  const fetchCalendars = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/calendar-list")
      if (!response.ok) return

      const data = await response.json() as CalendarListResponse
      setCalendars(data.calendars)

      if (profile.googleCalendarIds.length > 0) {
        setSelectedCalendarIds(profile.googleCalendarIds)
        return
      }

      const primary = data.calendars.find((calendar) => calendar.primary)
      const fallback = primary ? [primary.id] : data.calendars[0] ? [data.calendars[0].id] : []
      setSelectedCalendarIds(fallback)
      if (fallback.length > 0) {
        window.setTimeout(() => writeSelectedCalendarIds(fallback), 0)
        patchProfile({ googleCalendarIds: fallback })
      }
    } finally {
      setIsLoading(false)
    }
  }, [patchProfile, profile.googleCalendarIds])

  useEffect(() => {
    if (isOpen) {
      setNotificationPermission(getNotificationPermission())
      void fetchIntegrationStatuses()
      void fetchCalendars()
    }
  }, [fetchCalendars, fetchIntegrationStatuses, isOpen])

  useEffect(() => {
    if (isOpen && hasProfileData) applyProfile(profile)
  }, [applyProfile, hasProfileData, isOpen, profile])

  useEffect(() => {
    if (isOpen && homeAssistantStatus?.configured) void fetchHomeAssistantCatalog()
  }, [fetchHomeAssistantCatalog, homeAssistantStatus?.configured, isOpen])

  useEffect(() => {
    const handleAudioStatusChange = (event: Event) => {
      const detail = (event as CustomEvent<ProductivityAudioStatus>).detail
      if (detail === "unsupported" || detail === "needs-activation" || detail === "ready") {
        setAudioStatus(detail)
      }
    }

    window.addEventListener(PRODUCTIVITY_AUDIO_STATUS_EVENT, handleAudioStatusChange)
    return () => window.removeEventListener(PRODUCTIVITY_AUDIO_STATUS_EVENT, handleAudioStatusChange)
  }, [])

  function toggleCalendar(calendarId: string) {
    const next = selectedCalendarIds.includes(calendarId)
      ? selectedCalendarIds.filter((id) => id !== calendarId)
      : [...selectedCalendarIds, calendarId]
    const normalized = next.length > 0 ? next : [calendarId]

    setSelectedCalendarIds(normalized)
    writeSelectedCalendarIds(normalized)
    patchProfile({ googleCalendarIds: normalized })
  }

  function updateNightModeSettings(nextSettings: NightModeSettings) {
    setNightModeSettings(nextSettings)
    writeNightModeSettings(nextSettings)
    patchProfile({
      nightModeEnabled: nextSettings.enabled,
      nightModeStart: nextSettings.start,
      nightModeEnd: nextSettings.end,
    })
  }

  function updateAlertPreference(preference: ProductivityAlertPreference) {
    const nextSettings = { ...alertSettings, preference }
    setAlertSettings(nextSettings)
    if (preference === "visual-sound") setAudioStatus(getProductivityAudioStatus())
    writeProductivityAlertSettings(nextSettings)
    patchProfile({
      productivityAlertPreference: nextSettings.preference,
      productivityNotificationEnabled: nextSettings.notificationEnabled,
    })
  }

  async function activateProductivityAudio() {
    setAudioStatus(await testProductivityAudio())
  }

  async function enableBrowserNotifications() {
    const permission = await requestProductivityNotificationPermission()
    setNotificationPermission(permission)

    const nextSettings = {
      ...alertSettings,
      notificationEnabled: permission === "granted",
    }
    setAlertSettings(nextSettings)
    writeProductivityAlertSettings(nextSettings)
    patchProfile({
      productivityAlertPreference: nextSettings.preference,
      productivityNotificationEnabled: nextSettings.notificationEnabled,
    })
  }

  function disableBrowserNotifications() {
    const nextSettings = {
      ...alertSettings,
      notificationEnabled: false,
    }
    setAlertSettings(nextSettings)
    writeProductivityAlertSettings(nextSettings)
    patchProfile({
      productivityAlertPreference: nextSettings.preference,
      productivityNotificationEnabled: nextSettings.notificationEnabled,
    })
  }

  function updatePomodoroDuration(mode: PomodoroMode, value: string) {
    const parsedMinutes = Number(value.replace(",", "."))
    const minutes = Number.isFinite(parsedMinutes)
      ? Math.max(1, Math.min(180, Math.round(parsedMinutes)))
      : Math.round(pomodoroDurations[mode] / 60)

    const nextDurations = {
      ...pomodoroDurations,
      [mode]: minutes * 60,
    }

    setPomodoroDurations(nextDurations)
    writePomodoroDurations(nextDurations)
    patchProfile({
      pomodoroFocusSeconds: nextDurations["focus"],
      pomodoroShortBreakSeconds: nextDurations["short-break"],
      pomodoroLongBreakSeconds: nextDurations["long-break"],
    })
  }

  async function saveWeatherSettings() {
    await patchProfile({
      weatherLocation,
      weatherLat: Number(weatherLat),
      weatherLon: Number(weatherLon),
      weatherTimezone,
      googleCalendarTimezone: weatherTimezone,
    })
  }

  async function saveClockSettings() {
    await patchProfile({
      primaryClockLabel,
      primaryClockTimezone,
      secondaryClocks: secondaryClocks.filter((clock) => clock.label.trim() && clock.timezone.trim()),
    })
  }

  function updateSecondaryClock(index: number, field: "label" | "timezone", value: string) {
    setSecondaryClocks((current) => current.map((clock, clockIndex) => clockIndex === index ? { ...clock, [field]: value } : clock))
  }

  async function saveOpenAiKey() {
    if (!openAiKey.trim()) return
    const response = await fetch("/api/integrations/openai", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: openAiKey }),
    })
    if (response.ok) {
      setOpenAiConfigured(true)
      setOpenAiKey("")
    }
  }

  async function clearOpenAiKey() {
    await fetch("/api/integrations/openai", { method: "DELETE" })
    setOpenAiConfigured(false)
    setOpenAiKey("")
  }

  async function disconnectSpotify() {
    await fetch("/api/spotify/auth/disconnect", { method: "POST" })
    await fetchIntegrationStatuses()
  }

  async function loginFinance() {
    setFinanceAuthError(null)
    const credentials = financeLoginInputSchema.safeParse({
      email: financeEmail,
      password: financePassword,
    })
    if (!credentials.success) {
      setFinanceAuthError("Informe um email e uma senha válidos")
      return
    }

    setFinanceAuthLoading(true)
    try {
      const response = await fetch("/api/finance/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials.data),
      })
      const payload: unknown = await response.json().catch(() => null)

      if (!response.ok) {
        const message = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
          ? payload.error
          : `Não foi possível autenticar no Paridade Risco (${response.status})`
        setFinanceAuthError(message)
        return
      }

      const parsed = financeAuthUserResponseSchema.safeParse(payload)
      if (!parsed.success) {
        setFinanceAuthError("O Paridade Risco retornou uma resposta inválida")
        return
      }

      setFinanceUser(parsed.data.user)
      setFinanceEmail("")
      setFinancePassword("")
      setFinanceAuthError(null)
      window.dispatchEvent(new Event(FINANCE_AUTH_CHANGED_EVENT))
    } catch {
      setFinanceAuthError("Não foi possível conectar ao Paridade Risco")
    } finally {
      setFinanceAuthLoading(false)
    }
  }

  async function disconnectFinance() {
    setFinanceAuthError(null)
    const response = await fetch("/api/finance/auth/me", { method: "DELETE" }).catch(() => null)
    if (response && !response.ok) {
      setFinanceAuthError("Não foi possível desconectar o Paridade Risco")
      return
    }

    setFinanceUser(null)
    setFinanceEmail("")
    setFinancePassword("")
    window.dispatchEvent(new Event(FINANCE_AUTH_CHANGED_EVENT))
  }

  async function saveHomeAssistantSettings() {
    setHomeAssistantError(null)
    const body: Record<string, unknown> = {
      entityIds: homeAssistantEntityIds.split(",").map((item) => item.trim()).filter(Boolean),
    }
    if (homeAssistantUrl.trim()) body.url = homeAssistantUrl.trim()
    if (homeAssistantToken.trim()) body.token = homeAssistantToken.trim()

    if (await patchHomeAssistant(body)) {
      setHomeAssistantUrl("")
      setHomeAssistantToken("")
    }
  }

  async function clearHomeAssistantSettings() {
    await fetch("/api/integrations/home-assistant", { method: "DELETE" })
    setHomeAssistantStatus({ configured: false, hasUrl: false, hasToken: false, entityIds: [] })
    setHomeAssistantError(null)
    setHomeAssistantUrl("")
    setHomeAssistantToken("")
    setHomeAssistantEntityIds("")
    setHomeAssistantCatalog([])
    refreshDataSource("home-assistant")
  }

  function toggleHomeAssistantEntity(entityId: string) {
    const selectedIds = homeAssistantEntityIds.split(",").map((item) => item.trim()).filter(Boolean)
    const nextIds = selectedIds.includes(entityId)
      ? selectedIds.filter((item) => item !== entityId)
      : [...selectedIds, entityId]
    setHomeAssistantEntityIds(nextIds.join(","))
    void patchHomeAssistant({ entityIds: nextIds })
  }

  const selectedHomeAssistantEntityIds = homeAssistantEntityIds.split(",").map((item) => item.trim()).filter(Boolean)
  const normalizedHomeAssistantSearch = homeAssistantCatalogSearch.trim().toLocaleLowerCase("pt-BR")
  const filteredHomeAssistantCatalog = homeAssistantCatalog.filter((entity) => {
    if (!normalizedHomeAssistantSearch) return true
    return [entity.name, entity.entityId, entity.domain, entity.deviceClass ?? ""]
      .some((value) => value.toLocaleLowerCase("pt-BR").includes(normalizedHomeAssistantSearch))
  })

  return (
    <>
      {showTrigger && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`${SETTINGS_ICON_BUTTON_CLASS} text-muted-foreground/70`}
          aria-label="Configurações"
        >
          <Settings className="size-4" />
        </button>
      )}

      {isOpen && (
        <div
          className="absolute inset-0 z-30 flex items-stretch justify-end bg-background/75 p-[calc(var(--dock-pad-y)+0.25rem)]"
          onKeyDown={(e) => { if (e.key === "Escape") setIsOpen(false) }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false) }}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-heading"
            className="flex h-full min-w-0 w-[min(28rem,calc(100vw-1rem))] flex-col rounded-xl border border-border/55 bg-card px-[clamp(0.75rem,2vw,1rem)] py-[clamp(0.7rem,1.5vh,0.95rem)] text-card-foreground"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div id="settings-heading" className="text-[clamp(0.9rem,2vw,1rem)] font-medium leading-tight text-foreground">
                  Configurações
                </div>
                <div className="mt-0.5 text-[clamp(0.66rem,1.5vw,0.75rem)] leading-snug text-muted-foreground">
                  Dock e agenda
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className={SETTINGS_ICON_BUTTON_CLASS}
                aria-label="Fechar configurações"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-3 min-h-0 flex-1 flex flex-col gap-2 overflow-y-auto overscroll-contain pr-1">
              <section className={SETTINGS_SECTION_CLASS}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-foreground" style={{ fontSize: "clamp(0.7rem,1.75vw,0.84rem)" }}>
                      {session?.user?.name ?? session?.user?.email ?? "Conta"}
                    </div>
                    <div className="truncate text-muted-foreground" style={{ fontSize: "clamp(0.56rem,1.35vw,0.66rem)" }}>
                      {session?.user?.email}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (session?.user?.id) clearFocusDockLocalState(session.user.id)
                      void authClient.signOut()
                    }}
                    className={`${SETTINGS_ICON_BUTTON_CLASS} size-9`}
                    aria-label="Sair"
                  >
                    <LogOut className="size-3.5" />
                  </button>
                </div>
              </section>

              <section className={SETTINGS_SECTION_CLASS}>
                <div className={SETTINGS_SECTION_TITLE_CLASS}>
                  <LayoutDashboard className="size-3.5 text-muted-foreground" />
                  Painéis do dock
                </div>
                <label className="flex items-center justify-between gap-3 rounded-lg border border-border/30 bg-background/45 px-2 py-1.5">
                  <span className="min-w-0">
                    <span className="block text-foreground" style={{ fontSize: "clamp(0.6rem,1.5vw,0.72rem)" }}>Rotação automática</span>
                    <span className="block text-muted-foreground" style={{ fontSize: "clamp(0.52rem,1.25vw,0.62rem)" }}>Avança a cada 60 segundos</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={dockPanelConfig.autoRotate}
                    onChange={(event) => setAutoRotate(event.target.checked)}
                    className="size-4 accent-[var(--accent)]"
                    aria-label="Ativar rotação automática"
                  />
                </label>
                <div className="mt-2 flex flex-col gap-1">
                  {dockPanelConfig.panelOrder.map((panelId, index) => {
                    const definition = DOCK_PANEL_DEFINITIONS.find((item) => item.id === panelId)
                    if (!definition) return null
                    const visible = !dockPanelConfig.hiddenPanelIds.includes(panelId)
                    return (
                      <div key={panelId} className={`flex items-center gap-1 rounded-lg border px-1.5 py-1 ${visible ? "border-border/35 bg-background/35" : "border-border/20 bg-background/15 opacity-55"}`}>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-foreground" style={{ fontSize: "clamp(0.58rem,1.45vw,0.7rem)" }}>{definition.label}</div>
                          <div className="truncate text-muted-foreground" style={{ fontSize: "clamp(0.48rem,1.15vw,0.58rem)" }}>{definition.description}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPanelVisibility(panelId, !visible)}
                          className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={`${visible ? "Ocultar" : "Exibir"} painel ${definition.label}`}
                          aria-pressed={visible}
                        >
                          {visible ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => movePanel(panelId, -1)}
                          disabled={index === 0}
                          className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-25"
                          aria-label={`Mover ${definition.label} para cima`}
                        >
                          <ChevronUp className="size-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => movePanel(panelId, 1)}
                          disabled={index === dockPanelConfig.panelOrder.length - 1}
                          className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-25"
                          aria-label={`Mover ${definition.label} para baixo`}
                        >
                          <ChevronDown className="size-3" />
                        </button>
                      </div>
                    )
                  })}
                </div>
                <label className="mt-2 block text-muted-foreground" style={{ fontSize: "clamp(0.52rem,1.25vw,0.62rem)" }}>
                  Painel inicial
                  <select
                    value={dockPanelConfig.initialPanelId}
                    onChange={(event) => setInitialPanel(event.target.value as DockPanelId)}
                    className={`mt-1 ${SETTINGS_INPUT_CLASS}`}
                  >
                    {dockPanelConfig.panelOrder.filter((panelId) => !dockPanelConfig.hiddenPanelIds.includes(panelId)).map((panelId) => (
                      <option key={panelId} value={panelId}>{DOCK_PANEL_DEFINITIONS.find((item) => item.id === panelId)?.label ?? panelId}</option>
                    ))}
                  </select>
                </label>
              </section>

              <section className={SETTINGS_SECTION_CLASS}>
                <div className={SETTINGS_SECTION_TITLE_CLASS}>
                  <Palette className="size-3.5 text-muted-foreground" />
                  Aparência
                </div>

                <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Tema do dock">
                  {DOCK_THEMES.map((theme) => {
                    const selected = appearance.themePreset === theme.id
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setTheme(theme.id)}
                        className={`flex min-h-11 items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-ring ${
                          selected
                            ? "border-foreground/55 bg-background/80 text-foreground"
                            : "border-border/35 text-muted-foreground hover:border-border/70 hover:bg-background/45 hover:text-foreground"
                        }`}
                      >
                        <span
                          className="relative size-8 shrink-0 overflow-hidden rounded-md border border-foreground/15"
                          style={{ backgroundColor: theme.preview.background }}
                          aria-hidden="true"
                        >
                          <span
                            className="absolute inset-x-1 bottom-1 h-2 rounded-sm"
                            style={{ backgroundColor: theme.preview.surface }}
                          />
                          <span
                            className="absolute top-1 left-1 size-1 rounded-full"
                            style={{ backgroundColor: theme.preview.foreground }}
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium" style={{ fontSize: "clamp(0.62rem,1.55vw,0.74rem)" }}>
                            {theme.label}
                          </span>
                          <span className="block truncate opacity-70" style={{ fontSize: "clamp(0.5rem,1.2vw,0.6rem)" }}>
                            {theme.description}
                          </span>
                        </span>
                        {selected && <Check className="size-3.5 shrink-0 text-accent" aria-hidden="true" />}
                      </button>
                    )
                  })}
                </div>

                <div className="mt-2 flex items-center gap-1.5 text-muted-foreground" style={{ fontSize: "clamp(0.56rem,1.35vw,0.66rem)" }}>
                  <LayoutDashboard className="size-3" />
                  Modo de layout
                </div>
                <div className="mt-1 grid grid-cols-3 gap-1" role="radiogroup" aria-label="Modo de layout">
                  {DOCK_LAYOUTS.map((layout) => {
                    const selected = appearance.layoutPreset === layout.id
                    return (
                      <button
                        key={layout.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setLayout(layout.id)}
                        className={`min-w-0 rounded-lg border px-1.5 py-1.5 text-left transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-ring ${
                          selected
                            ? "border-foreground/55 bg-background/80 text-foreground"
                            : "border-border/35 text-muted-foreground hover:border-border/70 hover:bg-background/45 hover:text-foreground"
                        }`}
                      >
                        <span className="block truncate font-medium" style={{ fontSize: "clamp(0.56rem,1.4vw,0.68rem)" }}>
                          {layout.label}
                        </span>
                        <span className="mt-0.5 block truncate opacity-70" style={{ fontSize: "clamp(0.46rem,1.1vw,0.54rem)" }}>
                          {layout.description}
                        </span>
                      </button>
                    )
                  })}
                </div>

                <div className="mt-2 text-muted-foreground" style={{ fontSize: "clamp(0.56rem,1.35vw,0.66rem)" }}>
                  Cor de ação
                </div>
                <div className="mt-1 flex items-center justify-between gap-1" role="radiogroup" aria-label="Cor de ação">
                  {DOCK_ACCENTS.map((accent) => {
                    const selected = appearance.accentPreset === accent.id
                    return (
                      <button
                        key={accent.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={accent.label}
                        title={accent.label}
                        onClick={() => setAccent(accent.id)}
                        className={`flex size-11 items-center justify-center rounded-lg border transition-[background-color,border-color,transform] duration-150 active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-ring ${
                          selected ? "border-foreground/70 bg-background/80" : "border-border/35 hover:border-border/70"
                        }`}
                      >
                        <span
                          className="size-6 rounded-md border border-foreground/15"
                          style={{ backgroundColor: accent.color }}
                          aria-hidden="true"
                        />
                      </button>
                    )
                  })}
                </div>
              </section>

              <section className={SETTINGS_SECTION_CLASS}>
                <div className={SETTINGS_SECTION_TITLE_CLASS}>
                  Clima
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-2">
                  <label htmlFor="weather-location" className="min-w-0">
                    <span className={SETTINGS_FIELD_LABEL_CLASS} style={{ fontSize: "clamp(0.5rem,1.15vw,0.58rem)" }}>Cidade</span>
                    <input id="weather-location" value={weatherLocation} onChange={(event) => setWeatherLocation(event.target.value)} onBlur={saveWeatherSettings} className={SETTINGS_INPUT_CLASS} placeholder="Ex.: Brasília" />
                  </label>
                  <label htmlFor="weather-timezone" className="min-w-0">
                    <span className={SETTINGS_FIELD_LABEL_CLASS} style={{ fontSize: "clamp(0.5rem,1.15vw,0.58rem)" }}>Fuso horário</span>
                    <input id="weather-timezone" value={weatherTimezone} onChange={(event) => setWeatherTimezone(event.target.value)} onBlur={saveWeatherSettings} className={SETTINGS_INPUT_CLASS} placeholder="Ex.: America/Sao_Paulo" />
                  </label>
                  <label htmlFor="weather-latitude" className="min-w-0">
                    <span className={SETTINGS_FIELD_LABEL_CLASS} style={{ fontSize: "clamp(0.5rem,1.15vw,0.58rem)" }}>Latitude</span>
                    <input id="weather-latitude" value={weatherLat} onChange={(event) => setWeatherLat(event.target.value)} onBlur={saveWeatherSettings} className={SETTINGS_INPUT_CLASS} placeholder="Ex.: -15.886953" inputMode="decimal" />
                  </label>
                  <label htmlFor="weather-longitude" className="min-w-0">
                    <span className={SETTINGS_FIELD_LABEL_CLASS} style={{ fontSize: "clamp(0.5rem,1.15vw,0.58rem)" }}>Longitude</span>
                    <input id="weather-longitude" value={weatherLon} onChange={(event) => setWeatherLon(event.target.value)} onBlur={saveWeatherSettings} className={SETTINGS_INPUT_CLASS} placeholder="Ex.: -47.813873" inputMode="decimal" />
                  </label>
                </div>
                <div className="mt-1.5 text-muted-foreground/60" style={{ fontSize: "clamp(0.48rem,1.15vw,0.58rem)" }}>
                  A cidade e as coordenadas definem onde consultar o clima.
                </div>
              </section>

              <section className={SETTINGS_SECTION_CLASS}>
                <div className={SETTINGS_SECTION_TITLE_CLASS}>
                  <Clock3 className="size-3.5 text-muted-foreground" />
                  Relógios do Today
                </div>
                <div className="space-y-2">
                  <fieldset className="min-w-0">
                    <legend className="mb-1 text-muted-foreground" style={{ fontSize: "clamp(0.58rem,1.3vw,0.64rem)" }}>Relógio principal</legend>
                    <div className="grid grid-cols-2 gap-x-2">
                      <label htmlFor="primary-clock-label" className="min-w-0">
                        <span className={SETTINGS_FIELD_LABEL_CLASS} style={{ fontSize: "clamp(0.5rem,1.15vw,0.58rem)" }}>Nome exibido</span>
                        <input id="primary-clock-label" value={primaryClockLabel} onChange={(event) => setPrimaryClockLabel(event.target.value)} onBlur={saveClockSettings} className={SETTINGS_INPUT_CLASS} placeholder="Ex.: Brasília" />
                      </label>
                      <label htmlFor="primary-clock-timezone" className="min-w-0">
                        <span className={SETTINGS_FIELD_LABEL_CLASS} style={{ fontSize: "clamp(0.5rem,1.15vw,0.58rem)" }}>Fuso horário</span>
                        <input id="primary-clock-timezone" value={primaryClockTimezone} onChange={(event) => setPrimaryClockTimezone(event.target.value)} onBlur={saveClockSettings} className={SETTINGS_INPUT_CLASS} placeholder="Ex.: America/Sao_Paulo" />
                      </label>
                    </div>
                  </fieldset>
                  {secondaryClocks.map((clock, index) => (
                    <fieldset key={index} className="min-w-0">
                      <legend className="mb-1 text-muted-foreground" style={{ fontSize: "clamp(0.58rem,1.3vw,0.64rem)" }}>Relógio alternativo {index + 1}</legend>
                      <div className="grid grid-cols-2 gap-x-2">
                        <label htmlFor={`secondary-clock-${index}-label`} className="min-w-0">
                          <span className={SETTINGS_FIELD_LABEL_CLASS} style={{ fontSize: "clamp(0.5rem,1.15vw,0.58rem)" }}>Nome exibido</span>
                          <input id={`secondary-clock-${index}-label`} value={clock.label} onChange={(event) => updateSecondaryClock(index, "label", event.target.value)} onBlur={saveClockSettings} className={SETTINGS_INPUT_CLASS} placeholder={`Ex.: Fuso ${index + 1}`} />
                        </label>
                        <label htmlFor={`secondary-clock-${index}-timezone`} className="min-w-0">
                          <span className={SETTINGS_FIELD_LABEL_CLASS} style={{ fontSize: "clamp(0.5rem,1.15vw,0.58rem)" }}>Fuso horário</span>
                          <input id={`secondary-clock-${index}-timezone`} value={clock.timezone} onChange={(event) => updateSecondaryClock(index, "timezone", event.target.value)} onBlur={saveClockSettings} className={SETTINGS_INPUT_CLASS} placeholder="Ex.: Europe/Lisbon" />
                        </label>
                      </div>
                    </fieldset>
                  ))}
                </div>
                <div className="mt-2 text-muted-foreground/60" style={{ fontSize: "clamp(0.48rem,1.15vw,0.58rem)" }}>
                  Use o fuso IANA, por exemplo America/Sao_Paulo. Salva ao sair do campo.
                </div>
              </section>

              <section className={SETTINGS_SECTION_CLASS}>
                <div className={SETTINGS_SECTION_TITLE_CLASS}>
                  <KeyRound className="size-3.5 text-muted-foreground" />
                  OpenAI
                  <span className="text-muted-foreground" style={{ fontSize: "clamp(0.56rem,1.35vw,0.66rem)" }}>
                    {openAiConfigured ? "configurado" : "pendente"}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="password"
                    value={openAiKey}
                    onChange={(event) => setOpenAiKey(event.target.value)}
                    className={`${SETTINGS_INPUT_CLASS} flex-1`}
                    placeholder="OpenAI API key"
                  />
                  <button type="button" onClick={saveOpenAiKey} className={SETTINGS_ACTION_CLASS}>Salvar</button>
                  {openAiConfigured && <button type="button" onClick={clearOpenAiKey} className={`${SETTINGS_ACTION_CLASS} border-border/40 bg-transparent text-muted-foreground hover:bg-secondary/40`}>Limpar</button>}
                </div>
              </section>

              <section className={SETTINGS_SECTION_CLASS}>
                <div className={SETTINGS_SECTION_TITLE_CLASS}>
                  Spotify
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 truncate text-muted-foreground" style={{ fontSize: "clamp(0.58rem,1.45vw,0.7rem)" }}>
                    {!spotifyStatus?.appConfigured
                      ? "App Spotify sem credenciais"
                      : spotifyStatus.connected
                        ? `Conectado: ${spotifyStatus.displayName ?? "Spotify"}`
                        : "Conta Spotify não conectada"}
                  </div>
                  {spotifyStatus?.connected ? (
                    <button type="button" onClick={disconnectSpotify} className={`${SETTINGS_ACTION_CLASS} shrink-0 border-border/40 bg-transparent text-muted-foreground hover:bg-secondary/40`}>Desconectar</button>
                  ) : (
                    <a href="/api/spotify/auth/start" className={`${SETTINGS_ACTION_CLASS} shrink-0`}>Conectar</a>
                  )}
                </div>
              </section>

              <section className={SETTINGS_SECTION_CLASS}>
                <div className={SETTINGS_SECTION_TITLE_CLASS}>
                  <BriefcaseBusiness className="size-3.5 text-muted-foreground" />
                  Paridade de Risco
                  <span className="text-muted-foreground" style={{ fontSize: "clamp(0.56rem,1.35vw,0.66rem)" }}>
                    {financeUser ? "conectado" : "pendente"}
                  </span>
                </div>

                {financeUser ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 truncate text-muted-foreground" style={{ fontSize: "clamp(0.58rem,1.45vw,0.7rem)" }}>
                      Conectado: {financeUser.name ?? financeUser.email}
                    </div>
                    <button type="button" onClick={() => void disconnectFinance()} className={`${SETTINGS_ACTION_CLASS} shrink-0 border-border/40 bg-transparent text-muted-foreground hover:bg-secondary/40`}>
                      Desconectar
                    </button>
                  </div>
                ) : (
                  <form onSubmit={(event) => { event.preventDefault(); void loginFinance() }} className="grid grid-cols-1 gap-1.5">
                    <input
                      id="finance-settings-email"
                      type="email"
                      value={financeEmail}
                      onChange={(event) => setFinanceEmail(event.target.value)}
                      className={SETTINGS_INPUT_CLASS}
                      placeholder="Email do Paridade Risco"
                      autoComplete="email"
                      required
                    />
                    <input
                      id="finance-settings-password"
                      type="password"
                      value={financePassword}
                      onChange={(event) => setFinancePassword(event.target.value)}
                      className={SETTINGS_INPUT_CLASS}
                      placeholder="Senha do Paridade Risco"
                      autoComplete="current-password"
                      required
                    />
                    <button type="submit" disabled={financeAuthLoading} className={`${SETTINGS_ACTION_CLASS} justify-self-start`}>
                      {financeAuthLoading ? "Entrando..." : "Entrar"}
                    </button>
                  </form>
                )}

                <p className="mt-1 text-muted-foreground/60" style={{ fontSize: "clamp(0.5rem,1.2vw,0.6rem)" }}>
                  A sessão fica protegida no servidor; a senha não é armazenada pelo Focus Dock.
                </p>
                {financeAuthError && (
                  <p role="alert" className="mt-1 text-destructive/90" style={{ fontSize: "clamp(0.58rem,1.35vw,0.68rem)" }}>
                    {financeAuthError}
                  </p>
                )}
              </section>

              <section className={SETTINGS_SECTION_CLASS}>
                <div className={SETTINGS_SECTION_TITLE_CLASS}>
                  Home Assistant
                </div>
                <div className="mb-1 text-muted-foreground" style={{ fontSize: "clamp(0.56rem,1.35vw,0.66rem)" }}>
                  {homeAssistantStatus?.configured ? "Configurado" : "Pendente"}
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  <input value={homeAssistantUrl} onChange={(event) => setHomeAssistantUrl(event.target.value)} className={SETTINGS_INPUT_CLASS} placeholder={homeAssistantStatus?.hasUrl ? "URL configurada" : "Home Assistant URL"} />
                  <input type="password" value={homeAssistantToken} onChange={(event) => setHomeAssistantToken(event.target.value)} className={SETTINGS_INPUT_CLASS} placeholder={homeAssistantStatus?.hasToken ? "Token configurado" : "Token"} />
                  {homeAssistantStatus?.configured ? (
                    <div className="mt-1">
                      <div className="mb-1 flex items-center justify-between gap-2 text-muted-foreground" style={{ fontSize: "clamp(0.56rem,1.35vw,0.66rem)" }}>
                        <span>Dispositivos no painel Casa</span>
                        <span className="shrink-0 font-mono tabular-nums">{selectedHomeAssistantEntityIds.length} selecionados</span>
                      </div>
                      <div className="flex gap-1.5">
                        <label className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md border border-border/50 bg-background px-2 py-1 text-muted-foreground focus-within:border-ring">
                          <Search className="size-3.5 shrink-0" aria-hidden="true" />
                          <input
                            value={homeAssistantCatalogSearch}
                            onChange={(event) => setHomeAssistantCatalogSearch(event.target.value)}
                            className="min-w-0 flex-1 bg-transparent text-foreground outline-none"
                            placeholder="Filtrar dispositivos"
                            aria-label="Filtrar dispositivos do Home Assistant"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => void fetchHomeAssistantCatalog()}
                          disabled={homeAssistantCatalogLoading}
                          className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border/45 bg-background text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                          aria-label="Atualizar dispositivos do Home Assistant"
                          title="Atualizar lista"
                        >
                          <RefreshCw className={`size-3.5 ${homeAssistantCatalogLoading ? "animate-spin" : ""}`} />
                        </button>
                      </div>

                      {homeAssistantCatalogLoading && (
                        <div className="mt-2 text-muted-foreground" style={{ fontSize: "clamp(0.58rem,1.4vw,0.7rem)" }}>
                          Consultando dispositivos...
                        </div>
                      )}

                      {!homeAssistantCatalogLoading && homeAssistantCatalog.length === 0 && (
                        <div className="mt-2 rounded-md border border-border/30 bg-background/30 px-2 py-2 text-muted-foreground" style={{ fontSize: "clamp(0.58rem,1.4vw,0.7rem)" }}>
                          Nenhuma entidade controlável encontrada.
                        </div>
                      )}

                      {!homeAssistantCatalogLoading && homeAssistantCatalog.length > 0 && filteredHomeAssistantCatalog.length === 0 && (
                        <div className="mt-2 rounded-md border border-border/30 bg-background/30 px-2 py-2 text-muted-foreground" style={{ fontSize: "clamp(0.58rem,1.4vw,0.7rem)" }}>
                          Nenhum dispositivo corresponde ao filtro.
                        </div>
                      )}

                      {!homeAssistantCatalogLoading && filteredHomeAssistantCatalog.length > 0 && (
                        <div className="dock-list-scroll mt-2 max-h-[clamp(8rem,28vh,12rem)] overflow-y-auto rounded-md border border-border/30 bg-background/30 p-1">
                          {filteredHomeAssistantCatalog.map((entity) => {
                            const selected = selectedHomeAssistantEntityIds.includes(entity.entityId)
                            return (
                              <button
                                key={entity.entityId}
                                type="button"
                                role="checkbox"
                                aria-checked={selected}
                                onClick={() => toggleHomeAssistantEntity(entity.entityId)}
                                className={`flex min-h-10 w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-[background-color,color,transform] duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring ${selected ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"}`}
                                title={entity.name}
                              >
                                <span className={`flex size-4 shrink-0 items-center justify-center rounded border ${selected ? "border-accent bg-accent text-background" : "border-border/70"}`}>
                                  {selected && <Check className="size-3" aria-hidden="true" />}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block line-clamp-2 leading-tight" style={{ fontSize: "clamp(0.62rem,1.55vw,0.75rem)" }}>
                                    {entity.name}
                                  </span>
                                  <span className="mt-0.5 block truncate font-mono text-muted-foreground/55" style={{ fontSize: "clamp(0.48rem,1.15vw,0.58rem)" }}>
                                    {entity.domain} · {entity.entityId}
                                  </span>
                                </span>
                                <span className="shrink-0 font-mono text-muted-foreground/55" style={{ fontSize: "clamp(0.48rem,1.15vw,0.58rem)" }}>
                                  {entity.state}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      )}

                      <div className="mt-1 text-muted-foreground/60" style={{ fontSize: "clamp(0.5rem,1.2vw,0.6rem)" }}>
                        Marque os dispositivos que devem aparecer no painel Casa. A lista é carregada diretamente do seu Home Assistant.
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-md border border-border/30 bg-background/30 px-2 py-2 text-muted-foreground" style={{ fontSize: "clamp(0.58rem,1.4vw,0.7rem)" }}>
                      Informe a URL e o token para carregar os dispositivos acessíveis.
                    </div>
                  )}
                  <div className="flex gap-1.5">
                    <button type="button" onClick={saveHomeAssistantSettings} className={SETTINGS_ACTION_CLASS}>Salvar</button>
                    {homeAssistantStatus?.configured && <button type="button" onClick={clearHomeAssistantSettings} className={`${SETTINGS_ACTION_CLASS} border-border/40 bg-transparent text-muted-foreground hover:bg-secondary/40`}>Limpar</button>}
                  </div>
                  {homeAssistantError && (
                    <p role="alert" className="mt-1 text-destructive/90" style={{ fontSize: "clamp(0.58rem,1.35vw,0.68rem)" }}>
                      {homeAssistantError}
                    </p>
                  )}
                </div>
              </section>

              <section className={SETTINGS_SECTION_CLASS}>
                <div className={SETTINGS_SECTION_TITLE_CLASS}>
                  <Clock3 className="size-3.5 text-muted-foreground" />
                  Produtividade
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {POMODORO_DURATION_FIELDS.map((field) => (
                    <label key={field.mode} className="flex flex-col gap-1 text-muted-foreground" style={{ fontSize: "clamp(0.56rem,1.4vw,0.68rem)" }}>
                      {field.label}
                      <input
                        type="number"
                        min={1}
                        max={180}
                        step={1}
                        inputMode="numeric"
                        value={Math.round(pomodoroDurations[field.mode] / 60)}
                        onChange={(event) => updatePomodoroDuration(field.mode, event.target.value)}
                         className={`${SETTINGS_INPUT_CLASS} text-center`}
                         aria-label={`Duração de ${field.label.toLowerCase()} em minutos`}
                      />
                    </label>
                  ))}
                </div>

                <div className="mt-2 flex items-center gap-1.5 text-muted-foreground" style={{ fontSize: "clamp(0.58rem,1.45vw,0.7rem)" }}>
                  <Bell className="size-3" />
                  Alerta
                </div>
                <div className="mt-1 grid grid-cols-3 gap-1.5">
                  {ALERT_OPTIONS.map((option) => {
                    const selected = alertSettings.preference === option.value
                    return (
                      <button
                        key={option.value}
                        onClick={() => updateAlertPreference(option.value)}
                       className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
                         selected
                           ? "border-border/70 bg-background text-foreground"
                           : "border-border/30 bg-secondary/20 text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                       }`}
                        title={option.description}
                        aria-pressed={selected}
                      >
                        {option.icon}
                        <span className="font-medium" style={{ fontSize: "clamp(0.58rem,1.45vw,0.7rem)" }}>
                          {option.label}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {alertSettings.preference === "visual-sound" && (
                  <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-border/30 bg-background/45 px-2 py-1.5">
                    <div className="min-w-0">
                      <div className="text-foreground" style={{ fontSize: "clamp(0.6rem,1.5vw,0.72rem)" }}>
                        Som deste dispositivo
                      </div>
                      <div className="truncate text-muted-foreground" style={{ fontSize: "clamp(0.52rem,1.25vw,0.62rem)" }}>
                        {audioStatus === "ready"
                          ? "Pronto para o fim do Pomodoro ou Timer"
                          : audioStatus === "unsupported"
                            ? "Indisponível; o alerta visual continua ativo"
                            : "Toque uma vez para liberar o áudio no Safari/iOS"}
                      </div>
                    </div>

                    {audioStatus !== "unsupported" && (
                      <button
                        onClick={() => void activateProductivityAudio()}
                        className={`${SETTINGS_ACTION_CLASS} shrink-0`}
                        style={{ fontSize: "clamp(0.56rem,1.35vw,0.66rem)" }}
                      >
                        {audioStatus === "ready" ? "Testar" : "Ativar e testar"}
                      </button>
                    )}
                  </div>
                )}

                <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-border/30 bg-background/45 px-2 py-1.5">
                  <div className="min-w-0">
                    <div className="text-foreground" style={{ fontSize: "clamp(0.6rem,1.5vw,0.72rem)" }}>
                      Notificação do sistema
                    </div>
                    <div className="truncate text-muted-foreground" style={{ fontSize: "clamp(0.52rem,1.25vw,0.62rem)" }}>
                      {notificationPermission === "unsupported"
                        ? isStandaloneProductivityApp()
                          ? "Indisponível neste navegador"
                          : "No iPhone/iPad, adicione o Dock à Tela de Início"
                        : notificationPermission === "denied"
                          ? "Bloqueada no navegador"
                          : alertSettings.notificationEnabled && notificationPermission === "granted"
                            ? "Ativa para Pomodoro e Timer"
                            : "Opcional, com permissão explícita"}
                    </div>
                  </div>

                  {alertSettings.notificationEnabled && notificationPermission === "granted" ? (
                    <button
                      onClick={disableBrowserNotifications}
                      className={`${SETTINGS_ACTION_CLASS} shrink-0 border-border/40 bg-secondary/40 text-muted-foreground hover:text-foreground`}
                      style={{ fontSize: "clamp(0.56rem,1.35vw,0.66rem)" }}
                    >
                      Desativar
                    </button>
                  ) : (
                    <button
                      onClick={enableBrowserNotifications}
                      disabled={notificationPermission === "unsupported" || notificationPermission === "denied"}
                      className={`${SETTINGS_ACTION_CLASS} shrink-0 disabled:opacity-45`}
                      style={{ fontSize: "clamp(0.56rem,1.35vw,0.66rem)" }}
                    >
                      Ativar
                    </button>
                  )}
                </div>
              </section>

              <section className={SETTINGS_SECTION_CLASS}>
                <label className="flex items-center justify-between gap-3">
                  <span className="text-foreground" style={{ fontSize: "clamp(0.7rem,1.75vw,0.86rem)" }}>
                    Modo noturno automático
                  </span>
                  <input
                    type="checkbox"
                    checked={nightModeSettings.enabled}
                    onChange={(event) => updateNightModeSettings({ ...nightModeSettings, enabled: event.target.checked })}
                    className="size-4 accent-[var(--accent)]"
                  />
                </label>

                <label className="mt-2 flex items-center justify-between gap-3 border-t border-border/25 pt-2">
                  <span className="min-w-0">
                    <span className="block text-foreground" style={{ fontSize: "clamp(0.68rem,1.7vw,0.82rem)" }}>
                      Baixo consumo junto
                    </span>
                    <span className="block text-muted-foreground" style={{ fontSize: "clamp(0.56rem,1.35vw,0.66rem)" }}>
                      Suspende atualizações dos painéis fora de foco durante o modo noturno.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={nightModeSettings.lowPowerWithNightMode}
                    onChange={(event) => updateNightModeSettings({ ...nightModeSettings, lowPowerWithNightMode: event.target.checked })}
                    className="size-4 shrink-0 accent-[var(--accent)]"
                  />
                </label>

                <div className="mt-2 flex items-center justify-between gap-3 border-t border-border/25 pt-2">
                  <div className="min-w-0">
                    <div className="text-foreground" style={{ fontSize: "clamp(0.68rem,1.7vw,0.82rem)" }}>
                      Tela exclusiva
                    </div>
                    <div className="text-muted-foreground" style={{ fontSize: "clamp(0.56rem,1.35vw,0.66rem)" }}>
                      {nightModeSettings.manualActive
                        ? "Ativada manualmente"
                        : isWithinNightMode(new Date(), nightModeSettings)
                          ? "Ativada pelo horário"
                          : "Disponível somente nesta tela"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateNightModeSettings({
                      ...nightModeSettings,
                      manualActive: !nightModeSettings.manualActive,
                    })}
                    className={`shrink-0 rounded-lg border px-2 py-1 text-foreground transition-[background-color,border-color,transform] duration-150 active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-ring ${
                      nightModeSettings.manualActive ? "border-foreground/50 bg-foreground text-background" : "border-border/50 bg-secondary/60"
                    }`}
                    style={{ fontSize: "clamp(0.56rem,1.35vw,0.66rem)" }}
                  >
                    {nightModeSettings.manualActive ? "Desativar" : "Ativar agora"}
                  </button>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1 text-muted-foreground" style={{ fontSize: "clamp(0.58rem,1.45vw,0.7rem)" }}>
                    Início
                    <input
                      type="time"
                      value={nightModeSettings.start}
                      onChange={(event) => updateNightModeSettings({ ...nightModeSettings, start: event.target.value })}
                    className={SETTINGS_INPUT_CLASS}
                     />
                   </label>
                   <label className="flex flex-col gap-1 text-muted-foreground" style={{ fontSize: "clamp(0.58rem,1.45vw,0.7rem)" }}>
                     Fim
                     <input
                       type="time"
                       value={nightModeSettings.end}
                       onChange={(event) => updateNightModeSettings({ ...nightModeSettings, end: event.target.value })}
                       className={SETTINGS_INPUT_CLASS}
                    />
                  </label>
                </div>
              </section>

              {runtimeEvents.length > 0 && (
                <section className={SETTINGS_SECTION_CLASS}>
                  <div className="mb-1 flex items-center gap-1.5 text-muted-foreground" style={{ fontSize: "clamp(0.6rem,1.5vw,0.72rem)" }}>
                    <Bell className="size-3" />
                    <span className="uppercase tracking-[0.12em]">Sinais recentes</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {runtimeEvents.slice(0, 3).map((event) => (
                      <div key={event.id} className="flex items-start justify-between gap-2 text-muted-foreground/70">
                        <span className="min-w-0">
                          <span className="mr-1 text-foreground/75">{event.source}</span>
                          {event.text}
                        </span>
                        <time className="shrink-0 font-mono tabular-nums text-muted-foreground/45" dateTime={event.at}>
                          {new Date(event.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </time>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <div className="mb-1 text-muted-foreground" style={{ fontSize: "clamp(0.6rem,1.5vw,0.72rem)" }}>
                Agendas exibidas
              </div>

              {isLoading && (
                <div className="text-muted-foreground" style={{ fontSize: "clamp(0.68rem,1.7vw,0.82rem)" }}>
                  Carregando agendas...
                </div>
              )}

              {!isLoading && calendars.length === 0 && (
                <div className="text-muted-foreground" style={{ fontSize: "clamp(0.68rem,1.7vw,0.82rem)" }}>
                  Nenhuma agenda disponível
                </div>
              )}

              {calendars.map((calendar) => {
                const selected = selectedCalendarIds.includes(calendar.id)
                return (
                  <button
                    key={calendar.id}
                    onClick={() => toggleCalendar(calendar.id)}
                    className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
                      selected ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    }`}
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: calendar.color ?? "var(--accent)" }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate" style={{ fontSize: "clamp(0.7rem,1.75vw,0.86rem)" }}>
                      {calendar.name}
                    </span>
                    {selected && <Check className="size-3.5 shrink-0 text-accent" />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
