"use client"

import { AlertCircle, Loader2, Mic, MicOff, PhoneOff, Volume2, Waves } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRealtimeAgent, type RealtimeAgentStatus } from "@/hooks/use-realtime-agent"
import { cn } from "@/lib/utils"

const STATUS_TEXT: Record<RealtimeAgentStatus, string> = {
  idle: "Toque para falar",
  connecting: "Conectando",
  listening: "Ouvindo",
  thinking: "Processando",
  speaking: "Falando",
  error: "Toque para tentar novamente",
}

function statusIcon(status: RealtimeAgentStatus) {
  if (status === "connecting" || status === "thinking") return <Loader2 className="size-[clamp(1.25rem,3vw,1.7rem)] animate-spin" />
  if (status === "speaking") return <Volume2 className="size-[clamp(1.25rem,3vw,1.7rem)]" />
  if (status === "listening") return <Waves className="size-[clamp(1.25rem,3vw,1.7rem)]" />
  if (status === "error") return <AlertCircle className="size-[clamp(1.25rem,3vw,1.7rem)]" />
  return <Mic className="size-[clamp(1.25rem,3vw,1.7rem)]" />
}

export function VoiceAgentPanel() {
  const { error, isConfigured, status, stop, toggle, transcript } = useRealtimeAgent()
  const isActive = status !== "idle" && status !== "error"
  const isBusy = status === "connecting" || status === "thinking"

  return (
    <section aria-labelledby="voice-heading" className="dock-px flex h-full w-full flex-col items-center justify-between overflow-hidden py-[clamp(0.45rem,1.4vh,0.95rem)]">
      <div className="flex min-h-[clamp(2.8rem,10vh,4rem)] w-full max-w-[34rem] flex-col items-center justify-center text-center">
        <h2 id="voice-heading" className="flex items-center gap-2 text-[clamp(0.6rem,1.45vw,0.72rem)] font-medium uppercase tracking-normal text-accent/85">
          <Mic className="size-[clamp(0.82rem,1.8vw,1rem)]" />
          <span>Agente</span>
        </h2>

        <p className="mt-1 max-w-[24rem] text-[clamp(0.62rem,1.45vw,0.75rem)] leading-snug text-muted-foreground/65">
          {isConfigured === false
            ? "Configure OPENAI_API_KEY para ativar."
            : "Pergunte, organize ou peça contexto do dia."}
        </p>

        {error ? (
          <div className="mt-1 line-clamp-1 max-w-[28rem] text-[clamp(0.62rem,1.45vw,0.75rem)] text-destructive">
            {error}
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(0.55rem,1.6vh,0.9rem)]">
        <button
          type="button"
          onClick={toggle}
          disabled={isBusy}
          aria-label={isActive ? "Encerrar conversa por voz" : "Iniciar conversa por voz"}
          className={cn(
            "relative flex aspect-square h-[min(51vh,14.75rem)] min-h-[8.5rem] items-center justify-center rounded-full border transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-75",
            isActive
              ? "border-accent/60 bg-accent/15 text-accent shadow-[0_0_3.4rem_color-mix(in_oklch,var(--accent)_35%,transparent)]"
              : "border-border/35 bg-secondary/20 text-foreground hover:bg-secondary/40",
            status === "error" && "border-destructive/60 bg-destructive/10 text-destructive",
          )}
        >
          <span
            className={cn(
              "absolute inset-[-0.65rem] rounded-full border opacity-0 transition-opacity",
              isActive && "border-accent/20 opacity-100",
              status === "listening" && "animate-pulse",
              status === "speaking" && "scale-110 border-accent/30 opacity-100",
            )}
            aria-hidden="true"
          />
          {statusIcon(status)}
        </button>

        <div className="flex h-[clamp(1.7rem,4.6vh,2.2rem)] items-center gap-2 text-[clamp(0.88rem,2.2vw,1.12rem)] font-semibold text-foreground">
          <span>{STATUS_TEXT[status]}</span>
          {isActive ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={stop}
              aria-label="Encerrar conversa"
              className="size-[clamp(1.8rem,4.5vw,2.25rem)] rounded-full text-muted-foreground hover:text-foreground"
            >
              <PhoneOff className="size-[clamp(0.9rem,2vw,1.1rem)]" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid min-h-[clamp(3.4rem,12vh,5.4rem)] w-full max-w-[28rem] content-end gap-1 overflow-hidden pb-[clamp(0.15rem,0.5vh,0.35rem)]">
        {transcript.length ? (
          transcript.map((item) => (
            <div
              key={item.id}
              className={cn(
                "truncate rounded-md px-2 py-1 text-[clamp(0.62rem,1.45vw,0.76rem)]",
                item.role === "user" ? "bg-secondary/35 text-muted-foreground" : "bg-accent/10 text-foreground",
              )}
            >
              <span className="mr-1 text-muted-foreground/70">{item.role === "user" ? "Voce" : "Agente"}:</span>
              {item.text}
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center gap-2 text-[clamp(0.66rem,1.55vw,0.8rem)] text-muted-foreground/70">
            {status === "idle" ? <MicOff className="size-4" /> : <Waves className="size-4" />}
            <span>{status === "idle" ? "Microfone desligado" : "Aguardando fala"}</span>
          </div>
        )}
      </div>
    </section>
  )
}
