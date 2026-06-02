import { NextResponse } from "next/server"
import { financeMe } from "@/lib/finance"
import { deleteIntegrationProvider, getIntegrationSecret } from "@/lib/integration-secrets"
import { isAuthResponse, requireCurrentUser } from "@/lib/current-user"

export async function GET(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user

  const token = await getIntegrationSecret(user.id, "finance", "access_token")
  if (!token) {
    return NextResponse.json({ financeAuthRequired: true }, { status: 401 })
  }

  try {
    const financeUser = await financeMe(token)
    return NextResponse.json({ user: financeUser })
  } catch (error) {
    console.error("Finance me error:", error)
    await deleteIntegrationProvider(user.id, "finance")
    return NextResponse.json({ financeAuthRequired: true, error: "Token inválido ou expirado" }, { status: 401 })
  }
}

export async function DELETE(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user

  await deleteIntegrationProvider(user.id, "finance")
  return NextResponse.json({ financeAuthRequired: true })
}

