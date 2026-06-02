import { NextResponse } from "next/server"
import { isAuthResponse, requireCurrentUser } from "@/lib/current-user"
import { getUserProfile, updateUserProfile, type UserProfile } from "@/lib/user-profile"

export async function GET(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user

  const profile = await getUserProfile(user.id)
  return NextResponse.json({ profile })
}

export async function PATCH(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user

  const patch = await request.json() as Partial<UserProfile>
  const profile = await updateUserProfile(user.id, patch)
  return NextResponse.json({ profile })
}

