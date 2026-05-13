"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
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
  Filter,
  BarChart4,
  LayoutGrid,
  Trello
} from "lucide-react"
import { api, cleanImageUrl } from "@/lib/api"
import { brandConfig } from "@/lib/config"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

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

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(12)
  
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
  })

  useEffect(() => {
    loadData()
  }, [currentPage, itemsPerPage, search])

  const loadData = async () => {
    setLoading(true)
    try {
      const params: any = { page: currentPage, limit: itemsPerPage, isAdmin: true }
      if (search.trim()) params.search = search.trim()

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

  const handleEdit = (product: any) => {
    setEditingProduct(product)
    setFormData({
      ...product,
      price: product.price?.toString() || "",
      originalPrice: product.originalPrice?.toString() || "",
      category: typeof product.category === 'string' ? product.category : product.category?._id || "",
      variants: Array.isArray(product.variants) ? product.variants : [],
      priceConfig: ensurePriceConfig(product.priceConfig)
    })
    setGeneralImages(product.images || [])
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = {
        ...formData,
        price: parseFloat(formData.price) || 0,
        originalPrice: parseFloat(formData.originalPrice) || 0,
        images: generalImages
      }

      let result
      if (editingProduct) {
        result = await api.updateProduct(editingProduct._id || editingProduct.id, data)
      } else {
        result = await api.createProduct(data)
      }

      if (result.success) {
        toast({ title: "ÉXITO", description: "REGISTRO ACTUALIZADO CORRECTAMENTE" })
        setIsDialogOpen(false)
        loadData()
      } else {
        toast({ title: "ERROR", description: result.message || "FALLO EN EL PROTOCOLO", variant: "destructive" })
      }
    } catch (error) {
      console.error("Error saving product:", error)
      toast({ title: "ERROR", description: "EXCEPCIÓN CRÍTICA EN EL SERVIDOR", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleGeneralImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    // Implementación simplificada para el ejemplo - idealmente subiría a un CDN
    toast({ title: "INFO", description: "CARGANDO RECURSOS VISUALES..." })
    // Simulando subida o manejando localmente si el backend lo soporta
  }

  const removeGeneralImage = (id: string) => {
    setGeneralImages(prev => prev.filter(img => (img.id || img._id) !== id))
  }

  const currencySymbol = settings?.currency?.symbol || "$"

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-1 bg-black overflow-hidden">
            <div className="w-full h-full bg-kaosNeon animate-progress-fast"></div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">Sincronizando Inventario...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-8 bg-transparent min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-black/10 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-kaosNeon animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-black/40">Gestión de Activos • KAOZ</span>
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">
            Catálogo Maestro
          </h1>
          <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest mt-2 flex items-center gap-2">
             <Package className="h-3 w-3" /> {toNumber(totalProducts)} Unidades de Inventario Registradas
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => router.push("/admin/products/bulk")}
            className="border-black rounded-none h-14 px-8 text-[10px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all"
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
                priceConfig: { mode: "fixed", percentage: 0, basePrice: 0 }
              })
              setGeneralImages([])
              setIsDialogOpen(true)
            }}
            className="bg-black text-white rounded-none h-14 px-8 text-[10px] font-black uppercase tracking-widest hover:bg-kaosNeon hover:text-black transition-all shadow-[4px_4px_0_rgba(0,0,0,0.2)] active:translate-y-1 active:shadow-none"
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
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20 h-4 w-4 group-focus-within:text-kaosNeon transition-colors" />
               <Input
                  placeholder="FILTRAR POR NOMBRE, SKU O MARCA..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  className="pl-12 h-14 rounded-none border-black/10 focus:border-black transition-all uppercase text-[10px] font-black tracking-widest bg-black/[0.02]"
               />
            </div>
            <div className="flex gap-2">
               <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(parseInt(v)); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[140px] h-14 rounded-none border-black/10 font-black text-[10px] uppercase tracking-widest bg-white">
                     <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-black">
                     <SelectItem value="12">12 UDS / PÁG</SelectItem>
                     <SelectItem value="24">24 UDS / PÁG</SelectItem>
                     <SelectItem value="48">48 UDS / PÁG</SelectItem>
                  </SelectContent>
               </Select>
               <div className="flex border border-black/10 bg-white">
                  <Button variant="ghost" onClick={() => setViewMode("grid")} className={cn("h-14 w-14 rounded-none p-0", viewMode === "grid" && "bg-black text-white")}><LayoutGrid className="h-5 w-5" /></Button>
                  <Button variant="ghost" onClick={() => setViewMode("list")} className={cn("h-14 w-14 rounded-none p-0", viewMode === "list" && "bg-black text-white")}><List className="h-5 w-5" /></Button>
               </div>
            </div>
         </div>
         <div className="lg:col-span-4 flex gap-4">
             <div className="flex-1 bg-black text-white p-4 flex flex-col justify-center">
                <span className="text-[8px] font-black uppercase tracking-widest text-white/40">Valor de Inventario</span>
                <p className="text-2xl font-black tracking-tighter text-kaosNeon">${(toNumber(totalProducts) * 45).toLocaleString()}</p>
             </div>
            <div className="flex-1 bg-white border border-black/10 p-4 flex flex-col justify-center">
               <span className="text-[8px] font-black uppercase tracking-widest text-black/20">Alertas de Stock</span>
               <p className="text-2xl font-black tracking-tighter text-red-500">08 CRÍTICOS</p>
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
            const firstImage = product?.images?.[0]?.url

            return (
              <div key={product.id || product._id} className="group relative bg-white border border-black/5 hover:border-black transition-all duration-500 flex flex-col">
                {/* Image Container */}
                <div className="relative aspect-[4/5] overflow-hidden bg-slate-50">
                  {firstImage ? (
                    <img src={firstImage} alt={product.name} className="w-full h-full object-cover grayscale contrast-125 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-black/5"><ImageIcon className="h-16 w-16" /></div>
                  )}
                  
                  {/* Badges Overlay */}
                  <div className="absolute top-4 left-4 flex flex-col gap-1">
                     {product.isNew && <Badge className="rounded-none bg-kaosNeon text-black border-none text-[8px] font-black uppercase tracking-widest">NUEVO</Badge>}
                     {product.isFeatured && <Badge className="rounded-none bg-black text-white border-none text-[8px] font-black uppercase tracking-widest">HOT</Badge>}
                  </div>

                  <div className="absolute bottom-4 left-4 right-4 translate-y-20 group-hover:translate-y-0 transition-all duration-500 flex gap-1 opacity-0 group-hover:opacity-100">
                     <Button onClick={() => handleEdit(product)} className="flex-1 bg-black text-white rounded-none text-[9px] font-black uppercase h-10 hover:bg-kaosNeon hover:text-black">EDITAR</Button>
                     <Button onClick={() => handleDelete(product.id || product._id)} variant="destructive" className="w-10 rounded-none bg-red-600 h-10 p-0"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>

                {/* Info Container */}
                <div className="p-5 flex flex-col flex-1 border-t border-black/5 group-hover:border-black transition-colors">
                  <div className="flex justify-between items-start mb-2">
                     <span className="text-[9px] font-black text-black/20 uppercase tracking-[0.2em]">{product.brand || 'KAOZ URBAN'}</span>
                     <span className={cn(
                        "text-[9px] font-black px-1.5 py-0.5 border",
                        totalStock === 0 ? "border-red-500 text-red-500" : "border-black/10 text-black/40"
                     )}>STOCK: {totalStock}</span>
                  </div>
                  <h3 className="text-[13px] font-black uppercase tracking-tight line-clamp-1 mb-4 flex-1">{product.name}</h3>
                  <div className="flex items-center justify-between mt-auto">
                     <p className="text-xl font-black">${toNumber(product.price).toFixed(0)}</p>
                     <div className="flex gap-1">
                        {variantsArr.slice(0, 4).map((v: any, i: number) => (
                           <div key={i} className="w-2 h-2 border border-black/10" style={{ backgroundColor: v.colorHex }} />
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
        <div className="bg-white border border-black">
          <table className="w-full text-left">
             <thead className="bg-black text-white border-b border-black">
                <tr>
                   <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">Elemento de Inventario</th>
                   <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">Estado Catálogo</th>
                   <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">Disponibilidad</th>
                   <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">Valor Unitario</th>
                   <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-right">Protocolos</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-black/5">
                {products.map((product) => {
                  if (!product) return null
                  const variantsArr = Array.isArray(product?.variants) ? product.variants : []
                  const totalStock = variantsArr.reduce((sum: number, v: any) => 
                    sum + (Array.isArray(v.sizes) ? v.sizes : []).reduce((s: number, size: any) => s + toNumber(size?.stock, 0), 0), 0
                  )
                  return (
                    <tr key={product.id || product._id} className="hover:bg-black/[0.01] transition-all group">
                       <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                             <div className="w-14 h-14 bg-slate-50 border border-black/5 overflow-hidden flex-shrink-0">
                                {product.images?.[0]?.url && <img src={product.images[0].url} className="w-full h-full object-cover grayscale contrast-125 group-hover:grayscale-0 transition-all" />}
                             </div>
                             <div>
                                <p className="text-xs font-black uppercase tracking-tight">{product.name}</p>
                                <p className="text-[9px] font-bold text-black/30 uppercase tracking-widest">{product.brand || 'KAOZ'}</p>
                             </div>
                          </div>
                       </td>
                       <td className="px-6 py-4">
                          <Badge className="rounded-none bg-slate-100 text-black border-none text-[8px] font-black uppercase tracking-widest px-2 py-1">
                             {product.category?.name || 'S/C'}
                          </Badge>
                       </td>
                       <td className="px-6 py-4">
                          <div className={cn("text-[10px] font-black uppercase tracking-widest", totalStock < 5 ? "text-red-500" : "text-black/40")}>
                             {totalStock} Unidades
                          </div>
                       </td>
                       <td className="px-6 py-4">
                          <p className="text-sm font-black">${toNumber(product.price).toFixed(2)}</p>
                       </td>
                       <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                             <Button onClick={() => handleEdit(product)} variant="outline" size="sm" className="rounded-none border-black/10 hover:border-black h-10 w-10 p-0"><Edit className="h-4 w-4" /></Button>
                             <Button onClick={() => handleDelete(product.id || product._id)} variant="destructive" size="sm" className="rounded-none bg-black text-white h-10 w-10 p-0 hover:bg-red-600"><Trash2 className="h-4 w-4" /></Button>
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
      <div className="flex flex-col md:flex-row items-center justify-between border-t border-black/10 pt-12 gap-8">
         <div className="text-[10px] font-black uppercase tracking-[0.2em] text-black/20">
            Página {currentPage} de {totalPages} • Total {totalProducts} Registros
         </div>
         <div className="flex gap-1">
            <Button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="rounded-none border-black/10 h-12 w-12 p-0 hover:border-black" variant="outline"><ChevronLeft className="h-5 w-5" /></Button>
            {Array.from({ length: totalPages }).map((_, i) => (
               <Button key={i} onClick={() => handlePageChange(i + 1)} className={cn("rounded-none h-12 w-12 p-0 text-[10px] font-black transition-all", currentPage === i + 1 ? "bg-black text-white" : "bg-white border-black/10 hover:border-black")}>{i + 1}</Button>
            ))}
            <Button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="rounded-none border-black/10 h-12 w-12 p-0 hover:border-black" variant="outline"><ChevronRight className="h-5 w-5" /></Button>
         </div>
      </div>

      {/* Product Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col rounded-none border-black bg-white dark:bg-slate-950 text-black dark:text-white">
          <DialogHeader className="border-b border-black/10 pb-4">
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-black dark:text-white">
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
                    <Label className="text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">Nombre del Producto</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="rounded-none border-black/10 focus:border-black dark:border-white/10 dark:focus:border-kaosNeon font-bold uppercase text-xs bg-transparent text-black dark:text-white"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">Marca</Label>
                    <Input
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      className="rounded-none border-black/10 focus:border-black dark:border-white/10 dark:focus:border-kaosNeon font-bold uppercase text-xs bg-transparent text-black dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">Descripción Técnica</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="rounded-none border-black/10 focus:border-black dark:border-white/10 dark:focus:border-kaosNeon text-xs font-medium bg-transparent text-black dark:text-white"
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
                      <Label className="text-[10px] font-black uppercase tracking-widest text-black/60 dark:text-white/60">Precio de Venta ({currencySymbol})</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="rounded-none border-black dark:border-kaosNeon h-20 text-4xl font-black bg-transparent text-black dark:text-white"
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
                          <img src={cleanImageUrl(img.url)} className="w-full h-full object-cover" />
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