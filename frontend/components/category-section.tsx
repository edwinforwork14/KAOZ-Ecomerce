import { useEffect, useState } from "react"
import { api, cleanImageUrl } from "@/lib/api"
import { ArrowRight } from "lucide-react"
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
          const featuredCategories = result.categories.filter(
            (cat: any) => cat.slug && cat.isFeatured
          )
          setCategories(featuredCategories)
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
      <section className="max-w-[1440px] mx-auto px-4 md:px-10 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="aspect-card bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </section>
    )
  }

  if (categories.length === 0) return null

  return (
    <section className="max-w-[1600px] mx-auto px-4 md:px-8 py-20" data-purpose="collections-grid">
      <div className="flex justify-between items-end mb-12">
        <h2 
          className="text-black text-3xl md:text-5xl tracking-wider leading-none"
          style={{ fontFamily: "'Permanent Marker', cursive" }}
        >
          Explora nuestras colecciones
        </h2>
        <button 
          onClick={() => onCategoryClick?.('products')}
          className="text-xs font-bold uppercase underline tracking-widest"
        >
          Ver Todas
        </button>
      </div>
      <div className={`grid gap-4 md:gap-6 ${
        categories.length === 1 ? 'grid-cols-1' :
        categories.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
        categories.length === 3 ? 'grid-cols-1 md:grid-cols-3' :
        categories.length === 4 ? 'grid-cols-2 md:grid-cols-4' :
        'grid-cols-2 md:grid-cols-5'
      }`}>
        {categories.slice(0, 5).map((category, index) => (
          <motion.div 
            key={category.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            onClick={() => onCategoryClick?.(category.slug)}
            className={`group relative rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all duration-500 ${
              categories.length === 1 ? 'aspect-[21/9] md:aspect-[25/9]' : 'aspect-card'
            }`}
          >
            <img 
              alt={category.name} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
              src={cleanImageUrl(category.image) || "/placeholder.svg"} 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 md:p-8 flex flex-col justify-end text-white">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: (index * 0.1) + 0.3 }}
              >
                <h3 className={`${categories.length === 1 ? 'text-3xl md:text-5xl' : 'text-xl md:text-2xl'} font-black uppercase leading-none tracking-tighter mb-2`}>
                  {category.name}
                </h3>
                <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest opacity-70 group-hover:opacity-100 transition-opacity">
                  {category.description || "Explorar Colección"}
                </p>
              </motion.div>
              
              <div className="absolute bottom-6 right-6 md:bottom-8 md:right-8 w-10 h-10 md:w-12 md:h-12 rounded-full border border-white/30 flex items-center justify-center group-hover:bg-kaosNeon group-hover:border-kaosNeon group-hover:text-black transition-all duration-500 group-hover:rotate-[-45deg]">
                <ArrowRight className="w-5 h-5 md:w-6 md:h-6" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}