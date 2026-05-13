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
import { api } from "@/lib/api"
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
      let result
      if (editingCategory._id) {
        result = await api.updateCategory(editingCategory._id, editingCategory)
      } else {
        result = await api.createCategory(editingCategory)
      }

      if (result.success) {
        loadCategories()
        setEditingCategory(null)
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
            className="absolute left-0 top-0 bottom-0 border-l border-black" 
            style={{ left: (depth * 24) - 12 }}
          />
        )}
        <div 
          className="flex items-center justify-between p-4 border border-black mb-2 bg-white transition-all hover:bg-gray-50 group relative"
          style={{ marginLeft: depth * 24 }}
        >
          {/* Depth line */}
          {depth > 0 && (
            <div 
              className="absolute w-3 border-t border-black left-0 top-1/2 -translate-x-full"
              style={{ left: 0 }}
            />
          )}

          <div className="flex items-center gap-4">
            {hasChildren ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-none border border-black hover:bg-black hover:text-white transition-all"
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
                <div className="w-1.5 h-1.5 bg-black" />
              </div>
            )}
            
            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                <span className="text-sm font-black uppercase tracking-tight">
                  {category.name}
                </span>
                {!category.isActive && (
                  <span className="text-[9px] font-black uppercase tracking-widest border border-red-500 text-red-500 px-1">INACTIVA</span>
                )}
                {category.isFeatured && (
                  <span className="text-[9px] font-black uppercase tracking-widest border border-kaosNeon bg-kaosNeon text-black px-1">DESTACADA</span>
                )}
              </div>
              {category.productCount !== undefined && category.productCount > 0 && (
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                  {category.productCount} SKUs REGISTRADOS
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-none h-8 w-8 hover:bg-black hover:text-white"
              onClick={() => {
                setEditingCategory({
                  name: "",
                  parent: category._id,
                  isActive: true,
                  order: (category.subcategories?.length || 0)
                })
                setShowForm(true)
              }}
              title="Agregar subcategoría"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-none h-8 w-8 hover:bg-black hover:text-white"
              onClick={() => {
                setEditingCategory({
                  ...category,
                  parent: category.parent?._id || undefined
                })
                setShowForm(true)
              }}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-none h-8 w-8 hover:bg-red-600 hover:text-white"
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
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Escaneando Estructura de Directorios...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8 bg-[#fafafa] min-h-screen">
      {/* Industrial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-black pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-black animate-pulse"></div>
            <span className="industrial-stat-label text-black">Arquitectura de Catálogo</span>
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">
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
            setShowForm(true)
          }}
          className="rounded-none bg-black text-white hover:bg-gray-800 h-14 px-10 font-black uppercase text-xs tracking-widest transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Rama
        </Button>
      </div>

      {/* Industrial Tools Bar */}
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-black transition-colors" />
          <Input
            placeholder="FILTRAR POR NOMBRE O RUTA CRÍTICA..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-14 rounded-none border-black focus:ring-0 uppercase text-xs font-bold tracking-widest bg-white"
          />
        </div>
        <div className="flex border border-black p-1 bg-white w-full md:w-auto h-14">
          <button
            onClick={() => setViewMode("list")}
            className={`flex-1 md:flex-none px-8 font-black uppercase text-[10px] tracking-widest transition-all ${
              viewMode === "list" ? "bg-black text-white" : "text-black hover:bg-gray-100"
            }`}
          >
            MODO MANIFIESTO
          </button>
          <button
            onClick={() => setViewMode("tree")}
            className={`flex-1 md:flex-none px-8 font-black uppercase text-[10px] tracking-widest transition-all ${
              viewMode === "tree" ? "bg-black text-white" : "text-black hover:bg-gray-100"
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
              className="industrial-card flex items-center justify-between p-6 bg-white hover:border-black group relative transition-all"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-black transition-all group-hover:w-2" />
              
              <div className="flex items-center gap-6">
                {category.image ? (
                  <div className="w-16 h-16 border border-black p-1 grayscale hover:grayscale-0 transition-all">
                    <img
                      src={category.image}
                      alt={category.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 border border-black bg-gray-50 flex items-center justify-center">
                    <Folder className="h-6 w-6 text-gray-400" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-black uppercase tracking-tighter">{category.name}</span>
                    {!category.isActive && (
                      <span className="text-[9px] font-black uppercase tracking-widest border border-red-500 text-red-500 px-1">INACTIVA</span>
                    )}
                    {category.isFeatured && (
                      <span className="text-[9px] font-black uppercase tracking-widest border border-kaosNeon bg-kaosNeon text-black px-1">DESTACADA</span>
                    )}
                  </div>
                  {category.fullPath && category.fullPath !== category.name && (
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                      RUTA: {category.fullPath?.toUpperCase() || 'RAÍZ'}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-8">
                {category.productCount !== undefined && (
                  <div className="text-right hidden md:block">
                    <p className="industrial-stat-label">Stock de Ítems</p>
                    <p className="text-xl font-black">{category.productCount}</p>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-none h-10 w-10 border border-black hover:bg-black hover:text-white transition-all"
                    onClick={() => {
                      setEditingCategory({
                        ...category,
                        parent: category.parent?._id || undefined
                      })
                      setShowForm(true)
                    }}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-none h-10 w-10 border border-black hover:bg-red-600 hover:text-white transition-all"
                    onClick={() => deleteCategory(category._id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {filteredCategories.length === 0 && (
            <div className="border-2 border-dashed border-gray-200 p-24 text-center">
              <Folder className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-xl font-black uppercase tracking-tighter text-gray-400">Sin Datos de Estructura</p>
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
            <div className="border-2 border-dashed border-gray-200 p-24 text-center">
              <Folder className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-xl font-black uppercase tracking-tighter text-gray-400">Mapa de Árbol Vacío</p>
            </div>
          )}
        </div>
      )}

      {/* Modal de edición Industrial */}
      {showForm && editingCategory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="w-full max-w-xl bg-white dark:bg-slate-950 border border-black dark:border-white/20 shadow-[20px_20px_0_rgba(0,0,0,1)] dark:shadow-[20px_20px_0_rgba(255,255,255,0.05)] overflow-hidden">
            <div className="p-8 bg-black text-white">
              <div className="flex items-center gap-3 mb-2">
                 <div className="w-2 h-2 bg-kaosNeon animate-pulse"></div>
                 <span className="text-[10px] font-black uppercase tracking-widest text-white/40">ESTRUCTURA DE DATOS • KAOZ</span>
              </div>
              <div className="flex justify-between items-center">
                <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">
                  {editingCategory._id ? "MODIFICAR RAMA" : "NUEVA RAMA"}
                </h2>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setShowForm(false)
                    setEditingCategory(null)
                  }}
                  className="h-12 w-12 rounded-none hover:bg-kaosNeon hover:text-black transition-all"
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">Nomenclatura Obligatoria</label>
                <Input
                  value={editingCategory.name || ""}
                  onChange={(e) => setEditingCategory({
                    ...editingCategory,
                    name: e.target.value
                  })}
                  placeholder="NOMBRE DE LA CATEGORÍA..."
                  className="h-14 rounded-none border-black dark:border-white/10 focus:border-black dark:focus:border-kaosNeon focus:ring-0 uppercase font-bold text-xs tracking-widest bg-transparent text-black dark:text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">Descripción del Segmento</label>
                <Textarea
                  value={editingCategory.description || ""}
                  onChange={(e) => setEditingCategory({
                    ...editingCategory,
                    description: e.target.value
                  })}
                  placeholder="DETALLES TÉCNICOS O DESCRIPCIÓN..."
                  className="rounded-none border-black dark:border-white/10 focus:border-black dark:focus:border-kaosNeon focus:ring-0 uppercase font-bold text-xs tracking-widest min-h-[100px] bg-transparent text-black dark:text-white"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Dependencia Jerárquica</label>
                  <Select
                    value={editingCategory.parent?.toString() || "none"}
                    onValueChange={(value) => setEditingCategory({
                      ...editingCategory,
                      parent: value === "none" ? undefined : value
                    })}
                  >
                    <SelectTrigger className="h-14 rounded-none border-black focus:ring-0 uppercase font-bold text-[10px] tracking-widest">
                      <SelectValue placeholder="RAÍZ (SIN PADRE)" />
                    </SelectTrigger>
                    <SelectContent className="rounded-none border-black">
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
                  <label className="text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">Recurso Multimedia (URL)</label>
                  <div className="flex gap-4">
                    <Input
                      value={editingCategory.image || ""}
                      onChange={(e) => setEditingCategory({
                        ...editingCategory,
                        image: e.target.value
                      })}
                      placeholder="https://..."
                      className="h-14 rounded-none border-black dark:border-white/10 focus:border-kaosNeon focus:ring-0 text-[10px] font-bold bg-transparent"
                    />
                    {editingCategory.image && (
                      <div className="h-14 w-14 border border-black overflow-hidden flex-shrink-0 grayscale hover:grayscale-0 transition-all">
                        <img src={editingCategory.image} className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 border border-black bg-gray-50">
                  <Switch
                    checked={editingCategory.isActive !== false}
                    onCheckedChange={(checked) => setEditingCategory({
                      ...editingCategory,
                      isActive: checked
                    })}
                    className="data-[state=checked]:bg-black"
                  />
                  <label className="text-[10px] font-black uppercase tracking-widest">ACTIVO</label>
                </div>
                <div className="flex items-center gap-3 p-4 border border-black bg-kaosNeon/10">
                  <Switch
                    checked={editingCategory.isFeatured === true}
                    onCheckedChange={(checked) => setEditingCategory({
                      ...editingCategory,
                      isFeatured: checked
                    })}
                    className="data-[state=checked]:bg-kaosNeon"
                  />
                  <label className="text-[10px] font-black uppercase tracking-widest">DESTACADA EN HOME</label>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowForm(false)
                    setEditingCategory(null)
                  }}
                  className="flex-1 h-14 rounded-none border-black font-black uppercase text-xs tracking-widest hover:bg-gray-100 transition-all"
                >
                  ABORTAR
                </Button>
                <Button 
                  onClick={saveCategory} 
                  disabled={saving}
                  className="flex-1 h-14 rounded-none bg-black text-white font-black uppercase text-xs tracking-widest hover:bg-gray-800 transition-all"
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