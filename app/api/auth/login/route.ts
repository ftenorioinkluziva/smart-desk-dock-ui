import { NextRequest, NextResponse } from "next/server"
import { financeLogin } from "@/lib/finance"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json() as { email: string; password: string }
    if (!email || !password) {
      return NextResponse.json({ error: "Email e senha são obrigatórios" }, { status: 400 })
    }

    const result = await financeLogin(email, password)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Auth login error:", error)
    return NextResponse.json({ error: "Falha na autenticação" }, { status: 401 })
  }
}
