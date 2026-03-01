"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { ClockWeather } from "@/components/clock-weather"
import { ProductivityHub } from "@/components/productivity-hub"
import { Agenda } from "@/components/agenda"
import { SpotifyBar } from "@/components/spotify-bar"

const PAGES = 3

export default function Page() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activePage, setActivePage] = useState(0)

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const index = Math.round(el.scrollLeft / el.clientWidth)
    setActivePage(index)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener("scroll", handleScroll, { passive: true })
    return () => el.removeEventListener("scroll", handleScroll)
  }, [handleScroll])

  return (
    <div className="h-dvh w-dvw overflow-hidden bg-background relative flex flex-col">
      {/* Carousel */}
      <div
        ref={scrollRef}
        className="flex-1 flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
      >
        {/* Page 1: Clock & Weather */}
        <section className="w-full h-full flex-shrink-0 snap-center flex items-center justify-center">
          <ClockWeather />
        </section>

        {/* Page 2: Productivity Hub */}
        <section className="w-full h-full flex-shrink-0 snap-center flex items-center justify-center">
          <ProductivityHub />
        </section>

        {/* Page 3: Daily Agenda */}
        <section className="w-full h-full flex-shrink-0 snap-center">
          <Agenda />
        </section>
      </div>

      {/* Pagination Dots */}
      <div className="flex items-center justify-center gap-1.5 pb-1">
        {Array.from({ length: PAGES }).map((_, i) => (
          <span
            key={i}
            className={`rounded-full transition-all duration-300 ${
              activePage === i
                ? "w-1.5 h-1.5 bg-foreground"
                : "w-1 h-1 bg-muted-foreground/40"
            }`}
            aria-hidden="true"
          />
        ))}
      </div>

      {/* Persistent Spotify Bar */}
      <div className="w-full border-t border-border/50 bg-background/80 backdrop-blur-sm z-50">
        <SpotifyBar />
      </div>
    </div>
  )
}
