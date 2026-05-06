"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"

interface CategorySectionProps {
  onCategoryClick?: (category: string) => void
}

export default function CategorySection({ onCategoryClick }: CategorySectionProps) {
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const loadCategories = async () => {
      try {
        setLoading(true)
        const result = await api.getCategories()
        
        if (isMounted && result.success) {
          const activeCategories = result.categories.filter(
            (cat: any) => cat.slug
          )
          setCategories(activeCategories)
        }
      } catch (error) {
        console.error('Error loading categories:', error)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadCategories()
    return () => { isMounted = false }
  }, [])

  if (loading) {
    return (
      <section className="py-24 bg-background border-t border-outline-variant/30">
        <div className="container mx-auto px-gutter">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-[3/4] bg-surface-container border border-outline-variant/30 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (categories.length === 0) return null

  return (
    <section className="py-24 bg-background border-t border-outline-variant/30 overflow-hidden relative">
      {/* Technical Background Grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />

      <div className="container mx-auto px-gutter relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-[1px] bg-tertiary"></div>
              <span className="font-mono-data text-label-caps text-tertiary uppercase tracking-[0.2em]">Asset_Collections</span>
            </div>
            <h2 className="font-display text-h1 text-on-background uppercase tracking-tight leading-none">
              Inbound_Inventory
            </h2>
          </div>
          <div className="font-mono-data text-on-surface-variant text-xs uppercase border-l border-tertiary pl-6 py-2 max-w-xs">
            SELECT CATEGORY PROTOCOL TO FILTER SYSTEM DATABASE // TOTAL_ENTRIES: {categories.length.toString().padStart(2, '0')}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((category, index) => (
            <div
              key={category.id}
              onClick={() => onCategoryClick?.(category.slug)}
              className="group relative aspect-[3/4] overflow-hidden border border-outline-variant/30 bg-surface-container-lowest cursor-pointer transition-all duration-500 hover:border-tertiary"
            >
              {/* Image with Technical Post-Processing */}
              <img
                src={category.image_url || "/placeholder.svg"}
                alt={category.name}
                className="w-full h-full object-cover mix-blend-luminosity group-hover:mix-blend-normal transition-all duration-700 group-hover:scale-105"
              />
              
              {/* Technical Overlay */}
              <div className="absolute inset-0 bg-surface-container-highest/20 group-hover:bg-transparent transition-colors" />
              
              {/* Coordinate Data */}
              <div className="absolute top-4 left-4 font-mono-data text-[9px] text-on-surface-variant uppercase bg-background/80 px-1 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                REF_ID: {category.id?.slice(-8) || index.toString().padStart(4, '0')} // SYST.LOG
              </div>

              {/* Content Card */}
              <div className="absolute inset-x-0 bottom-0 p-8 flex flex-col justify-end bg-gradient-to-t from-background/90 to-transparent pt-24">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-h3 text-on-background uppercase tracking-tight group-hover:text-tertiary transition-colors">
                    {category.name}
                  </h3>
                  <span className="material-symbols-outlined text-tertiary opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all">
                    arrow_forward
                  </span>
                </div>
                <div className="h-[2px] w-0 group-hover:w-full bg-tertiary mt-2 transition-all duration-500"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}