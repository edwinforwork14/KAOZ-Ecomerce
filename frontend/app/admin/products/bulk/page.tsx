"use client"

import { useState, useEffect, useCallback } from "react"
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
  Info
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
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
  const [session, setSession] = useState<any>(null)
  const [drafts, setDrafts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  
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
        setSession(uploadRes.session)
        setDrafts(uploadRes.session.drafts)
        setCurrentStep("edit")
        toast({ title: "Imágenes subidas", description: `${e.target.files.length} archivos procesados.` })
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setUploading(false)
    }
  }

  // Load Categories
  useEffect(() => {
    const loadCategories = async () => {
      const res = await api.getCategories()
      if (res.success) setCategories(res.categories)
    }
    loadCategories()
  }, [])

  // STEP 2: Edit Logic
  const updateDraftField = (id: string, field: string, value: any) => {
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d))
  }

  const saveDrafts = async () => {
    if (!sessionId) return
    setLoading(true)
    try {
      const res = await api.updateBulkDrafts(sessionId, drafts)
      if (res.success) {
        setSession(res.session)
        setDrafts(res.session.drafts)
        toast({ title: "Borradores guardados", description: "El progreso se ha sincronizado." })
      }
    } catch (error: any) {
      toast({ title: "Error al guardar", description: error.message, variant: "destructive" })
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
        toast({ title: "¡Éxito!", description: `${res.results.created} productos publicados correctamente.` })
        router.push("/admin/products")
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setPublishing(false)
    }
  }

  // Render Steps
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header / Stepper */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold tracking-tight">Carga Masiva de Productos</h1>
          </div>

          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              {[
                { id: "upload", label: "Subida" },
                { id: "edit", label: "Edición" },
                { id: "validate", label: "Validación" },
                { id: "publish", label: "Finalizar" }
              ].map((step, idx) => (
                <div key={step.id} className="flex items-center">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                    currentStep === step.id ? "bg-black text-white" : 
                    idx < ["upload", "edit", "validate", "publish"].indexOf(currentStep) ? "bg-green-500 text-white" : "bg-slate-100 text-slate-400"
                  )}>
                    {idx < ["upload", "edit", "validate", "publish"].indexOf(currentStep) ? <CheckCircle2 className="h-5 w-5" /> : idx + 1}
                  </div>
                  {idx < 3 && <div className="w-8 h-[2px] bg-slate-100 mx-2" />}
                </div>
              ))}
            </div>
            
            <div className="flex gap-2">
              {currentStep === "edit" && (
                <Button onClick={saveDrafts} disabled={loading} variant="outline" className="gap-2">
                  <Save className="h-4 w-4" /> Guardar
                </Button>
              )}
              {currentStep === "edit" && (
                <Button onClick={() => setCurrentStep("validate")} className="gap-2 bg-black text-white hover:bg-slate-800">
                  Validar <ChevronRight className="h-4 w-4" />
                </Button>
              )}
              {currentStep === "validate" && (
                <Button onClick={() => setCurrentStep("publish")} className="gap-2 bg-black text-white hover:bg-slate-800">
                  Revisar <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        {/* STEP 1: UPLOAD */}
        {currentStep === "upload" && (
          <div className="max-w-2xl mx-auto mt-20 text-center">
            <div className="mb-8 flex justify-center">
              <div className="w-24 h-24 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400">
                <Upload className="h-12 w-12" />
              </div>
            </div>
            <h2 className="text-3xl font-bold mb-4">Sube tus imágenes</h2>
            <p className="text-slate-500 mb-8">
              Arrastra tus fotos o selecciona una carpeta completa. El sistema detectará automáticamente nombres y variantes.
            </p>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="p-6 border-2 border-dashed border-slate-200 rounded-2xl hover:border-black transition-all cursor-pointer bg-white group">
                <input 
                  type="file" 
                  multiple 
                  className="hidden" 
                  id="file-upload" 
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                  <ImageIcon className="h-8 w-8 mb-2 text-slate-400 group-hover:text-black transition-colors" />
                  <span className="font-bold text-sm">Archivos Sueltos</span>
                  <span className="text-xs text-slate-400">JPG, PNG, WEBP</span>
                </label>
              </div>
              <div className="p-6 border-2 border-dashed border-slate-200 rounded-2xl hover:border-black transition-all cursor-pointer bg-white group">
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
                <label htmlFor="folder-upload" className="cursor-pointer flex flex-col items-center">
                  <FolderOpen className="h-8 w-8 mb-2 text-slate-400 group-hover:text-black transition-colors" />
                  <span className="font-bold text-sm">Subir Carpeta</span>
                  <span className="text-xs text-slate-400">Escaneo inteligente</span>
                </label>
              </div>
            </div>

            {uploading && (
              <div className="space-y-4">
                <p className="text-sm font-medium animate-pulse">Procesando y optimizando imágenes...</p>
                <Progress value={45} className="h-2" />
              </div>
            )}
          </div>
        )}

        {/* STEP 2: EDIT (Spreadsheet View) */}
        {currentStep === "edit" && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="bg-white">{drafts.length} Productos detectados</Badge>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Keyboard className="h-3 w-3" />
                  <span>Usa Tab para navegar entre celdas</span>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[80px]">Imagen</TableHead>
                    <TableHead className="w-[300px]">Nombre del Producto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="w-[120px]">Precio ($)</TableHead>
                    <TableHead className="w-[100px]">Stock</TableHead>
                    <TableHead className="w-[200px]">Tags</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drafts.map((draft) => (
                    <TableRow key={draft.id} className="group">
                      <TableCell>
                        <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden border border-slate-200">
                          {draft.images?.[0] ? (
                            <img src={draft.images[0].url} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <ImageIcon className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input 
                          value={draft.name} 
                          onChange={(e) => updateDraftField(draft.id, "name", e.target.value)}
                          className="border-transparent hover:border-slate-200 focus:border-black transition-all bg-transparent rounded-none"
                        />
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={draft.categoryId} 
                          onValueChange={(val) => updateDraftField(draft.id, "categoryId", val)}
                        >
                          <SelectTrigger className="border-transparent hover:border-slate-200 bg-transparent">
                            <SelectValue placeholder="Seleccionar..." />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(cat => (
                              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number"
                          value={draft.price} 
                          onChange={(e) => updateDraftField(draft.id, "price", e.target.value)}
                          className="border-transparent hover:border-slate-200 focus:border-black transition-all bg-transparent"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number"
                          value={draft.stock} 
                          onChange={(e) => updateDraftField(draft.id, "stock", e.target.value)}
                          className="border-transparent hover:border-slate-200 focus:border-black transition-all bg-transparent"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          value={draft.tags?.join(", ")} 
                          onChange={(e) => updateDraftField(draft.id, "tags", e.target.value.split(",").map((t: string) => t.trim()))}
                          className="border-transparent hover:border-slate-200 focus:border-black transition-all bg-transparent text-xs"
                          placeholder="tag1, tag2..."
                        />
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500"
                          onClick={() => setDrafts(prev => prev.filter(d => d.id !== draft.id))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {drafts.length === 0 && (
              <div className="py-20 text-center text-slate-400">
                No hay borradores. Sube imágenes para comenzar.
              </div>
            )}

            <div className="p-4 border-t border-slate-100 flex justify-center">
              <Button variant="ghost" className="gap-2 text-slate-400 hover:text-black">
                <Plus className="h-4 w-4" /> Añadir producto manualmente
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: VALIDATE */}
        {currentStep === "validate" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-lg font-bold mb-4">Revisión de Errores</h3>
              {drafts.map(draft => (
                <div key={draft.id} className={cn(
                  "p-4 rounded-2xl border flex items-center justify-between bg-white",
                  draft.errors?.length > 0 ? "border-red-100 bg-red-50/10" : "border-slate-100"
                )}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={draft.images?.[0]?.url} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{draft.name}</p>
                      {draft.errors?.length > 0 ? (
                        <div className="flex items-center gap-2 text-xs text-red-500 mt-1">
                          <AlertCircle className="h-3 w-3" />
                          <span>{draft.errors.join(", ")}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-green-500 mt-1">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Listo para publicar</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setCurrentStep("edit")}>Corregir</Button>
                </div>
              ))}
            </div>

            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="font-bold mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Estado de Validación
                </h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Total</span>
                    <span className="font-bold">{drafts.length}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Válidos</span>
                    <span className="font-bold text-green-600">{drafts.filter(d => d.status === "valid").length}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Con Errores</span>
                    <span className="font-bold text-red-600">{drafts.filter(d => d.status !== "valid").length}</span>
                  </div>
                  <Progress 
                    value={(drafts.filter(d => d.status === "valid").length / drafts.length) * 100} 
                    className="h-2"
                  />
                </div>
              </div>

              <div className="bg-black text-white p-6 rounded-2xl">
                <h4 className="font-bold mb-2 flex items-center gap-2">
                  <Rocket className="h-5 w-5" />
                  ¿Todo listo?
                </h4>
                <p className="text-slate-400 text-sm mb-6">
                  Se crearán {drafts.filter(d => d.status === "valid").length} productos nuevos en tu catálogo.
                </p>
                <Button 
                  onClick={() => setCurrentStep("publish")}
                  disabled={drafts.filter(d => d.status === "valid").length === 0}
                  className="w-full bg-white text-black hover:bg-slate-100 font-bold"
                >
                  Continuar a Resumen
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: PUBLISH / SUMMARY */}
        {currentStep === "publish" && (
          <div className="max-w-xl mx-auto text-center py-20">
            <div className="mb-8 flex justify-center">
              <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center text-green-500 border-4 border-white shadow-xl">
                <CheckCircle2 className="h-12 w-12" />
              </div>
            </div>
            <h2 className="text-3xl font-bold mb-4">Confirmación Final</h2>
            <p className="text-slate-500 mb-10">
              Estás a punto de publicar <strong>{drafts.filter(d => d.status === "valid").length}</strong> productos nuevos. 
              {drafts.filter(d => d.status !== "valid").length > 0 && ` ${drafts.filter(d => d.status !== "valid").length} productos incompletos serán ignorados.`}
            </p>
            
            <div className="space-y-4">
              <Button 
                onClick={handlePublish} 
                disabled={publishing}
                className="w-full h-14 bg-black text-white hover:bg-slate-800 rounded-xl text-lg font-bold gap-3"
              >
                {publishing ? <Loader2 className="h-6 w-6 animate-spin" /> : <><Rocket className="h-6 w-6" /> Publicar Catálogo</>}
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setCurrentStep("validate")}
                disabled={publishing}
                className="text-slate-400"
              >
                Volver a revisar
              </Button>
            </div>

            <div className="mt-12 flex items-start gap-4 p-4 bg-slate-100 rounded-xl text-left">
              <Info className="h-5 w-5 text-slate-400 mt-0.5" />
              <p className="text-xs text-slate-500 leading-relaxed">
                Este proceso puede tardar unos segundos dependiendo de la cantidad de imágenes. 
                Los productos aparecerán instantáneamente en tu tienda una vez finalizado.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer info (Shortcuts) */}
      <footer className="px-8 py-3 bg-white border-t border-slate-200 text-[10px] text-slate-400 uppercase tracking-widest flex justify-between items-center">
        <div className="flex gap-6">
          <span className="flex items-center gap-1"><span className="bg-slate-100 px-1 rounded border">TAB</span> Siguiente Celda</span>
          <span className="flex items-center gap-1"><span className="bg-slate-100 px-1 rounded border">ESC</span> Cancelar</span>
        </div>
        <span>KAOZ ADMIN ENGINE v2.0</span>
      </footer>
    </div>
  )
}
