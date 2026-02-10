"use client"

import { brandConfig } from "@/lib/config"

interface HeroProps {
  onExploreClick?: () => void
}

export default function Hero({ onExploreClick }: HeroProps) {
  return (
    <section className="relative w-full overflow-hidden bg-black">
      {/* Main Hero Image */}
      <div className="relative w-full">
        <div className="relative overflow-hidden">
          {/* Responsive Image with parallax effect */}
          <picture>
            {/* Mobile: imagen vertical */}
            <source 
              media="(max-width: 768px)" 
              srcSet="/yenfit-1200-750-3.png" 
            />
            {/* Desktop: imagen horizontal */}
            <source 
              media="(min-width: 769px)" 
              srcSet="/yenfit-05.png" 
            />
            {/* Fallback */}
            <img
              src="/yenfit-05.png"
              alt={brandConfig.name}
              className="w-full h-auto object-cover animate-fadeIn"
              style={{
                minHeight: '50vh',
                maxHeight: '85vh',
                objectFit: 'cover'
              }}
              onError={(e) => {
                e.currentTarget.src = '/placeholder.svg'
              }}
            />
          </picture>
          
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
        </div>

        {/* Floating elements decoration - desktop only */}
        <div className="absolute top-10 right-10 hidden lg:block pointer-events-none">
          <div 
            className="w-32 h-32 rounded-full blur-3xl opacity-30 animate-pulse"
            style={{ backgroundColor: brandConfig.colors.primary }}
          />
        </div>
        
        <div className="absolute bottom-20 left-10 hidden lg:block pointer-events-none">
          <div 
            className="w-40 h-40 rounded-full blur-3xl opacity-20 animate-pulse"
            style={{ 
              backgroundColor: brandConfig.colors.secondary,
              animationDelay: '1s'
            }}
          />
        </div>
      </div>

      {/* Minimal Scroll Indicator - Perfectly Centered */}
      {/* <div className="absolute bottom-8 left-0 right-0 flex justify-center z-20">
        <div className="animate-bounce">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-10 border-2 border-white/40 rounded-full flex justify-center backdrop-blur-sm bg-black/10">
              <div className="w-1.5 h-3 bg-white/60 rounded-full mt-2 animate-pulse" />
            </div>
            <span className="text-white/60 text-xs font-medium tracking-wider uppercase">
              Scroll
            </span>
          </div>
        </div>
      </div> */}
    </section>
  )
}