import { z } from "zod"
import { realtimeProductivityControlInputSchema, realtimeSpotifyControlInputSchema } from "@/lib/operations/contracts"
import { operationErrorSchema } from "@/lib/operations/errors"

export const realtimeAgentConfigured = Boolean(process.env.OPENAI_API_KEY)

export const REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL ?? "gpt-realtime-mini"
export const REALTIME_VOICE = process.env.OPENAI_REALTIME_VOICE ?? "marin"
export const REALTIME_REASONING_EFFORT = process.env.OPENAI_REALTIME_REASONING_EFFORT ?? "low"

export const REALTIME_AGENT_INSTRUCTIONS = `
Voce e o agente de voz do Focus Dock, um painel de mesa discreto para produtividade.

Responda sempre em portugues do Brasil, com frases curtas e naturais para conversa por voz.
Evite respostas longas. Priorize o que importa agora: agenda, clima, foco, casa, midia e contexto do usuario.

Use as ferramentas disponiveis para consultar dados reais do dock quando o usuario pedir clima,
agenda, musica, casa ou carteira. Nao invente dados quando uma ferramenta estiver disponivel.

As acoes mutaveis atuais sao limitadas ao Spotify e produtividade local.
Spotify: tocar, pausar, proxima faixa e faixa anterior.
Para pedidos explicitos do usuario como "pausar a musica", "proxima faixa", "tocar" ou "voltar",
execute a acao diretamente com spotify_control. Nao peca confirmacao para esses comandos simples de midia.
Produtividade: iniciar, pausar ou reiniciar Pomodoro, timer e cronometro. Execute diretamente com
productivity_control quando o pedido for explicito, como "iniciar pomodoro" ou "timer de 10 minutos".
Confirme apenas quando o pedido for ambiguo.

Quando ferramentas de acao estiverem disponiveis no futuro, nunca altere Spotify, Home Assistant,
agenda, timers ou dados financeiros sem confirmacao explicita do usuario.

Nao leia dados financeiros sensiveis em excesso. Resuma com cuidado e pergunte antes de detalhar.
`.trim()

function toolParameters(schema: z.ZodType) {
  const parameters = z.toJSONSchema(schema, { target: "draft-7" })
  delete parameters.$schema
  return parameters
}

export const REALTIME_TOOLS = [
  {
    type: "function",
    name: "get_current_weather",
    description: "Consulta o clima atual e a previsao compacta do Focus Dock.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "get_today_events",
    description: "Consulta os eventos de hoje nas agendas selecionadas do Focus Dock.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "get_spotify_status",
    description: "Consulta a musica, artista, album, dispositivo e estado atual do Spotify.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "get_home_status",
    description: "Consulta o estado das entidades favoritas do Home Assistant.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "get_finance_summary",
    description: "Consulta um resumo compacto e nao transacional da carteira de investimentos.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "spotify_control",
    description: "Executa comandos simples de Spotify quando o usuario pediu explicitamente tocar, pausar, proxima faixa ou faixa anterior. Nao use para pedidos ambiguos.",
    parameters: toolParameters(realtimeSpotifyControlInputSchema),
  },
  {
    type: "function",
    name: "productivity_control",
    description: "Executa comandos locais de produtividade quando o usuario pedir explicitamente Pomodoro, timer ou cronometro.",
    parameters: toolParameters(realtimeProductivityControlInputSchema),
  },
] as const

export type RealtimeClientSecretResponse = {
  configured: boolean
  model: string
  voice: string
  clientSecret?: string
  expiresAt?: number
  mock?: boolean
  error?: string
  operationError?: z.infer<typeof operationErrorSchema>
}

export const realtimeClientSecretResponseSchema = z.object({
  configured: z.boolean(),
  model: z.string(),
  voice: z.string(),
  clientSecret: z.string().optional(),
  expiresAt: z.number().optional(),
  mock: z.boolean().optional(),
  error: z.string().optional(),
  operationError: operationErrorSchema.optional(),
}).strict()

export function buildRealtimeSessionPayload() {
  const session: Record<string, unknown> = {
    type: "realtime",
    model: REALTIME_MODEL,
    instructions: REALTIME_AGENT_INSTRUCTIONS,
    audio: {
      input: {
        turn_detection: {
          type: "server_vad",
          create_response: true,
        },
      },
      output: {
        voice: REALTIME_VOICE,
      },
    },
    tools: REALTIME_TOOLS,
    tool_choice: "auto",
  }

  if (REALTIME_MODEL === "gpt-realtime-2") {
    session.reasoning = {
      effort: REALTIME_REASONING_EFFORT,
    }
  }

  return {
    session,
  }
}

export function buildLegacyRealtimeSessionPayload() {
  return {
    session: {
      type: "realtime",
      model: REALTIME_MODEL,
      instructions: REALTIME_AGENT_INSTRUCTIONS,
      audio: {
        output: {
          voice: REALTIME_VOICE,
        },
      },
      tools: REALTIME_TOOLS,
      tool_choice: "auto",
    },
  }
}
