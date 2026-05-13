"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
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
  const router = useRouter()
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
        categoryId: formData.category,
        subcategoryId: formData.subcategory || undefined,
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
        result = await api.updateProduct(editingProduct.id || editingProduct._id, formDataToSend)
      } else {
        result = await api.createProduct(formDataToSend)
      }

      if (result?.success) {
        const productId = result.product?.id || result.product?._id
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
      category: String(product?.categoryId || product?.category?.id || product?.category?._id || (typeof product?.category === 'string' ? product.category : "")),
      subcategory: String(product?.subcategoryId || product?.subcategory?.id || product?.subcategory?._id || (typeof product?.subcategory === 'string' ? product.subcategory : "")),
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
    setGeneralImages((prev) => prev.filter((img) => (img.id || img._id) !== imageId))
  }

  const removeNewGeneralImage = (index: number) => {
    setNewGeneralImages((prev) => prev.filter((_, i) => i !== index))
  }

  const removeVariantImage = (variantIndex: number, imageId: string) => {
    const newVariants = [...formData.variants]
    newVariants[variantIndex].images = newVariants[variantIndex].images.filter((img) => (img.id || img._id) !== imageId)
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

  const subcategories = categories.filter((cat) => (cat?.parent?.id || cat?.parent?._id || cat?.parent) === formData.category)
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
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-1 bg-black overflow-hidden">
            <div className="w-full h-full bg-kaosNeon animate-progress-fast"></div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">Cargando Inventario...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-8 bg-transparent min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-black/10 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-kaosNeon animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-black/40">Gestión de Catálogo • KAOZ</span>
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">
            Productos
          </h1>
        </div>
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => router.push("/admin/products/bulk")}
            className="border-black rounded-none hover:bg-black hover:text-white transition-all h-14 px-8 text-xs font-black uppercase tracking-widest"
          >
            <Upload className="h-5 w-5 mr-2" />
            Carga Masiva
          </Button>
          <Button
            onClick={() => {
              resetForm()
              setIsDialogOpen(true)
            }}
            className="bg-black text-white rounded-none hover:bg-kaosNeon hover:text-black transition-all h-14 px-8 text-xs font-black uppercase tracking-widest"
          >
            <Plus className="h-5 w-5 mr-2" />
            Registrar Producto
          </Button>
        </div>
      </div>

      {/* Search & Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20 h-4 w-4 group-focus-within:text-kaosNeon transition-colors" />
          <Input
            placeholder="BUSCAR EN CATÁLOGO..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setCurrentPage(1)
            }}
            className="pl-12 h-12 rounded-none border-black/10 focus:border-black transition-all uppercase text-[10px] font-black tracking-widest bg-black/[0.02]"
          />
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center border border-black/10 bg-white">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("grid")}
              className={`rounded-none h-12 w-12 p-0 ${viewMode === 'grid' ? 'bg-black text-white' : 'hover:bg-black/5'}`}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("list")}
              className={`rounded-none h-12 w-12 p-0 ${viewMode === 'list' ? 'bg-black text-white' : 'hover:bg-black/5'}`}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
            <SelectTrigger className="w-[180px] h-12 rounded-none border-black/10 font-black text-[10px] uppercase tracking-widest bg-black/[0.02]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-none border-black">
              <SelectItem value="12">12 ITEMS</SelectItem>
              <SelectItem value="24">24 ITEMS</SelectItem>
              <SelectItem value="48">48 ITEMS</SelectItem>
              <SelectItem value="100">100 ITEMS</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Products Display */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((product) => {
            const variantsArr = Array.isArray(product?.variants) ? product.variants : []
            const totalStock = variantsArr.reduce((sum: number, v: any) => {
              const sizesArr = Array.isArray(v?.sizes) ? v.sizes : []
              return sum + sizesArr.reduce((s: number, size: any) => s + toNumber(size?.stock, 0), 0)
            }, 0) || 0

            const firstImage = Array.isArray(product?.images) ? product.images[0] : null

            return (
              <div
                key={product.id || product._id}
                className="group relative bg-white border border-black/5 hover:border-black transition-all duration-300 flex flex-col"
              >
                <div className="relative aspect-square transition-all duration-500 overflow-hidden bg-black/[0.02]">
                  {firstImage?.url ? (
                    <img
                      src={firstImage.url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-90 group-hover:opacity-100"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-black/5">
                      <ImageIcon className="h-20 w-20" />
                    </div>
                  )}

                  {/* Badges */}
                  <div className="absolute top-0 left-0 p-3 space-y-2">
                    {product?.isNew && (
                      <span className="block px-2 py-1 bg-kaosNeon text-black text-[8px] font-black uppercase tracking-widest">
                        New
                      </span>
                    )}
                    {product?.isFeatured && (
                      <span className="block px-2 py-1 bg-black text-white text-[8px] font-black uppercase tracking-widest">
                        Hot
                      </span>
                    )}
                  </div>

                  <div className="absolute top-0 right-0 p-3">
                    <div className={`
                      text-[9px] font-black px-2 py-1 border
                      ${totalStock === 0 ? 'border-red-500 text-red-500 bg-white' : 
                        totalStock < 5 ? 'border-amber-500 text-amber-500 bg-white' : 
                        'border-black/10 text-black/40 bg-white'}
                    `}>
                      STOCK: {totalStock}
                    </div>
                  </div>

                  {/* Actions Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-2 backdrop-blur-[2px]">
                    <Button 
                      variant="outline" 
                      className="w-32 bg-white text-black rounded-none border-none text-[10px] font-black uppercase tracking-widest hover:bg-kaosNeon transition-colors"
                      onClick={() => handleEdit(product)}
                    >
                      Editar
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="w-32 rounded-none text-[10px] font-black uppercase tracking-widest bg-black text-white hover:bg-red-600 transition-colors"
                      onClick={() => handleDelete(product.id || product._id)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-black/20 mb-1">{product.brand || 'KAOZ'}</p>
                    <h3 className="text-[11px] font-black uppercase tracking-tight line-clamp-1">{product.name}</h3>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-black/5 flex items-center justify-between">
                    <p className="text-sm font-black">{currencySymbol}{toNumber(product.price).toFixed(0)}</p>
                    <div className="flex -space-x-1">
                      {variantsArr.slice(0, 3).map((v: any, i: number) => (
                        <div 
                          key={i} 
                          className="w-3 h-3 border border-black/10" 
                          style={{ backgroundColor: v.colorHex || '#ccc' }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="border border-black bg-white">
          <table className="w-full text-left">
            <thead className="bg-black text-white border-b border-black">
              <tr>
                <th className="px-6 py-4 industrial-stat-label text-white">Item</th>
                <th className="px-6 py-4 industrial-stat-label text-white">Categoría</th>
                <th className="px-6 py-4 industrial-stat-label text-white">Stock</th>
                <th className="px-6 py-4 industrial-stat-label text-white">Precio</th>
                <th className="px-6 py-4 industrial-stat-label text-white text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black">
              {products.map((product) => {
                const totalStock = (product?.variants || []).reduce((sum: number, v: any) => 
                  sum + (v.sizes || []).reduce((s: number, size: any) => s + toNumber(size?.stock, 0), 0), 0
                )
                return (
                  <tr key={product.id || product._id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-100 grayscale group-hover:grayscale-0 transition-all border border-gray-200">
                          {product.images?.[0]?.url && <img src={product.images[0].url} className="w-full h-full object-cover" />}
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-tight">{product.name}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">{product.brand}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className="text-[10px] font-bold uppercase tracking-widest bg-gray-100 px-2 py-1">
                         {product.category?.name || '-'}
                       </span>
                    </td>
                    <td className="px-6 py-4">
                       <div className={`text-xs font-black ${totalStock < 10 ? 'text-red-500' : 'text-black'}`}>
                         {totalStock} UDS
                       </div>
                    </td>
                    <td className="px-6 py-4 font-black text-xs">
                       {currencySymbol}{toNumber(product.price).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <Button variant="outline" size="sm" className="rounded-none border-black hover:bg-black hover:text-white" onClick={() => handleEdit(product)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="destructive" size="sm" className="rounded-none bg-red-600" onClick={() => handleDelete(product.id || product._id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                       </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-black pt-8">
          <div className="industrial-stat-label text-gray-400">
            Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, totalProducts)} de {totalProducts} productos
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-none border-black"
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
                    className={`rounded-none w-10 ${currentPage === pageNum ? 'bg-black text-white' : 'border-black'}`}
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="rounded-none border-black"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Product Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col rounded-none border-black">
          <DialogHeader className="border-b border-black pb-4">
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter">
              {editingProduct ? "Editar Registro" : "Nuevo Registro"}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col pt-4">
            <TabsList className="grid w-full grid-cols-4 mb-8 bg-gray-100 rounded-none p-1">
              <TabsTrigger value="basic" className="rounded-none font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-black data-[state=active]:text-white">
                Básico
              </TabsTrigger>
              <TabsTrigger value="pricing" className="rounded-none font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-black data-[state=active]:text-white">
                Precio
              </TabsTrigger>
              <TabsTrigger value="variants" className="rounded-none font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-black data-[state=active]:text-white">
                Variantes
              </TabsTrigger>
              <TabsTrigger value="images" className="rounded-none font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-black data-[state=active]:text-white">
                Imágenes
              </TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {/* Tabs Content - Simplified for Industrial Look */}
              <TabsContent value="basic" className="space-y-6 mt-0">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="industrial-stat-label">Nombre del Producto</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="rounded-none border-gray-200 focus:border-black font-bold uppercase text-xs"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="industrial-stat-label">Marca</Label>
                    <Input
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      className="rounded-none border-gray-200 focus:border-black font-bold uppercase text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="industrial-stat-label">Descripción Técnica</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="rounded-none border-gray-200 focus:border-black text-xs font-medium"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="industrial-stat-label">Categoría</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger className="rounded-none border-gray-200 font-bold text-xs uppercase">
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-none border-black">
                        {parentCategories.map((cat: any) => (
                          <SelectItem key={cat.id || cat._id} value={cat.id || cat._id} className="text-xs font-bold uppercase">{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-6 pt-8">
                     <div className="flex items-center gap-2">
                        <Switch checked={formData.isActive} onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })} className="data-[state=checked]:bg-black" />
                        <Label className="industrial-stat-label">Activo</Label>
                     </div>
                     <div className="flex items-center gap-2">
                        <Switch checked={formData.isFeatured} onCheckedChange={(checked) => setFormData({ ...formData, isFeatured: checked })} className="data-[state=checked]:bg-black" />
                        <Label className="industrial-stat-label">Destacado</Label>
                     </div>
                  </div>
                </div>
              </TabsContent>

              {/* Pricing Content */}
              <TabsContent value="pricing" className="space-y-8 mt-0">
                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label className="industrial-stat-label text-black">Precio de Venta ({currencySymbol})</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="rounded-none border-black h-16 text-3xl font-black"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="industrial-stat-label">Precio Original / Ref</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.originalPrice}
                        onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                        className="rounded-none border-gray-200 h-16 text-xl font-bold text-gray-400"
                      />
                    </div>
                 </div>
              </TabsContent>

              {/* Variants Content */}
              <TabsContent value="variants" className="space-y-6 mt-0">
                 {formData.variants.map((variant, vIndex) => (
                   <div key={vIndex} className="border border-black p-6 space-y-6 relative group">
                      <div className="flex items-center justify-between">
                         <span className="industrial-heading">Variante #{vIndex + 1}</span>
                         <Button type="button" variant="ghost" onClick={() => setFormData({ ...formData, variants: formData.variants.filter((_, i) => i !== vIndex) })} className="text-red-500 hover:bg-red-50 rounded-none">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remover
                         </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <Label className="industrial-stat-label">Nombre del Color</Label>
                            <Input 
                              value={variant.color} 
                              onChange={(e) => {
                                const newVariants = [...formData.variants];
                                newVariants[vIndex].color = e.target.value;
                                setFormData({ ...formData, variants: newVariants });
                              }}
                              className="rounded-none border-gray-200 uppercase font-bold text-xs" 
                            />
                         </div>
                         <div className="space-y-2">
                            <Label className="industrial-stat-label">Muestra de Color</Label>
                            <div className="flex gap-4">
                               <Input 
                                 type="color" 
                                 value={variant.colorHex} 
                                 onChange={(e) => {
                                   const newVariants = [...formData.variants];
                                   newVariants[vIndex].colorHex = e.target.value;
                                   setFormData({ ...formData, variants: newVariants });
                                 }}
                                 className="w-16 h-10 p-1 rounded-none border-gray-200 cursor-pointer" 
                               />
                               <Input value={variant.colorHex} className="rounded-none border-gray-200 font-mono text-xs" readOnly />
                            </div>
                         </div>
                      </div>

                      <div className="space-y-4">
                         <Label className="industrial-stat-label">Stock por Talla</Label>
                         <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                            {variant.sizes.map((size, sIndex) => (
                               <div key={sIndex} className="space-y-1">
                                  <div className="bg-black text-white text-[8px] font-black py-1 text-center">{size.size}</div>
                                  <Input 
                                    type="number" 
                                    value={size.stock} 
                                    onChange={(e) => {
                                      const newVariants = [...formData.variants];
                                      newVariants[vIndex].sizes[sIndex].stock = parseInt(e.target.value) || 0;
                                      setFormData({ ...formData, variants: newVariants });
                                    }}
                                    className="rounded-none border-gray-200 text-center font-bold text-xs p-1 h-8" 
                                  />
                               </div>
                            ))}
                         </div>
                      </div>
                   </div>
                 ))}
                 <Button type="button" variant="outline" onClick={() => setFormData({ ...formData, variants: [...formData.variants, { color: '', colorHex: '#000000', images: [], sizes: [{ size: 'S', stock: 0 }, { size: 'M', stock: 0 }, { size: 'L', stock: 0 }, { size: 'XL', stock: 0 }] }] })} className="w-full h-12 rounded-none border-black border-dashed font-black uppercase tracking-widest">
                    + Añadir Variante
                 </Button>
              </TabsContent>

              {/* Images Content */}
              <TabsContent value="images" className="space-y-8 mt-0">
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {generalImages.map((img, idx) => (
                       <div key={img.id || img._id || idx} className="aspect-square bg-gray-100 border border-black relative group grayscale hover:grayscale-0 transition-all">
                          <img src={img.url.startsWith('http') ? img.url : `https://yenfit.shop${img.url}`} className="w-full h-full object-cover" />
                          <Button type="button" onClick={() => removeGeneralImage(img.id || img._id)} className="absolute top-2 right-2 h-8 w-8 bg-red-600 text-white rounded-none opacity-0 group-hover:opacity-100 transition-opacity">
                             <X className="h-4 w-4" />
                          </Button>
                       </div>
                    ))}
                    <label className="aspect-square border-2 border-dashed border-black flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                       <Upload className="h-8 w-8 mb-2" />
                       <span className="industrial-stat-label">Subir Imagen</span>
                       <input type="file" multiple accept="image/*" onChange={handleGeneralImageChange} className="hidden" />
                    </label>
                 </div>
              </TabsContent>
            </form>

            <DialogFooter className="border-t border-black pt-6 mt-8">
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-none industrial-heading">Cerrar</Button>
              <Button onClick={handleSubmit} disabled={saving} className="rounded-none bg-black text-white h-12 px-12 industrial-heading hover:bg-gray-800">
                 {saving ? 'Guardando...' : editingProduct ? 'Actualizar Registro' : 'Confirmar Registro'}
              </Button>
            </DialogFooter>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}