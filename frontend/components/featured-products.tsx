// frontend/components/featured-products.tsx
"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ShoppingBag,
  Heart,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Grid3X3,
  LayoutGrid,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { motion, AnimatePresence } from "framer-motion"
import { useCart } from "@/contexts/cart-context"
import { api } from "@/lib/api"

interface FeaturedProductsProps {
  onProductClick?: (product: any) => void
  category?: string
  showAll?: boolean
  setActiveTab?: (tab: string) => void
  viewAllTab?: string
}

const COLORS_VISIBLE_LIMIT = 8

export default function FeaturedProducts({
  onProductClick,
  category: categoryProp,
  showAll = false,
  setActiveTab,
  viewAllTab = "shop",
}: FeaturedProductsProps) {
  const { addItem, setIsOpen } = useCart()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [totalProducts, setTotalProducts] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [sortBy, setSortBy] = useState("featured")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState("")
  const [selectedSubcategory, setSelectedSubcategory] = useState("")
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000])
  const [priceRangeUI, setPriceRangeUI] = useState<[number, number]>([0, 1000000])
  const [priceBounds, setPriceBounds] = useState<[number, number]>([0, 1000000])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [subcategories, setSubcategories] = useState<any[]>([])
  const [filterOptions, setFilterOptions] = useState({
    colors: [] as string[],
    sizes: [] as string[],
    brands: [] as string[],
  })
  const [showAllColors, setShowAllColors] = useState(false)
  const [filtersLoading, setFiltersLoading] = useState(true)
  const [viewMode, setViewMode] = useState<3 | 4>(3)

  const loadFilters = useCallback(async () => {
    try {
      setFiltersLoading(true)
      const [catsRes, optionsRes] = await Promise.all([
        api.getCategories(),
        api.getFilterOptions(),
      ])

      if (Array.isArray(catsRes)) {
        setCategories(catsRes)
      } else if (catsRes && typeof catsRes === 'object' && Array.isArray((catsRes as any).categories)) {
        setCategories((catsRes as any).categories)
      } else {
        setCategories([])
      }
      
      setFilterOptions({
        colors: optionsRes?.colors || [],
        sizes: optionsRes?.sizes || [],
        brands: optionsRes?.brands || [],
      })

      if (optionsRes?.priceRange) {
        setPriceBounds([optionsRes.priceRange.min, optionsRes.priceRange.max])
        setPriceRange([optionsRes.priceRange.min, optionsRes.priceRange.max])
        setPriceRangeUI([optionsRes.priceRange.min, optionsRes.priceRange.max])
      }
    } catch (error) {
      console.error("Error loading filters:", error)
    } finally {
      setFiltersLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFilters()
  }, [loadFilters])

  useEffect(() => {
    if (selectedCategoryId) {
      const cat = categories.find((c) => (c.id || c._id) === selectedCategoryId)
      setSubcategories(cat?.subcategories || [])
      setSelectedSubcategory("")
    } else {
      setSubcategories([])
      setSelectedSubcategory("")
    }
  }, [selectedCategoryId, categories])

  const categoryIdFromSlug = (slug: string) => {
    const cat = categories.find(
      (c) => c.name.toLowerCase() === slug.toLowerCase() || c.slug === slug
    )
    return cat?.id || cat?._id || ""
  }

  useEffect(() => {
    if (Array.isArray(categories) && categories.length > 0) {
      if (!categoryProp || categoryProp === "shop" || categoryProp === "home") {
        setSelectedCategoryId("")
      } else {
        const id = categoryIdFromSlug(categoryProp)
        if (id) {
          setSelectedCategoryId(id)
        } else {
          setSelectedCategoryId("")
        }
      }
    }
  }, [categoryProp, categories])

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true)
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        sort: sortBy,
        search: searchTerm,
        category: selectedCategoryId,
        subcategory: selectedSubcategory,
        colors: selectedColors.join(","),
        sizes: selectedSizes.join(","),
        brands: selectedBrands.join(","),
        minPrice: priceRange[0],
        maxPrice: priceRange[1],
      }

      const res = await api.getProducts(params)
      setProducts(res.products || [])
      setTotalProducts(res.total || 0)
    } catch (error) {
      console.error("Error loading products:", error)
    } finally {
      setLoading(false)
    }
  }, [
    currentPage,
    itemsPerPage,
    sortBy,
    searchTerm,
    selectedCategoryId,
    selectedSubcategory,
    selectedColors,
    selectedSizes,
    selectedBrands,
    priceRange,
  ])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const totalPages = Math.ceil(totalProducts / itemsPerPage)

  const activeFiltersCount = useMemo(() => {
    let count = selectedColors.length + selectedSizes.length + (selectedCategoryId ? 1 : 0)
    if (selectedSubcategory) count++
    if (searchTerm) count++
    return count
  }, [selectedColors, selectedSizes, selectedCategoryId, selectedSubcategory, searchTerm])

  const clearFilters = () => {
    setSelectedColors([])
    setSelectedSizes([])
    setSelectedBrands([])
    setSelectedCategoryId("")
    setSelectedSubcategory("")
    setSearchTerm("")
    setPriceRange(priceBounds)
    setPriceRangeUI(priceBounds)
  }

  const handleSliderChange = (value: number[]) => {
    setPriceRangeUI(value as [number, number])
  }

  const handleSliderCommit = (value: number[]) => {
    setPriceRange(value as [number, number])
    setCurrentPage(1)
  }

  const handleMinInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 0
    setPriceRangeUI([val, priceRangeUI[1]])
  }

  const handleMaxInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || priceBounds[1]
    setPriceRangeUI([priceRangeUI[0], val])
  }

  const getColorStyle = (color: string) => {
    if (color.startsWith("#")) return { backgroundColor: color }
    
    const colorMap: Record<string, string> = {
      // Spanish
      negro: "#000000",
      blanco: "#FFFFFF",
      rojo: "#FF0000",
      azul: "#0000FF",
      verde: "#008000",
      amarillo: "#FFFF00",
      naranja: "#FFA500",
      morado: "#800080",
      rosa: "#FFC0CB",
      gris: "#808080",
      marron: "#A52A2A",
      cafe: "#A52A2A",
      beige: "#F5F5DC",
      crema: "#FFFDD0",
      turquesa: "#40E0D0",
      lima: "#00FF00",
      oro: "#FFD700",
      plata: "#C0C0C0",
      // English
      black: "#000000",
      white: "#FFFFFF",
      red: "#FF0000",
      blue: "#0000FF",
      green: "#008000",
      yellow: "#FFFF00",
      orange: "#FFA500",
      purple: "#800080",
      pink: "#FFC0CB",
      gray: "#808080",
      grey: "#808080",
      brown: "#A52A2A",
      cyan: "#00FFFF",
      magenta: "#FF00FF",
      navy: "#000080",
      teal: "#008080",
      olive: "#808000",
      maroon: "#800000",
      gold: "#FFD700",
      silver: "#C0C0C0",
    }
    
    const normalized = color.toLowerCase().trim()
    return { backgroundColor: colorMap[normalized] || "#D1D5DB" }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const pageTitle = categoryProp && categoryProp !== "shop" && categoryProp !== "home" 
    ? categories.find(c => (c.id || c._id) === selectedCategoryId)?.name || "PRODUCTOS"
    : "PRODUCTOS"

  const FiltersLoadingSkeleton = () => (
    <div className="space-y-8 py-2 animate-pulse">
      <div className="space-y-4">
        <div className="h-3 w-20 bg-gray-100 rounded-full" />
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 w-20 bg-gray-50 rounded-full" />
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <div className="h-3 w-24 bg-gray-100 rounded-full" />
        <div className="h-40 bg-gray-50 rounded-[24px]" />
      </div>
    </div>
  )

  const FiltersMarkup = (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
      }}
      className="space-y-8 py-2"
    >
      {/* Search - Mobile */}
      <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="lg:hidden mb-6">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-black transition-colors" />
          <input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-100 border-none rounded-2xl pl-12 pr-12 py-4 text-sm font-bold focus:ring-2 focus:ring-kaosNeon transition-all"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full">
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </div>
      </motion.div>

      {/* Categories */}
      <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="space-y-4">
        <h4 className="font-black text-[11px] uppercase tracking-[0.25em] text-black mb-2 flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-kaosNeon rounded-full" />
          Categorías
        </h4>
        <div className="bg-gray-50/80 rounded-[28px] p-5 border border-gray-100 shadow-sm">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategoryId("")}
              className={`px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
                !selectedCategoryId ? "bg-black text-white shadow-lg scale-105" : "bg-white text-gray-400 hover:bg-gray-100 border border-gray-100"
              }`}
            >
              Todos
            </button>
            {Array.isArray(categories) && categories.map((cat) => (
              <button
                key={cat.id || cat._id}
                onClick={() => setSelectedCategoryId(selectedCategoryId === (cat.id || cat._id) ? "" : (cat.id || cat._id))}
                className={`px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
                  selectedCategoryId === (cat.id || cat._id) ? "bg-kaosNeon text-black shadow-lg scale-105" : "bg-white text-gray-400 hover:bg-gray-100 border border-gray-100"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Subcategories */}
      {subcategories.length > 0 && (
        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="space-y-4">
          <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-gray-400 ml-1">Tipo</h4>
          <div className="flex flex-wrap gap-2">
            {subcategories.map((sub: any) => (
              <button
                key={sub.id || sub._id}
                onClick={() => setSelectedSubcategory(selectedSubcategory === (sub.id || sub._id) ? "" : (sub.id || sub._id))}
                className={`px-4 py-2.5 rounded-full text-[11px] font-black uppercase tracking-wider transition-all duration-300 ${
                  selectedSubcategory === (sub.id || sub._id) ? "bg-black text-white shadow-lg scale-105" : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                }`}
              >
                {sub.name}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Colors */}
      {filterOptions.colors.length > 0 && (
        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="space-y-4">
          <h4 className="font-black text-[11px] uppercase tracking-[0.25em] text-black mb-2 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-kaosNeon rounded-full" />
            Colores
          </h4>
          <div className="bg-gray-50/80 rounded-[28px] p-6 border border-gray-100 shadow-sm">
            <div className="grid grid-cols-5 gap-3">
              {filterOptions.colors.slice(0, showAllColors ? undefined : COLORS_VISIBLE_LIMIT).map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColors(prev => prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color])}
                  className="relative group flex items-center justify-center"
                >
                  <div 
                    className={`w-10 h-10 rounded-full border-2 transition-all ${selectedColors.includes(color) ? "border-black ring-4 ring-black/5 scale-110" : "border-white shadow-sm"}`}
                    style={getColorStyle(color)}
                  />
                  {selectedColors.includes(color) && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className={`w-2.5 h-2.5 rounded-full ${color.toLowerCase() === 'blanco' || color.toLowerCase() === 'white' ? 'bg-black' : 'bg-white shadow-sm'}`} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Price */}
      <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="space-y-4">
        <h4 className="font-black text-[11px] uppercase tracking-[0.25em] text-black mb-2 flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-kaosNeon rounded-full" />
          Precio
        </h4>
        <div className="bg-gray-50/80 rounded-[28px] p-7 border border-gray-100 shadow-sm space-y-8">
          <Slider value={priceRangeUI} min={priceBounds[0]} max={priceBounds[1]} step={1} onValueChange={handleSliderChange} onValueCommit={handleSliderCommit} />
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <span className="block text-[9px] font-black text-gray-300 uppercase mb-1 tracking-tighter">Min</span>
              <span className="font-black text-sm text-black">${priceRangeUI[0]}</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <span className="block text-[9px] font-black text-gray-300 uppercase mb-1 tracking-tighter">Max</span>
              <span className="font-black text-sm text-black">${priceRangeUI[1]}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Clear All */}
      <AnimatePresence>
        {activeFiltersCount > 0 && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
            <Button variant="outline" className="w-full py-6 rounded-2xl border-2 font-black uppercase text-[10px] tracking-widest hover:bg-black hover:text-white transition-all" onClick={clearFilters}>
              <X className="h-3 w-3 mr-2" /> Limpiar Todo ({activeFiltersCount})
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )

  return (
    <div className="w-full">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12 px-4 md:px-8">
        <h2 className="text-4xl font-black uppercase tracking-tighter italic">{pageTitle}</h2>
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          {/* Grid Toggle */}
          <div className="hidden md:flex items-center bg-gray-100 p-1.5 rounded-2xl border border-gray-200">
            <button onClick={() => setViewMode(3)} className={`p-2.5 rounded-xl transition-all ${viewMode === 3 ? "bg-white shadow-md text-black" : "text-gray-400"}`}>
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button onClick={() => setViewMode(4)} className={`p-2.5 rounded-xl transition-all ${viewMode === 4 ? "bg-white shadow-md text-black" : "text-gray-400"}`}>
              <Grid3X3 className="w-5 h-5" />
            </button>
          </div>

          <div className="relative flex-1 md:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-black transition-colors" />
            <input
              placeholder="BUSCAR EQUIPAMIENTO..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-100 border-none rounded-2xl pl-12 pr-12 py-4 text-sm font-bold focus:ring-2 focus:ring-kaosNeon transition-all uppercase"
            />
          </div>
          
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="lg:hidden h-14 w-14 rounded-2xl border-2 border-gray-200">
                <SlidersHorizontal className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 overflow-y-auto pt-12 shadow-2xl">
              <SheetHeader className="mb-8">
                <SheetTitle className="text-2xl font-black uppercase italic tracking-tighter">Filtros</SheetTitle>
              </SheetHeader>
              {filtersLoading ? <FiltersLoadingSkeleton /> : FiltersMarkup}
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="flex gap-12 px-4 md:px-8">
        <aside className="hidden lg:block w-72 shrink-0 border-r border-gray-100 pr-12">
          <div className="sticky top-28">
            <div className="mb-10">
              <h3 className="text-xl font-black uppercase tracking-tighter italic mb-1">Filtrar por</h3>
              <div className="h-1 w-12 bg-kaosNeon rounded-full" />
            </div>
            {filtersLoading ? <FiltersLoadingSkeleton /> : FiltersMarkup}
          </div>
        </aside>

        <main className="flex-1">
          {loading && products.length === 0 ? (
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${viewMode === 3 ? 'xl:grid-cols-3' : 'xl:grid-cols-4'} gap-8`}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="space-y-5">
                  <div className="aspect-[3/4] bg-gray-50 rounded-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer" />
                  </div>
                  <div className="px-2 space-y-3">
                    <div className="h-4 w-3/4 bg-gray-100 rounded-full" />
                    <div className="h-6 w-1/4 bg-gray-200 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-8 border border-gray-100 shadow-inner">
                <Search className="w-12 h-12 text-gray-200" />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tight mb-4">No se encontraron productos</h3>
              <p className="text-gray-500 mb-8 max-w-xs mx-auto">Prueba ajustando los filtros o buscando algo diferente.</p>
              <Button onClick={clearFilters} className="bg-black text-white px-10 py-7 rounded-full font-bold uppercase text-[10px] tracking-widest hover:bg-kaosNeon hover:text-black transition-all">Reiniciar Filtros</Button>
            </div>
          ) : (
            <motion.div 
              layout
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.1 }
                }
              }}
              className={`grid grid-cols-1 sm:grid-cols-2 ${viewMode === 3 ? 'xl:grid-cols-3' : 'xl:grid-cols-4'} gap-x-8 gap-y-16`}
            >
              {products.map((product) => (
                <motion.div
                  key={product.id || product._id}
                  variants={{
                    hidden: { opacity: 0, y: 30 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
                  }}
                  whileHover={{ y: -10 }}
                  className="group cursor-pointer"
                  onClick={() => onProductClick?.(product)}
                >
                  <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gray-50 mb-6 transition-all duration-500 group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.15)] ring-1 ring-black/5">
                    <img 
                      src={product.images?.[0]?.url || "/placeholder.svg"} 
                      alt={product.name} 
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" 
                    />
                    
                    {/* Badge Overlay */}
                    {product.isNew && (
                      <div className="absolute top-4 left-4 z-10">
                        <Badge className="bg-kaosNeon text-black font-black uppercase text-[9px] tracking-widest px-3 py-1 rounded-full border-none">NEW_DROP</Badge>
                      </div>
                    )}

                    {/* Action Overlay */}
                    <div className="absolute inset-x-0 bottom-0 p-6 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[0.22, 1, 0.36, 1] z-20">
                      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 flex items-center justify-between shadow-xl">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Explorar</span>
                          <span className="text-xs font-black uppercase truncate max-w-[120px]">{product.name}</span>
                        </div>
                        <Button 
                          size="icon" 
                          className="rounded-full bg-black text-white hover:bg-kaosNeon hover:text-black transition-colors shadow-lg"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Hover Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>

                  <div className="px-1 flex justify-between items-start">
                    <div className="flex flex-col">
                      <h3 className="font-sans font-bold text-xs uppercase tracking-wider text-gray-500 mb-1">{product.category?.name || "URBAN"}</h3>
                      <h4 className="font-sans font-black text-lg uppercase tracking-tight leading-tight group-hover:text-kaosNeon transition-colors">{product.name}</h4>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-sans font-black text-xl leading-none">${product.price}</span>
                      {product.originalPrice && (
                        <span className="text-[10px] text-gray-400 line-through mt-1">${product.originalPrice}</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-20 pt-12 border-t border-gray-100">
              <Button variant="outline" disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)} className="h-12 w-12 rounded-xl border-2">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <Button
                  key={i}
                  variant={currentPage === i + 1 ? "default" : "outline"}
                  onClick={() => handlePageChange(i + 1)}
                  className={`h-12 w-12 rounded-xl font-black text-xs ${currentPage === i + 1 ? "bg-black text-white" : "border-2"}`}
                >
                  {i + 1}
                </Button>
              ))}
              <Button variant="outline" disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)} className="h-12 w-12 rounded-xl border-2">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}