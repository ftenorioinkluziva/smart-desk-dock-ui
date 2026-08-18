import { NextResponse } from "next/server"
import {
  buildLegacyRealtimeSessionPayload,
  buildRealtimeSessionPayload,
  REALTIME_MODEL,
  REALTIME_VOICE,
  realtimeClientSecretResponseSchema,
  type RealtimeClientSecretResponse,
} from "@/lib/realtime-agent"
import { getIntegrationSecret } from "@/lib/integration-secrets"
import { isAuthResponse, requireCurrentUser } from "@/lib/current-user"
import { z } from "zod"
import { operationErrorResponse } from "@/lib/http/operation-response"
import { upstreamError } from "@/lib/operations/errors"

const openAIRealtimeSessionResponseSchema = z.object({
  client_secret: z.object({ value: z.string().optional(), expires_at: z.number().optional() }).passthrough().optional(),
  value: z.string().optional(),
  expires_at: z.number().optional(),
  error: z.object({ message: z.string().optional() }).passthrough().optional(),
}).passthrough()
type OpenAIRealtimeSessionResponse = z.infer<typeof openAIRealtimeSessionResponseSchema>

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

    const parsed = openAIRealtimeSessionResponseSchema.safeParse(await response.json())
    if (!parsed.success) {
      return operationErrorResponse(
        upstreamError("OPENAI_REALTIME_RESPONSE_INVALID", "OpenAI Realtime returned an invalid response", { retryable: false }),
        { extra: { configured: true, model: REALTIME_MODEL, voice: REALTIME_VOICE } },
      )
    }
    const data = parsed.data

    if (!response.ok) {
      console.error("OpenAI Realtime session error", { status: response.status })
      return operationErrorResponse(
        upstreamError("OPENAI_REALTIME_SESSION_FAILED", "Realtime session creation failed", {
          retryable: response.status === 429 || response.status >= 500,
        }),
        { extra: { configured: true, model: REALTIME_MODEL, voice: REALTIME_VOICE } },
      )
    }

    const clientSecret = extractClientSecret(data)

    if (!clientSecret.value) {
      console.error("OpenAI Realtime session missing client secret")
      return operationErrorResponse(
        upstreamError("OPENAI_REALTIME_SECRET_MISSING", "Realtime session did not include a client secret", { retryable: false }),
        { extra: { configured: true, model: REALTIME_MODEL, voice: REALTIME_VOICE } },
      )
    }

    return NextResponse.json(realtimeClientSecretResponseSchema.parse({
      configured: true,
      model: REALTIME_MODEL,
      voice: REALTIME_VOICE,
      clientSecret: clientSecret.value,
      expiresAt: clientSecret.expiresAt,
    }))
  } catch (error) {
    console.error("OpenAI Realtime session request failed", { errorType: error instanceof Error ? error.name : "unknown" })
    return operationErrorResponse(
      upstreamError("OPENAI_REALTIME_REQUEST_FAILED", "Realtime session request failed"),
      { extra: { configured: true, model: REALTIME_MODEL, voice: REALTIME_VOICE } },
    )
  }
}
