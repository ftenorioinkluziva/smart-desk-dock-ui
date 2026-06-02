"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

export function WindyMap() {
  const [interactive, setInteractive] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const touchStartRef = useRef<{ x: number; y: number; page: number } | null>(null)

  const exit = useCallback(() => setInteractive(false), [])

  const scrollCarouselBy = useCallback((direction: -1 | 1, fromPage?: number) => {
    const carousel = wrapperRef.current?.closest<HTMLElement>("[data-dock-carousel]")
    if (!carousel) return

    const currentPage = fromPage ?? Math.round(carousel.scrollLeft / carousel.clientWidth)
    const maxPage = Math.max(0, Math.round(carousel.scrollWidth / carousel.clientWidth) - 1)
    const nextPage = Math.min(maxPage, Math.max(0, currentPage + direction))
    carousel.scrollTo({ left: carousel.clientWidth * nextPage, behavior: "smooth" })
  }, [])

  const handleSwipeStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (interactive) return
    const touch = event.touches[0]
    const carousel = wrapperRef.current?.closest<HTMLElement>("[data-dock-carousel]")
    const page = carousel ? Math.round(carousel.scrollLeft / carousel.clientWidth) : 0
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, page }
  }, [interactive])

  const handleSwipeEnd = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (interactive) return
    const start = touchStartRef.current
    touchStartRef.current = null
    if (!start) return

    const touch = event.changedTouches[0]
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y

    if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.2) return
    scrollCarouselBy(dx > 0 ? -1 : 1, start.page)
  }, [interactive, scrollCarouselBy])

  // iOS Safari workaround: force synchronous reflow after exiting interactive
  // mode to release the iframe's touch event capture (WebKit bug).
  useLayoutEffect(() => {
    if (interactive) return
    const el = wrapperRef.current
    if (!el) return
    el.style.display = "none"
    void el.offsetHeight
    el.style.display = ""
  }, [interactive])

  useEffect(() => {
    if (!interactive) return
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") exit() }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [interactive, exit])

  return (
    <section aria-labelledby="windy-heading" className="flex h-full w-full items-center justify-center overflow-hidden relative">
      <h2 id="windy-heading" className="sr-only">Mapa do Clima</h2>
      <div ref={wrapperRef} className={cn("size-full", !interactive && "pointer-events-none")}>
        <iframe
          src="https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=km/h&zoom=11&overlay=rain&product=ecmwf&level=surface&lat=-15.89&lon=-47.808&message=true"
          title="Mapa do Clima Windy"
          className={cn("size-full", !interactive && "pointer-events-none")}
          loading="lazy"
          allow="fullscreen"
        />
      </div>

      {!interactive && (
        <>
          <div
            className="absolute inset-0 z-10 touch-pan-x"
            aria-hidden="true"
            onTouchStart={handleSwipeStart}
            onTouchEnd={handleSwipeEnd}
          />
          <button
            type="button"
            onClick={() => setInteractive(true)}
            className="absolute bottom-[clamp(0.4rem,1.2vh,0.7rem)] left-1/2 z-20 -translate-x-1/2 rounded-full border border-border/40 bg-background/80 px-3 py-1 text-[clamp(0.6rem,1.5vw,0.72rem)] text-foreground backdrop-blur-sm transition-colors hover:bg-background/95"
          >
            Toque para interagir
          </button>
        </>
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
