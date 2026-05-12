"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Check,
  ListMusic,
  MonitorSpeaker,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Smartphone,
  Speaker,
  Volume2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

type RepeatState = "off" | "track" | "context"

type NowPlaying = {
  isPlaying: boolean
  track: string | null
  artist: string | null
  albumArt: string | null
  album: string | null
  deviceName: string | null
  deviceType: string | null
  volumePercent: number | null
  shuffle: boolean
  repeat: RepeatState
  progressMs: number
  durationMs: number
  mock?: boolean
}

type SpotifyDevice = {
  id: string | null
  isActive: boolean
  isPrivateSession: boolean
  isRestricted: boolean
  name: string
  type: string
  volumePercent: number | null
  supportsVolume: boolean
}

type SpotifyPlaylist = {
  id: string
  name: string
  uri: string
  image: string | null
  owner: string | null
  totalTracks: number | null
}

const FALLBACK: NowPlaying = {
  isPlaying: false,
  track: null,
  artist: null,
  albumArt: null,
  album: null,
  deviceName: null,
  deviceType: null,
  volumePercent: null,
  shuffle: false,
  repeat: "off",
  progressMs: 0,
  durationMs: 0,
  mock: true,
}

async function sendControl(body: {
  action: "play" | "pause" | "next" | "previous" | "shuffle" | "repeat" | "volume" | "transfer"
    | "play-context"
  state?: boolean
  repeatState?: RepeatState
  volumePercent?: number
  deviceId?: string
  play?: boolean
  contextUri?: string
}) {
  await fetch("/api/spotify-control", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {})
}

