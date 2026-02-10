"use client"

import { useState, useEffect, useMemo } from "react"
import { 
  Plus, Trash2, Edit2, X, GripVertical, ChevronRight, ChevronDown,
  FolderOpen, Folder, Image as ImageIcon, Save, AlertCircle, Search
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
      cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
      <div key={category._id}>
        <div 
          className={`
            flex items-center justify-between p-3 border-b hover:bg-muted/50
            ${depth > 0 ? `ml-${depth * 6}` : ""}
          `}
          style={{ marginLeft: depth * 24 }}
        >
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => toggleExpand(category._id)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            ) : (
              <div className="w-6" />
            )}
            
            {hasChildren ? (
              <FolderOpen className="h-4 w-4 text-amber-500" />
            ) : (
              <Folder className="h-4 w-4 text-gray-400" />
            )}
            
            <span className={`font-medium ${!category.isActive ? "text-muted-foreground" : ""}`}>
              {category.name}
            </span>
            
            {!category.isActive && (
              <Badge variant="secondary" className="text-xs">Inactivo</Badge>
            )}
            
            {category.productCount !== undefined && category.productCount > 0 && (
              <Badge variant="outline" className="text-xs">
                {category.productCount} productos
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
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
              onClick={() => deleteCategory(category._id)}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {category.subcategories!.map(sub => renderTreeItem(sub, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categorías</h1>
          <p className="text-muted-foreground">Administra las categorías y subcategorías de productos</p>
        </div>
        <Button onClick={() => {
          setEditingCategory({
            name: "",
            description: "",
            parent: undefined,
            isActive: true,
            order: categories.length
          })
          setShowForm(true)
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Categoría
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar categorías..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-1 border rounded-lg p-1">
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            Lista
          </Button>
          <Button
            variant={viewMode === "tree" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("tree")}
          >
            Árbol
          </Button>
        </div>
      </div>

      {viewMode === "list" ? (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredCategories.map((category) => (
                <div
                  key={category._id}
                  className="flex items-center justify-between p-4 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                    {category.image ? (
                      <img
                        src={category.image}
                        alt={category.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                        <Folder className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{category.name}</span>
                        {!category.isActive && (
                          <Badge variant="secondary" className="text-xs">Inactivo</Badge>
                        )}
                      </div>
                      {category.fullPath && category.fullPath !== category.name && (
                        <div className="text-sm text-muted-foreground">
                          {category.fullPath}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {category.productCount !== undefined && (
                      <Badge variant="outline">
                        {category.productCount} productos
                      </Badge>
                    )}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
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
                        onClick={() => deleteCategory(category._id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {filteredCategories.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  {searchTerm ? "No se encontraron categorías" : "No hay categorías creadas"}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            {treeCategories.length > 0 ? (
              <div className="divide-y">
                {treeCategories.map(category => renderTreeItem(category))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                No hay categorías creadas
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal de edición */}
      {showForm && editingCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {editingCategory._id ? "Editar" : "Nueva"} Categoría
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => {
                  setShowForm(false)
                  setEditingCategory(null)
                }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input
                  value={editingCategory.name || ""}
                  onChange={(e) => setEditingCategory({
                    ...editingCategory,
                    name: e.target.value
                  })}
                  placeholder="Nombre de la categoría"
                />
              </div>

              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={editingCategory.description || ""}
                  onChange={(e) => setEditingCategory({
                    ...editingCategory,
                    description: e.target.value
                  })}
                  placeholder="Descripción opcional"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Categoría padre</Label>
                <Select
                  value={editingCategory.parent?.toString() || "none"}
                  onValueChange={(value) => setEditingCategory({
                    ...editingCategory,
                    parent: value === "none" ? undefined : value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin categoría padre (raíz)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin categoría padre (raíz)</SelectItem>
                    {parentCategories
                      .filter(cat => cat._id !== editingCategory._id)
                      .map(cat => (
                        <SelectItem key={cat._id} value={cat._id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>URL de imagen</Label>
                <Input
                  value={editingCategory.image || ""}
                  onChange={(e) => setEditingCategory({
                    ...editingCategory,
                    image: e.target.value
                  })}
                  placeholder="https://..."
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={editingCategory.isActive !== false}
                  onCheckedChange={(checked) => setEditingCategory({
                    ...editingCategory,
                    isActive: checked
                  })}
                />
                <Label>Categoría activa</Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => {
                  setShowForm(false)
                  setEditingCategory(null)
                }}>
                  Cancelar
                </Button>
                <Button onClick={saveCategory} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}