"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  Upload, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Plus, 
  Save, 
  Rocket, 
  Image as ImageIcon,
  Loader2,
  FolderOpen,
  Keyboard,
  Info,
  Settings2,
  Tag,
  Palette,
  Eye,
  RefreshCw,
  Box,
  Layers
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

type Step = "upload" | "edit" | "validate" | "publish"

export default function BulkUploadPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [currentStep, setCurrentStep] = useState<Step>("upload")
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [drafts, setDrafts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [settings, setSettings] = useState<any>(null)
  
  // Modal State
  const [editingDraft, setEditingDraft] = useState<any>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  // Load Data
  useEffect(() => {
    const loadData = async () => {
      const [catRes, setRes] = await Promise.all([
        api.getCategories(),
        api.getSettings()
      ])
      if (catRes.success) setCategories(catRes.categories)
      if (setRes.success) setSettings(setRes.settings)
    }
    loadData()
  }, [])

  const currencySymbol = settings?.currency?.symbol || "$"

  // STEP 1: Upload Logic
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    
    setUploading(true)
    try {
      let currentSessionId = sessionId
      if (!currentSessionId) {
        const initRes = await api.initBulkSession()
        if (initRes.success) {
          currentSessionId = initRes.session.id
          setSessionId(currentSessionId)
        } else {
          throw new Error("No se pudo iniciar la sesión")
        }
      }

      const formData = new FormData()
      Array.from(e.target.files).forEach(file => {
        formData.append("images", file)
      })

      const uploadRes = await api.uploadBulkImages(currentSessionId!, formData)
      if (uploadRes.success) {
        setDrafts(uploadRes.session.drafts.map((d: any) => ({
          ...d,
          description: d.description || "",
          subcategory: d.subcategory || "",
          brand: d.brand || "KAOZ",
          tags: d.tags || "",
          features: d.features || "",
          isNew: d.isNew !== undefined ? d.isNew : true,
          isFeatured: d.isFeatured || false,
          isActive: d.isActive !== undefined ? d.isActive : true,
          categoryId: d.categoryId || "",
          subcategoryId: d.subcategoryId || "",
          priceConfig: d.priceConfig || { mode: "fixed", percentage: 0, basePrice: 0 }
        })))
        setCurrentStep("edit")
        toast({ title: "MÓDULOS CARGADOS", description: `${e.target.files.length} ACTIVOS PROCESADOS.` })
      }
    } catch (error: any) {
      toast({ title: "FALLO DE SISTEMA", description: error.message, variant: "destructive" })
    } finally {
      setUploading(false)
    }
  }

  // STEP 2: Edit Logic
  const updateDraftField = (id: string, field: string, value: any) => {
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d))
  }

  const handleOpenDetails = (draft: any) => {
    setEditingDraft({ ...draft })
    setIsDetailsOpen(true)
  }

  const saveDetails = () => {
    if (editingDraft) {
      setDrafts(prev => prev.map(d => d.id === editingDraft.id ? editingDraft : d))
      setIsDetailsOpen(false)
      toast({ title: "REGISTRO ACTUALIZADO", description: "DATOS SINCRONIZADOS EN TABLA" })
    }
  }

  const saveDrafts = async () => {
    if (!sessionId) return
    setLoading(true)
    try {
      const res = await api.updateBulkDrafts(sessionId, drafts)
      if (res.success) {
        setDrafts(res.session.drafts)
        toast({ title: "SISTEMA SINCRONIZADO", description: "BORRADORES ASEGURADOS EN NUBE." })
      }
    } catch (error: any) {
      toast({ title: "ERROR DE PERSISTENCIA", description: error.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  // STEP 4: Publish
  const handlePublish = async () => {
    if (!sessionId) return
    setPublishing(true)
    try {
      const res = await api.publishBulkSession(sessionId)
      if (res.success) {
        toast({ 
          title: "DESPLIEGUE EXITOSO", 
          description: `${res.results.created} PRODUCTOS INTEGRADOS AL CATÁLOGO.` 
        })
        router.push("/admin/products")
      }
    } catch (error: any) {
      toast({ title: "ERROR DE DESPLIEGUE", description: error.message, variant: "destructive" })
    } finally {
      setPublishing(false)
    }
  }

  // Variants Helper
  const getVariantSummary = (variants: any[]) => {
    if (!variants?.length) return "SIN VARIANTES"
    const totalStock = variants.reduce((sum, v) => 
      sum + (v.sizes?.reduce((s: number, sz: any) => s + (parseInt(sz.stock) || 0), 0) || 0), 0
    )
    return `${variants.length} COLORES / ${totalStock} UDS`
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-mono">
      {/* Industrial Stepper Header */}
      <header className="bg-black text-white px-8 py-6 sticky top-0 z-30 border-b border-white/10">
        <div className="max-w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => router.back()}
              className="text-white hover:bg-white/10 rounded-none border border-white/20"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 bg-kaosNeon animate-pulse"></div>
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">Protocolo de Carga Masiva</span>
              </div>
              <h1 className="text-2xl font-black uppercase tracking-tighter leading-none">
                Ingesta de Inventario
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-12">
            {/* Stepper */}
            <div className="hidden lg:flex items-center gap-4">
              {[
                { id: "upload", label: "INGESTA" },
                { id: "edit", label: "CURACIÓN" },
                { id: "validate", label: "CONTROL" },
                { id: "publish", label: "DESPLIEGUE" }
              ].map((step, idx) => (
                <div key={step.id} className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "text-[10px] font-black tracking-widest px-2 py-1 border transition-all",
                      currentStep === step.id ? "bg-kaosNeon text-black border-kaosNeon" : 
                      idx < ["upload", "edit", "validate", "publish"].indexOf(currentStep) ? "bg-white/10 text-white/60 border-white/10" : "text-white/20 border-white/5"
                    )}>
                      0{idx + 1}. {step.label}
                    </span>
                  </div>
                  {idx < 3 && <ChevronRight className="h-3 w-3 text-white/10" />}
                </div>
              ))}
            </div>
            
            <div className="flex gap-3">
              {currentStep === "edit" && (
                <Button onClick={saveDrafts} disabled={loading} variant="outline" className="rounded-none border-white/20 text-white hover:bg-white/10 h-11 px-6 text-[10px] font-black uppercase tracking-widest gap-2">
                  <Save className="h-4 w-4" /> Respaldar
                </Button>
              )}
              {currentStep === "edit" && (
                <Button 
                  onClick={() => setCurrentStep("validate")} 
                  className="rounded-none bg-kaosNeon text-black hover:bg-white h-11 px-8 text-[10px] font-black uppercase tracking-widest gap-2"
                >
                  Validar Datos <ChevronRight className="h-4 w-4" />
                </Button>
              )}
              {currentStep === "validate" && (
                <Button 
                  onClick={() => setCurrentStep("publish")} 
                  className="rounded-none bg-kaosNeon text-black hover:bg-white h-11 px-8 text-[10px] font-black uppercase tracking-widest gap-2"
                >
                  Confirmar Despliegue <Rocket className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-full mx-auto w-full">
        {/* STEP 1: UPLOAD (Industrial Minimalist) */}
        {currentStep === "upload" && (
          <div className="max-w-4xl mx-auto mt-20 flex flex-col items-center">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
              <div className="p-12 border border-black hover:bg-black hover:text-white transition-all cursor-pointer group flex flex-col items-center text-center">
                <input 
                  type="file" 
                  multiple 
                  className="hidden" 
                  id="file-upload" 
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                <label htmlFor="file-upload" className="cursor-pointer space-y-6">
                  <div className="w-20 h-20 bg-black text-white group-hover:bg-kaosNeon group-hover:text-black flex items-center justify-center transition-colors mx-auto">
                    <ImageIcon className="h-10 w-10" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight mb-2">Archivos Individuales</h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Selección manual de activos (.JPG, .PNG)</p>
                  </div>
                </label>
              </div>

              <div className="p-12 border border-black hover:bg-black hover:text-white transition-all cursor-pointer group flex flex-col items-center text-center">
                <input 
                  type="file" 
                  multiple 
                  // @ts-ignore
                  webkitdirectory="" 
                  directory="" 
                  className="hidden" 
                  id="folder-upload"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                <label htmlFor="folder-upload" className="cursor-pointer space-y-6">
                  <div className="w-20 h-20 bg-black text-white group-hover:bg-kaosNeon group-hover:text-black flex items-center justify-center transition-colors mx-auto">
                    <FolderOpen className="h-10 w-10" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight mb-2">Estructura de Carpeta</h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Escaneo inteligente de variantes y nombres</p>
                  </div>
                </label>
              </div>
            </div>

            {uploading && (
              <div className="w-full max-w-md mt-16 space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black uppercase tracking-widest animate-pulse">Analizando bits...</span>
                  <span className="text-[10px] font-black">PROCESANDO</span>
                </div>
                <div className="h-1 bg-black/5 w-full overflow-hidden">
                  <div className="h-full bg-kaosNeon animate-progress-fast w-full"></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: EDIT (Industrial Spreadsheet) */}
        {currentStep === "edit" && (
          <div className="border border-black bg-white shadow-[12px_12px_0px_0px_rgba(0,0,0,0.05)]">
            <div className="p-4 border-b border-black flex items-center justify-between bg-[#fafafa]">
              <div className="flex items-center gap-6">
                <Badge className="bg-black text-white rounded-none h-8 px-4 font-black text-[10px] uppercase tracking-widest">
                  SESIÓN: {drafts.length} REGISTROS
                </Badge>
                <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-widest text-black/40">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500"></div> VÁLIDO
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-red-500"></div> REVISIÓN REQUERIDA
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[9px] font-bold text-black/30 uppercase tracking-widest italic">
                <Keyboard className="h-3 w-3" /> Auto-guardado local activo
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-black">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="w-[50px] text-white/60 font-black uppercase text-[9px] tracking-widest text-center border-r border-white/10">ST</TableHead>
                    <TableHead className="w-[300px] text-white font-black uppercase text-[10px] tracking-widest border-r border-white/10">Nombre del Activo</TableHead>
                    <TableHead className="w-[180px] text-white font-black uppercase text-[10px] tracking-widest border-r border-white/10">Categoría</TableHead>
                    <TableHead className="w-[100px] text-white font-black uppercase text-[10px] tracking-widest text-right border-r border-white/10">Precio</TableHead>
                    <TableHead className="w-[100px] text-white font-black uppercase text-[10px] tracking-widest text-right border-r border-white/10">Original</TableHead>
                    <TableHead className="w-[200px] text-white font-black uppercase text-[10px] tracking-widest border-r border-white/10">Config. Variantes</TableHead>
                    <TableHead className="w-[120px] text-white font-black uppercase text-[10px] tracking-widest border-r border-white/10">Marca</TableHead>
                    <th className="w-[120px] text-white font-black uppercase text-[10px] tracking-widest text-center">Acciones</th>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drafts.map((draft) => (
                    <TableRow key={draft.id} className="group border-b border-black/5 hover:bg-black/[0.02]">
                      <TableCell className="text-center border-r border-black/5">
                         <div className={cn(
                           "w-2 h-2 mx-auto transition-all",
                           draft.status === "valid" ? "bg-green-500" : "bg-red-500 animate-pulse scale-125"
                         )} />
                      </TableCell>
                      <TableCell className="border-r border-black/5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gray-100 border border-black/5 flex-shrink-0 group-hover:scale-110 transition-transform overflow-hidden">
                            {draft.images?.[0] ? (
                              <img src={draft.images[0].url} className="w-full h-full object-cover grayscale" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-black/10"><ImageIcon className="h-5 w-5" /></div>
                            )}
                          </div>
                          <Input 
                            value={draft.name} 
                            onChange={(e) => updateDraftField(draft.id, "name", e.target.value)}
                            className="h-9 border-none focus:ring-0 bg-transparent p-0 text-xs font-black uppercase tracking-tight focus:text-kaosNeon"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="border-r border-black/5">
                        <Select 
                          value={draft.categoryId} 
                          onValueChange={(val) => updateDraftField(draft.id, "categoryId", val)}
                        >
                          <SelectTrigger className="h-9 border-none bg-transparent p-0 text-[10px] font-bold uppercase">
                            <SelectValue placeholder="SIN ASIGNAR" />
                          </SelectTrigger>
                          <SelectContent className="rounded-none border-black">
                            {categories.map(cat => (
                              <SelectItem key={cat.id} value={cat.id} className="text-[10px] font-bold uppercase">{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="border-r border-black/5">
                        <div className="flex items-center gap-1 justify-end">
                          <span className="text-[10px] font-black opacity-30">{currencySymbol}</span>
                          <Input 
                            type="number"
                            value={draft.price} 
                            onChange={(e) => updateDraftField(draft.id, "price", parseFloat(e.target.value))}
                            className="h-9 border-none focus:ring-0 bg-transparent p-0 text-xs font-black text-right w-16"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="border-r border-black/5">
                        <div className="flex items-center gap-1 justify-end opacity-40">
                          <span className="text-[10px] font-black">{currencySymbol}</span>
                          <Input 
                            type="number"
                            value={draft.originalPrice || ""} 
                            onChange={(e) => updateDraftField(draft.id, "originalPrice", parseFloat(e.target.value))}
                            className="h-9 border-none focus:ring-0 bg-transparent p-0 text-xs font-black text-right w-16"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="border-r border-black/5">
                        <Button 
                          variant="ghost" 
                          onClick={() => handleOpenDetails(draft)}
                          className="h-9 w-full justify-start gap-2 p-0 text-[9px] font-black uppercase tracking-widest hover:bg-transparent hover:text-kaosNeon"
                        >
                          <Layers className="h-3 w-3" />
                          {getVariantSummary(draft.variants)}
                        </Button>
                      </TableCell>
                      <TableCell className="border-r border-black/5">
                        <Input 
                          value={draft.brand} 
                          onChange={(e) => updateDraftField(draft.id, "brand", e.target.value)}
                          className="h-9 border-none focus:ring-0 bg-transparent p-0 text-[10px] font-black uppercase tracking-widest"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 hover:bg-black hover:text-kaosNeon rounded-none"
                            onClick={() => handleOpenDetails(draft)}
                          >
                            <Settings2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 hover:bg-red-600 hover:text-white rounded-none"
                            onClick={() => setDrafts(prev => prev.filter(d => d.id !== draft.id))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {drafts.length === 0 && (
              <div className="py-32 text-center">
                <p className="text-sm font-black uppercase tracking-[0.2em] opacity-20 italic">Esperando Activos de Inventario...</p>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: VALIDATE (Industrial Checklist) */}
        {currentStep === "validate" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-[1400px] mx-auto">
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center justify-between mb-6 border-b-2 border-black pb-4">
                <h3 className="text-2xl font-black uppercase tracking-tighter">Reporte de Pre-Despliegue</h3>
                <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-black text-white">Análisis de Integridad</span>
              </div>
              
              <div className="space-y-3">
                {drafts.map(draft => (
                  <div key={draft.id} className={cn(
                    "p-6 border transition-all flex items-center justify-between bg-white",
                    draft.errors?.length > 0 ? "border-red-500 bg-red-50/10" : "border-black/10"
                  )}>
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-gray-100 border border-black/5 overflow-hidden">
                        <img src={draft.images?.[0]?.url} className="w-full h-full object-cover grayscale" />
                      </div>
                      <div>
                        <p className="font-black text-xs uppercase tracking-tight">{draft.name}</p>
                        {draft.errors?.length > 0 ? (
                          <div className="flex items-center gap-2 text-[9px] font-black text-red-600 mt-2 uppercase tracking-widest">
                            <AlertCircle className="h-3 w-3" />
                            <span>{draft.errors.join(" // ")}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-[9px] font-black text-green-600 mt-2 uppercase tracking-widest">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Listado para Despliegue</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleOpenDetails(draft)}
                      className="rounded-none border-black hover:bg-black hover:text-white h-10 px-6 font-black uppercase text-[10px] tracking-widest"
                    >
                      Corregir
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-4 space-y-6 sticky top-32 h-fit">
              <div className="bg-black text-white p-8 border border-black">
                <h4 className="font-black mb-6 flex items-center gap-3 uppercase text-xs tracking-widest border-b border-white/10 pb-4">
                  <Settings2 className="h-5 w-5 text-kaosNeon" />
                  Métricas de Validación
                </h4>
                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Total Analizados</span>
                    <span className="text-2xl font-black">{drafts.length}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Certificados</span>
                    <span className="text-2xl font-black text-kaosNeon">{drafts.filter(d => d.status === "valid").length}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Incompletos</span>
                    <span className="text-2xl font-black text-red-500">{drafts.filter(d => d.status !== "valid").length}</span>
                  </div>
                  
                  <div className="space-y-2 pt-4">
                     <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-white/20">
                        <span>Eficiencia de Carga</span>
                        <span>{Math.round((drafts.filter(d => d.status === "valid").length / Math.max(drafts.length, 1)) * 100)}%</span>
                     </div>
                     <Progress 
                        value={(drafts.filter(d => d.status === "valid").length / Math.max(drafts.length, 1)) * 100} 
                        className="h-1 bg-white/5"
                     />
                  </div>
                </div>
              </div>

              <div className="bg-kaosNeon text-black p-8 border border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)]">
                <h4 className="font-black mb-2 flex items-center gap-3 uppercase text-xs tracking-widest">
                  <Rocket className="h-5 w-5" />
                  ¿PROCEDER?
                </h4>
                <p className="text-[10px] font-bold uppercase leading-relaxed mb-8 opacity-60">
                  El sistema integrará los productos certificados al motor de catálogo principal. Los registros incompletos serán omitidos.
                </p>
                <Button 
                  onClick={() => setCurrentStep("publish")}
                  disabled={drafts.filter(d => d.status === "valid").length === 0}
                  className="w-full bg-black text-white hover:bg-white hover:text-black rounded-none h-14 font-black uppercase text-xs tracking-widest transition-all"
                >
                  Finalizar Revisión
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: PUBLISH (Final confirmation) */}
        {currentStep === "publish" && (
          <div className="max-w-xl mx-auto text-center py-20 flex flex-col items-center">
            <div className="mb-12 relative">
              <div className="w-32 h-32 bg-kaosNeon text-black flex items-center justify-center border-4 border-black animate-pulse">
                <Rocket className="h-16 w-16" />
              </div>
              <div className="absolute -right-4 -top-4 w-12 h-12 bg-black text-white flex items-center justify-center font-black text-xl">
                !
              </div>
            </div>
            <h2 className="text-4xl font-black uppercase tracking-tighter mb-4 italic">Confirmar Inyección</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-12 max-w-sm">
              Está a punto de publicar <strong>{drafts.filter(d => d.status === "valid").length}</strong> registros al entorno de producción. Esta acción es irreversible.
            </p>
            
            <div className="space-y-4 w-full">
              <Button 
                onClick={handlePublish} 
                disabled={publishing}
                className="w-full h-16 bg-black text-white hover:bg-kaosNeon hover:text-black rounded-none text-sm font-black uppercase tracking-[0.2em] gap-3 transition-all group"
              >
                {publishing ? <RefreshCw className="h-6 w-6 animate-spin" /> : <><Rocket className="h-6 w-6 group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform" /> Inyectar a Catálogo</>}
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setCurrentStep("validate")}
                disabled={publishing}
                className="text-[10px] font-black uppercase tracking-widest text-black/40 hover:text-black hover:bg-transparent"
              >
                Retornar a Control de Calidad
              </Button>
            </div>

            <div className="mt-16 flex items-start gap-4 p-6 border border-black/10 text-left bg-gray-50 max-w-sm">
              <Info className="h-5 w-5 text-black mt-0.5" />
              <p className="text-[9px] font-bold text-black/60 leading-relaxed uppercase tracking-widest">
                El proceso de inyección optimiza imágenes y sincroniza bases de datos. 
                Los cambios se reflejarán instantáneamente en la interfaz de usuario final.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Details / Variants Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col rounded-none border-black p-0 font-mono">
          <DialogHeader className="bg-black text-white p-8">
            <div className="flex items-center gap-4 mb-2">
              <Settings2 className="h-4 w-4 text-kaosNeon" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 italic">Editor Técnico de Producto</span>
            </div>
            <DialogTitle className="text-3xl font-black uppercase tracking-tighter">
              {editingDraft?.name || "Detalles del Producto"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-8 bg-white space-y-12 custom-scrollbar">
            {/* Row 1: Basic Config */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
               <div className="space-y-6">
                  <h4 className="text-xs font-black uppercase tracking-widest border-b border-black pb-2 flex items-center gap-2">
                     <Info className="h-4 w-4" /> Descripción & Metadatos
                  </h4>
                  <div className="space-y-4">
                     <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase opacity-40">Resumen Descriptivo</Label>
                        <Textarea 
                           value={editingDraft?.description || ""}
                           onChange={(e) => setEditingDraft({...editingDraft, description: e.target.value})}
                           className="rounded-none border-black/10 focus:border-black h-32 text-xs uppercase"
                           placeholder="INTRODUCIR ESPECIFICACIONES TÉCNICAS..."
                        />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase opacity-40">Categoría Principal</Label>
                           <Select 
                              value={editingDraft?.categoryId || ""}
                              onValueChange={(value) => setEditingDraft({...editingDraft, categoryId: value, subcategoryId: ""})}
                           >
                              <SelectTrigger className="rounded-none border-black/10 focus:border-black h-11 text-[10px] font-black uppercase">
                                 <SelectValue placeholder="SELECCIONAR..." />
                              </SelectTrigger>
                              <SelectContent className="rounded-none border-black font-mono">
                                 {categories.filter(c => !c.parentId).map(cat => (
                                    <SelectItem key={cat.id} value={cat.id} className="text-[10px] font-black uppercase">{cat.name}</SelectItem>
                                 ))}
                              </SelectContent>
                           </Select>
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase opacity-40">Subcategoría</Label>
                           <Select 
                              value={editingDraft?.subcategoryId || ""}
                              onValueChange={(value) => setEditingDraft({...editingDraft, subcategoryId: value})}
                              disabled={!editingDraft?.categoryId}
                           >
                              <SelectTrigger className="rounded-none border-black/10 focus:border-black h-11 text-[10px] font-black uppercase">
                                 <SelectValue placeholder={editingDraft?.categoryId ? "SELECCIONAR..." : "ELEGIR CAT. PRIMARIA"} />
                              </SelectTrigger>
                              <SelectContent className="rounded-none border-black font-mono">
                                 {categories.filter(c => c.parentId === editingDraft?.categoryId).map(cat => (
                                    <SelectItem key={cat.id} value={cat.id} className="text-[10px] font-black uppercase">{cat.name}</SelectItem>
                                 ))}
                              </SelectContent>
                           </Select>
                        </div>
                        <div className="space-y-2 col-span-2">
                           <Label className="text-[10px] font-black uppercase opacity-40">Etiquetas (CSV)</Label>
                           <Input 
                              value={editingDraft?.tags || ""}
                              onChange={(e) => setEditingDraft({...editingDraft, tags: e.target.value})}
                              className="rounded-none border-black/10 focus:border-black h-11 text-xs uppercase"
                              placeholder="RUNNING, URBAN, LIMITED..."
                           />
                        </div>
                     </div>
                  </div>
               </div>

               <div className="space-y-6">
                  <h4 className="text-xs font-black uppercase tracking-widest border-b border-black pb-2 flex items-center gap-2">
                     <Box className="h-4 w-4" /> Estados de Visibilidad
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                     <div className="flex items-center justify-between p-4 border border-black/5 bg-gray-50">
                        <div className="space-y-0.5">
                           <Label className="text-[10px] font-black uppercase">Activo en Catálogo</Label>
                           <p className="text-[9px] font-bold opacity-40 uppercase">DISPONIBLE PARA VENTA INMEDIATA</p>
                        </div>
                        <Switch 
                           checked={editingDraft?.isActive} 
                           onCheckedChange={(checked) => setEditingDraft({...editingDraft, isActive: checked})}
                        />
                     </div>
                     <div className="flex items-center justify-between p-4 border border-black/5 bg-gray-50">
                        <div className="space-y-0.5">
                           <Label className="text-[10px] font-black uppercase">Etiqueta "NUEVO"</Label>
                           <p className="text-[9px] font-bold opacity-40 uppercase">MOSTRAR BADGE DE NOVEDAD</p>
                        </div>
                        <Switch 
                           checked={editingDraft?.isNew} 
                           onCheckedChange={(checked) => setEditingDraft({...editingDraft, isNew: checked})}
                        />
                     </div>
                     <div className="flex items-center justify-between p-4 border border-black/5 bg-gray-50">
                        <div className="space-y-0.5">
                           <Label className="text-[10px] font-black uppercase">Destacado (HOT)</Label>
                           <p className="text-[9px] font-bold opacity-40 uppercase">POSICIÓN PRIORITARIA EN HOME</p>
                        </div>
                        <Switch 
                           checked={editingDraft?.isFeatured} 
                           onCheckedChange={(checked) => setEditingDraft({...editingDraft, isFeatured: checked})}
                        />
                     </div>
                  </div>
               </div>
            </div>

            {/* Row 2: Variants Management */}
            <div className="space-y-6">
               <div className="flex items-center justify-between border-b border-black pb-2">
                  <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                     <Palette className="h-4 w-4" /> Matriz de Variantes & Stock
                  </h4>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      const newVariants = [...(editingDraft?.variants || []), { color: "NUEVO COLOR", colorHex: "#000000", sizes: [{ size: "ÚNICA", stock: 0 }] }]
                      setEditingDraft({...editingDraft, variants: newVariants})
                    }}
                    className="h-8 text-[9px] font-black uppercase tracking-widest gap-1 hover:bg-black hover:text-white rounded-none border border-black/10"
                  >
                    <Plus className="h-3 w-3" /> Añadir Variante
                  </Button>
               </div>

               <div className="space-y-6">
                  {editingDraft?.variants?.map((v: any, vIdx: number) => (
                    <div key={vIdx} className="border border-black p-6 bg-gray-50/50 space-y-6">
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                             <div className="space-y-2">
                                <Label className="text-[9px] font-black uppercase opacity-40">Identificador Color</Label>
                                <Input 
                                   value={v.color}
                                   onChange={(e) => {
                                      const newVariants = [...editingDraft.variants]
                                      newVariants[vIdx].color = e.target.value
                                      setEditingDraft({...editingDraft, variants: newVariants})
                                   }}
                                   className="h-9 rounded-none border-black/10 bg-white text-xs uppercase font-black"
                                />
                             </div>
                             <div className="space-y-2">
                                <Label className="text-[9px] font-black uppercase opacity-40">Hex</Label>
                                <div className="flex gap-2">
                                   <Input 
                                      type="color"
                                      value={v.colorHex || "#000000"}
                                      onChange={(e) => {
                                         const newVariants = [...editingDraft.variants]
                                         newVariants[vIdx].colorHex = e.target.value
                                         setEditingDraft({...editingDraft, variants: newVariants})
                                      }}
                                      className="h-9 w-12 p-1 rounded-none border-black/10 bg-white"
                                   />
                                   <Input 
                                      value={v.colorHex || "#000000"}
                                      onChange={(e) => {
                                         const newVariants = [...editingDraft.variants]
                                         newVariants[vIdx].colorHex = e.target.value
                                         setEditingDraft({...editingDraft, variants: newVariants})
                                      }}
                                      className="h-9 w-24 rounded-none border-black/10 bg-white text-[10px] uppercase font-black"
                                   />
                                </div>
                             </div>
                          </div>
                          <Button 
                             variant="ghost" 
                             size="icon" 
                             className="text-red-600 hover:bg-red-50"
                             onClick={() => {
                                const newVariants = editingDraft.variants.filter((_: any, i: number) => i !== vIdx)
                                setEditingDraft({...editingDraft, variants: newVariants})
                             }}
                          >
                             <Trash2 className="h-4 w-4" />
                          </Button>
                       </div>

                       <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                          {v.sizes?.map((s: any, sIdx: number) => (
                             <div key={sIdx} className="bg-white border border-black/10 p-3 space-y-2 group relative">
                                <Input 
                                   value={s.size}
                                   onChange={(e) => {
                                      const newVariants = [...editingDraft.variants]
                                      newVariants[vIdx].sizes[sIdx].size = e.target.value
                                      setEditingDraft({...editingDraft, variants: newVariants})
                                   }}
                                   className="h-7 border-none bg-transparent p-0 text-[10px] font-black uppercase text-center focus:ring-0"
                                />
                                <div className="flex items-center gap-1 border-t border-black/5 pt-2">
                                   <span className="text-[8px] font-black opacity-20">UDS:</span>
                                   <Input 
                                      type="number"
                                      value={s.stock}
                                      onChange={(e) => {
                                         const newVariants = [...editingDraft.variants]
                                         newVariants[vIdx].sizes[sIdx].stock = parseInt(e.target.value) || 0
                                         setEditingDraft({...editingDraft, variants: newVariants})
                                      }}
                                      className="h-7 border-none bg-transparent p-0 text-xs font-black text-center focus:ring-0"
                                   />
                                </div>
                                <button 
                                   onClick={() => {
                                      const newVariants = [...editingDraft.variants]
                                      newVariants[vIdx].sizes = newVariants[vIdx].sizes.filter((_: any, i: number) => i !== sIdx)
                                      setEditingDraft({...editingDraft, variants: newVariants})
                                   }}
                                   className="absolute -top-2 -right-2 w-5 h-5 bg-black text-white items-center justify-center hidden group-hover:flex"
                                >
                                   <X className="h-3 w-3" />
                                </button>
                             </div>
                          ))}
                          <Button 
                             variant="outline" 
                             className="h-auto aspect-square border-dashed border-black/20 text-black/40 hover:border-black hover:text-black rounded-none flex flex-col gap-1 p-0"
                             onClick={() => {
                                const newVariants = [...editingDraft.variants]
                                newVariants[vIdx].sizes.push({ size: "TALLA", stock: 0 })
                                setEditingDraft({...editingDraft, variants: newVariants})
                             }}
                          >
                             <Plus className="h-4 w-4" />
                             <span className="text-[8px] font-black uppercase">Añadir Talla</span>
                          </Button>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>

          <DialogFooter className="p-8 border-t border-black bg-gray-50">
            <Button 
              variant="outline" 
              onClick={() => setIsDetailsOpen(false)}
              className="rounded-none border-black h-14 px-8 text-[10px] font-black uppercase tracking-widest"
            >
              Cancelar
            </Button>
            <Button 
              onClick={saveDetails}
              className="rounded-none bg-black text-white hover:bg-kaosNeon hover:text-black h-14 px-12 text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Confirmar Parámetros
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function X(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}
