import { NextResponse } from "next/server"
import {
  buildLegacyRealtimeSessionPayload,
  buildRealtimeSessionPayload,
  REALTIME_MODEL,
  REALTIME_VOICE,
  realtimeAgentConfigured,
  type RealtimeClientSecretResponse,
} from "@/lib/realtime-agent"

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

async function requestRealtimeClientSecret(endpoint: string, body: unknown) {
  return fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
}

export async function POST() {
  if (!realtimeAgentConfigured) {
    return NextResponse.json({
      configured: false,
      model: REALTIME_MODEL,
      voice: REALTIME_VOICE,
      mock: true,
      error: "OPENAI_API_KEY is not configured",
    } satisfies RealtimeClientSecretResponse)
  }

  try {
    let response = await requestRealtimeClientSecret(
      "https://api.openai.com/v1/realtime/client_secrets",
      buildRealtimeSessionPayload(),
    )

    if (response.status === 404 || response.status === 400) {
      response = await requestRealtimeClientSecret(
        "https://api.openai.com/v1/realtime/sessions",
        buildLegacyRealtimeSessionPayload(),
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
