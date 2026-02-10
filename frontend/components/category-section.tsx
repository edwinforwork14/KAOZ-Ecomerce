"use client"

import { useEffect, useState } from "react"
import { ArrowRight } from "lucide-react"
import { api } from "@/lib/api"
import { brandConfig } from "@/lib/config"

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
            (cat: any) => cat.isActive !== false
          )
          setCategories(activeCategories)
        }
      } catch (error) {
        console.error('Error loading categories:', error)
        if (isMounted) {
          setCategories([])
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadCategories()

    return () => {
      isMounted = false
    }
  }, [])

  const handleCategoryClick = (slug: string) => {
    if (onCategoryClick) {
      onCategoryClick(slug)
    }
  }

  // Category Skeleton Component
  const CategorySkeleton = () => (
    <div className="relative aspect-[3/4] overflow-hidden bg-gray-200 animate-pulse">
      <div className="absolute inset-0 shimmer"></div>
      <div className="absolute inset-0 flex flex-col justify-end p-6">
        <div className="h-8 bg-gray-300 rounded w-3/4 mb-2 relative overflow-hidden">
          <div className="absolute inset-0 shimmer"></div>
        </div>
        <div className="h-4 bg-gray-300 rounded w-1/2 mb-4 relative overflow-hidden">
          <div className="absolute inset-0 shimmer"></div>
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Skeleton */}
          <div className="mb-12">
            <div className="h-10 bg-gray-200 rounded w-80 mb-2 relative overflow-hidden">
              <div className="absolute inset-0 shimmer"></div>
            </div>
            <div className="h-1 w-24 bg-gray-200 relative overflow-hidden">
              <div className="absolute inset-0 shimmer"></div>
            </div>
          </div>

          {/* Categories Grid Skeleton */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <CategorySkeleton key={i} />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (categories.length === 0) {
    return null
  }

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-2">
            COMPRAR POR CATEGORÍA
          </h2>
          <div className="h-1 w-24 bg-black"></div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((category) => (
            <div
              key={category._id}
              onClick={() => handleCategoryClick(category.slug)}
              className="group relative aspect-[3/4] overflow-hidden bg-gray-200 cursor-pointer"
            >
              {/* Background Image */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-300 to-gray-400">
                <img
                  src={category.image || "/placeholder.svg"}
                  alt={category.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.svg"
                  }}
                />
              </div>

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-300" />

              {/* Content */}
              <div className="absolute inset-0 flex flex-col justify-end p-6">
                <h3 className="text-white text-2xl md:text-3xl font-black uppercase mb-2">
                  {category.name}
                </h3>
                {category.description && (
                  <p className="text-white/90 text-sm mb-4 line-clamp-2">
                    {category.description}
                  </p>
                )}
                {category.productCount > 0 && (
                  <p className="text-white/80 text-xs mb-4">
                    {category.productCount} producto{category.productCount !== 1 ? 's' : ''}
                  </p>
                )}
                <div className="flex items-center text-white font-semibold uppercase text-sm group-hover:translate-x-2 transition-transform duration-300">
                  COMPRAR AHORA
                  <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}