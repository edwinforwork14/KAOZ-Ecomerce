"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Image as ImageIcon,
  X,
  Star,
  Loader2,
  Palette,
  Package,
  DollarSign,
  Percent,
  Tag,
  Upload,
  Check,
  ChevronLeft,
  ChevronRight,
  Grid3x3,
  List,
} from "lucide-react"
import { api } from "@/lib/api"
import { brandConfig } from "@/lib/config"
import { useToast } from "@/hooks/use-toast"

interface ExistingImage {
  _id: string
  url: string
  alt: string
  isMain: boolean
}

interface Size {
  size: string
  stock: number
  sku?: string
}

interface Variant {
  color: string
  colorHex: string
  images: ExistingImage[]
  sizes: Size[]
}

interface PriceConfig {
  mode: "fixed" | "markup" | "discount"
  percentage: number
  basePrice: number
}

function toNumber(v: unknown, fallback = 0) {
  const n = typeof v === "number" ? v : parseFloat(String(v))
  return Number.isFinite(n) ? n : fallback
}

function ensurePriceConfig(pc: any): PriceConfig {
  const mode: PriceConfig["mode"] =
    pc?.mode === "markup" || pc?.mode === "discount" || pc?.mode === "fixed" ? pc.mode : "fixed"
  return {
    mode,
    percentage: toNumber(pc?.percentage, 0),
    basePrice: toNumber(pc?.basePrice, 0),
  }
}

function safeLower(v: unknown) {
  return String(v ?? "").toLowerCase()
}

