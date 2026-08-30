import {
  userProfilePatchSchema,
  userProfileSchema,
  type UserProfile,
  type UserProfilePatch,
} from "@/lib/operations/contracts"

const userProfileResponseSchema = userProfileSchema.transform((profile) => ({ profile }))

async function readProfileResponse(response: Response) {
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) return null

  const parsed = userProfileResponseSchema.safeParse(
    payload && typeof payload === "object" && "profile" in payload
      ? payload.profile
      : null,
  )
  return parsed.success ? parsed.data.profile : null
}

export async function fetchUserProfile(): Promise<UserProfile | null> {
  try {
    return await readProfileResponse(await fetch("/api/profile", { cache: "no-store" }))
  } catch {
    return null
  }
}

export async function patchUserProfile(patch: UserProfilePatch): Promise<UserProfile | null> {
  const parsedPatch = userProfilePatchSchema.safeParse(patch)
  if (!parsedPatch.success) return null

  try {
    return await readProfileResponse(await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsedPatch.data),
    }))
  } catch {
    return null
  }
}
