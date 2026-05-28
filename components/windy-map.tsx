"use client"

import { useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export function WindyMap() {
  const [interactive, setInteractive] = useState(false)

  const exit = useCallback(() => setInteractive(false), [])

  useEffect(() => {
    if (!interactive) return
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") exit() }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [interactive, exit])

  return (
    <section aria-labelledby="windy-heading" className="flex h-full w-full items-center justify-center overflow-hidden relative">
      <h2 id="windy-heading" className="sr-only">Mapa do Clima</h2>
      <div className={cn("size-full", !interactive && "pointer-events-none")}>
        <iframe
          src="https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=km/h&zoom=11&overlay=rain&product=ecmwf&level=surface&lat=-15.89&lon=-47.808&message=true"
          title="Mapa do Clima Windy"
          className="size-full"
          loading="lazy"
          allow="fullscreen"
        />
      </div>

      {!interactive && (
        <button
          type="button"
          onClick={() => setInteractive(true)}
          className="absolute bottom-[clamp(0.4rem,1.2vh,0.7rem)] left-1/2 -translate-x-1/2 z-10 rounded-full border border-border/40 bg-background/80 px-3 py-1 text-[clamp(0.6rem,1.5vw,0.72rem)] text-foreground backdrop-blur-sm transition-colors hover:bg-background/95"
        >
          Toque para interagir
        </button>
      )}

      {interactive && (
        <button
          type="button"
          onClick={exit}
          className="absolute top-[clamp(0.3rem,0.8vh,0.5rem)] right-[clamp(0.3rem,0.8vw,0.5rem)] z-10 flex size-[clamp(1.4rem,3.5vw,1.8rem)] items-center justify-center rounded-full border border-border/40 bg-background/80 text-muted-foreground backdrop-blur-sm transition-colors hover:text-foreground"
          aria-label="Voltar ao carrossel"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
          </svg>
        </button>
      )}
    </section>
  )
}
