"use client"

import { brandConfig } from "@/lib/config"

interface HeroProps {
  onExploreClick?: () => void
}

export default function Hero({ onExploreClick }: HeroProps) {
  return (
    <section className="relative h-[90vh] min-h-[700px] w-full flex items-end border-b border-outline-variant/30">
      {/* Background Layer */}
      <div className="absolute inset-0 w-full h-full z-0 bg-surface-container-lowest grid-pattern overflow-hidden">
        {/* Hero Image — using Unsplash for reliability */}
        <img
          alt="KAOS Urban Athletics — Industrial sportswear"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-50 mix-blend-luminosity"
          src="https://images.unsplash.com/photo-1483721310020-03333e577078?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80"
        />

        {/* Gradient fade to background at bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/10" />

        {/* Technical grid lines */}
        <div className="absolute top-1/4 left-0 w-full h-px bg-outline-variant/20" />
        <div className="absolute top-1/2 left-0 w-full h-px bg-outline-variant/20" />
        <div className="absolute top-3/4 left-0 w-full h-px bg-outline-variant/20" />
        <div className="absolute top-0 left-1/4 w-px h-full bg-outline-variant/20 hidden md:block" />
        <div className="absolute top-0 left-1/2 w-px h-full bg-outline-variant/20 hidden md:block" />
        <div className="absolute top-0 left-3/4 w-px h-full bg-outline-variant/20 hidden md:block" />
      </div>

      {/* Technical coordinate overlays */}
      <div className="absolute top-24 left-gutter font-mono-data text-label-caps text-on-surface-variant hidden md:block z-10 opacity-70">
        COORD: 45.5017° N, 73.5673° W<br />
        SYS.VER: 2.4.1 // KAOS_CORE
      </div>
      <div className="absolute top-24 right-gutter flex flex-col items-end gap-1 font-mono-data text-label-caps text-on-surface-variant hidden md:block z-10 opacity-70">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-tertiary animate-pulse inline-block" />
          LIVE FEED
        </div>
        ENG: OPTIMAL
      </div>

      {/* Hero Content */}
      <div className="relative w-full px-gutter md:px-margin pb-16 z-10 flex flex-col md:flex-row justify-between items-end gap-8">
        <div className="w-full max-w-4xl border-l-2 border-tertiary pl-6 md:pl-12">
          {/* Drop label */}
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-tertiary text-on-tertiary font-mono-data text-label-caps uppercase px-2 py-1">
              INIT: DROP_004
            </div>
            <span className="font-mono-data text-on-surface-variant text-sm uppercase">
              // ENGINEERED CHAOS
            </span>
          </div>

          {/* Main headline */}
          <h1 className="font-display text-display text-on-background mb-6 uppercase leading-[0.9]">
            SYSTEMATIC<br />
            <span className="text-outline">DISRUPTION</span>
          </h1>

          {/* Subtext */}
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl mb-10 border-l border-outline-variant/50 pl-4">
            Technical sportswear strictly engineered for the urban grid.
            Utilitarian design meets uncompromising performance.{" "}
            <span className="text-tertiary">No excess. Just function.</span>
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <button
              onClick={onExploreClick}
              className="bg-tertiary text-on-tertiary font-label-caps text-label-caps uppercase px-12 py-5 hover:bg-surface-container-highest hover:text-tertiary transition-all duration-300 border border-tertiary flex items-center justify-center gap-2 group w-full sm:w-auto"
            >
              EXECUTE: SHOP
              <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </button>
            <button className="bg-transparent border border-outline-variant text-on-background font-label-caps text-label-caps uppercase px-12 py-5 hover:bg-surface-container hover:border-outline transition-all duration-300 w-full sm:w-auto">
              VIEW PROTOCOL
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="hidden lg:flex flex-col items-center gap-4 absolute bottom-16 right-gutter">
          <span className="font-mono-data text-label-caps text-on-surface-variant rotate-90 origin-bottom translate-y-12 whitespace-nowrap uppercase tracking-widest">
            SCROLL
          </span>
          <div className="w-px h-16 bg-outline-variant relative overflow-hidden">
            <div className="w-full h-1/2 bg-tertiary absolute top-0 animate-shimmer" />
          </div>
        </div>
      </div>
    </section>
  )
}