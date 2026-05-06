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
      <section className="py-8 md:py-12 lg:py-16 bg-white">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-center h-48 md:h-64">
            <Loader2 className="h-10 w-10 md:h-12 md:w-12 animate-spin text-gray-400" />
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-8 md:py-12 lg:py-16 bg-white">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-black uppercase tracking-tight mb-3 md:mb-4">
            {pageTitle}
          </h2>
          <div className="h-1 w-20 md:w-24 bg-gradient-to-r from-black to-gray-400 rounded-full mb-4 md:mb-6" />

          {/* Toolbar */}
          {showAll && (
            <div className="space-y-3 mb-4 md:mb-6">
              {/* Search */}
              <div className="relative w-full">
                <Search className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-gray-400" />
                <Input
                  placeholder="Buscar productos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 md:pl-12 h-12 md:h-14 border-2 border-gray-200 rounded-2xl focus:border-black transition-all shadow-sm hover:shadow-md text-sm md:text-base w-full"
                />
              </div>

              {/* Controls Row */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
                {/* Mobile Filter Button */}
                <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      className="lg:hidden h-11 md:h-12 px-3 md:px-4 border-2 rounded-xl md:rounded-2xl font-semibold gap-2 text-xs md:text-sm whitespace-nowrap flex-shrink-0"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                      Filtros
                      {activeFiltersCount > 0 && (
                        <Badge className="bg-black text-white text-[10px] md:text-xs">
                          {activeFiltersCount}
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>

                  <SheetContent side="left" className="w-80 overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle>Filtros</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6">{FiltersMarkup}</div>
                  </SheetContent>
                </Sheet>

                {/* Items per page selector */}
                <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                  <SelectTrigger className="w-[100px] md:w-[140px] h-11 md:h-12 border-2 rounded-xl md:rounded-2xl text-xs md:text-sm flex-shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12 por página</SelectItem>
                    <SelectItem value="24">24 por página</SelectItem>
                    <SelectItem value="48">48 por página</SelectItem>
                  </SelectContent>
                </Select>

                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="h-11 md:h-12 px-3 md:px-4 border-2 border-gray-200 rounded-xl md:rounded-2xl font-semibold uppercase text-[10px] md:text-xs bg-white hover:border-gray-300 transition-all shadow-sm cursor-pointer flex-shrink-0 min-w-[120px] md:min-w-[140px]"
                >
                  <option value="featured">Destacados</option>
                  <option value="-createdAt">Más Nuevos</option>
                  <option value="price">Precio: Menor</option>
                  <option value="-price">Precio: Mayor</option>
                  <option value="name">Nombre A-Z</option>
                </select>

                {/* Grid Toggle */}
                <div className="hidden md:flex items-center border-2 rounded-2xl overflow-hidden flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setGridCols(3)}
                    className={`p-2.5 md:p-3 ${
                      gridCols === 3 ? "bg-black text-white" : "bg-white hover:bg-gray-100"
                    }`}
                  >
                    <Grid3X3 className="h-4 w-4 md:h-5 md:w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setGridCols(4)}
                    className={`p-2.5 md:p-3 ${
                      gridCols === 4 ? "bg-black text-white" : "bg-white hover:bg-gray-100"
                    }`}
                  >
                    <LayoutGrid className="h-4 w-4 md:h-5 md:w-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Results count & Active Filters */}
          <div className="flex flex-wrap items-center gap-2 text-sm md:text-base">
            <p className="text-xs md:text-sm text-gray-600 font-medium">
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Cargando...
                </span>
              ) : (
                <>
                  Mostrando <span className="font-bold text-black">{products.length}</span> de{" "}
                  {totalProducts} productos
                </>
              )}
            </p>

            {selectedCategoryId && pageTitle === "PRODUCTOS" && (
              <Badge
                variant="secondary"
                className="gap-1 cursor-pointer text-xs"
                onClick={() => setSelectedCategoryId("")}
              >
                {topCategories.find((c: any) => c._id === selectedCategoryId)?.name || "Categoría"}{" "}
                <X className="h-3 w-3" />
              </Badge>
            )}

            {selectedBrands.map((brand) => (
              <Badge
                key={brand}
                variant="secondary"
                className="gap-1 cursor-pointer text-xs"
                onClick={() => setSelectedBrands((prev) => prev.filter((b) => b !== brand))}
              >
                {brand} <X className="h-3 w-3" />
              </Badge>
            ))}

            {selectedColors.map((color) => (
              <Badge
                key={color}
                variant="secondary"
                className="gap-1 cursor-pointer text-xs"
                onClick={() => setSelectedColors((prev) => prev.filter((c) => c !== color))}
              >
                <span className="w-3 h-3 rounded-full mr-1" style={getColorStyle(color)} />
                {color} <X className="h-3 w-3" />
              </Badge>
            ))}

            {isPriceFiltered && (
              <Badge
                variant="secondary"
                className="gap-1 cursor-pointer text-xs"
                onClick={resetPrice}
              >
                ${priceRangeApplied[0]} - ${priceRangeApplied[1]} <X className="h-3 w-3" />
              </Badge>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex gap-4 md:gap-6 lg:gap-8">
          {/* Desktop Sidebar Filters */}
          {showAll && (
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-24 bg-white rounded-2xl border-2 p-6">
                {filtersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : (
                  FiltersMarkup
                )}
              </div>
            </aside>
          )}

          {/* Products Grid */}
          <div className="flex-1">
            {products.length === 0 && !loading ? (
              <div className="text-center py-12 md:py-16 px-4">
                <div className="inline-flex items-center justify-center w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl md:rounded-3xl mb-4 md:mb-6 shadow-lg">
                  <ShoppingBag className="h-10 w-10 md:h-12 md:w-12 text-gray-400" />
                </div>
                <p className="text-lg md:text-xl text-gray-500 mb-4 md:mb-6 font-semibold">
                  No se encontraron productos
                </p>
                <Button
                  onClick={clearFilters}
                  className="bg-black text-white rounded-xl md:rounded-2xl px-8 md:px-10 py-5 md:py-6 font-bold uppercase text-sm md:text-base"
                >
                  Limpiar Filtros
                </Button>
              </div>
            ) : (
              <>
                <div
                  className={[
                    "grid grid-cols-2 gap-3 md:gap-4 lg:gap-6",
                    showAll
                      ? gridCols === 3
                        ? "md:grid-cols-3"
                        : "md:grid-cols-3 lg:grid-cols-4"
                      : "md:grid-cols-3 lg:grid-cols-4",
                  ].join(" ")}
                >
                  {products.map((product, index) => {
                    const price = formatPrice(Number(product.price) || 0, true)
                    const originalPrice =
                      product.originalPrice && product.originalPrice > product.price
                        ? formatPrice(Number(product.originalPrice) || 0, false)
                        : null

                    return (
                      <div
                        key={product.id || product._id}
                        // Animación staggered (uno por uno)
                        className="group cursor-pointer animate-in fade-in zoom-in-95 duration-500 fill-mode-both"
                        style={{
                          animationDelay: `${index * 50}ms`,
                          animationFillMode: "both",
                        }}
                        onClick={() => onProductClick?.(product)}
                      >
                        {/* Image Container */}
                        <div className="relative aspect-[3/4] overflow-hidden bg-gray-100 mb-2 md:mb-3 lg:mb-4 rounded-xl md:rounded-2xl shadow-sm md:shadow-md hover:shadow-lg md:hover:shadow-2xl transition-all duration-500">
                          <img
                            src={
                              product.images?.[0]?.url || "/placeholder.svg"
                            }
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            onError={(e) => {
                              e.currentTarget.src = "/placeholder.svg"
                            }}
                          />

                          {/* Badges */}
                          <div className="absolute top-2 left-2 md:top-3 md:left-3 flex flex-col gap-1 md:gap-2">
                            {product.isNew && (
                              <span className="bg-gradient-to-r from-black to-gray-800 text-white px-2 py-1 md:px-3 md:py-1.5 text-[10px] md:text-xs font-bold uppercase rounded-full shadow-lg">
                                NUEVO
                              </span>
                            )}
                            {originalPrice && (
                              <span className="bg-gradient-to-r from-red-600 to-red-500 text-white px-2 py-1 md:px-3 md:py-1.5 text-[10px] md:text-xs font-bold uppercase rounded-full shadow-lg">
                                -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                              </span>
                            )}
                          </div>

                          {/* Favorite Button */}
                          <button
                            type="button"
                            className="hidden md:flex absolute top-3 right-3 w-11 h-11 bg-white/95 backdrop-blur-sm rounded-full items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-black hover:text-white hover:scale-110 shadow-xl"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Heart className="h-5 w-5" />
                          </button>

                          {/* Quick Add Button */}
                          <div className="absolute bottom-0 left-0 right-0 p-2 md:p-3 lg:p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                            <Button
                              className="w-full bg-gradient-to-r from-black to-gray-800 text-white hover:from-gray-800 hover:to-black rounded-xl md:rounded-2xl h-10 md:h-12 font-bold transition-all hover:scale-105 active:scale-95 shadow-2xl uppercase tracking-wide text-xs md:text-sm"
                              onClick={(e) => handleAddToCart(product, e)}
                            >
                              <ShoppingBag className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" />
                              AGREGAR
                            </Button>
                          </div>
                        </div>

                        {/* Product Info */}
                        <div className="space-y-1 md:space-y-2 px-1">
                          {/* <p className="text-[10px] md:text-xs text-gray-500 font-medium uppercase">
                            {product.brand}
                          </p> */}
                          <h3 className="font-semibold text-xs md:text-sm uppercase tracking-wide line-clamp-2 leading-tight">
                            {product.name}
                          </h3>

                          <div className="space-y-0.5 md:space-y-1">
                            <div className="flex items-center gap-1.5 md:gap-2">
                              {originalPrice ? (
                                <>
                                  <span className="text-base md:text-lg font-bold text-red-600">
                                    {price.main}
                                  </span>
                                  <span className="text-xs md:text-sm text-gray-500 line-through">
                                    {originalPrice.main}
                                  </span>
                                </>
                              ) : (
                                <span className="text-base md:text-lg font-bold text-black">
                                  {price.main}
                                </span>
                              )}
                            </div>
                            {price.bs && (
                              <p className="text-[10px] md:text-xs text-gray-500">{price.bs}</p>
                            )}
                          </div>

                          {/* Colors */}
                          {product.variants && product.variants.length > 0 && (
                            <div className="flex gap-1 md:gap-1.5 pt-1">
                              {product.variants.slice(0, 4).map((variant: any, index: number) => (
                                <div
                                  key={index}
                                  className="w-5 h-5 md:w-6 md:h-6 rounded-full border-2 border-gray-300 shadow-sm hover:scale-110 transition-transform"
                                  style={getColorStyle(variant.color)}
                                  title={variant.color}
                                />
                              ))}
                              {product.variants.length > 4 && (
                                <span className="text-[10px] md:text-xs text-gray-500 self-center ml-0.5 md:ml-1 font-medium">
                                  +{product.variants.length - 4}
                                </span>
                              )}
                            </div>
                          )}
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="h-9 md:h-11 px-2.5 md:px-4 rounded-xl md:rounded-2xl border-2 font-semibold"
                      >
                        <ChevronLeft className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      </Button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum
                          if (totalPages <= 5) {
                            pageNum = i + 1
                          } else if (currentPage <= 3) {
                            pageNum = i + 1
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i
                          } else {
                            pageNum = currentPage - 2 + i
                          }

                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(pageNum)}
                              className={`w-9 h-9 md:w-11 md:h-11 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm ${
                                currentPage === pageNum
                                  ? "bg-black text-white"
                                  : "border-2 hover:border-black"
                              }`}
                            >
                              {pageNum}
                            </Button>
                          )
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="h-9 md:h-11 px-2.5 md:px-4 rounded-xl md:rounded-2xl border-2 font-semibold"
                      >
                        <ChevronRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* View All Button */}
        {!showAll && products.length >= 8 && (
          <div className="text-center mt-8 md:mt-12">
            <Button
              type="button"
              onClick={handleViewAll}
              variant="outline"
              size="lg"
              className="border-2 border-black px-8 md:px-12 py-5 md:py-6 rounded-xl md:rounded-2xl font-semibold uppercase tracking-wider hover:bg-black hover:text-white transition-all duration-300 hover:scale-105 shadow-lg text-sm md:text-base"
            >
              VER TODO
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}