"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { authClient } from "@/lib/auth-client"
import { readNightModeSettings, writeNightModeSettings } from "@/lib/dock-settings"
import { writePomodoroDurations, writeProductivityAlertSettings } from "@/lib/productivity-settings"
import { writeSelectedCalendarIds } from "@/lib/calendar-settings"
import { readUserCache, writeUserCache } from "@/lib/user-cache"
import {
  userProfilePatchSchema,
  userProfileSchema,
  type UserProfile,
  type UserProfilePatch,
} from "@/lib/operations/contracts"
import { fetchUserProfile, patchUserProfile } from "@/lib/profile-client"
import { DEFAULT_USER_PROFILE } from "@/lib/user-profile-defaults"

const PROFILE_CACHE_NAMESPACE = "user-profile"

export type UserProfileStatus = "unauthenticated" | "loading" | "syncing" | "ready" | "offline"

type UserProfileContextValue = {
  profile: UserProfile
  userId: string | null
  status: UserProfileStatus
  hasProfileData: boolean
  updateProfile: (patch: UserProfilePatch) => void
  refreshProfile: () => Promise<boolean>
}

const UserProfileContext = createContext<UserProfileContextValue | null>(null)

function mergeProfile(profile: UserProfile, patch: UserProfilePatch) {
  const parsedPatch = userProfilePatchSchema.safeParse(patch)
  if (!parsedPatch.success) return null

  const next = userProfileSchema.safeParse({ ...profile, ...parsedPatch.data })
  return next.success ? next.data : null
}

function isSameValue(left: unknown, right: unknown) {
  if (Object.is(left, right)) return true
  try {
    return JSON.stringify(left) === JSON.stringify(right)
  } catch {
    return false
  }
}

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const { data: session } = authClient.useSession()
  const userId = session?.user?.id ?? null
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE)
  const [status, setStatus] = useState<UserProfileStatus>("loading")
  const [hasProfileData, setHasProfileData] = useState(false)
  const profileRef = useRef<UserProfile>(DEFAULT_USER_PROFILE)
  const generationRef = useRef(0)
  const pendingPatchRef = useRef<UserProfilePatch>({})
  const patchQueueRef = useRef<Promise<void>>(Promise.resolve())

  const applyProfile = useCallback((nextProfile: UserProfile) => {
    profileRef.current = nextProfile
    setProfile(nextProfile)
    if (userId) writeUserCache(userId, PROFILE_CACHE_NAMESPACE, nextProfile)
  }, [userId])

  const refreshProfile = useCallback(async () => {
    if (!userId) return false

    const generation = generationRef.current
    const remoteProfile = await fetchUserProfile()
    if (!remoteProfile || generation !== generationRef.current) return false

    const nextProfile = mergeProfile(remoteProfile, pendingPatchRef.current) ?? remoteProfile
    applyProfile(nextProfile)
    setHasProfileData(true)
    setStatus("ready")
    return true
  }, [applyProfile, userId])

  useEffect(() => {
    generationRef.current += 1
    const generation = generationRef.current
    pendingPatchRef.current = {}
    patchQueueRef.current = Promise.resolve()

    if (!userId) {
      profileRef.current = DEFAULT_USER_PROFILE
      setProfile(DEFAULT_USER_PROFILE)
      setHasProfileData(false)
      setStatus("unauthenticated")
      return
    }

    const cached = readUserCache(userId, PROFILE_CACHE_NAMESPACE, userProfileSchema)
    const initialProfile = cached?.data ?? DEFAULT_USER_PROFILE
    profileRef.current = initialProfile
    setProfile(initialProfile)
    setHasProfileData(Boolean(cached))
    setStatus(cached ? "syncing" : "loading")

    void refreshProfile().then((synced) => {
      if (generation !== generationRef.current || synced) return
      setStatus("offline")
    })
  }, [refreshProfile, userId])

  useEffect(() => {
    if (!userId || !hasProfileData) return

    const nightMode = readNightModeSettings()
    writeNightModeSettings({
      ...nightMode,
      enabled: profile.nightModeEnabled,
      start: profile.nightModeStart,
      end: profile.nightModeEnd,
    })
    writeProductivityAlertSettings({
      preference: profile.productivityAlertPreference,
      notificationEnabled: profile.productivityNotificationEnabled,
    })
    writePomodoroDurations({
      focus: profile.pomodoroFocusSeconds,
      "short-break": profile.pomodoroShortBreakSeconds,
      "long-break": profile.pomodoroLongBreakSeconds,
    })
    if (profile.googleCalendarIds.length > 0) {
      writeSelectedCalendarIds(profile.googleCalendarIds)
    }
  }, [hasProfileData, profile, userId])

  const updateProfile = useCallback((patch: UserProfilePatch) => {
    if (!userId) return

    const nextProfile = mergeProfile(profileRef.current, patch)
    const parsedPatch = userProfilePatchSchema.safeParse(patch)
    if (!nextProfile || !parsedPatch.success) return

    const patchToPersist = parsedPatch.data
    const generation = generationRef.current
    pendingPatchRef.current = { ...pendingPatchRef.current, ...patchToPersist }
    applyProfile(nextProfile)
    setHasProfileData(true)
    setStatus("syncing")

    patchQueueRef.current = patchQueueRef.current.then(async () => {
      const remoteProfile = await patchUserProfile(patchToPersist)
      if (!remoteProfile || generation !== generationRef.current) {
        if (generation === generationRef.current) setStatus("offline")
        return
      }

      const pending = { ...pendingPatchRef.current }
      for (const [key, value] of Object.entries(patchToPersist)) {
        const pendingKey = key as keyof UserProfilePatch
        if (isSameValue(pending[pendingKey], value)) delete pending[pendingKey]
      }
      pendingPatchRef.current = pending
      applyProfile(mergeProfile(remoteProfile, pending) ?? remoteProfile)
      setHasProfileData(true)
      setStatus("ready")
    })
  }, [applyProfile, userId])

  const value = useMemo(() => ({
    profile,
    userId,
    status,
    hasProfileData,
    updateProfile,
    refreshProfile,
  }), [hasProfileData, profile, refreshProfile, status, updateProfile, userId])

  return <UserProfileContext.Provider value={value}>{children}</UserProfileContext.Provider>
}

export function useUserProfile() {
  const context = useContext(UserProfileContext)
  if (!context) throw new Error("useUserProfile must be used within UserProfileProvider")
  return context
}
