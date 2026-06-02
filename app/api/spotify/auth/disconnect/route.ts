import { NextResponse } from "next/server"
import { isAuthResponse, requireCurrentUser } from "@/lib/current-user"
import { deleteIntegrationProvider } from "@/lib/integration-secrets"

export async function POST(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user

  await deleteIntegrationProvider(user.id, "spotify")
  return NextResponse.json({ connected: false })
}

