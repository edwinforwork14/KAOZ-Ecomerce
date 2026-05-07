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
import { useCart } from "@/contexts/cart-context"
import { api } from "@/lib/api"

interface FeaturedProductsProps {
  onProductClick?: (product: any) => void
  category?: string
  showAll?: boolean
  setActiveTab?: (tab: string) => void
  viewAllTab?: string
}

interface PublicSettings {
  currency: {
    symbol: string
    code: string
    showBsPrice: boolean
  }
  exchangeRate: {
    usd: number
    eur: number
    date?: string
  }
}

interface FilterOptions {
  brands: string[]
  colors: { name: string; hex: string | null }[]
  priceRange: { min: number; max: number }
  totalProducts: number
  counts: {
    new: number
    discount: number
    inStock: number
  }
}

export default function FeaturedProducts({
  onProductClick,
  category,
  showAll = false,
  setActiveTab,
  viewAllTab = "sale",
}: FeaturedProductsProps) {
  const { addItem } = useCart()

  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [settings, setSettings] = useState<PublicSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [filtersLoading, setFiltersLoading] = useState(false)

  // Opciones de filtro globales del backend
  const [globalFilterOptions, setGlobalFilterOptions] = useState<FilterOptions>({
    brands: [],
    colors: [],
    priceRange: { min: 0, max: 1000 },
    totalProducts: 0,
    counts: { new: 0, discount: 0, inStock: 0 },
  })

  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("featured")
  const [gridCols, setGridCols] = useState<3 | 4>(4)
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(12)

  // Category filter
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("")

  // Filter states
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("")
  const [showOnlyNew, setShowOnlyNew] = useState(false)
  const [showOnlyDiscount, setShowOnlyDiscount] = useState(false)
  const [showOnlyInStock, setShowOnlyInStock] = useState(false)
  
  // Estado para "Ver más" colores
  const [showAllColors, setShowAllColors] = useState(false)

  // PRICE FILTER
  const [priceRangeUI, setPriceRangeUI] = useState<[number, number]>([0, 1000])
  const [minInput, setMinInput] = useState<string>("0")
  const [maxInput, setMaxInput] = useState<string>("1000")
  const [priceRangeApplied, setPriceRangeApplied] = useState<[number, number]>([0, 1000])

  // Collapsible states
  const [brandOpen, setBrandOpen] = useState(true)
  const [colorOpen, setColorOpen] = useState(true)
  const [priceOpen, setPriceOpen] = useState(true)
  const [subcategoryOpen, setSubcategoryOpen] = useState(true)
  const [categoryOpen, setCategoryOpen] = useState(true)

  // "VER TODO" handler
  const handleViewAll = () => {
    if (setActiveTab) {
      setActiveTab(viewAllTab)
      return
    }
    console.warn(`[FeaturedProducts] "VER TODO" pressed but setActiveTab was not provided.`)
  }

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Load initial data
  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      try {
        const [categoriesResult, settingsResult] = await Promise.all([
          api.getCategories(),
          api.getPublicSettings(),
        ])

        if (!isMounted) return

        if (categoriesResult?.success) setCategories(categoriesResult.categories || [])
        if (settingsResult?.success) {
          setSettings({
            currency: settingsResult.settings.currency,
            exchangeRate: settingsResult.exchangeRate,
          })
        }
      } catch (error) {
        console.error("Error loading data:", error)
      }
    }

    loadData()
    return () => {
      isMounted = false
    }
  }, [])

  // Helper: find categoryId from slug
  const categoryIdFromSlug = useCallback(
    (slug?: string) => {
      if (!slug) return ""
      const found = categories.find((c) => c.slug === slug)
      return found?._id || ""
    },
    [categories]
  )

  // Load Filter Options
  const loadFilterOptions = useCallback(async (categoryId?: string) => {
    try {
      setFiltersLoading(true)
      const params: any = {}
      if (categoryId) params.category = categoryId

      const result = await api.getFilterOptions(params)

      if (result?.success && result.filterOptions) {
        const opts = result.filterOptions
        setGlobalFilterOptions(opts)

        const { min, max } = opts.priceRange
        setPriceRangeUI([min, max])
        setPriceRangeApplied([min, max])
        setMinInput(String(min))
        setMaxInput(String(max))
      }
    } catch (error) {
      console.error("Error loading filter options:", error)
    } finally {
      setFiltersLoading(false)
    }
  }, [])

  // Reset filters logic
  useEffect(() => {
    setSelectedBrands([])
    setSelectedColors([])
    setSelectedSubcategory("")
    setShowOnlyNew(false)
    setShowOnlyDiscount(false)
    setShowOnlyInStock(false)
    setSearchTerm("")
    setDebouncedSearchTerm("")
    setSortBy("featured")
    setCurrentPage(1)
    setShowAllColors(false)

    const cid = categoryIdFromSlug(category)
    setSelectedCategoryId(cid || "")

    if (categories.length > 0) {
      loadFilterOptions(cid || undefined)
    }
  }, [category, categories.length, categoryIdFromSlug, loadFilterOptions])

  // Reload options when internal category changes
  useEffect(() => {
    if (showAll && categories.length > 0) {
      loadFilterOptions(selectedCategoryId || undefined)
    }
  }, [selectedCategoryId, showAll, categories.length, loadFilterOptions])

  // Load Products
  useEffect(() => {
    let isMounted = true

    const loadProducts = async () => {
      try {
        setLoading(true)

        const params: any = {
          page: currentPage,
          limit: showAll ? itemsPerPage : 8,
          sort: sortBy,
        }

        // 1. Si el usuario seleccionó manualmente una categoría en el dropdown, úsala.
        if (selectedCategoryId) {
          params.category = selectedCategoryId
        } 
        // 2. Si no hay selección manual, intenta usar la categoría que viene de los props (Header/URL)
        else if (category && categories.length > 0) {
          const cat = categories.find((c) => c.slug === category)
          if (cat) {
            params.category = cat._id
          }
        }

        if (debouncedSearchTerm.trim()) {
          params.search = debouncedSearchTerm.trim()
        }

        if (selectedBrands.length > 0) {
          params.brands = selectedBrands.join(",")
        }

        if (selectedColors.length > 0) {
          params.colors = selectedColors.join(",")
        }

        if (selectedSubcategory) {
          params.subcategory = selectedSubcategory
        }

        const priceBounds = globalFilterOptions.priceRange
        if (priceRangeApplied[0] !== priceBounds.min || priceRangeApplied[1] !== priceBounds.max) {
          params.minPrice = priceRangeApplied[0]
          params.maxPrice = priceRangeApplied[1]
        }

        if (showOnlyNew) {
          params.isNew = "true"
        }

        if (showOnlyDiscount) {
          params.hasDiscount = "true"
        }

        if (showOnlyInStock) {
          params.inStock = "true"
        }

        const result = await api.getProducts(params)
        if (!isMounted) return

        if (result?.success) {
          setProducts(result.products || [])
          setTotalPages(result.totalPages || 1)
          setTotalProducts(result.total || 0)
        } else {
          setProducts([])
          setTotalPages(1)
          setTotalProducts(0)
        }
      } catch (error) {
        console.error("Error loading products:", error)
        if (isMounted) {
          setProducts([])
          setTotalPages(1)
          setTotalProducts(0)
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    if (!category || categories.length > 0) loadProducts()

    return () => {
      isMounted = false
    }
  }, [
    category,
    sortBy,
    debouncedSearchTerm,
    categories,
    showAll,
    currentPage,
    itemsPerPage,
    selectedCategoryId,
    selectedBrands,
    selectedColors,
    selectedSubcategory,
    priceRangeApplied,
    showOnlyNew,
    showOnlyDiscount,
    showOnlyInStock,
    globalFilterOptions.priceRange,
  ])

  // ✅ CORRECCIÓN AQUÍ: Resetear página Y hacer scroll hacia arriba al cambiar filtros
  useEffect(() => {
    setCurrentPage(1)
    window.scrollTo({ top: 0, behavior: "smooth" }) // Esta es la línea mágica
  }, [
    selectedCategoryId,
    selectedBrands,
    selectedColors,
    selectedSubcategory,
    showOnlyNew,
    showOnlyDiscount,
    showOnlyInStock,
    priceRangeApplied, // Se dispara solo al soltar el slider (commit)
    debouncedSearchTerm,
    sortBy,
  ])

  const filterOptions = useMemo(() => {
    const colorHexMap: { [key: string]: string } = {}
    globalFilterOptions.colors.forEach((c) => {
      if (c.hex) colorHexMap[c.name] = c.hex
    })

    return {
      brands: globalFilterOptions.brands,
      colors: globalFilterOptions.colors.map((c) => c.name),
      colorHexMap,
    }
  }, [globalFilterOptions])

  // Limite de colores
  const COLORS_VISIBLE_LIMIT = 10
  const visibleColors = useMemo(() => {
    if (showAllColors) return filterOptions.colors
    return filterOptions.colors.slice(0, COLORS_VISIBLE_LIMIT)
  }, [filterOptions.colors, showAllColors])

  const priceBounds: [number, number] = useMemo(() => {
    return [globalFilterOptions.priceRange.min, globalFilterOptions.priceRange.max]
  }, [globalFilterOptions.priceRange])

  const topCategories = useMemo(() => {
    return (categories || [])
      .filter((c: any) => !c.parent)
      .sort((a: any, b: any) => (a.order ?? 999) - (b.order ?? 999))
  }, [categories])

  const subcategories = useMemo(() => {
    if (!category) return []
    const parentCat = categories.find((c) => c.slug === category)
    if (!parentCat) return []
    return categories.filter((c) => c.parent?._id === parentCat._id || c.parent === parentCat._id)
  }, [categories, category])

  const handleSliderChange = (value: number[]) => {
    if (Array.isArray(value) && value.length === 2) {
      setPriceRangeUI([value[0], value[1]])
    }
  }

  const handleSliderCommit = (value: number[]) => {
    if (Array.isArray(value) && value.length === 2) {
      const newRange: [number, number] = [value[0], value[1]]
      setPriceRangeUI(newRange)
      setMinInput(String(value[0]))
      setMaxInput(String(value[1]))
      setPriceRangeApplied(newRange)
    }
  }

  const handleMinInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMinInput(e.target.value)
  }

  const handleMaxInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMaxInput(e.target.value)
  }

  const applyPriceFilter = () => {
    const [minB, maxB] = priceBounds

    let min = minInput.trim() === "" ? minB : Number(minInput)
    let max = maxInput.trim() === "" ? maxB : Number(maxInput)

    if (Number.isNaN(min) || !Number.isFinite(min)) min = minB
    if (Number.isNaN(max) || !Number.isFinite(max)) max = maxB

    min = Math.max(minB, Math.min(min, maxB))
    max = Math.max(minB, Math.min(max, maxB))

    if (min > max) [min, max] = [max, min]

    const newRange: [number, number] = [min, max]
    setPriceRangeUI(newRange)
    setPriceRangeApplied(newRange)
    setMinInput(String(min))
    setMaxInput(String(max))
  }

  const resetPrice = () => {
    const [minB, maxB] = priceBounds
    setPriceRangeUI(priceBounds)
    setPriceRangeApplied(priceBounds)
    setMinInput(String(minB))
    setMaxInput(String(maxB))
  }

  const formatPrice = (price: number, showBs = false) => {
    const symbol = settings?.currency?.symbol || "$"
    const formatted = `${symbol}${price.toFixed(2)}`

    if (showBs && settings?.currency?.showBsPrice && settings?.exchangeRate) {
      const rate =
        settings.currency.code === "EUR" ? settings.exchangeRate.eur : settings.exchangeRate.usd
      const bsPrice = price * rate
      return { main: formatted, bs: `Bs. ${bsPrice.toFixed(2)}` }
    }

    return { main: formatted, bs: null as string | null }
  }

  const handleAddToCart = async (product: any, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!product.variants || product.variants.length === 0) return

    const firstVariant =
      product.variants.find((v: any) => v.sizes?.some((s: any) => (s.stock || 0) > 0)) ||
      product.variants[0]

    const firstSize =
      firstVariant?.sizes?.find((s: any) => (s.stock || 0) > 0) || firstVariant?.sizes?.[0]

    if (!firstSize || (firstSize.stock || 0) === 0) return

    await addItem(
      {
        id: product.id || product._id,
        name: product.name,
        price: product.price,
        originalPrice:
          product.originalPrice && product.originalPrice > product.price
            ? product.originalPrice
            : undefined,
        image: product.images?.[0]?.url,
        size: firstSize.size,
        color: firstVariant.color,
      },
      1
    )
  }

  const clearFilters = () => {
    setSelectedBrands([])
    setSelectedColors([])
    setSelectedSubcategory("")
    setShowOnlyNew(false)
    setShowOnlyDiscount(false)
    setShowOnlyInStock(false)

    const cid = categoryIdFromSlug(category)
    setSelectedCategoryId(cid || "")

    setSearchTerm("")
    setDebouncedSearchTerm("")
    setSortBy("featured")

    resetPrice()
  }

  const isPriceFiltered =
    priceRangeApplied[0] !== priceBounds[0] || priceRangeApplied[1] !== priceBounds[1]
  const isSearchFiltered = debouncedSearchTerm.trim().length > 0
  const isCategoryFiltered = selectedCategoryId !== "" && categoryIdFromSlug(category) === ""

  const activeFiltersCount = [
    isCategoryFiltered,
    selectedBrands.length > 0,
    selectedColors.length > 0,
    selectedSubcategory !== "",
    showOnlyNew,
    showOnlyDiscount,
    showOnlyInStock,
    isPriceFiltered,
    isSearchFiltered,
  ].filter(Boolean).length

  // ✅ FUNCION PRINCIPAL: Determina el título y visibilidad del filtro
  const getCategoryTitle = () => {
    // Si no hay categoría definida, el título por defecto es "PRODUCTOS" (como en tu imagen)
    if (!category) return "PRODUCTOS"
    
    // Buscamos si la categoría existe
    const cat = categories.find((c) => c.slug === category)
    
    // Si existe, devolvemos su nombre, si no, "PRODUCTOS"
    return cat?.name?.toUpperCase?.() || "PRODUCTOS"
  }

  // ✅ Calculamos el título actual para usarlo en la condición
  const pageTitle = getCategoryTitle()

  const getColorStyle = (color: string) => {
    const hex = filterOptions.colorHexMap[color]
    if (hex) return { backgroundColor: hex }

    const colorMap: { [key: string]: string } = {
      negro: "#000000",
      black: "#000000",
      blanco: "#FFFFFF",
      white: "#FFFFFF",
      rojo: "#DC2626",
      red: "#DC2626",
      azul: "#2563EB",
      blue: "#2563EB",
      verde: "#16A34A",
      green: "#16A34A",
      amarillo: "#EAB308",
      yellow: "#EAB308",
      naranja: "#EA580C",
      orange: "#EA580C",
      morado: "#9333EA",
      purple: "#9333EA",
      rosa: "#EC4899",
      pink: "#EC4899",
      gris: "#6B7280",
      gray: "#6B7280",
    }

    return { backgroundColor: colorMap[color.toLowerCase()] || "#9CA3AF" }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value))
    setCurrentPage(1)
  }

  // Variable de JSX para filtros
  const FiltersMarkup = (
    <div className="space-y-6">
      <div className="space-y-3">
        <h4 className="font-bold text-sm uppercase tracking-wider">Filtros Rápidos</h4>

        {/* ✅ CAMBIO: El filtro se muestra SOLO si el título es "PRODUCTOS" */}
        {pageTitle === "PRODUCTOS" && (
          <Collapsible open={categoryOpen} onOpenChange={setCategoryOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2">
              <span className="text-sm font-bold uppercase tracking-wider">Categoría</span>
              {categoryOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CollapsibleTrigger>

            <CollapsibleContent className="pt-2 space-y-2">
              <div className="flex items-center gap-2">
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="h-12 w-full px-4 border-2 border-gray-200 rounded-2xl font-semibold text-sm bg-white hover:border-gray-300 transition-all shadow-sm cursor-pointer"
                  title="Filtrar por categoría"
                >
                  <option value="">Todas las categorías</option>
                  {topCategories.map((c: any) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {selectedCategoryId && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 rounded-2xl border-2"
                    onClick={() => setSelectedCategoryId("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        <div className="space-y-2 pt-2 border-t">
          <label className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-gray-50 transition-colors">
            <Checkbox checked={showOnlyNew} onCheckedChange={(c) => setShowOnlyNew(c as boolean)} />
            <span className="text-sm font-medium">Solo Nuevos</span>
            <Badge className="ml-auto bg-black text-white text-xs">
              {globalFilterOptions.counts.new}
            </Badge>
          </label>

          <label className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-gray-50 transition-colors">
            <Checkbox
              checked={showOnlyDiscount}
              onCheckedChange={(c) => setShowOnlyDiscount(c as boolean)}
            />
            <span className="text-sm font-medium">Con Descuento</span>
            <Badge className="ml-auto bg-red-500 text-white text-xs">
              {globalFilterOptions.counts.discount}
            </Badge>
          </label>

          <label className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-gray-50 transition-colors">
            <Checkbox
              checked={showOnlyInStock}
              onCheckedChange={(c) => setShowOnlyInStock(c as boolean)}
            />
            <span className="text-sm font-medium">En Stock</span>
            <Badge className="ml-auto bg-green-500 text-white text-xs">
              {globalFilterOptions.counts.inStock}
            </Badge>
          </label>
        </div>
      </div>

      {subcategories.length > 0 && (
        <Collapsible open={subcategoryOpen} onOpenChange={setSubcategoryOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 border-t pt-4">
            <h4 className="font-bold text-sm uppercase tracking-wider">Subcategorías</h4>
            {subcategoryOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </CollapsibleTrigger>

          <CollapsibleContent className="pt-3 space-y-2">
            {subcategories.map((sub: any) => (
              <label
                key={sub._id}
                className={`flex items-center gap-3 cursor-pointer p-2 rounded-xl transition-colors ${
                  selectedSubcategory === sub._id ? "bg-black text-white" : "hover:bg-gray-50"
                }`}
                onClick={() =>
                  setSelectedSubcategory(selectedSubcategory === sub._id ? "" : sub._id)
                }
              >
                <span className="text-sm font-medium">{sub.name}</span>
              </label>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* {filterOptions.brands.length > 0 && (
        <Collapsible open={brandOpen} onOpenChange={setBrandOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 border-t pt-4">
            <h4 className="font-bold text-sm uppercase tracking-wider">
              Marcas ({filterOptions.brands.length})
            </h4>
            {brandOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CollapsibleTrigger>

          <CollapsibleContent className="pt-3 space-y-2 max-h-48 overflow-y-auto">
            {filterOptions.brands.map((brand) => (
              <label
                key={brand}
                className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <Checkbox
                  checked={selectedBrands.includes(brand)}
                  onCheckedChange={(checked) => {
                    if (checked) setSelectedBrands((prev) => [...prev, brand])
                    else setSelectedBrands((prev) => prev.filter((b) => b !== brand))
                  }}
                />
                <span className="text-sm font-medium">{brand}</span>
              </label>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )} */}

      {filterOptions.colors.length > 0 && (
        <Collapsible open={colorOpen} onOpenChange={setColorOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 border-t pt-4">
            <h4 className="font-bold text-sm uppercase tracking-wider">
              Colores ({filterOptions.colors.length})
            </h4>
            {colorOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CollapsibleTrigger>

          <CollapsibleContent className="pt-3">
            <div className="flex flex-wrap gap-2">
              {visibleColors.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    setSelectedColors((prev) =>
                      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
                    )
                  }}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    selectedColors.includes(color)
                      ? "ring-2 ring-black ring-offset-2 scale-110"
                      : "border-gray-300 hover:scale-110"
                  }`}
                  style={getColorStyle(color)}
                  title={color}
                  type="button"
                />
              ))}
            </div>
            {filterOptions.colors.length > COLORS_VISIBLE_LIMIT && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 text-xs text-gray-500 hover:text-black p-0 h-auto font-medium"
                onClick={() => setShowAllColors(!showAllColors)}
              >
                {showAllColors ? (
                  <span className="flex items-center gap-1">
                    <Minus className="h-3 w-3" /> Mostrar menos
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Plus className="h-3 w-3" /> Mostrar más (
                    {filterOptions.colors.length - COLORS_VISIBLE_LIMIT})
                  </span>
                )}
              </Button>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Price Range */}
      <Collapsible open={priceOpen} onOpenChange={setPriceOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 border-t pt-4">
          <h4 className="font-bold text-sm uppercase tracking-wider">
            Precio (${priceBounds[0]} - ${priceBounds[1]})
          </h4>
          {priceOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </CollapsibleTrigger>

        <CollapsibleContent className="pt-4 space-y-4">
          <div className="px-2">
            <Slider
              value={priceRangeUI}
              min={priceBounds[0]}
              max={priceBounds[1]}
              step={1}
              onValueChange={handleSliderChange}
              onValueCommit={handleSliderCommit}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-500 uppercase">Mínimo</p>
              <Input
                type="text"
                inputMode="numeric"
                value={minInput}
                onChange={handleMinInputChange}
                placeholder={String(priceBounds[0])}
                className="h-11 rounded-2xl border-2"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-500 uppercase">Máximo</p>
              <Input
                type="text"
                inputMode="numeric"
                value={maxInput}
                onChange={handleMaxInputChange}
                placeholder={String(priceBounds[1])}
                className="h-11 rounded-2xl border-2"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              className="flex-1 rounded-2xl font-bold uppercase h-11"
              onClick={applyPriceFilter}
            >
              Aplicar
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl border-2 font-bold uppercase h-11 px-4"
              onClick={resetPrice}
            >
              Resetear
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Clear Filters */}
      {activeFiltersCount > 0 && (
        <Button
          variant="outline"
          className="w-full border-2 border-black rounded-xl font-bold uppercase text-sm"
          onClick={clearFilters}
        >
          <X className="h-4 w-4 mr-2" />
          Limpiar Filtros ({activeFiltersCount})
        </Button>
      )}
    </div>
  )

  if (loading && products.length === 0) {
    return (
      <section className="w-full border-b border-outline-variant/30 bg-background">
        <div className="flex justify-between items-end p-gutter md:p-margin border-b border-outline-variant/30 bg-surface-container-lowest">
          <div className="flex items-center gap-4">
            <div className="bg-tertiary text-on-tertiary px-2 py-1 flex items-center">
              <span className="material-symbols-outlined text-sm">bolt</span>
            </div>
            <h2 className="font-h2 text-h2 text-on-background uppercase tracking-tight">LOADING INVENTORY</h2>
          </div>
        </div>
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-2 border-tertiary border-t-transparent animate-spin"></div>
            <span className="font-mono-data text-label-caps text-on-surface-variant uppercase tracking-widest">Initialising Grid...</span>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="w-full border-b border-gray-100 bg-white">
      <div className="flex flex-col sm:flex-row justify-between items-end p-gutter md:p-margin border-b border-gray-100 bg-gray-50/50 gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-black text-white px-2 py-1 flex items-center">
            <span className="material-symbols-outlined text-sm">bolt</span>
          </div>
          <h2 className="text-3xl font-black text-black uppercase tracking-tight">{pageTitle}</h2>
        </div>
        
        {showAll && (
          <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:min-w-[300px]">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-gray-400 text-sm">&gt;_</span>
              <input
                placeholder="BUSCAR PRODUCTOS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white border border-gray-200 text-black placeholder-gray-400 focus:ring-1 focus:ring-black px-10 py-3 w-full font-mono text-sm uppercase transition-colors rounded-xl"
              />
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white border border-gray-200 text-black focus:ring-1 focus:ring-black px-4 py-3 font-mono text-xs uppercase transition-colors cursor-pointer rounded-xl"
            >
              <option value="featured">Featured</option>
              <option value="-createdAt">Most Recent</option>
              <option value="price">Price: Low</option>
              <option value="-price">Price: High</option>
            </select>

            {/* Mobile Filter Trigger */}
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <button className="lg:hidden bg-transparent border border-outline-variant/50 text-on-background px-4 py-3 font-mono-data text-xs uppercase flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">tune</span>
                  Filters
                  {activeFiltersCount > 0 && <span className="bg-tertiary text-on-tertiary px-1">{activeFiltersCount}</span>}
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 bg-background border-r border-outline-variant/30 p-6 overflow-y-auto">
                <SheetHeader className="border-b border-outline-variant/30 pb-4 mb-6">
                  <SheetTitle className="font-display text-h3 text-on-background uppercase tracking-tight">Protocol_Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-6">{FiltersMarkup}</div>
              </SheetContent>
            </Sheet>
          </div>
        )}

        {!showAll && (
          <div className="font-mono text-gray-500 hidden md:block uppercase">
            ITEMS: {products.length.toString().padStart(2, '0')} // ORDEN: RECIENTE
          </div>
        )}
      </div>

      {/* Results count & Active Filters */}
      {showAll && (
        <div className="flex flex-wrap items-center gap-2 px-gutter md:px-margin py-3 border-b border-gray-100 bg-gray-50/30 text-sm md:text-base">
          <p className="text-xs md:text-sm text-gray-500 font-mono uppercase">
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 border border-tertiary border-t-transparent animate-spin inline-block" />
                Cargando...
              </span>
            ) : (
              <>
                Mostrando <span className="font-bold text-on-background">{products.length}</span> de{" "}
                {totalProducts} productos
              </>
            )}
          </p>

          {selectedCategoryId && pageTitle === "PRODUCTOS" && (
            <Badge variant="secondary" className="gap-1 cursor-pointer text-xs" onClick={() => setSelectedCategoryId("")}>
              {topCategories.find((c: any) => c._id === selectedCategoryId)?.name || "Categoría"}{" "}
              <X className="h-3 w-3" />
            </Badge>
          )}

          {selectedBrands.map((brand) => (
            <Badge key={brand} variant="secondary" className="gap-1 cursor-pointer text-xs" onClick={() => setSelectedBrands((prev) => prev.filter((b) => b !== brand))}>
              {brand} <X className="h-3 w-3" />
            </Badge>
          ))}

          {selectedColors.map((color) => (
            <Badge key={color} variant="secondary" className="gap-1 cursor-pointer text-xs" onClick={() => setSelectedColors((prev) => prev.filter((c) => c !== color))}>
              <span className="w-3 h-3 rounded-full mr-1" style={getColorStyle(color)} />
              {color} <X className="h-3 w-3" />
            </Badge>
          ))}

          {isPriceFiltered && (
            <Badge variant="secondary" className="gap-1 cursor-pointer text-xs" onClick={resetPrice}>
              ${priceRangeApplied[0]} - ${priceRangeApplied[1]} <X className="h-3 w-3" />
            </Badge>
          )}
        </div>
      )}

      <div className="w-full flex gap-0">
        {/* Desktop Sidebar Filters */}
        {showAll && (
          <aside className="hidden lg:block w-72 flex-shrink-0 border-r border-gray-100 bg-white">
            <div className="sticky top-24 p-8">
              {filtersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-2 border-black border-t-transparent animate-spin"></div>
                </div>
              ) : (
                FiltersMarkup
              )}
            </div>
          </aside>
        )}

        <div className="flex-1 bg-white">
          {products.length === 0 && !loading ? (
            <div className="text-center py-32 px-4 flex flex-col items-center">
              <span className="material-symbols-outlined text-6xl text-outline mb-6">inventory_2</span>
              <p className="font-h3 text-h3 text-on-background mb-8 uppercase tracking-tight">NO_ASSETS_FOUND</p>
              <button
                onClick={clearFilters}
                className="bg-tertiary text-on-tertiary font-label-caps text-label-caps uppercase px-12 py-5 hover:bg-surface-container-highest hover:text-tertiary transition-all duration-300 border border-tertiary"
              >
                RESET_PROTOCOL
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 w-full">
                  {products.map((product, index) => {
                    const price = formatPrice(Number(product.price) || 0, true)
                    const originalPrice =
                      product.originalPrice && product.originalPrice > product.price
                        ? formatPrice(Number(product.originalPrice) || 0, false)
                        : null

                    return (
                      <div
                        key={product.id || product._id}
                        className="group flex flex-col border-b border-r border-gray-100 bg-white relative hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => onProductClick?.(product)}
                      >
                        <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-white">
                          <span className="font-mono text-[10px] text-gray-400 uppercase tracking-widest">REF: {product.id?.slice(-6) || product._id?.slice(-6)}</span>
                          {product.isNew ? (
                            <span className="font-mono text-[10px] bg-black text-white px-2 py-0.5 rounded-full uppercase">NEW</span>
                          ) : originalPrice ? (
                            <span className="font-mono text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full uppercase">SALE</span>
                          ) : null}
                        </div>
                        
                        <div className="relative w-full aspect-[4/5] overflow-hidden bg-white p-4">
                          <img
                            src={product.images?.[0]?.url || "/placeholder.svg"}
                            alt={product.name}
                            className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                            onError={(e) => { e.currentTarget.src = "/placeholder.svg" }}
                          />
                          
                          {/* Technical Action Overlay */}
                          <div className="absolute inset-0 bg-black/5 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 m-4 rounded-xl">
                            <button 
                              className="bg-black text-white font-bold text-[10px] uppercase px-6 py-3 rounded-full hover:bg-kaosNeon hover:text-black transition-all flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 duration-300 shadow-xl"
                              onClick={(e) => { e.stopPropagation(); handleAddToCart(product, e) }}
                            >
                              <Plus className="w-3 h-3" /> AÑADIR
                            </button>
                          </div>
                        </div>

                        <div className="p-4 border-t border-gray-100">
                          <h4 className="font-bold text-sm text-black uppercase truncate mb-1">{product.name}</h4>
                          <div className="flex justify-between items-center mt-2">
                            <p className="font-mono text-gray-400 text-[10px] uppercase">{product.category?.name || "COLLECTION"}</p>
                            <span className="font-bold text-black text-sm">
                              ${product.price}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Pagination Controls */}
                {showAll && totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 md:mt-12 pt-6 md:pt-8 border-t-2">
                    <div className="text-xs md:text-sm text-gray-600 font-medium text-center sm:text-left">
                      Mostrando {(currentPage - 1) * itemsPerPage + 1} a{" "}
                      {Math.min(currentPage * itemsPerPage, totalProducts)} de {totalProducts}{" "}
                      productos
                    </div>

                    <div className="flex items-center gap-1.5 md:gap-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-4 py-2 border border-outline-variant hover:bg-surface-container disabled:opacity-30 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">chevron_left</span>
                      </button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum
                          if (totalPages <= 5) pageNum = i + 1
                          else if (currentPage <= 3) pageNum = i + 1
                          else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i
                          else pageNum = currentPage - 2 + i

                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`w-10 h-10 font-mono-data text-xs border transition-colors ${
                                currentPage === pageNum
                                  ? "bg-tertiary text-on-tertiary border-tertiary"
                                  : "border-outline-variant hover:bg-surface-container"
                              }`}
                            >
                              {pageNum.toString().padStart(2, '0')}
                            </button>
                          )
                        })}
                      </div>

                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 border border-outline-variant hover:bg-surface-container disabled:opacity-30 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}        {/* View All Button */}
        {!showAll && products.length >= 8 && (
          <div className="p-6 border-t border-outline-variant/30 flex justify-center bg-surface-container-lowest">
            <button
              type="button"
              onClick={handleViewAll}
              className="bg-transparent border border-outline-variant text-on-surface-variant font-mono-data text-label-caps uppercase px-12 py-4 hover:bg-surface-container hover:text-tertiary hover:border-tertiary transition-all duration-300 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">sync</span> LOAD NEXT BATCH // ALL PRODUCTS
            </button>
          </div>
        )}
        </div>
      </div>
    </section>
  )
}