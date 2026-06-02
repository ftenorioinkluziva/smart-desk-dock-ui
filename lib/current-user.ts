import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export type CurrentUser = {
  id: string
  email: string
  name?: string | null
  image?: string | null
}

export async function getCurrentUser(request: Request): Promise<CurrentUser | null> {
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  if (!session?.user?.id || !session.user.email) return null

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
  }
}

export async function requireCurrentUser(request: Request): Promise<CurrentUser | NextResponse> {
  const user = await getCurrentUser(request)
  if (!user) {
    return NextResponse.json({ authRequired: true, error: "Authentication required" }, { status: 401 })
  }
  return user
}

export function isAuthResponse(value: CurrentUser | NextResponse): value is NextResponse {
  return value instanceof NextResponse
}

