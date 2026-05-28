import { NextRequest, NextResponse } from "next/server"
import { financeMe } from "@/lib/finance"

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null

  if (!token) {
    return NextResponse.json({ error: "Token não fornecido" }, { status: 401 })
  }

  try {
    const user = await financeMe(token)
    return NextResponse.json(user)
  } catch (error) {
    console.error("Auth me error:", error)
    return NextResponse.json({ error: "Token inválido ou expirado" }, { status: 401 })
  }
}
