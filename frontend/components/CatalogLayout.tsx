"use client"

import { useState } from "react"
import FeaturedProducts from "./featured-products"

interface CatalogLayoutProps {
  category?: string
  onProductClick: (product: any) => void
  setActiveTab: (tab: string) => void
}

export default function CatalogLayout({ category, onProductClick, setActiveTab }: CatalogLayoutProps) {
  const [selectedFilter, setSelectedFilter] = useState("all")

  const categories = [
    { name: "Todos", key: "all", icon: "grid_view" },
    { name: "Hombres", key: "men", icon: "person" },
    { name: "Mujeres", key: "women", icon: "person_4" },
    { name: "Niños", key: "kids", icon: "child_care" },
    { name: "Drops", key: "drops", icon: "new_releases" },
  ]

  return (
    <div className="flex flex-1 relative min-h-screen pt-20 md:pt-24">
      {/* SideNavBar (Desktop) */}
      <aside className="hidden md:flex flex-col h-screen w-64 border-r border-outline-variant sticky top-24 gap-sm py-lg bg-surface-container-low">
        <div className="px-margin mb-lg">
          <h2 className="font-display text-h2 text-primary uppercase">Filtros</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Especificaciones Técnicas</p>
        </div>
        
        <nav className="flex flex-col gap-unit">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => {
                setSelectedFilter(cat.key)
                setActiveTab(cat.key === "all" ? "products" : cat.key)
              }}
              className={`flex items-center gap-sm px-md py-sm font-mono-data text-mono-data uppercase transition-all ${
                (category || "all") === cat.key || (cat.key === "all" && !category)
                ? "bg-tertiary text-on-tertiary font-bold translate-x-1" 
                : "text-on-surface-variant hover:bg-surface-container-highest"
              }`}
            >
              <span className="material-symbols-outlined">{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </nav>

        <div className="mt-auto px-margin pb-20">
          <button 
            onClick={() => setActiveTab("products")}
            className="w-full bg-transparent border border-outline text-on-surface hover:border-tertiary hover:text-tertiary font-label-caps text-label-caps py-sm uppercase transition-colors flex items-center justify-center gap-xs"
          >
            Limpiar Filtros
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-gutter md:p-xl">
        {/* Banner Area */}
        <div className="w-full bg-surface-container border border-outline-variant mb-xl relative overflow-hidden group h-48 md:h-64">
          <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent z-10 pointer-events-none"></div>
          <img 
            alt="Catalog Banner" 
            className="w-full h-full object-cover opacity-60 grayscale group-hover:grayscale-0 transition-all duration-500" 
            src="https://images.unsplash.com/photo-1552062624-9b88d3d92fb9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" 
          />
          <div className="absolute bottom-margin left-margin z-20">
            <span className="inline-block bg-surface-variant text-tertiary font-label-caps text-label-caps px-sm py-unit mb-sm uppercase border border-outline-variant">
              Colección 2024
            </span>
            <h1 className="font-h1 text-h1 text-primary uppercase">
              {category ? `División ${category}` : "Arsenal Técnico"}
            </h1>
            <p className="font-mono-data text-mono-data text-on-surface-variant mt-xs uppercase">Tactical Deployment / FW24</p>
          </div>
        </div>

        {/* Product Grid */}
        <FeaturedProducts 
          category={category} 
          onProductClick={onProductClick} 
          showAll={true} 
        />
      </main>
    </div>
  )
}
