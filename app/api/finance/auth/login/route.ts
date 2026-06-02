import { NextResponse } from "next/server"
import { financeLogin } from "@/lib/finance"
import { setIntegrationSecret } from "@/lib/integration-secrets"
import { isAuthResponse, requireCurrentUser } from "@/lib/current-user"

export async function POST(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user

  try {
    const { email, password } = await request.json() as { email?: string; password?: string }
    if (!email || !password) {
      return NextResponse.json({ error: "Email e senha são obrigatórios" }, { status: 400 })
    }

    const result = await financeLogin(email, password)
    await setIntegrationSecret(user.id, "finance", "access_token", result.token)
    await setIntegrationSecret(user.id, "finance", "user_email", result.user.email)

    return NextResponse.json({ user: result.user })
  } catch (error) {
    console.error("Finance login error:", error)
    return NextResponse.json({ error: "Falha na autenticação" }, { status: 401 })
  }
}