export default function ProductsPage() {
  const { toast } = useToast()

  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("basic")

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(12)
  
  // Vista
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  // Images state
  const [generalImages, setGeneralImages] = useState<ExistingImage[]>([])
  const [newGeneralImages, setNewGeneralImages] = useState<File[]>([])
  const [variantNewImages, setVariantNewImages] = useState<{ [key: number]: File[] }>({})

  // Form data
  const [formData, setFormData] = useState<{
    name: string
    description: string
    price: string
    originalPrice: string
    category: string
    subcategory: string
    brand: string
    isNew: boolean
    isFeatured: boolean
    isActive: boolean
    newDurationDays: string
    tags: string
    features: string
    priceConfig: PriceConfig
    variants: Variant[]
  }>({
    name: "",
    description: "",
    price: "",
    originalPrice: "",
    category: "",
    subcategory: "",
    brand: "",
    isNew: false,
    isFeatured: false,
    isActive: true,
    newDurationDays: "",
    tags: "",
    features: "",
    priceConfig: { mode: "fixed", percentage: 0, basePrice: 0 },
    variants: [
      {
        color: "",
        colorHex: "#000000",
        images: [],
        sizes: [
          { size: "S", stock: 0 },
          { size: "M", stock: 0 },
          { size: "L", stock: 0 },
          { size: "XL", stock: 0 },
        ],
      },
    ],
  })

  useEffect(() => {
    loadData()
  }, [currentPage, itemsPerPage, search])

  const loadData = async () => {
    setLoading(true)
    try {
      const params: any = {
        page: currentPage,
        limit: itemsPerPage,
      }

      if (search.trim()) {
        params.search = search.trim()
      }

      const [productsResult, categoriesResult, settingsResult] = await Promise.all([
        api.getProducts(params),
        api.getCategories(),
        api.getSettings(),
      ])

      if (productsResult?.success) {
        setProducts(productsResult.products || [])
        setTotalPages(productsResult.totalPages || 1)
        setTotalProducts(productsResult.total || 0)
      }
      if (categoriesResult?.success) setCategories(categoriesResult.categories || [])
      if (settingsResult?.success) setSettings(settingsResult.settings || null)
    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: "Error",
        description: "Error al cargar datos",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const calculatePrice = useCallback(() => {
    const pc = ensurePriceConfig(formData.priceConfig)
    if (pc.mode === "fixed") return toNumber(formData.price, 0)
    if (pc.basePrice <= 0) return 0
    if (pc.mode === "markup") return pc.basePrice * (1 + pc.percentage / 100)
    return pc.basePrice * (1 - pc.percentage / 100)
  }, [formData.priceConfig, formData.price])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const formDataToSend = new FormData()

      newGeneralImages.forEach((image) => {
        formDataToSend.append("images", image)
      })

      const variantsToSend = formData.variants.map((variant) => ({
        ...variant,
        images: variant.images || [],
      }))

      const pc = ensurePriceConfig(formData.priceConfig)
      let finalPrice = toNumber(formData.price, 0)
      let finalOriginalPrice: number | undefined =
        formData.originalPrice !== "" ? toNumber(formData.originalPrice, undefined as any) : undefined

      if (pc.mode === "markup" && pc.basePrice > 0) {
        finalPrice = pc.basePrice * (1 + pc.percentage / 100)
      } else if (pc.mode === "discount" && pc.basePrice > 0) {
        finalOriginalPrice = pc.basePrice
        finalPrice = pc.basePrice * (1 - pc.percentage / 100)
      }

      const dataToSend = {
        name: formData.name,
        description: formData.description,
        price: finalPrice,
        originalPrice: finalOriginalPrice,
        category: formData.category,
        subcategory: formData.subcategory || undefined,
        brand: formData.brand,
        isNew: formData.isNew,
        isFeatured: formData.isFeatured,
        isActive: formData.isActive,
        newDurationDays: formData.newDurationDays ? parseInt(formData.newDurationDays, 10) : undefined,
        tags: formData.tags ? formData.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        features: formData.features ? formData.features.split(",").map((f) => f.trim()).filter(Boolean) : [],
        priceConfig: pc,
        variants: variantsToSend,
        images: generalImages,
      }

      formDataToSend.append("data", JSON.stringify(dataToSend))

      let result
      if (editingProduct) {
        result = await api.updateProduct(editingProduct._id, formDataToSend)
      } else {
        result = await api.createProduct(formDataToSend)
      }

      if (result?.success) {
        const productId = result.product?._id
        if (productId) {
          for (const [variantIndex, files] of Object.entries(variantNewImages)) {
            if (files.length > 0) {
              const variantFormData = new FormData()
              files.forEach((file) => variantFormData.append("images", file))
              await api.uploadVariantImages(productId, parseInt(variantIndex, 10), variantFormData)
            }
          }
        }

        toast({
          title: "Éxito",
          description: editingProduct ? "Producto actualizado" : "Producto creado",
        })
        setIsDialogOpen(false)
        await loadData()
        resetForm()
      } else {
        toast({
          title: "Error",
          description: result?.message || "Error al guardar",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error saving product:", error)
      toast({
        title: "Error",
        description: "Error al guardar producto",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este producto?")) return

    try {
      const result = await api.deleteProduct(id)
      if (result?.success) {
        toast({ title: "Eliminado", description: "Producto eliminado correctamente" })
        loadData()
      } else {
        toast({
          title: "Error",
          description: result?.message || "No se pudo eliminar",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting product:", error)
      toast({
        title: "Error",
        description: "Error al eliminar producto",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (product: any) => {
    const productPriceConfig = ensurePriceConfig(product?.priceConfig)

    setEditingProduct(product)
    setFormData({
      name: String(product?.name ?? ""),
      description: String(product?.description ?? ""),
      price: String(product?.price ?? ""),
      originalPrice: product?.originalPrice != null ? String(product.originalPrice) : "",
      category: String(product?.category?._id || product?.category || ""),
      subcategory: String(product?.subcategory?._id || product?.subcategory || ""),
      brand: String(product?.brand ?? ""),
      isNew: !!product?.isNew,
      isFeatured: !!product?.isFeatured,
      isActive: product?.isActive !== false,
      newDurationDays: product?.newDurationDays != null ? String(product.newDurationDays) : "",
      tags: Array.isArray(product?.tags) ? product.tags.join(", ") : "",
      features: Array.isArray(product?.features) ? product.features.join(", ") : "",
      priceConfig: productPriceConfig,
      variants: Array.isArray(product?.variants)
        ? product.variants.map((v: any) => ({
            color: String(v?.color ?? ""),
            colorHex: String(v?.colorHex ?? "#000000"),
            images: Array.isArray(v?.images) ? v.images : [],
            sizes: Array.isArray(v?.sizes)
              ? v.sizes.map((s: any) => ({
                  size: String(s?.size ?? ""),
                  stock: toNumber(s?.stock, 0),
                  sku: s?.sku,
                }))
              : [
                  { size: "S", stock: 0 },
                  { size: "M", stock: 0 },
                  { size: "L", stock: 0 },
                  { size: "XL", stock: 0 },
                ],
          }))
        : [
            {
              color: "",
              colorHex: "#000000",
              images: [],
              sizes: [
                { size: "S", stock: 0 },
                { size: "M", stock: 0 },
                { size: "L", stock: 0 },
                { size: "XL", stock: 0 },
              ],
            },
          ],
    })

    setGeneralImages(Array.isArray(product?.images) ? product.images : [])
    setNewGeneralImages([])
    setVariantNewImages({})
    setActiveTab("basic")
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      originalPrice: "",
      category: "",
      subcategory: "",
      brand: "",
      isNew: false,
      isFeatured: false,
      isActive: true,
      newDurationDays: "",
      tags: "",
      features: "",
      priceConfig: { mode: "fixed", percentage: 0, basePrice: 0 },
      variants: [
        {
          color: "",
          colorHex: "#000000",
          images: [],
          sizes: [
            { size: "S", stock: 0 },
            { size: "M", stock: 0 },
            { size: "L", stock: 0 },
            { size: "XL", stock: 0 },
          ],
        },
      ],
    })
    setGeneralImages([])
    setNewGeneralImages([])
    setVariantNewImages({})
    setEditingProduct(null)
    setActiveTab("basic")
  }

  const handleGeneralImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNewGeneralImages((prev) => [...prev, ...Array.from(e.target.files)])
    }
  }

  const handleVariantImageChange = (variantIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setVariantNewImages((prev) => ({
        ...prev,
        [variantIndex]: [...(prev[variantIndex] || []), ...Array.from(e.target.files)],
      }))
    }
  }

  const removeGeneralImage = (imageId: string) => {
    setGeneralImages((prev) => prev.filter((img) => img._id !== imageId))
  }

  const removeNewGeneralImage = (index: number) => {
    setNewGeneralImages((prev) => prev.filter((_, i) => i !== index))
  }

  const removeVariantImage = (variantIndex: number, imageId: string) => {
    const newVariants = [...formData.variants]
    newVariants[variantIndex].images = newVariants[variantIndex].images.filter((img) => img._id !== imageId)
    setFormData({ ...formData, variants: newVariants })
  }

  const removeVariantNewImage = (variantIndex: number, imageIndex: number) => {
    setVariantNewImages((prev) => ({
      ...prev,
      [variantIndex]: prev[variantIndex]?.filter((_, i) => i !== imageIndex) || [],
    }))
  }

  const setMainImage = (index: number) => {
    setGeneralImages((prev) => prev.map((img, i) => ({ ...img, isMain: i === index })))
  }

  const subcategories = categories.filter((cat) => cat?.parent?._id === formData.category || cat?.parent === formData.category)
  const parentCategories = categories.filter((cat) => !cat?.parent)
  const currencySymbol = settings?.currency?.symbol || "$"

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Cargando productos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 space-y-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Productos
          </h1>
          <p className="text-gray-500 mt-1">Gestiona tu inventario de {brandConfig.name}</p>
        </div>
        <Button
          onClick={() => {
            resetForm()
            setIsDialogOpen(true)
          }}
          className="text-white shadow-lg hover:shadow-xl transition-all"
          style={{ backgroundColor: brandConfig.colors.primary }}
        >
          <Plus className="h-5 w-5 mr-2" />
          Nuevo Producto
        </Button>
      </div>

      {/* Search, Filters & View Controls */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            placeholder="Buscar productos..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setCurrentPage(1)
            }}
            className="pl-10 border-2 focus:border-gray-400"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-3 py-1.5">
            {totalProducts} productos totales
          </Badge>
          
          <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="12">12 por página</SelectItem>
              <SelectItem value="24">24 por página</SelectItem>
              <SelectItem value="48">48 por página</SelectItem>
              <SelectItem value="100">100 por página</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="rounded-none"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Products Display */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => {
            const variantsArr = Array.isArray(product?.variants) ? product.variants : []
            const totalStock =
              variantsArr.reduce((sum: number, v: any) => {
                const sizesArr = Array.isArray(v?.sizes) ? v.sizes : []
                return sum + sizesArr.reduce((s: number, size: any) => s + toNumber(size?.stock, 0), 0)
              }, 0) || 0

            const productPriceConfig = ensurePriceConfig(product?.priceConfig)
            const hasPriceConfigBadge = productPriceConfig.mode !== "fixed"
            const productImages = Array.isArray(product?.images) ? product.images : []
            const firstImage = productImages[0]

            return (
              <Card
                key={product._id}
                className="group border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
              >
                <div className="relative aspect-square bg-gray-100 overflow-hidden">
                  {firstImage?.url ? (
                      <img
                        src={firstImage.url || "/placeholder.svg"}
                        alt={firstImage?.alt || product?.name || "Producto"}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <ImageIcon className="h-16 w-16 text-gray-300" />
                    </div>
                  )}

                  <div className="absolute top-3 left-3 flex flex-col gap-2">
                    {product?.isNew && <Badge className="bg-green-500 text-white shadow-md">NUEVO</Badge>}
                    {product?.isFeatured && (
                      <Badge className="bg-amber-500 text-white shadow-md">
                        <Star className="h-3 w-3 mr-1 fill-current" />
                        DESTACADO
                      </Badge>
                    )}
                    {product?.isActive === false && (
                      <Badge variant="secondary" className="bg-gray-800 text-white">
                        INACTIVO
                      </Badge>
                    )}
                  </div>

                  <div className="absolute top-3 right-3">
                    <Badge
                      className={`shadow-md ${
                        totalStock === 0 ? "bg-red-500" : totalStock < 10 ? "bg-amber-500" : "bg-green-500"
                      } text-white`}
                    >
                      {totalStock} uds
                    </Badge>
                  </div>

                  {hasPriceConfigBadge && (
                    <div className="absolute bottom-3 left-3">
                      <Badge variant="outline" className="bg-white/90 backdrop-blur">
                        {productPriceConfig.mode === "markup" ? (
                          <>
                            <Percent className="h-3 w-3 mr-1" />+{productPriceConfig.percentage}%
                          </>
                        ) : (
                          <>
                            <Tag className="h-3 w-3 mr-1" />-{productPriceConfig.percentage}%
                          </>
                        )}
                      </Badge>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button size="sm" variant="secondary" onClick={() => handleEdit(product)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(product.id || product._id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <CardContent className="p-4">
                  <div className="mb-2">
                    <h3 className="font-semibold text-gray-900 line-clamp-1">{String(product?.name ?? "")}</h3>
                    <p className="text-sm text-gray-500">{String(product?.brand ?? "")}</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xl font-bold" style={{ color: brandConfig.colors.primary }}>
                        {currencySymbol}
                        {toNumber(product?.price, 0).toFixed(2)}
                      </p>
                      {product?.originalPrice && toNumber(product?.originalPrice, 0) > toNumber(product?.price, 0) && (
                        <p className="text-sm text-gray-400 line-through">
                          {currencySymbol}
                          {toNumber(product?.originalPrice, 0).toFixed(2)}
                        </p>
                      )}
                    </div>

                    <div className="flex -space-x-1">
                      {variantsArr.slice(0, 4).map((v: any, i: number) => (
                        <div
                          key={i}
                          className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: String(v?.colorHex || "#ccc") }}
                          title={String(v?.color || "")}
                        />
                      ))}
                      {variantsArr.length > 4 && (
                        <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium">
                          +{variantsArr.length - 4}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((product) => {
            const variantsArr = Array.isArray(product?.variants) ? product.variants : []
            const totalStock =
              variantsArr.reduce((sum: number, v: any) => {
                const sizesArr = Array.isArray(v?.sizes) ? v.sizes : []
                return sum + sizesArr.reduce((s: number, size: any) => s + toNumber(size?.stock, 0), 0)
              }, 0) || 0

            const productImages = Array.isArray(product?.images) ? product.images : []
            const firstImage = productImages[0]

            return (
              <Card key={product._id} className="border-0 shadow-md hover:shadow-lg transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                      {firstImage?.url ? (
                        <img
                          src={firstImage.url}
                          alt={firstImage?.alt || product?.name || "Producto"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-gray-300" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{String(product?.name ?? "")}</h3>
                          <p className="text-sm text-gray-500">{String(product?.brand ?? "")}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge
                            className={`${
                              totalStock === 0 ? "bg-red-500" : totalStock < 10 ? "bg-amber-500" : "bg-green-500"
                            } text-white`}
                          >
                            {totalStock} uds
                          </Badge>
                          {product?.isNew && <Badge className="bg-green-500 text-white">NUEVO</Badge>}
                          {product?.isFeatured && (
                            <Badge className="bg-amber-500 text-white">
                              <Star className="h-3 w-3 mr-1 fill-current" />
                              DESTACADO
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-3">
                          <p className="text-lg font-bold" style={{ color: brandConfig.colors.primary }}>
                            {currencySymbol}
                            {toNumber(product?.price, 0).toFixed(2)}
                          </p>
                          {product?.originalPrice && toNumber(product?.originalPrice, 0) > toNumber(product?.price, 0) && (
                            <p className="text-sm text-gray-400 line-through">
                              {currencySymbol}
                              {toNumber(product?.originalPrice, 0).toFixed(2)}
                            </p>
                          )}
                          <div className="flex -space-x-1">
                            {variantsArr.slice(0, 3).map((v: any, i: number) => (
                              <div
                                key={i}
                                className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                                style={{ backgroundColor: String(v?.colorHex || "#ccc") }}
                                title={String(v?.color || "")}
                              />
                            ))}
                            {variantsArr.length > 3 && (
                              <div className="w-5 h-5 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[10px] font-medium">
                                +{variantsArr.length - 3}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(product)}>
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(product.id || product._id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {products.length === 0 && (
        <div className="text-center py-16">
          <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No se encontraron productos</p>
          <p className="text-gray-400 text-sm mt-1">Intenta con otra búsqueda o crea un nuevo producto</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-gray-600">
            Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, totalProducts)} de {totalProducts} productos
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
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
                    className="w-10"
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
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Product Dialog (sin cambios) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold" style={{ color: brandConfig.colors.primary }}>
              {editingProduct ? "Editar Producto" : "Nuevo Producto"}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="basic" className="gap-2">
                <Package className="h-4 w-4" />
                Básico
              </TabsTrigger>
              <TabsTrigger value="pricing" className="gap-2">
                <DollarSign className="h-4 w-4" />
                Precio
              </TabsTrigger>
              <TabsTrigger value="variants" className="gap-2">
                <Palette className="h-4 w-4" />
                Variantes
              </TabsTrigger>
              <TabsTrigger value="images" className="gap-2">
                <ImageIcon className="h-4 w-4" />
                Imágenes
              </TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              {/* Basic Info Tab */}
              <TabsContent value="basic" className="space-y-4 mt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nombre del producto"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Marca *</Label>
                    <Input
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      placeholder="Marca"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descripción *</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    placeholder="Descripción del producto"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Categoría *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value, subcategory: "" })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {parentCategories.map((cat: any) => (
                          <SelectItem key={cat._id} value={cat._id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {subcategories.length > 0 && (
                    <div className="space-y-2">
                      <Label>Subcategoría</Label>
                      <Select 
                        value={formData.subcategory || "none"} 
                        onValueChange={(value) => setFormData({ 
                          ...formData, 
                          subcategory: value === "none" ? "" : value 
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar subcategoría" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Ninguna</SelectItem>
                          {subcategories.map((cat: any) => (
                            <SelectItem key={cat._id} value={cat._id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Etiquetas (separadas por coma)</Label>
                    <Input
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="deportivo, casual, verano"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Características (separadas por coma)</Label>
                    <Input
                      value={formData.features}
                      onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                      placeholder="Algodón 100%, Lavable, etc."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 pt-4 border-t">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <Label className="cursor-pointer">Producto Nuevo</Label>
                    <Switch checked={formData.isNew} onCheckedChange={(checked) => setFormData({ ...formData, isNew: checked })} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <Label className="cursor-pointer">Destacado</Label>
                    <Switch
                      checked={formData.isFeatured}
                      onCheckedChange={(checked) => setFormData({ ...formData, isFeatured: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <Label className="cursor-pointer">Activo</Label>
                    <Switch checked={formData.isActive} onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })} />
                  </div>
                  {formData.isNew && (
                    <div className="space-y-2">
                      <Label className="text-xs">Días como "nuevo"</Label>
                      <Input
                        type="number"
                        min={1}
                        value={formData.newDurationDays}
                        onChange={(e) => setFormData({ ...formData, newDurationDays: e.target.value })}
                        placeholder={`${settings?.newProductDuration || 30} (default)`}
                      />
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Pricing Tab */}
              <TabsContent value="pricing" className="space-y-6 mt-0">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <Label className="text-base font-semibold mb-3 block">Modo de Precio</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: "fixed", label: "Precio Fijo", icon: DollarSign, desc: "Ingresa el precio directamente" },
                      { value: "markup", label: "Margen (%)", icon: Percent, desc: "Precio base + porcentaje" },
                      { value: "discount", label: "Descuento (%)", icon: Tag, desc: "Precio base - porcentaje" },
                    ].map((mode) => (
                      <div
                        key={mode.value}
                        onClick={() =>
                          setFormData({
                            ...formData,
                            priceConfig: ensurePriceConfig({ ...formData.priceConfig, mode: mode.value }),
                          })
                        }
                        className={`
                          p-4 rounded-xl border-2 cursor-pointer transition-all
                          ${
                            formData.priceConfig.mode === mode.value
                              ? "border-blue-500 bg-blue-100"
                              : "border-gray-200 hover:border-gray-300 bg-white"
                          }
                        `}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <mode.icon
                            className={`h-5 w-5 ${
                              formData.priceConfig.mode === mode.value ? "text-blue-600" : "text-gray-500"
                            }`}
                          />
                          <span className="font-medium">{mode.label}</span>
                          {formData.priceConfig.mode === mode.value && <Check className="h-4 w-4 text-blue-600 ml-auto" />}
                        </div>
                        <p className="text-xs text-gray-500">{mode.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {formData.priceConfig.mode === "fixed" ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Precio de Venta ({currencySymbol}) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        required
                        className="text-xl font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Precio Original ({currencySymbol})</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.originalPrice}
                        onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                        placeholder="Para mostrar descuento"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Precio Base ({currencySymbol}) *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.priceConfig.basePrice || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              priceConfig: ensurePriceConfig({
                                ...formData.priceConfig,
                                basePrice: toNumber(e.target.value, 0),
                              }),
                            })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>
                          {formData.priceConfig.mode === "markup" ? "Porcentaje de Aumento" : "Porcentaje de Descuento"} (%)
                        </Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={formData.priceConfig.percentage || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              priceConfig: ensurePriceConfig({
                                ...formData.priceConfig,
                                percentage: toNumber(e.target.value, 0),
                              }),
                            })
                          }
                        />
                      </div>
                    </div>

                    {formData.priceConfig.basePrice > 0 && (
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-sm text-green-700 mb-2">Vista previa del precio:</p>
                        <div className="flex items-baseline gap-3">
                          <span className="text-3xl font-bold text-green-700">
                            {currencySymbol}
                            {calculatePrice().toFixed(2)}
                          </span>
                          {formData.priceConfig.mode === "discount" && (
                            <span className="text-lg text-gray-400 line-through">
                              {currencySymbol}
                              {formData.priceConfig.basePrice.toFixed(2)}
                            </span>
                          )}
                          <Badge className={formData.priceConfig.mode === "markup" ? "bg-blue-500" : "bg-red-500"}>
                            {formData.priceConfig.mode === "markup" ? "+" : "-"}
                            {formData.priceConfig.percentage}%
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Variants Tab */}
              <TabsContent value="variants" className="space-y-4 mt-0">
                {formData.variants.map((variant, vIndex) => (
                  <Card key={vIndex} className="border-2">
                    <CardContent className="p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full border-2 shadow-inner" style={{ backgroundColor: variant.colorHex }} />
                          <span className="font-semibold">
                            Variante {vIndex + 1}: {variant.color || "Sin nombre"}
                          </span>
                        </div>
                        {formData.variants.length > 1 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              const newVariants = formData.variants.filter((_, i) => i !== vIndex)
                              setFormData({ ...formData, variants: newVariants })
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Nombre del Color</Label>
                          <Input
                            value={variant.color}
                            onChange={(e) => {
                              const newVariants = [...formData.variants]
                              newVariants[vIndex].color = e.target.value
                              setFormData({ ...formData, variants: newVariants })
                            }}
                            placeholder="Negro, Blanco, etc."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Color (hex)</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={variant.colorHex}
                              onChange={(e) => {
                                const newVariants = [...formData.variants]
                                newVariants[vIndex].colorHex = e.target.value
                                setFormData({ ...formData, variants: newVariants })
                              }}
                              className="w-14 h-10 p-1 cursor-pointer"
                            />
                            <Input
                              value={variant.colorHex}
                              onChange={(e) => {
                                const newVariants = [...formData.variants]
                                newVariants[vIndex].colorHex = e.target.value
                                setFormData({ ...formData, variants: newVariants })
                              }}
                              className="flex-1"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Imágenes de esta variante</Label>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {variant.images.length + (variantNewImages[vIndex]?.length || 0)} imágenes
                            </Badge>
                            <span className="text-xs text-gray-500">(Se gestionan en la pestaña Imágenes)</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label className="mb-2 block">Stock por Talla</Label>
                        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                          {variant.sizes.map((size, sIndex) => (
                            <div key={sIndex} className="text-center">
                              <Label className="text-xs text-gray-500">{size.size}</Label>
                              <Input
                                type="number"
                                min="0"
                                value={size.stock}
                                onChange={(e) => {
                                  const newVariants = [...formData.variants]
                                  newVariants[vIndex].sizes[sIndex].stock = parseInt(e.target.value, 10) || 0
                                  setFormData({ ...formData, variants: newVariants })
                                }}
                                className="text-center"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      variants: [
                        ...formData.variants,
                        {
                          color: "",
                          colorHex: "#000000",
                          images: [],
                          sizes: [
                            { size: "S", stock: 0 },
                            { size: "M", stock: 0 },
                            { size: "L", stock: 0 },
                            { size: "XL", stock: 0 },
                          ],
                        },
                      ],
                    })
                  }}
                  className="w-full border-dashed"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Variante de Color
                </Button>
              </TabsContent>

              {/* Images Tab */}
              <TabsContent value="images" className="space-y-6 mt-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-semibold">Imágenes Generales</Label>
                      <p className="text-sm text-gray-500">Se muestran cuando no hay imágenes para un color específico</p>
                    </div>
                    <Badge variant="outline">{generalImages.length + newGeneralImages.length} imágenes</Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {generalImages.map((image, index) => (
                      <div
                        key={image._id}
                        className={`relative group aspect-square rounded-lg overflow-hidden border-2 ${
                          image.isMain ? "border-green-500" : "border-gray-200"
                        }`}
                      >
                        <img
                          src={`https://yenfit.shop${image.url}`}
                          alt={image.alt}
                          className="w-full h-full object-cover"
                        />
                        {image.isMain && (
                          <Badge className="absolute top-2 left-2 bg-green-500">
                            <Star className="h-3 w-3 mr-1 fill-current" />
                            Principal
                          </Badge>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          {!image.isMain && (
                            <Button size="sm" variant="secondary" type="button" onClick={() => setMainImage(index)}>
                              <Star className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="sm" variant="destructive" type="button" onClick={() => removeGeneralImage(image._id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {newGeneralImages.map((file, index) => (
                      <div
                        key={index}
                        className="relative group aspect-square rounded-lg overflow-hidden border-2 border-green-500"
                      >
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Nueva ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <Badge className="absolute top-2 left-2 bg-green-500">Nueva</Badge>
                        <Button
                          size="sm"
                          variant="destructive"
                          type="button"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"
                          onClick={() => removeNewGeneralImage(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 cursor-pointer flex flex-col items-center justify-center gap-2 transition-colors">
                      <Upload className="h-8 w-8 text-gray-400" />
                      <span className="text-sm text-gray-500">Agregar</span>
                      <input type="file" multiple accept="image/*" onChange={handleGeneralImageChange} className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <Label className="text-base font-semibold mb-4 block">Imágenes por Color</Label>

                  {formData.variants.map((variant, vIndex) => (
                    <div key={vIndex} className="mb-6 p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-6 h-6 rounded-full border-2" style={{ backgroundColor: variant.colorHex }} />
                        <span className="font-medium">{variant.color || `Variante ${vIndex + 1}`}</span>
                        <Badge variant="outline" className="ml-auto">
                          {variant.images.length + (variantNewImages[vIndex]?.length || 0)} imágenes
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {variant.images.map((image) => (
                          <div
                            key={image._id}
                            className="relative group aspect-square rounded-lg overflow-hidden border-2 border-gray-200"
                          >
                            <img
                              src={`https://yenfit.shop${image.url}`}
                              alt={image.alt}
                              className="w-full h-full object-cover"
                            />
                            <Button
                              size="sm"
                              variant="destructive"
                              type="button"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"
                              onClick={() => removeVariantImage(vIndex, image._id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}

                        {variantNewImages[vIndex]?.map((file, index) => (
                          <div
                            key={index}
                            className="relative group aspect-square rounded-lg overflow-hidden border-2 border-green-500"
                          >
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Nueva ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <Badge className="absolute top-2 left-2 bg-green-500">Nueva</Badge>
                            <Button
                              size="sm"
                              variant="destructive"
                              type="button"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"
                              onClick={() => removeVariantNewImage(vIndex, index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}

                        <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 cursor-pointer flex flex-col items-center justify-center gap-2 transition-colors bg-white">
                          <Upload className="h-6 w-6 text-gray-400" />
                          <span className="text-xs text-gray-500">Agregar</span>
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(e) => handleVariantImageChange(vIndex, e)}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <DialogFooter className="mt-6 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="text-white min-w-[140px]"
                  style={{ backgroundColor: brandConfig.colors.primary }}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      {editingProduct ? "Actualizar" : "Crear"} Producto
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}