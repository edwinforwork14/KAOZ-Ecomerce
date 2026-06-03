"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Package,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  AlertCircle,
  Image as ImageIcon,
  Palette,
  DollarSign,
  Hash,
  Tags,
  FileText,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
  Search,
  GripVertical,
  RefreshCw,
  Sparkles,
  X,
  Edit3,
  Grid3x3,
  List
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { api, cleanImageUrl } from "@/lib/api"
import { toast } from "sonner"
import { UploadedImage } from "./BulkImageUploader"

export interface SizeEntry {
  size: string
  stock: number
  sku?: string
}

interface VariantEntry {
  id?: string
  color: string
  colorHex: string
  images: { url: string; isMain?: boolean }[]
  sizes: SizeEntry[]
}

export interface ProductDraft {
  id: string
  name: string
  description: string
  price: number
  originalPrice: number | null
  categoryId: string | null
  subcategoryId: string | null
  brand: string
  isNew: boolean
  isFeatured: boolean
  isActive: boolean
  tags: string[]
  images: { url: string; isMain?: boolean; originalName?: string }[]
  variants: VariantEntry[]
  status: string
  errors: { field: string; message: string }[]
  warnings: { field: string; message: string }[]
  _suggestedColors?: string[]
  _hasColorVariants?: boolean
}

interface BulkDraftEditorProps {
  drafts: ProductDraft[]
  categories: any[]
  onDraftsChange: (drafts: ProductDraft[]) => void
  onBack: () => void
  onComplete: () => void
  /** Pool de imágenes disponibles desde la Fase 1 */
  assets?: Record<string, any>
  allImages?: UploadedImage[]

}

const DEFAULT_SIZES = ["S", "M", "L", "XL", "XXL"]

