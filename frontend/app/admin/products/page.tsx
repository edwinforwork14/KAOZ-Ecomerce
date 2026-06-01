"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
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
  Filter,
  BarChart4,
  LayoutGrid,
  Trello
} from "lucide-react"
import { api, cleanImageUrl, getInventoryStats } from "@/lib/api"
import { brandConfig } from "@/lib/config"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { ProductVariantEditor } from "@/components/admin/ProductVariantEditor"

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
  const [generalImages, setGeneralImages] = useState<any[]>([])

  const parentCategories = useMemo(() => {
    return categories.filter(c => !c.parent)
  }, [categories])

  const currencySymbol = settings?.currency?.symbol || "$"

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(12)
  const [stats, setStats] = useState({ totalValue: 0, totalStock: 0, criticalItems: 0 })
  
  // Vista
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  // Form data
  const [formData, setFormData] = useState<any>({
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
    variants: [],
    globalSizes: ["S", "M", "L", "XL"], // Default sizes
  })

  useEffect(() => {
    loadData()
  }, [currentPage, itemsPerPage, search])

  const loadData = async () => {
    setLoading(true)
    try {
      const params: any = { page: currentPage, limit: itemsPerPage, isAdmin: true }
      if (search.trim()) params.search = search.trim()

      const [productsResult, categoriesResult, settingsResult, statsResult] = await Promise.all([
        api.getProducts(params),
        api.getCategories(),
        api.getSettings(),
        getInventoryStats()
      ])

      if (productsResult?.success) {
        setProducts(productsResult.products || [])
        setTotalPages(productsResult.totalPages || 1)
        setTotalProducts(productsResult.total || 0)
      }
      if (categoriesResult?.success) setCategories(categoriesResult.categories || [])
      if (settingsResult?.success) setSettings(settingsResult.settings || null)
      if (statsResult?.success) setStats(statsResult.stats)
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿EJECUTAR PROTOCOLO DE ELIMINACIÓN?")) return
    try {
      const result = await api.deleteProduct(id)
      if (result?.success) {
        toast({ title: "ELIMINADO", description: "REGISTRO REMOVIDO DEL CATÁLOGO" })
        loadData()
      }
    } catch (error) {
      console.error("Error deleting product:", error)
    }
  }

  const toggleProductStatus = async (product: any) => {
    try {
      const res = await api.updateProduct(product.id || product._id, {
        ...product,
        isActive: !product.isActive
      })
      if (res.success) {
        setProducts(prev => prev.map(p => (p.id === product.id || p._id === product._id) ? res.product : p))
        toast({ title: "SISTEMA ACTUALIZADO", description: `PRODUCTO ${!product.isActive ? 'ACTIVADO' : 'DESACTIVADO'} CORRECTAMENTE.` })
      }
    } catch (error: any) {
      toast({ title: "ERROR DE PROTOCOLO", description: error.message, variant: "destructive" })
    }
  }

  const handleEdit = (product: any) => {
    setEditingProduct(product)
    const initialData = {
      ...product,
      price: product.price?.toString() || "",
      originalPrice: product.originalPrice?.toString() || "",
      category: typeof product.category === 'string' ? product.category : product.category?._id || product.category?.id || "",
      variants: Array.isArray(product.variants) ? product.variants : [],
      priceConfig: ensurePriceConfig(product.priceConfig),
      globalSizes: Array.from(new Set(product.variants?.flatMap((v: any) => v.sizes?.map((s: any) => s.size)) || ["S", "M", "L", "XL"]))
    };
    setFormData(initialData)
    setGeneralImages(product.images || [])
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const payloadData = {
        ...formData,
        price: parseFloat(formData.price) || 0,
        originalPrice: parseFloat(formData.originalPrice) || 0,
        images: generalImages
      }
      
      const payload = new FormData()
      payload.append("data", JSON.stringify(payloadData))

      let result
      if (editingProduct) {
        result = await api.updateProduct(editingProduct._id || editingProduct.id, payload)
      } else {
        result = await api.createProduct(payload)
      }

      if (result.success) {
        toast({ title: "ÉXITO", description: "REGISTRO ACTUALIZADO CORRECTAMENTE" })
        setIsDialogOpen(false)
        loadData()
      } else {
        toast({ title: "ERROR", description: result.message || "FALLO EN EL PROTOCOLO", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "ERROR", description: "EXCEPCIÓN CRÍTICA EN EL SERVIDOR", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleVariantChange = (newVariants: any[]) => {
    setFormData({ ...formData, variants: newVariants })
  }

  const handleGeneralImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    
    const files = Array.from(e.target.files)
    setSaving(true)
    
    const formData = new FormData()
    files.forEach(file => {
      formData.append("images", file)
    })

    try {
      const headers = await (api as any).getAuthHeaders()
      const { 'Content-Type': _, ...authHeaders } = headers
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/temp-upload`, {
        method: "POST",
        headers: authHeaders,
        body: formData
      })
      
      const result = await response.json()
      
      if (result.success) {
        const newImages = result.urls.map((url: string) => ({ url, isMain: false }))
        setGeneralImages([...generalImages, ...newImages])
        toast({ title: "IMÁGENES CARGADAS", description: `${newImages.length} RECURSOS GENERALES DISPONIBLES` })
      } else {
        toast({ title: "ERROR", description: "EL SERVIDOR RECHAZÓ LA CARGA", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "ERROR", description: "FALLO EN LA CARGA DE RECURSOS GENERALES", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const removeGeneralImage = (idOrIdx: any) => {
    setGeneralImages(prev => prev.filter((img, idx) => (img._id || img.id || idx) !== idOrIdx))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-1 bg-neutral-100 overflow-hidden">
            <div className="w-full h-full bg-neutral-900 animate-progress-fast"></div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] animate-pulse text-neutral-500">Sincronizando Inventario...</p>
        </div>
      </div>
    )
  }

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-8 bg-transparent min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-neutral-200 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-neutral-400 animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Gestión de Activos • KAOS</span>
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">
            Catálogo Maestro
          </h1>
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-2 flex items-center gap-2">
             <Package className="h-3 w-3" /> {toNumber(totalProducts)} Unidades de Inventario Registradas
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="default"
            onClick={() => router.push("/admin/products/bulk")}
            className="bg-neutral-900 text-white hover:bg-neutral-800 border border-neutral-300 rounded-none h-14 px-8 text-[10px] font-bold uppercase tracking-widest transition-all"
          >
            <Upload className="h-4 w-4 mr-2" />
            Carga Masiva
          </Button>
          <Button
            onClick={() => {
              setEditingProduct(null)
              setFormData({
                name: "",
                description: "",
                price: "",
                originalPrice: "",
                category: "",
                brand: "",
                isActive: true,
                isFeatured: false,
                variants: [],
                priceConfig: { mode: "fixed", percentage: 0, basePrice: 0 },
                globalSizes: ["S", "M", "L", "XL"]
              })
              setGeneralImages([])
              setIsDialogOpen(true)
            }}
            className="bg-neutral-900 text-white rounded-none h-14 px-8 text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-800 transition-all"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Producto
          </Button>
        </div>
      </div>

      {/* Tools & Analytics Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
         <div className="lg:col-span-8 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 group">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 h-4 w-4 group-focus-within:text-neutral-500 transition-colors" />
               <Input
                  placeholder="FILTRAR POR NOMBRE, SKU O MARCA..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  className="pl-12 h-14 rounded-none border-neutral-200 focus:border-neutral-400 transition-all uppercase text-[10px] font-bold tracking-widest bg-neutral-50"
               />
            </div>
            <div className="flex gap-2">
               <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(parseInt(v)); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[140px] h-14 rounded-none border-neutral-200 font-bold text-[10px] uppercase tracking-widest bg-white text-neutral-800">
                     <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-neutral-200 bg-white text-white/80">
                     <SelectItem value="12">12 UDS / PÁG</SelectItem>
                     <SelectItem value="24">24 UDS / PÁG</SelectItem>
                     <SelectItem value="48">48 UDS / PÁG</SelectItem>
                  </SelectContent>
               </Select>
               <div className="flex border border-neutral-200 bg-white">
                  <Button variant="ghost" onClick={() => setViewMode("grid")} className={cn("h-14 w-14 rounded-none p-0 hover:bg-neutral-50", viewMode === "grid" && "bg-neutral-900 text-white hover:bg-neutral-900")}><LayoutGrid className="h-5 w-5" /></Button>
                  <Button variant="ghost" onClick={() => setViewMode("list")} className={cn("h-14 w-14 rounded-none p-0 hover:bg-neutral-50", viewMode === "list" && "bg-neutral-900 text-white hover:bg-neutral-900")}><List className="h-5 w-5" /></Button>
               </div>
            </div>
         </div>
         <div className="lg:col-span-4 flex gap-4">
             <div className="flex-1 bg-white border border-neutral-200 text-neutral-900 p-4 flex flex-col justify-center">
                <span className="text-[8px] font-bold uppercase tracking-widest text-neutral-400">Valor de Inventario</span>
                <p className="text-2xl font-black tracking-tighter text-neutral-900">{currencySymbol}{stats.totalValue.toLocaleString()}</p>
             </div>
            <div className="flex-1 bg-white border border-neutral-200 p-4 flex flex-col justify-center">
               <span className="text-[8px] font-bold uppercase tracking-widest text-neutral-400">Alertas de Stock</span>
               <p className="text-2xl font-black tracking-tighter text-red-600">{stats.criticalItems.toString().padStart(2, '0')} CRÍTICOS</p>
            </div>
         </div>
      </div>

      {/* Grid Display */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
           {products.map((product) => {
             if (!product) return null
             const variantsArr = Array.isArray(product?.variants) ? product.variants : []
             const totalStock = variantsArr.reduce((sum: number, v: any) => {
                return sum + (Array.isArray(v?.sizes) ? v.sizes : []).reduce((s: number, size: any) => s + toNumber(size?.stock, 0), 0)
             }, 0)
             const firstImage = product?.images?.[0]?.url || product?.variants?.[0]?.images?.[0]?.url

            return (
              <div key={product.id || product._id} className="group relative bg-white border border-neutral-200 hover:border-neutral-400 shadow-sm transition-all duration-300 flex flex-col">
                {/* Image Container */}
                <div className="relative aspect-[4/5] overflow-hidden bg-neutral-50">
                  {firstImage ? (
                    <img src={firstImage} alt={product.name} className="w-full h-full object-cover group-hover:scale-102 transition-all duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-300"><ImageIcon className="h-12 w-12" /></div>
                  )}
                  
                  {/* Badges Overlay */}
                  <div className="absolute top-4 left-4 flex flex-col gap-1">
                     {product.isNew && <Badge className="rounded-none bg-neutral-100 text-neutral-800 border border-neutral-200 text-[8px] font-bold uppercase tracking-widest">NUEVO</Badge>}
                     {product.isFeatured && <Badge className="rounded-none bg-neutral-900 text-white border-none text-[8px] font-bold uppercase tracking-widest">HOT</Badge>}
                  </div>

                  <div className="absolute bottom-4 left-4 right-4 translate-y-20 group-hover:translate-y-0 transition-all duration-300 flex gap-1 opacity-0 group-hover:opacity-100">
                     <Button onClick={() => handleEdit(product)} className="flex-1 bg-neutral-900 text-white rounded-none text-[9px] font-bold uppercase h-10 hover:bg-neutral-800">EDITAR</Button>
                     {settings?.orders?.allowDelete && (
                       <Button onClick={() => handleDelete(product.id || product._id)} variant="destructive" className="w-10 rounded-none bg-red-50 text-red-650 hover:bg-red-100 hover:text-red-700 h-10 p-0 border border-red-150"><Trash2 className="h-4 w-4" /></Button>
                     )}
                  </div>
                </div>

                {/* Info Container */}
                <div className="p-5 flex flex-col flex-1 border-t border-neutral-100 group-hover:border-neutral-200 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                     <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-[0.2em]">{product.brand || 'KAOS URBAN'}</span>
                     <span className={cn(
                        "text-[9px] font-bold px-1.5 py-0.5 border rounded-[2px]",
                        totalStock === 0 ? "border-red-200 text-red-600 bg-red-50/50" : "border-neutral-200 text-neutral-500 bg-neutral-50"
                     )}>STOCK: {totalStock}</span>
                  </div>
                  <h3 className="text-[13px] font-bold uppercase tracking-tight text-neutral-800 line-clamp-1 mb-4 flex-1">{product.name}</h3>
                  <div className="flex items-center justify-between mt-auto">
                     <p className="text-xl font-black text-neutral-900">${toNumber(product.price).toFixed(0)}</p>
                     <div className="flex gap-1">
                        {variantsArr.slice(0, 4).map((v: any, i: number) => (
                           <div key={i} className="w-2.5 h-2.5 border border-neutral-200 rounded-full" style={{ backgroundColor: v.colorHex }} />
                        ))}
                     </div>
                  </div>
                </div>
              </div>
            )
           })}
        </div>
      ) : (
        /* List Display */
        <div className="bg-white border border-neutral-200 shadow-sm overflow-hidden">
          <table className="w-full text-left">
             <thead className="bg-neutral-50 text-neutral-700 border-b border-neutral-200">
                <tr>
                   <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-neutral-550">Elemento de Inventario</th>
                   <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-neutral-550">Estado Catálogo</th>
                   <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-neutral-550">Disponibilidad</th>
                   <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-neutral-550">Valor Unitario</th>
                   <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-neutral-550 text-right">Protocolos</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-neutral-200">
                {products.map((product) => {
                  if (!product) return null
                  const variantsArr = Array.isArray(product?.variants) ? product.variants : []
                  const totalStock = variantsArr.reduce((sum: number, v: any) => 
                    sum + (Array.isArray(v.sizes) ? v.sizes : []).reduce((s: number, size: any) => s + toNumber(size?.stock, 0), 0), 0
                  )
                  return (
                    <tr key={product.id || product._id} className="hover:bg-neutral-50/50 transition-all group">
                       <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                             <div className="w-14 h-14 bg-neutral-50 border border-neutral-200 overflow-hidden flex-shrink-0">
                                 {(product.images?.[0]?.url || product.variants?.[0]?.images?.[0]?.url) && (
                                   <img src={product.images?.[0]?.url || product.variants?.[0]?.images?.[0]?.url} className="w-full h-full object-cover group-hover:scale-105 transition-all" />
                                 )}
                             </div>
                             <div>
                                <p className="text-xs font-bold uppercase tracking-tight text-neutral-800">{product.name}</p>
                                <div className="flex items-center gap-2">
                                   <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">{product.brand || 'KAOS'}</p>
                                   <span className="text-[8px] text-neutral-300">•</span>
                                   <p className="text-[9px] font-bold text-neutral-600 uppercase tracking-widest">{product.category?.name || 'SIN CAT.'}</p>
                                </div>
                             </div>
                          </div>
                       </td>
                       <td className="px-6 py-4">
                           <div className="flex items-center gap-3">
                              <Switch 
                                checked={product.isActive} 
                                onCheckedChange={() => toggleProductStatus(product)}
                                className="data-[state=checked]:bg-neutral-900 data-[state=unchecked]:bg-neutral-200"
                              />
                              <Badge className={cn(
                                "rounded-none border text-[8px] font-bold uppercase tracking-widest px-2 py-0.5",
                                product.isActive ? "bg-neutral-100 text-neutral-800 border-neutral-200" : "bg-neutral-900 text-white border-transparent"
                              )}>
                                 {product.isActive ? "ACTIVO" : "OFFLINE"}
                              </Badge>
                           </div>
                        </td>
                       <td className="px-6 py-4">
                          <div className={cn("text-[10px] font-bold uppercase tracking-widest", totalStock < 5 ? "text-red-500" : "text-neutral-500")}>
                             {totalStock} Unidades
                          </div>
                       </td>
                       <td className="px-6 py-4">
                          <p className="text-sm font-black text-neutral-900">${toNumber(product.price).toFixed(2)}</p>
                       </td>
                       <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                             <Button onClick={() => handleEdit(product)} variant="outline" size="sm" className="rounded-none border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50 h-10 w-10 p-0 text-neutral-600"><Edit className="h-4 w-4" /></Button>
                             {settings?.orders?.allowDelete && (
                               <Button onClick={() => handleDelete(product.id || product._id)} variant="destructive" size="sm" className="rounded-none bg-red-50 text-red-655 hover:bg-red-100 border border-transparent hover:border-red-150 h-10 w-10 p-0"><Trash2 className="h-4 w-4" /></Button>
                             )}
                          </div>
                       </td>
                    </tr>
                  )
                })}
             </tbody>
          </table>
        </div>
      )}

      {/* Modern Pagination Section */}
      <div className="flex flex-col md:flex-row items-center justify-between border-t border-neutral-200 pt-12 gap-8">
         <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
            Página {currentPage} de {totalPages} • Total {stats.totalProducts || totalProducts} Registros
         </div>
         <div className="flex gap-1">
            <Button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="rounded-none border-neutral-200 h-12 w-12 p-0 hover:border-neutral-400 hover:bg-neutral-50" variant="outline"><ChevronLeft className="h-5 w-5" /></Button>
            {Array.from({ length: totalPages }).map((_, i) => (
               <Button key={i} onClick={() => handlePageChange(i + 1)} className={cn("rounded-none h-12 w-12 p-0 text-[10px] font-bold transition-all", currentPage === i + 1 ? "bg-neutral-900 text-white hover:bg-neutral-800" : "bg-white border-neutral-200 hover:border-neutral-400 text-neutral-700 hover:bg-neutral-50")}>{i + 1}</Button>
            ))}
            <Button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="rounded-none border-neutral-200 h-12 w-12 p-0 hover:border-neutral-400 hover:bg-neutral-50" variant="outline"><ChevronRight className="h-5 w-5" /></Button>
         </div>
      </div>

      {/* Product Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col rounded-none border-neutral-200 bg-white text-neutral-900 shadow-2xl p-0">
          <DialogHeader className="bg-neutral-900 text-white p-8">
            <div className="flex items-center gap-3 mb-2">
               <div className="w-2 h-2 bg-white animate-pulse"></div>
               <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">PROTOCOLO DE REGISTRO • KAOS</span>
            </div>
            <DialogTitle className="text-5xl font-black uppercase tracking-tighter leading-none text-white">
              {editingProduct ? "MODIFICAR ACTIVO" : "NUEVO REGISTRO"}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col p-8">
            <TabsList className="grid w-full grid-cols-4 mb-10 bg-neutral-100 rounded-none p-1">
              <TabsTrigger value="basic" className="rounded-none font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-neutral-900 data-[state=active]:text-white transition-all text-neutral-600">
                01. Básico
              </TabsTrigger>
              <TabsTrigger value="pricing" className="rounded-none font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-neutral-900 data-[state=active]:text-white transition-all text-neutral-600">
                02. Precio
              </TabsTrigger>
              <TabsTrigger value="variants" className="rounded-none font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-neutral-900 data-[state=active]:text-white transition-all text-neutral-600">
                03. Variantes
              </TabsTrigger>
              <TabsTrigger value="images" className="rounded-none font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-neutral-900 data-[state=active]:text-white transition-all text-neutral-600">
                04. Multimedia (Opcional)
              </TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {/* Tabs Content - Simplified for Industrial Look */}
              <TabsContent value="basic" className="space-y-6 mt-0">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Nombre del Producto</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="rounded-none border-neutral-200 focus:border-neutral-450 font-bold uppercase text-xs bg-transparent text-neutral-800"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Marca</Label>
                    <Input
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      className="rounded-none border-neutral-200 focus:border-neutral-450 font-bold uppercase text-xs bg-transparent text-neutral-800"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Descripción Técnica</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="rounded-none border-neutral-200 focus:border-neutral-450 text-xs font-medium bg-transparent text-neutral-800"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Categoría</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger className="rounded-none border-neutral-200 font-bold text-xs uppercase text-neutral-800 bg-white">
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-none border-neutral-200 bg-white text-white">
                        {parentCategories.map((cat: any) => (
                          <SelectItem key={cat.id || cat._id} value={cat.id || cat._id} className="text-xs font-bold uppercase">{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 gap-6 pt-6 col-span-2">
                    <div className="flex items-center justify-between p-4 bg-neutral-50 border border-neutral-100">
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-black uppercase text-neutral-700">Activo</Label>
                        <p className="text-[8px] font-bold opacity-40 uppercase">Venta Directa</p>
                      </div>
                      <Switch 
                        checked={formData.isActive} 
                        onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                        className="data-[state=checked]:bg-neutral-900"
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-neutral-50 border border-neutral-100">
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-black uppercase text-neutral-700">Destacado</Label>
                        <p className="text-[8px] font-bold opacity-40 uppercase">Sección Hot</p>
                      </div>
                      <Switch 
                        checked={formData.isFeatured} 
                        onCheckedChange={(checked) => setFormData({ ...formData, isFeatured: checked })}
                        className="data-[state=checked]:bg-neutral-900"
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-neutral-50 border border-neutral-100">
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-black uppercase text-neutral-700">Insignia Nuevo</Label>
                        <p className="text-[8px] font-bold opacity-40 uppercase">Tag Novedad</p>
                      </div>
                      <Switch 
                        checked={formData.isNew} 
                        onCheckedChange={(checked) => setFormData({ ...formData, isNew: checked })}
                        className="data-[state=checked]:bg-neutral-900"
                      />
                    </div>
                  </div>

                  <div className="col-span-2 space-y-4 pt-4 border-t border-neutral-150">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Tallas del Producto</Label>
                    <div className="flex flex-wrap gap-2">
                      {["UNIQUE", "S", "M", "L", "XL", "XXL", "38", "40", "42", "44"].map((size) => {
                        const isSelected = formData.globalSizes?.includes(size) || false
                        return (
                          <Button
                            key={size}
                            type="button"
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              const currentSizes = formData.globalSizes || []
                              const newSizes = isSelected
                                ? currentSizes.filter((s: string) => s !== size)
                                : [...currentSizes, size]
                              setFormData({ ...formData, globalSizes: newSizes })
                            }}
                            className={cn(
                              "rounded-none h-10 px-4 font-bold text-[10px] tracking-widest transition-all",
                              isSelected 
                                ? "bg-neutral-900 text-white border-neutral-900 hover:bg-neutral-800" 
                                : "bg-transparent border-neutral-200 hover:border-neutral-400 text-neutral-600 hover:bg-neutral-50"
                            )}
                          >
                            {size}
                          </Button>
                        )
                      })}
                      <Input
                        placeholder="AÑADIR TALLA..."
                        className="w-32 h-10 rounded-none border-neutral-200 text-[10px] font-bold uppercase placeholder:text-neutral-300 text-neutral-800"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            const val = e.currentTarget.value.trim().toUpperCase()
                            if (val && !formData.globalSizes.includes(val)) {
                              setFormData({ ...formData, globalSizes: [...formData.globalSizes, val] })
                              e.currentTarget.value = ""
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Pricing Content */}
              <TabsContent value="pricing" className="space-y-8 mt-0">
                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Precio Normal con Descuento ({currencySymbol})</Label>
                       <Input
                         type="number"
                         step="0.01"
                         value={formData.price}
                         onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                         className="rounded-none border-neutral-200 focus:border-neutral-450 h-20 text-4xl font-black bg-transparent text-neutral-900"
                         required
                       />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Precio Anterior / Tachado</Label>
                       <Input
                         type="number"
                         step="0.01"
                         value={formData.originalPrice}
                         onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                         className="rounded-none border-neutral-200 focus:border-neutral-450 h-16 text-xl font-bold text-neutral-400 bg-transparent"
                       />
                    </div>
                 </div>
              </TabsContent>

              {/* Variants Content */}
               <TabsContent value="variants" className="space-y-6 mt-0">
                  <ProductVariantEditor 
                     variants={formData.variants} 
                     onChange={handleVariantChange} 
                     availableSizes={formData.globalSizes}
                  />
               </TabsContent>

              {/* Images Content */}
              <TabsContent value="images" className="space-y-8 mt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="col-span-full">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-4 block">Multimedia del Producto (Imagen Principal y Galería)</Label>
                  </div>
                  {generalImages.map((img, idx) => (
                    <div key={idx} className={cn(
                      "group relative aspect-square rounded-none border bg-neutral-50 overflow-hidden",
                      img.isMain ? "border-neutral-900 ring-1 ring-neutral-900" : "border-neutral-200"
                    )}>
                      <img src={cleanImageUrl(img.url)} alt="General" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-neutral-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                        <Button 
                          type="button" 
                          variant={img.isMain ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            const newImages = generalImages.map((image, i) => ({
                              ...image,
                              isMain: i === idx
                            }))
                            setGeneralImages(newImages)
                          }}
                          className="rounded-none h-8 px-3 font-bold text-[9px] uppercase tracking-widest bg-white text-neutral-900 hover:bg-neutral-100 border-none"
                        >
                          {img.isMain ? 'PRINCIPAL' : 'DEFINIR PRINCIPAL'}
                        </Button>
                        <Button 
                          type="button" 
                          variant="destructive"
                          size="icon"
                          onClick={() => removeGeneralImage(img._id || img.id || idx)}
                          className="rounded-none h-8 w-8 bg-red-50 text-red-650 hover:bg-red-100 border-none"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {img.isMain && (
                        <div className="absolute top-0 left-0 bg-neutral-900 text-white px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider">
                          ASSET PRINCIPAL
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <label className="aspect-square border-2 border-dashed border-neutral-200 hover:border-neutral-400 flex flex-col items-center justify-center cursor-pointer hover:bg-neutral-50 transition-all group relative overflow-hidden">
                    <Upload className="h-8 w-8 mb-2 text-neutral-300 group-hover:text-neutral-500 transition-colors" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 group-hover:text-neutral-600 text-center px-2">Añadir Activos<br/>Multimedia</span>
                    <input type="file" multiple accept="image/*" onChange={handleGeneralImageChange} className="hidden" />
                  </label>
                </div>
              </TabsContent>
            </form>

            <DialogFooter className="bg-neutral-50 p-8 mt-auto flex flex-col md:flex-row gap-4 border-t border-neutral-200">
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-none font-bold uppercase text-[10px] tracking-widest h-14 px-8 border border-neutral-200 hover:bg-neutral-100 hover:text-neutral-900 transition-all text-neutral-600">
                 CANCELAR PROTOCOLO
              </Button>
              <Button onClick={handleSubmit} disabled={saving} className="rounded-none bg-neutral-900 text-white h-14 px-12 font-bold uppercase text-[10px] tracking-widest hover:bg-neutral-800 transition-all">
                 {saving ? 'PROCESANDO...' : editingProduct ? 'ACTUALIZAR REGISTRO' : 'CONFIRMAR REGISTRO'}
              </Button>
            </DialogFooter>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}