"use client"

import { useState, useEffect, useMemo } from "react"
import { 
  Plus, Trash2, Edit2, X, GripVertical, ChevronRight, ChevronDown,
  FolderOpen, Folder, Image as ImageIcon, Save, AlertCircle, Search, Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { api, cleanImageUrl } from "@/lib/api"
import { useRef } from "react"
import { useToast } from "@/hooks/use-toast"

interface Category {
  _id: string
  name: string
  slug: string
  description?: string
  image?: string
  parent?: {
    _id: string
    name: string
    slug: string
  } | null
  level: number
  order: number
  isActive: boolean
  isFeatured: boolean
  productCount?: number
  fullPath?: string
  subcategories?: Category[]
}

export default function AdminCategoriesPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [treeCategories, setTreeCategories] = useState<Category[]>([])
  const [viewMode, setViewMode] = useState<"list" | "tree">("list")
  const [searchTerm, setSearchTerm] = useState("")
  
  // Estados para edición
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Estados para expansión del árbol
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  
  // Referencia para input de imagen
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      // Cargar lista plana
      const listResult = await api.getAdminCategories(false)
      if (listResult.success) {
        setCategories(listResult.categories)
      }
      
      // Cargar árbol
      const treeResult = await api.getAdminCategories(true)
      if (treeResult.success) {
        setTreeCategories(treeResult.categories)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al cargar categorías",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredCategories = useMemo(() => {
    if (!searchTerm) return categories
    return categories.filter(cat => 
      (cat.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      cat.fullPath?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [categories, searchTerm])

  const parentCategories = useMemo(() => {
    return categories.filter(cat => !cat.parent || cat.level === 0)
  }, [categories])

  const saveCategory = async () => {
    if (!editingCategory?.name) {
      toast({
        title: "Error",
        description: "El nombre es requerido",
        variant: "destructive"
      })
      return
    }

    setSaving(true)
    try {
      const payload = new FormData()
      payload.append("data", JSON.stringify({
        ...editingCategory,
        parent: editingCategory.parent?._id || editingCategory.parent
      }))
      
      if (selectedImage) {
        payload.append("images", selectedImage)
      }

      let result
      if (editingCategory._id) {
        result = await api.updateCategory(editingCategory._id, payload)
      } else {
        result = await api.createCategory(payload)
      }

      if (result.success) {
        loadCategories()
        setEditingCategory(null)
        setSelectedImage(null)
        setPreviewImage(null)
        setShowForm(false)
        toast({
          title: "Guardado",
          description: "Categoría guardada correctamente"
        })
      } else {
        toast({
          title: "Error",
          description: result.message || "Error al guardar",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al guardar categoría",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const deleteCategory = async (id: string, force = false) => {
    const category = categories.find(c => c._id === id)
    const hasProducts = category?.productCount && category.productCount > 0
    const hasSubcategories = categories.some(c => c.parent?._id === id)

    if ((hasProducts || hasSubcategories) && !force) {
      const confirmMsg = hasProducts 
        ? `Esta categoría tiene ${category?.productCount} productos. ¿Estás seguro de eliminarla?`
        : `Esta categoría tiene subcategorías. ¿Estás seguro de eliminarla junto con sus subcategorías?`
      
      if (!confirm(confirmMsg)) return
    } else if (!force) {
      if (!confirm("¿Estás seguro de eliminar esta categoría?")) return
    }

    try {
      const result = await api.deleteCategory(id, force || hasProducts || hasSubcategories)
      if (result.success) {
        loadCategories()
        toast({
          title: "Eliminado",
          description: "Categoría eliminada correctamente"
        })
      } else {
        toast({
          title: "Error",
          description: result.message || "Error al eliminar",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al eliminar categoría",
        variant: "destructive"
      })
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const renderTreeItem = (category: Category, depth: number = 0) => {
    const hasChildren = category.subcategories && category.subcategories.length > 0
    const isExpanded = expandedIds.has(category._id)

    return (
      <div key={category._id} className="relative">
        {depth > 0 && (
          <div 
            className="absolute left-0 top-0 bottom-0 border-l border-neutral-200" 
            style={{ left: (depth * 24) - 12 }}
          />
        )}
        <div 
          className="flex items-center justify-between p-4 border border-neutral-200 mb-2 bg-white transition-all hover:bg-neutral-50/50 group relative shadow-sm"
          style={{ marginLeft: depth * 24 }}
        >
          {/* Depth line */}
          {depth > 0 && (
            <div 
              className="absolute w-3 border-t border-neutral-200 left-0 top-1/2 -translate-x-full"
              style={{ left: 0 }}
            />
          )}

          <div className="flex items-center gap-4">
            {hasChildren ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-none border border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50 transition-all text-neutral-600"
                onClick={() => toggleExpand(category._id)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            ) : (
              <div className="w-8 h-8 flex items-center justify-center opacity-20">
                <div className="w-1.5 h-1.5 bg-neutral-300" />
              </div>
            )}
            
            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-tight text-neutral-800">
                  {category.name}
                </span>
                {!category.isActive && (
                  <span className="text-[8px] font-bold uppercase tracking-widest border border-red-200 text-red-600 bg-red-50 px-1.5 py-0.5">INACTIVA</span>
                )}
                {category.isFeatured && (
                  <span className="text-[8px] font-bold uppercase tracking-widest bg-neutral-900 text-white px-1.5 py-0.5">DESTACADA</span>
                )}
              </div>
              {category.productCount !== undefined && category.productCount > 0 && (
                <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest mt-1">
                  {category.productCount} SKUs REGISTRADOS
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-none h-8 w-8 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-750 border border-neutral-100"
              onClick={() => {
                setEditingCategory({
                  name: "",
                  parent: category._id,
                  isActive: true,
                  order: (category.subcategories?.length || 0)
                })
                setSelectedImage(null)
                setPreviewImage(null)
                setShowForm(true)
              }}
              title="Agregar subcategoría"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-none h-8 w-8 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-750 border border-neutral-100"
              onClick={() => {
                setEditingCategory({
                  ...category,
                  parent: category.parent?._id || undefined
                })
                setSelectedImage(null)
                setPreviewImage(null)
                setShowForm(true)
              }}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-none h-8 w-8 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border border-transparent"
              onClick={() => deleteCategory(category._id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div className="space-y-1">
            {category.subcategories!.map(sub => renderTreeItem(sub, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-16 h-1 bg-neutral-100 overflow-hidden mx-auto">
            <div className="w-full h-full bg-neutral-900 animate-progress-fast"></div>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-450">Escaneando Estructura de Directorios...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8 bg-transparent min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-neutral-200 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-neutral-400 animate-pulse"></div>
            <span className="text-[10px] font-bold text-neutral-450 uppercase tracking-widest">Arquitectura de Catálogo</span>
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tighter leading-none text-neutral-900">
            Categorías
          </h1>
        </div>
        <Button 
          onClick={() => {
            setEditingCategory({
              name: "",
              description: "",
              parent: undefined,
              isActive: true,
              isFeatured: false,
              order: categories.length
            })
            setSelectedImage(null)
            setPreviewImage(null)
            setShowForm(true)
          }}
          className="rounded-none bg-neutral-900 text-white hover:bg-neutral-800 h-14 px-8 font-bold uppercase text-[10px] tracking-widest transition-all"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Rama
        </Button>
      </div>

      {/* Industrial Tools Bar */}
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-350 group-focus-within:text-neutral-500 transition-colors" />
          <Input
            placeholder="FILTRAR POR NOMBRE O RUTA CRÍTICA..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-14 rounded-none border-neutral-200 focus:border-neutral-400 focus:ring-0 uppercase text-[10px] font-bold tracking-widest bg-neutral-50"
          />
        </div>
        <div className="flex border border-neutral-200 p-1 bg-white w-full md:w-auto h-14">
          <button
            onClick={() => setViewMode("list")}
            className={`flex-1 md:flex-none px-8 font-bold uppercase text-[10px] tracking-widest transition-all ${
              viewMode === "list" ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            MODO MANIFIESTO
          </button>
          <button
            onClick={() => setViewMode("tree")}
            className={`flex-1 md:flex-none px-8 font-bold uppercase text-[10px] tracking-widest transition-all ${
              viewMode === "tree" ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            MODO JERÁRQUICO
          </button>
        </div>
      </div>

      {viewMode === "list" ? (
        <div className="space-y-4">
          {filteredCategories.map((category) => (
            <div
              key={category._id}
              className="flex items-center justify-between p-6 bg-white border border-neutral-200 shadow-sm hover:border-neutral-400 group relative transition-all"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-neutral-900 transition-all group-hover:w-1.5" />
              
              <div className="flex items-center gap-6">
                {category.image ? (
                  <div className="w-16 h-16 border border-neutral-200 p-1 transition-all">
                    <img
                      src={cleanImageUrl(category.image)}
                      alt={category.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 border border-neutral-200 bg-neutral-50 flex items-center justify-center">
                    <Folder className="h-6 w-6 text-neutral-450" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold uppercase tracking-tight text-neutral-800">{category.name}</span>
                    {!category.isActive && (
                      <span className="text-[8px] font-bold uppercase tracking-widest border border-red-200 text-red-600 bg-red-50 px-1.5 py-0.5">INACTIVA</span>
                    )}
                    {category.isFeatured && (
                      <span className="text-[8px] font-bold uppercase tracking-widest bg-neutral-900 text-white px-1.5 py-0.5">DESTACADA</span>
                    )}
                  </div>
                  {category.fullPath && category.fullPath !== category.name && (
                    <div className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mt-1">
                      RUTA: {category.fullPath?.toUpperCase() || 'RAÍZ'}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-8">
                {category.productCount !== undefined && (
                  <div className="text-right hidden md:block">
                    <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">Stock de Ítems</p>
                    <p className="text-lg font-black text-neutral-800">{category.productCount}</p>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-none h-10 w-10 border border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50 transition-all text-neutral-600"
                    onClick={() => {
                      setEditingCategory({
                        ...category,
                        parent: category.parent?._id || undefined
                      })
                      setSelectedImage(null)
                      setPreviewImage(null)
                      setShowForm(true)
                    }}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-none h-10 w-10 bg-red-50 text-red-655 hover:bg-red-100 border border-transparent hover:border-red-100 transition-all"
                    onClick={() => deleteCategory(category._id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {filteredCategories.length === 0 && (
            <div className="border border-dashed border-neutral-200 p-24 text-center">
              <Folder className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
              <p className="text-lg font-bold uppercase tracking-tight text-neutral-400">Sin Datos de Estructura</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2 max-w-4xl mx-auto">
          {treeCategories.length > 0 ? (
            <div className="space-y-4">
              {treeCategories.map(category => renderTreeItem(category))}
            </div>
          ) : (
            <div className="border border-dashed border-neutral-200 p-24 text-center">
              <Folder className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
              <p className="text-lg font-bold uppercase tracking-tight text-neutral-400">Mapa de Árbol Vacío</p>
            </div>
          )}
        </div>
      )}

      {/* Modal de edición Industrial */}
      {showForm && editingCategory && (
        <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="w-full max-w-xl bg-white border border-neutral-200 shadow-2xl overflow-hidden">
            <div className="p-8 bg-neutral-900 text-white">
              <div className="flex items-center gap-3 mb-2">
                 <div className="w-2 h-2 bg-white animate-pulse"></div>
                 <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">ESTRUCTURA DE DATOS • KAOS</span>
              </div>
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">
                  {editingCategory._id ? "MODIFICAR RAMA" : "NUEVA RAMA"}
                </h2>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setShowForm(false)
                    setEditingCategory(null)
                  }}
                  className="h-12 w-12 rounded-none hover:bg-neutral-800 hover:text-white transition-all"
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Nomenclatura Obligatoria</label>
                <Input
                  value={editingCategory.name || ""}
                  onChange={(e) => setEditingCategory({
                    ...editingCategory,
                    name: e.target.value
                  })}
                  placeholder="NOMBRE DE LA CATEGORÍA..."
                  className="h-14 rounded-none border-neutral-200 focus:border-neutral-450 focus:ring-0 uppercase font-bold text-xs tracking-widest bg-transparent text-neutral-800"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Descripción del Segmento</label>
                <Textarea
                  value={editingCategory.description || ""}
                  onChange={(e) => setEditingCategory({
                    ...editingCategory,
                    description: e.target.value
                  })}
                  placeholder="DETALLES TÉCNICOS O DESCRIPCIÓN..."
                  className="rounded-none border-neutral-200 focus:border-neutral-450 focus:ring-0 uppercase font-bold text-xs tracking-widest min-h-[100px] bg-transparent text-neutral-850"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Dependencia Jerárquica</label>
                  <Select
                    value={editingCategory.parent?.toString() || "none"}
                    onValueChange={(value) => setEditingCategory({
                      ...editingCategory,
                      parent: value === "none" ? undefined : value
                    })}
                  >
                    <SelectTrigger className="h-14 rounded-none border-neutral-200 focus:ring-0 uppercase font-bold text-[10px] tracking-widest bg-transparent text-neutral-800">
                      <SelectValue placeholder="RAÍZ (SIN PADRE)" />
                    </SelectTrigger>
                    <SelectContent className="rounded-none border-neutral-200 bg-white">
                      <SelectItem value="none" className="text-[10px] font-bold uppercase">RAÍZ (SIN PADRE)</SelectItem>
                      {parentCategories
                        .filter(cat => cat._id !== editingCategory._id)
                        .map(cat => (
                          <SelectItem key={cat._id} value={cat._id} className="text-[10px] font-bold uppercase">
                            {cat.name?.toUpperCase() || 'S/N'}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Recurso Multimedia</label>
                  <div className="flex gap-4">
                    <div 
                      onClick={() => imageInputRef.current?.click()}
                      className="flex-1 h-14 border border-neutral-200 flex items-center justify-center cursor-pointer hover:bg-neutral-50 transition-all group"
                    >
                      {previewImage || editingCategory.image ? (
                        <div className="flex items-center gap-3 px-4 w-full">
                           <div className="h-10 w-10 border border-neutral-200 overflow-hidden flex-shrink-0">
                             <img src={previewImage || cleanImageUrl(editingCategory.image!)} className="w-full h-full object-cover" />
                           </div>
                           <span className="text-[9px] font-black uppercase tracking-widest truncate text-neutral-700">Cambiar Imagen</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Plus className="h-4 w-4 text-neutral-450 group-hover:text-neutral-600" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-neutral-450 group-hover:text-neutral-600">Subir Imagen</span>
                        </div>
                      )}
                    </div>
                    <input 
                      type="file" 
                      ref={imageInputRef} 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setSelectedImage(file)
                          setPreviewImage(URL.createObjectURL(file))
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 border border-neutral-100 bg-neutral-50">
                  <Switch
                    checked={editingCategory.isActive !== false}
                    onCheckedChange={(checked) => setEditingCategory({
                      ...editingCategory,
                      isActive: checked
                    })}
                    className="data-[state=checked]:bg-neutral-900"
                  />
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-700">ACTIVO</label>
                </div>
                <div className="flex items-center gap-3 p-4 border border-neutral-100 bg-neutral-50">
                  <Switch
                    checked={editingCategory.isFeatured === true}
                    onCheckedChange={(checked) => setEditingCategory({
                      ...editingCategory,
                      isFeatured: checked
                    })}
                    className="data-[state=checked]:bg-neutral-900"
                  />
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-700">DESTACADA EN HOME</label>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowForm(false)
                      setEditingCategory(null)
                    }}
                    className="flex-1 h-14 rounded-none border-neutral-200 font-bold uppercase text-[10px] tracking-widest hover:bg-neutral-100 transition-all text-neutral-650 bg-transparent"
                  >
                    ABORTAR
                  </Button>
                <Button 
                  onClick={saveCategory} 
                  disabled={saving}
                  className="flex-1 h-14 rounded-none bg-neutral-900 text-white font-bold uppercase text-[10px] tracking-widest hover:bg-neutral-800 transition-all"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "PROCESANDO..." : "GUARDAR RAMA"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}