export function BulkDraftEditor({
  drafts,
  categories,
  onDraftsChange,
  onBack,
  onComplete,
  assets,
  allImages
}: BulkDraftEditorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [bulkEditMode, setBulkEditMode] = useState(false)
  const [selectedDrafts, setSelectedDrafts] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState("")
  const [showFilters, setShowFilters] = useState(true)

  const parentCategories = useMemo(() => categories.filter(c => !c.parent), [categories])

  const filteredDrafts = useMemo(() => {
    if (!searchTerm) return drafts
    return drafts.filter(d =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.brand.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [drafts, searchTerm])

  const stats = useMemo(() => ({
    total: drafts.length,
    valid: drafts.filter(d => d.errors.length === 0).length,
    invalid: drafts.filter(d => d.errors.length > 0).length,
    totalVariants: drafts.reduce((sum, d) => sum + d.variants.length, 0),
    totalImages: drafts.reduce((sum, d) => sum + d.images.length, 0)
  }), [drafts])

  // ─── Validación en frontend ────────────────────────────────────────
  const validateDraft = (draft: ProductDraft): ProductDraft => {
    const errors: { field: string; message: string }[] = []
    const warnings: { field: string; message: string }[] = []

    if (!draft.name || draft.name.trim().length < 3) {
      errors.push({ field: "name", message: "Nombre debe tener al menos 3 caracteres" })
    }

    if (draft.price === undefined || draft.price === null || Number(draft.price) <= 0) {
      errors.push({ field: "price", message: "Precio debe ser mayor a 0" })
    }

    if (!draft.categoryId) {
      warnings.push({ field: "categoryId", message: "Categoría no asignada (recomendado)" })
    }

    if (!draft.images || draft.images.length === 0) {
      errors.push({ field: "images", message: "Al menos una imagen requerida" })
    }

    if (!draft.variants || draft.variants.length === 0) {
      errors.push({ field: "variants", message: "Al menos una variante requerida" })
    } else {
      let hasStock = false
      draft.variants.forEach((v, vi) => {
        if (!v.color || v.color.trim().length === 0) {
          warnings.push({ field: `variants[${vi}].color`, message: `Variante #${vi + 1} sin nombre de color` })
        }
        if (!v.sizes || v.sizes.length === 0) {
          warnings.push({ field: `variants[${vi}].sizes`, message: `Variante "${v.color}" sin tallas definidas` })
        } else {
          v.sizes.forEach((s, si) => {
            if (!s.size || s.size.trim().length === 0) {
              errors.push({ field: `variants[${vi}].sizes[${si}].size`, message: `Talla vacía en variante "${v.color}"` })
            }
            if (s.stock > 0) hasStock = true
          })
        }
      })
      if (!hasStock) {
        warnings.push({ field: "stock", message: "Ninguna variante tiene stock > 0" })
      }
    }

    if (!draft.brand || draft.brand.trim().length === 0) {
      warnings.push({ field: "brand", message: "Marca no especificada" })
    }

    if (!draft.description || draft.description.trim().length < 10) {
      warnings.push({ field: "description", message: "Descripción muy corta (mín. 10 caracteres recomendado)" })
    }

    return {
      ...draft,
      errors,
      warnings,
      status: errors.length === 0 ? "valid" : "invalid"
    }
  }

  const updateDraft = (id: string, updates: Partial<ProductDraft>) => {
    onDraftsChange(drafts.map(d => {
      if (d.id !== id) return d
      return validateDraft({ ...d, ...updates })
    }))
  }

  const updateVariant = (draftId: string, vIdx: number, updates: Partial<VariantEntry>) => {
    onDraftsChange(drafts.map(d => {
      if (d.id !== draftId) return d
      const variants = [...d.variants]
      variants[vIdx] = { ...variants[vIdx], ...updates }
      return validateDraft({ ...d, variants })
    }))
  }

  const addVariant = (draftId: string) => {
    onDraftsChange(drafts.map(d => {
      if (d.id !== draftId) return d
      return validateDraft({
        ...d,
        variants: [...d.variants, {
          color: "",
          colorHex: "#000000",
          images: [],
          sizes: DEFAULT_SIZES.map(s => ({ size: s, stock: 0 }))
        }]
      })
    }))
  }

  const removeVariant = (draftId: string, vIdx: number) => {
    onDraftsChange(drafts.map(d => {
      if (d.id !== draftId) return d
      return validateDraft({ ...d, variants: d.variants.filter((_, i) => i !== vIdx) })
    }))
  }

  const addSizeRow = (draftId: string, vIdx: number) => {
    onDraftsChange(drafts.map(d => {
      if (d.id !== draftId) return d
      const variants = [...d.variants]
      variants[vIdx] = {
        ...variants[vIdx],
        sizes: [...variants[vIdx].sizes, { size: "", stock: 0 }]
      }
      return validateDraft({ ...d, variants })
    }))
  }

  const updateSize = (draftId: string, vIdx: number, sIdx: number, updates: Partial<SizeEntry>) => {
    onDraftsChange(drafts.map(d => {
      if (d.id !== draftId) return d
      const variants = [...d.variants]
      const sizes = [...variants[vIdx].sizes]
      sizes[sIdx] = { ...sizes[sIdx], ...updates }
      variants[vIdx] = { ...variants[vIdx], sizes }
      return validateDraft({ ...d, variants })
    }))
  }

  const removeSizeRow = (draftId: string, vIdx: number, sIdx: number) => {
    onDraftsChange(drafts.map(d => {
      if (d.id !== draftId) return d
      const variants = [...d.variants]
      variants[vIdx] = {
        ...variants[vIdx],
        sizes: variants[vIdx].sizes.filter((_, i) => i !== sIdx)
      }
      return validateDraft({ ...d, variants })
    }))
  }

  const duplicateDraft = (draft: ProductDraft) => {
    const newDraft: ProductDraft = validateDraft({
      ...draft,
      id: `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `${draft.name} (COPY)`,
      images: [...draft.images],
      variants: draft.variants.map(v => ({
        ...v,
        images: [...v.images],
        sizes: v.sizes.map(s => ({ ...s }))
      }))
    })
    onDraftsChange([...drafts, newDraft])
    toast.success("Producto duplicado")
  }

  const removeDraft = (id: string) => {
    onDraftsChange(drafts.filter(d => d.id !== id))
  }

  const toggleSelect = (id: string) => {
    setSelectedDrafts(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const applyBulkToSelected = (field: string, value: any) => {
    if (selectedDrafts.size === 0) {
      toast.warning("Selecciona al menos un producto")
      return
    }
    onDraftsChange(drafts.map(d => {
      if (!selectedDrafts.has(d.id)) return d
      let updated = { ...d }
      if (field === "brand") updated.brand = value
      else if (field === "isNew") updated.isNew = value
      else if (field === "isFeatured") updated.isFeatured = value
      else if (field === "isActive") updated.isActive = value
      else if (field === "categoryId") updated.categoryId = value
      else if (field === "price") updated.price = value
      return validateDraft(updated)
    }))
    toast.success(`${field} aplicado a ${selectedDrafts.size} producto(s)`)
    setBulkEditMode(false)
    setSelectedDrafts(new Set())
  }

  const assignImageToDraft = (draftId: string, imageUrl: string, imageName?: string) => {
    onDraftsChange(drafts.map(d => {
      if (d.id !== draftId) return d
      if (d.images.some(img => img.url === imageUrl)) return d
      return validateDraft({
        ...d,
        images: [...d.images, { url: imageUrl, isMain: d.images.length === 0, originalName: imageName }]
      })
    }))
  }

  const assignImageToVariant = (draftId: string, vIdx: number, imageUrl: string) => {
    onDraftsChange(drafts.map(d => {
      if (d.id !== draftId) return d
      const variants = [...d.variants]
      const currentImages = variants[vIdx].images || []
      if (currentImages.some(img => img.url === imageUrl)) return d
      variants[vIdx] = {
        ...variants[vIdx],
        images: [...currentImages, { url: imageUrl }]
      }
      return validateDraft({ ...d, variants })
    }))
  }

  const assignImageToAllSelected = (imageUrl: string, imageName?: string) => {
    if (selectedDrafts.size === 0) {
      toast.warning("Selecciona al menos un producto")
      return
    }
    onDraftsChange(drafts.map(d => {
      if (!selectedDrafts.has(d.id)) return d
      if (d.images.some(img => img.url === imageUrl)) return d
      return validateDraft({
        ...d,
        images: [...d.images, { url: imageUrl, isMain: d.images.length === 0, originalName: imageName }]
      })
    }))
    toast.success("Imagen asignada a " + selectedDrafts.size + " producto(s)")
  }

  const removeImageFromDraft = (draftId: string, imgIdx: number) => {
    onDraftsChange(drafts.map(d => {
      if (d.id !== draftId) return d
      return validateDraft({ ...d, images: d.images.filter((_, i) => i !== imgIdx) })
    }))
  }

  const removeImageFromVariant = (draftId: string, vIdx: number, imgIdx: number) => {
    onDraftsChange(drafts.map(d => {
      if (d.id !== draftId) return d
      const variants = [...d.variants]
      variants[vIdx] = {
        ...variants[vIdx],
        images: variants[vIdx].images.filter((_, i) => i !== imgIdx)
      }
      return validateDraft({ ...d, variants })
    }))
  }

  const setMainImage = (draftId: string, imgIdx: number) => {
    onDraftsChange(drafts.map(d => {
      if (d.id !== draftId) return d
      return {
        ...d,
        images: d.images.map((img, i) => ({ ...img, isMain: i === imgIdx }))
      }
    }))
  }

  // Grid/List view
  const renderDraftCard = (draft: ProductDraft) => {
    const isExpanded = expandedId === draft.id
    const isValid = draft.errors.length === 0
    const hasWarnings = draft.warnings && draft.warnings.length > 0

    return (
      <motion.div
        key={draft.id}
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "border transition-all bg-white",
          isExpanded ? "border-neutral-900 shadow-lg" : "border-neutral-200 hover:border-neutral-400",
          !isValid && "border-l-4 border-l-red-500",
          hasWarnings && isValid && "border-l-4 border-l-amber-500"
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-4 p-5 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : draft.id)}>
          <div className="w-14 h-14 bg-neutral-50 border border-neutral-200 overflow-hidden shrink-0">
            {draft.images[0] ? (
              <img src={cleanImageUrl(draft.images[0].url)} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-300">
                <ImageIcon className="h-6 w-6" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-tight text-neutral-800 truncate">
                {draft.name || "SIN NOMBRE"}
              </p>
              {draft.errors.length > 0 && (
                <Badge variant="outline" className="rounded-none border-red-200 text-red-600 bg-red-50 text-[8px] font-bold">
                  {draft.errors.length} ERROR(ES)
                </Badge>
              )}
              {isValid && hasWarnings && (
                <Badge variant="outline" className="rounded-none border-amber-200 text-amber-600 bg-amber-50 text-[8px] font-bold">
                  AVISOS
                </Badge>
              )}
              {isValid && !hasWarnings && (
                <Badge variant="outline" className="rounded-none border-green-200 text-green-600 bg-green-50 text-[8px] font-bold">
                  VALIDADO
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">${Number(draft.price || 0).toFixed(2)}</span>
              <span className="text-neutral-200">|</span>
              <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">{draft.brand || "S/M"}</span>
              <span className="text-neutral-200">|</span>
              <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">{draft.variants.length} VAR.</span>
              <span className="text-neutral-200">|</span>
              <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">{draft.images.length} IMG</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); duplicateDraft(draft) }}
              className="h-9 w-9 flex items-center justify-center text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 border border-transparent hover:border-neutral-200"
              title="Duplicar"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); removeDraft(draft.id) }}
              className="h-9 w-9 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200"
              title="Eliminar"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <button className="h-9 w-9 flex items-center justify-center text-neutral-400">
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Expanded Editor */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-neutral-100 overflow-hidden"
            >
              <div className="p-6 space-y-8">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Nombre del Producto</Label>
                    <Input
                      value={draft.name}
                      onChange={(e) => updateDraft(draft.id, { name: e.target.value })}
                      className="rounded-none border-neutral-200 focus:border-neutral-400 text-xs font-bold uppercase h-12"
                      placeholder="NOMBRE DEL PRODUCTO"
                    />
                    {draft.errors.some(e => e.field === "name") && (
                      <p className="text-[8px] font-bold text-red-500 mt-1">{draft.errors.find(e => e.field === "name")?.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Precio ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={draft.price || ""}
                      onChange={(e) => updateDraft(draft.id, { price: parseFloat(e.target.value) || 0 })}
                      className="rounded-none border-neutral-200 focus:border-neutral-400 text-sm font-black h-12"
                    />
                    {draft.errors.some(e => e.field === "price") && (
                      <p className="text-[8px] font-bold text-red-500 mt-1">{draft.errors.find(e => e.field === "price")?.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Precio Original</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={draft.originalPrice || ""}
                      onChange={(e) => updateDraft(draft.id, { originalPrice: parseFloat(e.target.value) || null })}
                      className="rounded-none border-neutral-200 focus:border-neutral-400 text-sm font-bold h-12 text-neutral-500"
                    />
                  </div>
                </div>

                {/* Brand & Category */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Marca</Label>
                    <Input
                      value={draft.brand}
                      onChange={(e) => updateDraft(draft.id, { brand: e.target.value })}
                      className="rounded-none border-neutral-200 focus:border-neutral-400 text-xs font-bold uppercase h-12"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Categoría</Label>
                    <Select
                      value={draft.categoryId || ""}
                      onValueChange={(v) => updateDraft(draft.id, { categoryId: v || null })}
                    >
                      <SelectTrigger className="rounded-none border-neutral-200 h-12 text-xs font-bold uppercase">
                        <SelectValue placeholder="SIN CATEGORÍA" />
                      </SelectTrigger>
                      <SelectContent className="rounded-none border-neutral-200 bg-white">
                        {parentCategories.map((cat: any) => (
                          <SelectItem key={cat.id || cat._id} value={cat.id || cat._id} className="text-xs font-bold uppercase">
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Subcategoría (opcional)</Label>
                    <Select
                      value={draft.subcategoryId || ""}
                      onValueChange={(v) => updateDraft(draft.id, { subcategoryId: v || null })}
                    >
                      <SelectTrigger className="rounded-none border-neutral-200 h-12 text-xs font-bold uppercase">
                        <SelectValue placeholder="NINGUNA" />
                      </SelectTrigger>
                      <SelectContent className="rounded-none border-neutral-200 bg-white">
                        {categories
                          .filter((c: any) => c.parent && (c.parent?.id || c.parent) === draft.categoryId)
                          .map((cat: any) => (
                            <SelectItem key={cat.id || cat._id} value={cat.id || cat._id} className="text-xs font-bold uppercase">
                              {cat.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Descripción</Label>
                  <Textarea
                    value={draft.description}
                    onChange={(e) => updateDraft(draft.id, { description: e.target.value })}
                    rows={3}
                    className="rounded-none border-neutral-200 focus:border-neutral-400 text-xs font-medium resize-none"
                    placeholder="DESCRIPCIÓN DEL PRODUCTO..."
                  />
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { key: "isNew", label: "INSIGNIA NUEVO", desc: "Tag de novedad" },
                    { key: "isFeatured", label: "DESTACADO", desc: "Sección Hot" },
                    { key: "isActive", label: "ACTIVO", desc: "Visible en tienda" }
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-neutral-50 border border-neutral-100">
                      <div>
                        <p className="text-[9px] font-black uppercase text-neutral-700">{label}</p>
                        <p className="text-[7px] font-bold text-neutral-400 uppercase tracking-wider">{desc}</p>
                      </div>
                      <Switch
                        checked={(draft as any)[key]}
                        onCheckedChange={(checked) => updateDraft(draft.id, { [key]: checked })}
                        className="data-[state=checked]:bg-neutral-900"
                      />
                    </div>
                  ))}
                </div>

                {/* Images Management */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-neutral-500">
                      Imágenes ({draft.images.length})
                    </Label>
                    <button
                      onClick={() => {
                        setImageAssignTarget({ draftId: draft.id })
                        setShowImagePool(true)
                      }}
                      className="h-8 px-3 border border-neutral-200 text-[8px] font-bold uppercase tracking-widest text-neutral-600 hover:border-neutral-900 hover:text-neutral-900 transition-all"
                    >
                      + ASIGNAR DEL POOL
                    </button>
                  </div>
                  <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                    {draft.images.map((img, idx) => (
                      <div key={idx} className={cn(
                        "group relative aspect-square border overflow-hidden bg-neutral-50",
                        img.isMain ? "border-neutral-900 ring-1 ring-neutral-900" : "border-neutral-200"
                      )}>
                        <img src={cleanImageUrl(img.url)} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-neutral-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
                          <button
                            onClick={() => setMainImage(draft.id, idx)}
                            className="bg-white text-neutral-900 text-[7px] font-bold px-2 py-1 w-full text-center"
                          >
                            {img.isMain ? "PRINCIPAL" : "HACER PRINCIPAL"}
                          </button>
                          <button
                            onClick={() => removeImageFromDraft(draft.id, idx)}
                            className="bg-red-500 text-white text-[7px] font-bold px-2 py-1 w-full text-center"
                          >
                            ELIMINAR
                          </button>
                        </div>
                        {img.isMain && (
                          <div className="absolute top-0 left-0 bg-neutral-900 text-white text-[6px] font-bold px-1 py-0.5">
                            PRINCIPAL
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Variants */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-neutral-500">
                      Variantes ({draft.variants.length})
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addVariant(draft.id)}
                      className="rounded-none border-neutral-200 h-9 px-4 text-[9px] font-bold uppercase tracking-widest"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      AÑADIR VARIANTE
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {draft.variants.map((variant, vIdx) => (
                      <div key={vIdx} className="border border-neutral-200 bg-neutral-50/30 p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full border border-neutral-300" style={{ backgroundColor: variant.colorHex || "#000" }} />
                            <span className="text-[10px] font-bold uppercase text-neutral-600">
                              {variant.color || "SIN COLOR"} · {variant.sizes.length} TALLA(S) · {variant.images.length} IMG
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => addSizeRow(draft.id, vIdx)}
                              className="h-8 px-3 text-[8px] font-bold uppercase tracking-widest text-neutral-500"
                            >
                              + TALLA
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeVariant(draft.id, vIdx)}
                              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 p-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Color config */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-[8px] font-bold uppercase tracking-widest text-neutral-400">Color</Label>
                              <Input
                                value={variant.color}
                                onChange={(e) => updateVariant(draft.id, vIdx, { color: e.target.value })}
                                className="rounded-none border-neutral-200 h-9 text-xs font-bold uppercase"
                                placeholder="NOMBRE"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[8px] font-bold uppercase tracking-widest text-neutral-400">Hex</Label>
                              <div className="flex gap-2">
                                <input
                                  type="color"
                                  value={variant.colorHex}
                                  onChange={(e) => updateVariant(draft.id, vIdx, { colorHex: e.target.value })}
                                  className="w-9 h-9 border border-neutral-200 cursor-pointer p-0.5"
                                />
                                <Input
                                  value={variant.colorHex}
                                  onChange={(e) => updateVariant(draft.id, vIdx, { colorHex: e.target.value })}
                                  className="rounded-none border-neutral-200 h-9 text-[9px] font-bold uppercase"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Sizes table */}
                          <div>
                            <Label className="text-[8px] font-bold uppercase tracking-widest text-neutral-400 mb-2 block">Tallas e Inventario</Label>
                            <div className="border border-neutral-200 overflow-hidden">
                              <table className="w-full">
                                <thead className="bg-neutral-100">
                                  <tr>
                                    <th className="px-3 py-2 text-[8px] font-bold uppercase tracking-widest text-neutral-500 text-left">TALLA</th>
                                    <th className="px-3 py-2 text-[8px] font-bold uppercase tracking-widest text-neutral-500 text-left">STOCK</th>
                                    <th className="px-3 py-2 w-8"></th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100">
                                  {variant.sizes.map((size, sIdx) => (
                                    <tr key={sIdx}>
                                      <td className="px-3 py-1.5">
                                        <Input
                                          value={size.size}
                                          onChange={(e) => updateSize(draft.id, vIdx, sIdx, { size: e.target.value })}
                                          className="rounded-none border-neutral-200 h-8 text-[10px] font-bold uppercase"
                                          placeholder="TALLA"
                                        />
                                      </td>
                                      <td className="px-3 py-1.5">
                                        <Input
                                          type="number"
                                          value={size.stock}
                                          onChange={(e) => updateSize(draft.id, vIdx, sIdx, { stock: parseInt(e.target.value) || 0 })}
                                          className="rounded-none border-neutral-200 h-8 text-[10px] font-bold"
                                        />
                                      </td>
                                      <td className="px-3 py-1.5">
                                        <button
                                          onClick={() => removeSizeRow(draft.id, vIdx, sIdx)}
                                          className="h-8 w-8 flex items-center justify-center text-neutral-400 hover:text-red-500"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>

                        {/* Variant images */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-[8px] font-bold uppercase tracking-widest text-neutral-400">
                              Imágenes de Variante ({variant.images.length})
                            </Label>
                            <button
                              onClick={() => {
                                setImageAssignTarget({ draftId: draft.id, variantIdx: vIdx })
                                setShowImagePool(true)
                              }}
                              className="h-7 px-2 border border-neutral-200 text-[7px] font-bold uppercase tracking-widest text-neutral-500 hover:border-neutral-900 hover:text-neutral-900 transition-all"
                            >
                              + DEL POOL
                            </button>
                          </div>
                          {variant.images.length > 0 ? (
                            <div className="flex gap-2 flex-wrap">
                              {variant.images.map((img, imgIdx) => (
                                <div key={imgIdx} className="relative w-14 h-14 border border-neutral-200 overflow-hidden group">
                                  <img src={cleanImageUrl(img.url)} alt="" className="w-full h-full object-cover" />
                                  <button
                                    onClick={() => removeImageFromVariant(draft.id, vIdx, imgIdx)}
                                    className="absolute inset-0 bg-neutral-950/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                  >
                                    <Trash2 className="h-4 w-4 text-white" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[8px] font-bold text-neutral-300 italic uppercase tracking-wider">
                              Sin imágenes asignadas
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Errors & Warnings */}
                {(draft.errors.length > 0 || (draft.warnings && draft.warnings.length > 0)) && (
                  <div className="space-y-1">
                    {draft.errors.map((err, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[9px] font-bold text-red-600 bg-red-50 border border-red-100 px-3 py-2">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        [{err.field}] {err.message}
                      </div>
                    ))}
                    {draft.warnings?.map((warn, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-3 py-2">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        [{warn.field}] {warn.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )
  }

  // Pool de imágenes disponibles (desde Fase 1)
  const availableImages = useMemo(() => {
    if (allImages && allImages.length > 0) {
      return allImages.map(img => ({
        url: img.url,
        name: img.originalName,
        size: img.size,
        width: img.width,
        height: img.height
      }))
    }
    if (assets && Object.keys(assets).length > 0) {
      return Object.entries(assets).map(([key, asset]: [string, any]) => ({
        url: asset.url,
        name: asset.originalName || key,
        size: asset.size || 0,
        width: asset.width,
        height: asset.height
      }))
    }
    return []
  }, [allImages, assets])

  const [showImagePool, setShowImagePool] = useState(false)
  const [imagePoolSearch, setImagePoolSearch] = useState("")
  const [imageAssignTarget, setImageAssignTarget] = useState<{ draftId: string; variantIdx?: number } | null>(null)

  const filteredImagePool = useMemo(() => {
    if (!imagePoolSearch) return availableImages
    return availableImages.filter(img =>
      img.name.toLowerCase().includes(imagePoolSearch.toLowerCase())
    )
  }, [availableImages, imagePoolSearch])

  const handleAssignFromPool = (imgUrl: string, imgName?: string) => {
    if (imageAssignTarget) {
      if (imageAssignTarget.variantIdx !== undefined) {
        assignImageToVariant(imageAssignTarget.draftId, imageAssignTarget.variantIdx, imgUrl)
      } else {
        assignImageToDraft(imageAssignTarget.draftId, imgUrl, imgName)
      }
      setImageAssignTarget(null)
    } else if (selectedDrafts.size > 0) {
      assignImageToAllSelected(imgUrl, imgName)
    } else {
      toast.info("Selecciona un producto expandido o usa edición masiva")
    }
  }

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Productos", value: stats.total, icon: Package, color: "text-neutral-900" },
          { label: "Válidos", value: stats.valid, icon: Check, color: "text-green-600" },
          { label: "Con Errores", value: stats.invalid, icon: AlertCircle, color: "text-red-600" },
          { label: "Variantes", value: stats.totalVariants, icon: Palette, color: "text-blue-600" }
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-neutral-200 p-4 flex items-center gap-3 shadow-sm">
            <stat.icon className={cn("h-5 w-5 shrink-0", stat.color)} />
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">{stat.label}</p>
              <p className={cn("text-xl font-black tracking-tight", stat.color)}>{String(stat.value).padStart(2, '0')}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white border border-neutral-200 p-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="BUSCAR PRODUCTO..."
              className="pl-9 h-10 w-56 rounded-none border-neutral-200 text-[9px] font-bold uppercase tracking-widest"
            />
          </div>
          <div className="flex items-center gap-2 border-l border-neutral-200 pl-3">
            <span className="text-[9px] font-bold text-neutral-400">{filteredDrafts.length} de {drafts.length}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Botón Pool de Imágenes */}
          {availableImages.length > 0 && (
            <button
              onClick={() => setShowImagePool(!showImagePool)}
              className={cn(
                "h-10 px-4 text-[9px] font-bold uppercase tracking-widest border transition-all",
                showImagePool ? "bg-neutral-900 text-white border-neutral-900" : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
              )}
            >
              <ImageIcon className="h-3.5 w-3.5 inline mr-1" />
              POOL ({availableImages.length})
            </button>
          )}
          <button
            onClick={() => { setBulkEditMode(!bulkEditMode); setSelectedDrafts(new Set()) }}
            className={cn(
              "h-10 px-4 text-[9px] font-bold uppercase tracking-widest border transition-all",
              bulkEditMode ? "bg-neutral-900 text-white border-neutral-900" : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
            )}
          >
            <Edit3 className="h-3.5 w-3.5 inline mr-1" />
            EDICIÓN MASIVA
          </button>
        </div>
      </div>

      {/* Bulk Edit Panel */}
      <AnimatePresence>
        {bulkEditMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-neutral-900 text-white p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-black uppercase tracking-tight">EDITOR MASIVO</p>
                <p className="text-[9px] text-white/50 uppercase tracking-widest">
                  {selectedDrafts.size} producto(s) seleccionados
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setBulkEditMode(false); setSelectedDrafts(new Set()) }}
                className="text-white/50 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {/* Select all toggle */}
              <button
                onClick={() => {
                  if (selectedDrafts.size === filteredDrafts.length) setSelectedDrafts(new Set())
                  else setSelectedDrafts(new Set(filteredDrafts.map(d => d.id)))
                }}
                className="bg-white/10 border border-white/20 p-3 text-center hover:bg-white/20 transition-all"
              >
                <p className="text-[8px] font-black uppercase tracking-widest text-white/50">
                  {selectedDrafts.size === filteredDrafts.length ? "DESELECC." : `SELECC. TODO`}
                </p>
              </button>
              {[
                { label: "MARCA", action: () => {
                  const val = prompt("Marca para los productos seleccionados:")
                  if (val) applyBulkToSelected("brand", val.toUpperCase())
                }},
                { label: "CATEGORÍA", action: () => {
                  const val = prompt("ID de categoría:")
                  if (val) applyBulkToSelected("categoryId", val)
                }},
                { label: "PRECIO", action: () => {
                  const val = prompt("Precio para todos:")
                  if (val) applyBulkToSelected("price", parseFloat(val) || 0)
                }},
                { label: "ACTIVAR", action: () => applyBulkToSelected("isActive", true) },
              ].map((btn, i) => (
                <button
                  key={i}
                  onClick={btn.action}
                  disabled={selectedDrafts.size === 0}
                  className="bg-white/10 border border-white/20 p-3 text-center hover:bg-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <p className="text-[8px] font-black uppercase tracking-widest">{btn.label}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Draft List */}
      <div className="space-y-3">
        {filteredDrafts.map(draft => (
          <div key={draft.id} className="relative">
            {bulkEditMode && (
              <div className="absolute -left-10 top-1/2 -translate-y-1/2 z-10">
                <input
                  type="checkbox"
                  checked={selectedDrafts.has(draft.id)}
                  onChange={() => toggleSelect(draft.id)}
                  className="w-4 h-4 accent-neutral-900 cursor-pointer"
                />
              </div>
            )}
            {renderDraftCard(draft)}
          </div>
        ))}
      </div>

      {/* Empty state */}
      {filteredDrafts.length === 0 && (
        <div className="border border-dashed border-neutral-200 p-16 text-center">
          <Package className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
          <p className="text-lg font-bold uppercase text-neutral-400">No hay productos generados</p>
          <p className="text-[10px] font-bold text-neutral-400 mt-1">Sube imágenes en la fase anterior para generar drafts automáticos</p>
        </div>
      )}

      {/* Image Pool Overlay */}
      <AnimatePresence>
        {showImagePool && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white border-2 border-neutral-900 shadow-2xl overflow-hidden"
          >
            <div className="bg-neutral-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ImageIcon className="h-5 w-5 text-kaosNeon" />
                <div>
                  <p className="text-sm font-black uppercase tracking-tight">POOL DE IMÁGENES</p>
                  <p className="text-[9px] text-white/50 uppercase tracking-widest">
                    {availableImages.length} activo(s) disponible(s)
                    {imageAssignTarget && (
                      <> · Asignando a: <span className="text-kaosNeon">{
                        drafts.find(d => d.id === imageAssignTarget.draftId)?.name || "producto"
                      }{imageAssignTarget.variantIdx !== undefined ? ` (variante ${imageAssignTarget.variantIdx + 1})` : ""}</span></>
                    )}
                    {!imageAssignTarget && selectedDrafts.size > 0 && (
                      <> · Asignando a <span className="text-kaosNeon">{selectedDrafts.size} producto(s) seleccionados</span></>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-white/40" />
                  <input
                    value={imagePoolSearch}
                    onChange={(e) => setImagePoolSearch(e.target.value)}
                    placeholder="FILTRAR..."
                    className="bg-white/10 border border-white/20 text-white text-[9px] font-bold uppercase tracking-widest pl-8 pr-3 h-8 w-40 placeholder:text-white/30 focus:outline-none focus:border-kaosNeon"
                  />
                </div>
                <button
                  onClick={() => { setShowImagePool(false); setImageAssignTarget(null) }}
                  className="h-8 w-8 flex items-center justify-center text-white/50 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-4 max-h-[400px] overflow-y-auto">
              {filteredImagePool.length === 0 ? (
                <div className="text-center py-8">
                  <ImageIcon className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                    {imagePoolSearch ? "Sin resultados" : "No hay imágenes disponibles. Sube imágenes en la Fase 1."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                  {filteredImagePool.map((img, idx) => {
                    const isAlreadyAssigned = imageAssignTarget
                      ? drafts.find(d => d.id === imageAssignTarget!.draftId)?.images.some(i => i.url === img.url)
                      : false
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                          "group relative aspect-square border overflow-hidden bg-neutral-50 cursor-pointer transition-all",
                          isAlreadyAssigned
                            ? "border-green-400 opacity-60"
                            : "border-neutral-200 hover:border-neutral-900 hover:shadow-lg"
                        )}
                        onClick={() => {
                          if (isAlreadyAssigned) {
                            toast.info("Esta imagen ya está asignada a este producto")
                            return
                          }
                          handleAssignFromPool(img.url, img.name)
                        }}
                      >
                        <img src={cleanImageUrl(img.url)} alt={img.name} className="w-full h-full object-cover" loading="lazy" />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1.5 pt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-[6px] font-bold text-white truncate leading-tight">{img.name}</p>
                          {img.width && img.height && (
                            <p className="text-[5px] text-white/60">{img.width}×{img.height}</p>
                          )}
                        </div>
                        {isAlreadyAssigned && (
                          <div className="absolute top-1 right-1 bg-green-500 text-white text-[6px] font-bold px-1 py-0.5 rounded-sm">
                            ASIGNADA
                          </div>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-neutral-200 p-3 flex items-center justify-between bg-neutral-50">
              <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">
                Haz clic en una imagen para asignarla
                {imageAssignTarget ? " al producto seleccionado" : selectedDrafts.size > 0 ? " a los productos seleccionados" : " (expande un producto o usa edición masiva)"}
              </p>
              <button
                onClick={() => { setShowImagePool(false); setImageAssignTarget(null) }}
                className="text-[8px] font-bold uppercase tracking-widest text-neutral-600 border border-neutral-200 px-3 py-1.5 hover:border-neutral-400 transition-all"
              >
                CERRAR
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between border-t border-neutral-200 pt-8">
        <Button
          variant="outline"
          onClick={onBack}
          className="rounded-none border-neutral-200 h-14 px-10 text-[10px] font-bold uppercase tracking-widest"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          VOLVER A IMÁGENES
        </Button>
        <Button
          onClick={onComplete}
          className="rounded-none bg-neutral-900 text-white h-14 px-12 text-[10px] font-black uppercase tracking-widest hover:bg-neutral-800 transition-all"
        >
          VALIDAR Y REVISAR
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
