import { NextResponse } from "next/server"
import { isAuthResponse, requireCurrentUser } from "@/lib/current-user"
import { getUserProfile, updateUserProfile } from "@/lib/user-profile"
import { parseJsonBody, operationErrorResponse } from "@/lib/http/operation-response"
import { userProfilePatchSchema } from "@/lib/operations/contracts"

export async function GET(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user

  const profile = await getUserProfile(user.id)
  return NextResponse.json({ profile })
}

export async function PATCH(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user

  const parsed = await parseJsonBody(request, userProfilePatchSchema)
  if (!parsed.ok) return operationErrorResponse(parsed.error)

  const profile = await updateUserProfile(user.id, parsed.value)
  return NextResponse.json({ profile })
}
