"use client"

import { useCallback, useRef, useState } from "react"
import type { RealtimeClientSecretResponse } from "@/lib/realtime-agent"
import { executeRealtimeTool } from "@/hooks/realtime-tools"

export type RealtimeAgentStatus = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "error"

type RealtimeTranscriptItem = {
  id: string
  role: "user" | "assistant" | "system"
  text: string
}

type RealtimeServerEvent = {
  type?: string
  call_id?: string
  name?: string
  arguments?: string
  item?: {
    id?: string
    type?: string
    call_id?: string
    name?: string
    arguments?: string
    role?: "user" | "assistant" | "system"
    content?: Array<{
      transcript?: string
      text?: string
    }>
  }
  response?: {
    id?: string
  }
  delta?: string
  transcript?: string
  error?: {
    message?: string
  }
}

function isSecureMicrophoneContext() {
  return window.isSecureContext || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
}

function normalizeTranscriptEvent(event: RealtimeServerEvent): RealtimeTranscriptItem | null {
  const text = event.transcript
    ?? event.item?.content?.map((content) => content.transcript ?? content.text).filter(Boolean).join(" ")
    ?? ""

  if (!text.trim()) return null

  return {
    id: event.item?.id ?? event.response?.id ?? crypto.randomUUID(),
    role: event.item?.role ?? (event.type?.includes("input") ? "user" : "assistant"),
    text: text.trim(),
  }
}

export function useRealtimeAgent() {
  const [status, setStatus] = useState<RealtimeAgentStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [model, setModel] = useState("gpt-realtime-mini")
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null)
  const [transcript, setTranscript] = useState<RealtimeTranscriptItem[]>([])

  const peerRef = useRef<RTCPeerConnection | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const handledToolCallsRef = useRef<Set<string>>(new Set())

  const cleanup = useCallback(() => {
    dataChannelRef.current?.close()
    dataChannelRef.current = null

    peerRef.current?.getSenders().forEach((sender) => sender.track?.stop())
    peerRef.current?.close()
    peerRef.current = null

    mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    mediaStreamRef.current = null

    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.srcObject = null
      audioRef.current.remove()
      audioRef.current = null
    }

    handledToolCallsRef.current.clear()
  }, [])

  const stop = useCallback(() => {
    cleanup()
    setStatus("idle")
  }, [cleanup])

  const sendToolResult = useCallback(async (callId: string, toolName: string, rawArguments?: string) => {
    const dataChannel = dataChannelRef.current
    if (!dataChannel || dataChannel.readyState !== "open") return
    if (handledToolCallsRef.current.has(callId)) return

    handledToolCallsRef.current.add(callId)
    setStatus("thinking")

    const result = await executeRealtimeTool(toolName, rawArguments)
    dataChannel.send(JSON.stringify({
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: callId,
        output: JSON.stringify(result),
      },
    }))
    dataChannel.send(JSON.stringify({ type: "response.create" }))
  }, [])

  const handleServerEvent = useCallback((event: RealtimeServerEvent) => {
    if (event.type === "error") {
      setError(event.error?.message ?? "Erro no agente de voz")
      setStatus("error")
      return
    }

    const toolCall = event.type === "response.function_call_arguments.done"
      ? { callId: event.call_id, name: event.name, arguments: event.arguments }
      : event.type === "response.output_item.done" && event.item?.type === "function_call"
      ? { callId: event.item.call_id, name: event.item.name, arguments: event.item.arguments }
      : null

    if (toolCall?.callId && toolCall.name) {
      void sendToolResult(toolCall.callId, toolCall.name, toolCall.arguments)
      return
    }

    if (event.type === "input_audio_buffer.speech_started") {
      setStatus("listening")
      return
    }

    if (event.type === "input_audio_buffer.speech_stopped") {
      setStatus("thinking")
      return
    }

    if (event.type === "response.audio.delta") {
      setStatus("speaking")
      return
    }

    if (event.type === "response.done") {
      setStatus("listening")
    }

    if (
      event.type === "conversation.item.input_audio_transcription.completed"
      || event.type === "response.audio_transcript.done"
      || event.type === "conversation.item.created"
    ) {
      const item = normalizeTranscriptEvent(event)
      if (!item) return
      setTranscript((current) => [...current.filter((entry) => entry.id !== item.id), item].slice(-4))
    }
  }, [sendToolResult])

  const start = useCallback(async () => {
    if (status === "connecting") return

    setStatus("connecting")
    setError(null)

    try {
      if (!isSecureMicrophoneContext()) {
        throw new Error("Microfone exige HTTPS, localhost ou 127.0.0.1")
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microfone nao disponivel neste navegador")
      }

      const sessionResponse = await fetch("/api/realtime/session", { method: "POST" })
      const session = await sessionResponse.json() as RealtimeClientSecretResponse

      setModel(session.model)
      setIsConfigured(session.configured)

      if (!session.configured || !session.clientSecret) {
        throw new Error(session.error ?? "Configure OPENAI_API_KEY para ativar o agente")
      }

      if (!sessionResponse.ok) {
        throw new Error(session.error ?? "Nao foi possivel criar a sessao realtime")
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      mediaStreamRef.current = mediaStream

      const peer = new RTCPeerConnection()
      peerRef.current = peer

      const audio = document.createElement("audio")
      audio.autoplay = true
      audio.setAttribute("playsinline", "true")
      audioRef.current = audio
      document.body.appendChild(audio)

      peer.ontrack = (event) => {
        audio.srcObject = event.streams[0]
      }

      mediaStream.getAudioTracks().forEach((track) => peer.addTrack(track, mediaStream))

      const dataChannel = peer.createDataChannel("oai-events")
      dataChannelRef.current = dataChannel
      dataChannel.onmessage = (message) => {
        try {
          handleServerEvent(JSON.parse(message.data) as RealtimeServerEvent)
        } catch {
          // Ignore malformed diagnostic events.
        }
      }
      dataChannel.onerror = () => {
        setError("Canal realtime indisponivel")
        setStatus("error")
      }

      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)

      const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.clientSecret}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp,
      })

      if (!sdpResponse.ok) {
        throw new Error("Falha ao abrir conexao WebRTC com a OpenAI")
      }

      const answer = await sdpResponse.text()
      await peer.setRemoteDescription({ type: "answer", sdp: answer })

      setTranscript([])
      setStatus("listening")
    } catch (startError) {
      cleanup()
      setError(startError instanceof Error ? startError.message : "Erro ao iniciar agente de voz")
      setStatus("error")
    }
  }, [cleanup, handleServerEvent, status])

  const toggle = useCallback(() => {
    if (status === "idle" || status === "error") {
      void start()
      return
    }
    stop()
  }, [start, status, stop])

  return {
    error,
    isConfigured,
    model,
    start,
    status,
    stop,
    toggle,
    transcript,
  }
}
