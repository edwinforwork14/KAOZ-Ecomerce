"use client"

import { brandConfig } from "@/lib/config"

export default function InstagramFeed() {
  return (
    <section className="py-24 bg-surface-container border-t border-outline-variant/30">
      <div className="container mx-auto px-gutter md:px-margin">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-tertiary">camera_alt</span>
              <span className="font-mono-data text-label-caps text-tertiary uppercase tracking-[0.2em]">Visual_Feed_Protocol</span>
            </div>
            <h2 className="font-display text-h1 text-on-background uppercase tracking-tight leading-none">
              #{brandConfig.name.toUpperCase()}_LOGS
            </h2>
          </div>
          <div className="font-mono-data text-on-surface-variant text-xs uppercase border-l border-tertiary pl-6 py-2 max-w-xs">
            COMMUNITY_ASSET_VERIFICATION // JOIN THE NETWORK AND SHARE YOUR INDUSTRIAL AESTHETIC
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="group relative aspect-square overflow-hidden border border-outline-variant/30 bg-surface-container-lowest">
              <img
                src={`/placeholder.svg?height=400&width=400&text=LOG_0${i}`}
                alt="Community Asset"
                className="w-full h-full object-cover mix-blend-luminosity group-hover:mix-blend-normal transition-all duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-tertiary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="material-symbols-outlined text-on-tertiary text-3xl">open_in_new</span>
              </div>
              <div className="absolute bottom-2 right-2 font-mono-data text-[8px] text-on-surface-variant uppercase bg-background/80 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                SRC: INSTAGRAM // ID: {Math.random().toString(36).substring(7).toUpperCase()}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <a 
            href={`https://instagram.com/${brandConfig.social.instagram}`}
            target="_blank"
            className="group relative bg-tertiary text-on-tertiary font-label-caps text-label-caps uppercase px-12 py-5 hover:bg-surface-container-highest hover:text-tertiary transition-all duration-300 border border-tertiary flex items-center gap-3"
          >
            <span className="material-symbols-outlined text-sm group-hover:scale-110 transition-transform">camera_alt</span>
            ACCESS_NETWORK_FEED
            <div className="absolute -bottom-1 -right-1 bg-tertiary w-3 h-3 group-hover:bg-on-surface-variant transition-colors"></div>
          </a>
        </div>
      </div>
    </section>
  )
}

