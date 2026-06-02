import { NextResponse } from "next/server"
import {
  buildLegacyRealtimeSessionPayload,
  buildRealtimeSessionPayload,
  REALTIME_MODEL,
  REALTIME_VOICE,
  type RealtimeClientSecretResponse,
} from "@/lib/realtime-agent"
import { getIntegrationSecret } from "@/lib/integration-secrets"
import { isAuthResponse, requireCurrentUser } from "@/lib/current-user"

type OpenAIRealtimeClientSecret = {
  value?: string
  expires_at?: number
}

type OpenAIRealtimeSessionResponse = {
  client_secret?: OpenAIRealtimeClientSecret
  value?: string
  expires_at?: number
  error?: {
    message?: string
  }
}

function extractClientSecret(data: OpenAIRealtimeSessionResponse) {
  return {
    value: data.client_secret?.value ?? data.value,
    expiresAt: data.client_secret?.expires_at ?? data.expires_at,
  }
}

async function requestRealtimeClientSecret(endpoint: string, body: unknown, apiKey: string) {
  return fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
}

export async function POST(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user

  const apiKey = await getIntegrationSecret(user.id, "openai", "api_key")

  if (!apiKey) {
    return NextResponse.json({
      configured: false,
      model: REALTIME_MODEL,
      voice: REALTIME_VOICE,
      mock: true,
      error: "Configure sua chave OpenAI nas configurações",
    } satisfies RealtimeClientSecretResponse)
  }

  try {
    let response = await requestRealtimeClientSecret(
      "https://api.openai.com/v1/realtime/client_secrets",
      buildRealtimeSessionPayload(),
      apiKey,
    )

    if (response.status === 404 || response.status === 400) {
      response = await requestRealtimeClientSecret(
        "https://api.openai.com/v1/realtime/sessions",
        buildLegacyRealtimeSessionPayload(),
        apiKey,
      )
    }

    const data = await response.json() as OpenAIRealtimeSessionResponse

    if (!response.ok) {
      console.error("OpenAI Realtime session error:", data.error?.message ?? data)
      return NextResponse.json({
        configured: true,
        model: REALTIME_MODEL,
        voice: REALTIME_VOICE,
        error: "Realtime session creation failed",
      } satisfies RealtimeClientSecretResponse, { status: 502 })
    }

    const clientSecret = extractClientSecret(data)

    if (!clientSecret.value) {
      console.error("OpenAI Realtime session missing client secret:", data)
      return NextResponse.json({
        configured: true,
        model: REALTIME_MODEL,
        voice: REALTIME_VOICE,
        error: "Realtime session did not include a client secret",
      } satisfies RealtimeClientSecretResponse, { status: 502 })
    }

    return NextResponse.json({
      configured: true,
      model: REALTIME_MODEL,
      voice: REALTIME_VOICE,
      clientSecret: clientSecret.value,
      expiresAt: clientSecret.expiresAt,
    } satisfies RealtimeClientSecretResponse)
  } catch (error) {
    console.error("OpenAI Realtime session request failed:", error)
    return NextResponse.json({
      configured: true,
      model: REALTIME_MODEL,
      voice: REALTIME_VOICE,
      error: "Realtime session request failed",
    } satisfies RealtimeClientSecretResponse, { status: 502 })
  }
}