function formatTime(ms: number) {
  if (!ms) return "0:00"
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

function nextRepeatState(current: RepeatState): RepeatState {
  if (current === "off") return "context"
  if (current === "context") return "track"
  return "off"
}

function DeviceIcon({ type }: { type: string | null }) {
  const normalized = type?.toLowerCase()
  if (normalized?.includes("smartphone") || normalized?.includes("phone")) {
    return <Smartphone className="size-[clamp(0.9rem,2vw,1.1rem)]" />
  }
  if (normalized?.includes("speaker")) {
    return <Speaker className="size-[clamp(0.9rem,2vw,1.1rem)]" />
  }
  return <MonitorSpeaker className="size-[clamp(0.9rem,2vw,1.1rem)]" />
}

export function SpotifyExpandedPanel() {
  const [nowPlaying, setNowPlaying] = useState<NowPlaying>(FALLBACK)
  const [devices, setDevices] = useState<SpotifyDevice[]>([])
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([])
  const [playlistError, setPlaylistError] = useState<string | null>(null)
  const [pendingVolume, setPendingVolume] = useState<number | null>(null)

  const fetchNowPlaying = useCallback(async () => {
    try {
      const res = await fetch("/api/spotify-now-playing")
      if (res.ok) setNowPlaying((await res.json()) as NowPlaying)
    } catch {}
  }, [])

  const fetchDevices = useCallback(async () => {
    try {
      const res = await fetch("/api/spotify-devices")
      if (res.ok) {
        const data = await res.json() as { devices?: SpotifyDevice[] }
        setDevices(data.devices ?? [])
      }
    } catch {}
  }, [])

  const fetchPlaylists = useCallback(async () => {
    try {
      const res = await fetch("/api/spotify-playlists")
      if (res.status === 403) {
        setPlaylistError("Reautorize com playlist-read-private")
        setPlaylists([])
        return
      }
      if (res.ok) {
        const data = await res.json() as { playlists?: SpotifyPlaylist[] }
        setPlaylistError(null)
        setPlaylists(data.playlists ?? [])
      }
    } catch {}
  }, [])

  useEffect(() => {
    fetchNowPlaying()
    fetchDevices()
    fetchPlaylists()
    const id = setInterval(fetchNowPlaying, 7000)
    const devicesId = setInterval(fetchDevices, 30000)
    return () => {
      clearInterval(id)
      clearInterval(devicesId)
    }
  }, [fetchDevices, fetchNowPlaying, fetchPlaylists])

  const progressPercent = useMemo(() => {
    if (!nowPlaying.durationMs) return 0
    return Math.min(100, Math.max(0, (nowPlaying.progressMs / nowPlaying.durationMs) * 100))
  }, [nowPlaying.durationMs, nowPlaying.progressMs])

  const isMock = nowPlaying.mock
  const disabled = Boolean(isMock)
  const volume = pendingVolume ?? nowPlaying.volumePercent ?? 0

  async function handlePlayPause() {
    const action = nowPlaying.isPlaying ? "pause" : "play"
    setNowPlaying((current) => ({ ...current, isPlaying: !current.isPlaying }))
    await sendControl({ action })
    setTimeout(fetchNowPlaying, 1500)
  }

  async function handlePrevious() {
    await sendControl({ action: "previous" })
    setTimeout(fetchNowPlaying, 1500)
  }

  async function handleNext() {
    await sendControl({ action: "next" })
    setTimeout(fetchNowPlaying, 1500)
  }

  async function handleShuffle() {
    const state = !nowPlaying.shuffle
    setNowPlaying((current) => ({ ...current, shuffle: state }))
    await sendControl({ action: "shuffle", state })
    setTimeout(fetchNowPlaying, 1500)
  }

  async function handleRepeat() {
    const repeatState = nextRepeatState(nowPlaying.repeat)
    setNowPlaying((current) => ({ ...current, repeat: repeatState }))
    await sendControl({ action: "repeat", repeatState })
    setTimeout(fetchNowPlaying, 1500)
  }

  async function handleVolumeCommit(value: number[]) {
    const volumePercent = value[0] ?? 0
    setPendingVolume(volumePercent)
    setNowPlaying((current) => ({ ...current, volumePercent }))
    await sendControl({ action: "volume", volumePercent })
    setPendingVolume(null)
    setTimeout(fetchNowPlaying, 1500)
  }

  async function handleTransfer(deviceId: string) {
    await sendControl({ action: "transfer", deviceId, play: nowPlaying.isPlaying })
    await Promise.all([fetchDevices(), fetchNowPlaying()])
    setTimeout(() => {
      fetchDevices()
      fetchNowPlaying()
    }, 1500)
  }

  async function handlePlaylistPlay(playlist: SpotifyPlaylist) {
    await sendControl({
      action: "play-context",
      contextUri: playlist.uri,
      deviceId: devices.find((device) => device.isActive)?.id ?? undefined,
    })
    setTimeout(fetchNowPlaying, 1500)
  }

  return (
    <div className="dock-px h-full w-full overflow-hidden py-[clamp(0.45rem,1.4vh,0.95rem)] pb-[clamp(1rem,3vh,1.8rem)]">
      <div className="flex h-full min-h-0 flex-col gap-[clamp(0.6rem,1.8vh,1rem)]">
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(10rem,0.75fr)_minmax(0,1.35fr)] items-center gap-[clamp(1rem,3vw,2.5rem)]">
          <div className="flex min-h-0 items-center justify-center">
          <div className="aspect-square h-[min(62vh,21rem)] max-h-full max-w-full overflow-hidden rounded-lg bg-secondary">
            {nowPlaying.albumArt ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={nowPlaying.albumArt}
                alt={`Capa do álbum ${nowPlaying.album ?? nowPlaying.track ?? "atual"}`}
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground">
                <Speaker className="size-12 opacity-40" />
              </div>
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-[clamp(0.45rem,1.35vh,0.85rem)]">
          <div className="min-w-0">
            <p className="text-[clamp(0.65rem,1.7vw,0.8rem)] font-medium uppercase tracking-normal text-spotify">
              {isMock ? "Spotify nao configurado" : nowPlaying.isPlaying ? "Tocando agora" : "Spotify pausado"}
            </p>
            <h1 className="mt-1 truncate pb-1 text-[clamp(1.55rem,4.6vw,3rem)] font-semibold leading-tight tracking-normal">
              {nowPlaying.track ?? (isMock ? "Configure o Spotify" : "Nada tocando")}
            </h1>
            <p className="mt-1 truncate pb-0.5 text-[clamp(0.85rem,2.2vw,1.15rem)] leading-snug text-muted-foreground">
              {nowPlaying.artist ?? "Conecte as credenciais para ativar este painel"}
            </p>
            {nowPlaying.album ? (
              <p className="truncate pb-0.5 text-[clamp(0.72rem,1.8vw,0.95rem)] leading-snug text-muted-foreground/80">
                {nowPlaying.album}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-spotify" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="flex justify-between text-[clamp(0.62rem,1.5vw,0.75rem)] tabular-nums text-muted-foreground">
              <span>{formatTime(nowPlaying.progressMs)}</span>
              <span>{formatTime(nowPlaying.durationMs)}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-[clamp(0.7rem,2vw,1.2rem)]">
            <Button
              size="icon-lg"
              variant="ghost"
              disabled={disabled}
              aria-label={nowPlaying.shuffle ? "Desativar aleatorio" : "Ativar aleatorio"}
              onClick={handleShuffle}
              className={cn("size-[clamp(2.2rem,5vw,3rem)] rounded-full", nowPlaying.shuffle && "text-spotify")}
            >
              <Shuffle className="size-[clamp(1rem,2.5vw,1.25rem)]" />
            </Button>
            <Button
              size="icon-lg"
              variant="ghost"
              disabled={disabled}
              aria-label="Faixa anterior"
              onClick={handlePrevious}
              className="size-[clamp(2.35rem,5.3vw,3.2rem)] rounded-full"
            >
              <SkipBack className="size-[clamp(1.15rem,3vw,1.45rem)]" fill="currentColor" />
            </Button>
            <Button
              size="icon-lg"
              disabled={disabled}
              aria-label={nowPlaying.isPlaying ? "Pausar" : "Tocar"}
              onClick={handlePlayPause}
              className="size-[clamp(3.2rem,7vw,4.35rem)] rounded-full bg-spotify text-background hover:bg-spotify/90"
            >
              {nowPlaying.isPlaying ? (
                <Pause className="size-[clamp(1.35rem,3.7vw,1.8rem)]" fill="currentColor" />
              ) : (
                <Play className="ml-0.5 size-[clamp(1.35rem,3.7vw,1.8rem)]" fill="currentColor" />
              )}
            </Button>
            <Button
              size="icon-lg"
              variant="ghost"
              disabled={disabled}
              aria-label="Proxima faixa"
              onClick={handleNext}
              className="size-[clamp(2.35rem,5.3vw,3.2rem)] rounded-full"
            >
              <SkipForward className="size-[clamp(1.15rem,3vw,1.45rem)]" fill="currentColor" />
            </Button>
            <Button
              size="icon-lg"
              variant="ghost"
              disabled={disabled}
              aria-label={`Repetir: ${nowPlaying.repeat}`}
              onClick={handleRepeat}
              className={cn("size-[clamp(2.2rem,5vw,3rem)] rounded-full", nowPlaying.repeat !== "off" && "text-spotify")}
            >
              {nowPlaying.repeat === "track" ? (
                <Repeat1 className="size-[clamp(1rem,2.5vw,1.25rem)]" />
              ) : (
                <Repeat className="size-[clamp(1rem,2.5vw,1.25rem)]" />
              )}
            </Button>
          </div>

          <div className="grid grid-cols-[minmax(9rem,0.68fr)_minmax(0,1.2fr)] gap-[clamp(0.65rem,2vw,1rem)] text-[clamp(0.7rem,1.8vw,0.9rem)]">
            <div className="flex items-center gap-2 rounded-md bg-secondary/55 px-3 py-2">
              <Volume2 className="size-[clamp(0.9rem,2vw,1.1rem)] text-muted-foreground" />
              <Slider
                value={[volume]}
                min={0}
                max={100}
                step={5}
                disabled={disabled || nowPlaying.volumePercent === null}
                aria-label="Volume"
                onValueChange={(value) => setPendingVolume(value[0] ?? 0)}
                onValueCommit={handleVolumeCommit}
                className="min-w-0"
              />
            </div>
            <div className="flex min-w-0 items-center gap-2 rounded-md bg-secondary/35 px-2 py-1.5">
              <span className="shrink-0 text-[clamp(0.58rem,1.35vw,0.68rem)] font-medium uppercase tracking-normal text-muted-foreground">
                Dispositivo
              </span>
              <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto scrollbar-hide">
                {devices.length ? (
                  devices.map((device) => (
                    <Button
                      key={device.id ?? device.name}
                      type="button"
                      variant={device.isActive ? "secondary" : "ghost"}
                      disabled={disabled || !device.id || device.isRestricted}
                      onClick={() => device.id && handleTransfer(device.id)}
                      className={cn(
                        "h-[clamp(1.75rem,4.5vh,2.15rem)] min-w-[7.5rem] max-w-[12rem] justify-start rounded-md px-2 text-[clamp(0.62rem,1.45vw,0.75rem)]",
                        device.isActive ? "font-semibold text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {device.isActive ? (
                        <Check className="size-[clamp(0.72rem,1.6vw,0.85rem)] text-spotify" />
                      ) : (
                        <DeviceIcon type={device.type} />
                      )}
                      <span className="min-w-0 truncate">{device.name}</span>
                    </Button>
                  ))
                ) : (
                  <span className="min-w-0 truncate px-1 text-muted-foreground">
                    {nowPlaying.deviceName ?? (isMock ? "Credenciais pendentes" : "Sem dispositivo ativo")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

        <div className="min-w-0 shrink-0">
          <div className="mb-1 flex items-center gap-2 text-[clamp(0.62rem,1.5vw,0.75rem)] font-medium uppercase tracking-normal text-muted-foreground">
            <ListMusic className="size-[clamp(0.75rem,1.7vw,0.9rem)]" />
            <span>Playlists</span>
            {playlistError ? <span className="normal-case text-destructive">{playlistError}</span> : null}
          </div>
          <div className="flex min-w-0 gap-[clamp(0.45rem,1.2vw,0.7rem)] overflow-x-auto pb-1 scrollbar-hide">
            {playlists.length ? (
              playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => handlePlaylistPlay(playlist)}
                  className="flex h-[clamp(2.9rem,8vh,3.65rem)] w-[clamp(10rem,22vw,13.5rem)] shrink-0 items-center gap-2 rounded-md bg-secondary/45 px-2 text-left transition-colors hover:bg-secondary disabled:pointer-events-none disabled:opacity-40"
                  aria-label={`Tocar playlist ${playlist.name}`}
                >
                  <div className="size-[clamp(2.2rem,6.1vh,2.8rem)] shrink-0 overflow-hidden rounded-md bg-secondary">
                    {playlist.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={playlist.image} alt="" className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground">
                        <ListMusic className="size-4" />
                      </div>
                    )}
                  </div>
                  <span className="min-w-0">
                    <span className="block truncate text-[clamp(0.72rem,1.75vw,0.88rem)] font-medium leading-tight">
                      {playlist.name}
                    </span>
                    <span className="block truncate text-[clamp(0.6rem,1.45vw,0.72rem)] text-muted-foreground">
                      {playlist.totalTracks === null ? playlist.owner : `${playlist.totalTracks} faixas`}
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <div className="flex h-[clamp(2.9rem,8vh,3.65rem)] min-w-[12rem] items-center rounded-md bg-secondary/35 px-3 text-[clamp(0.66rem,1.55vw,0.78rem)] text-muted-foreground">
                {playlistError ?? (isMock ? "Configure o Spotify" : "Nenhuma playlist carregada")}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
