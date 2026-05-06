"use client"

import { useEffect, useState } from "react"
import { ArrowRight, Box } from "lucide-react"
import { api } from "@/lib/api"
import { motion } from "framer-motion"

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
          // Filtrar solo las que tengan slug
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
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-[3/4] bg-secondary animate-pulse rounded-3xl" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (categories.length === 0) return null

  return (
    <section className="py-24 bg-white overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <motion.span 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="text-accent font-bold tracking-[0.2em] uppercase text-xs mb-3 block"
            >
              Colecciones
            </motion.span>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-bold tracking-tighter"
            >
              Comprar por Categoría
            </motion.h2>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="flex items-center gap-2 text-muted-foreground text-sm"
          >
            <Box className="w-4 h-4" />
            Explora nuestra variedad de productos seleccionados
          </motion.div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onCategoryClick?.(category.slug)}
              className="group relative aspect-[3/4] overflow-hidden rounded-3xl bg-secondary cursor-pointer hover-lift"
            >
              {/* Image */}
              <img
                src={category.image_url || "/placeholder.svg"}
                alt={category.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

              {/* Content */}
              <div className="absolute inset-0 flex flex-col justify-end p-8">
                <h3 className="text-white text-2xl font-bold mb-2 tracking-tight">
                  {category.name}
                </h3>
                <div className="flex items-center text-accent text-xs font-bold tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                  Explorar <ArrowRight className="ml-2 w-4 h-4" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}