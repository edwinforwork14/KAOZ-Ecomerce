import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { ArrowRight } from "lucide-react"

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
    <section className="max-w-[1440px] mx-auto px-4 md:px-10 py-16" data-purpose="collections-grid">
      <div className="flex justify-between items-end mb-10">
        <h2 className="text-2xl font-black uppercase tracking-wider">Explora nuestras colecciones</h2>
        <button 
          onClick={() => onCategoryClick?.('products')}
          className="text-xs font-bold uppercase underline tracking-widest"
        >
          Ver Todas
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {categories.slice(0, 5).map((category) => (
          <div 
            key={category.id}
            onClick={() => onCategoryClick?.(category.slug)}
            className="group relative rounded-2xl overflow-hidden aspect-card cursor-pointer"
          >
            <img 
              alt={category.name} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
              src={category.image_url || "/placeholder.svg"} 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent p-6 flex flex-col justify-end text-white">
              <h3 className="text-xl font-bold uppercase leading-tight">{category.name}</h3>
              <p className="text-[10px] opacity-80">{category.description || "Descubre nuestra colección."}</p>
              <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full border border-white flex items-center justify-center group-hover:bg-white group-hover:text-black transition-colors">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}