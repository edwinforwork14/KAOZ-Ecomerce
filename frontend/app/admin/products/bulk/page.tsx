"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft,
  Upload,
  Package,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Zap,
  Image as ImageIcon,
  ListChecks,
  FileText,
  Loader2,
  X,
  Info,
  ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { BulkImageUploader, UploadedImage } from "@/components/admin/BulkImageUploader"
import { BulkDraftEditor, ProductDraft } from "@/components/admin/BulkDraftEditor"
import { BulkValidationPanel } from "@/components/admin/BulkValidationPanel"

type Phase = "upload" | "edit" | "validate"

const PHASES: { id: Phase; label: string; icon: any; description: string }[] = [
  { id: "upload", label: "PRECARGA DE ACTIVOS", icon: ImageIcon, description: "Sube todas las imágenes del lote" },
  { id: "edit", label: "ASIGNACIÓN DE PRODUCTOS", icon: Package, description: "Configura productos y variantes" },
  { id: "validate", label: "VALIDACIÓN Y CONFIRMACIÓN", icon: ShieldCheck, description: "Revisa, corrige y publica" }
]

export default function BulkUploadPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [currentPhase, setCurrentPhase] = useState<Phase>("upload")
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [assets, setAssets] = useState<Record<string, any>>({})
  const [images, setImages] = useState<UploadedImage[]>([])
  const [drafts, setDrafts] = useState<ProductDraft[]>([])

  // Inicializar sesión al montar
  useEffect(() => {
    initSession()
  }, [])

  const initSession = async () => {
    setLoading(true)
    setError(null)
    try {
      // Cargar categorías en paralelo
      const [sessionResult, categoriesResult] = await Promise.all([
        api.initBulkSession(),
        api.getAdminCategories(false)
      ])

      if (!sessionResult.success) {
        throw new Error(sessionResult.error || "Error al iniciar sesión")
      }

      setSessionId(sessionResult.session.id)
      
      if (categoriesResult.success) {
        setCategories(categoriesResult.categories || [])
      }

      // Intentar cargar sesión existente
      if (sessionResult.session.assets) {
        setAssets(sessionResult.session.assets || {})
      }
      if (sessionResult.session.drafts) {
        setDrafts(sessionResult.session.drafts || [])
        if (sessionResult.session.drafts.length > 0) {
          setCurrentPhase("edit")
        }
      }

    } catch (error: any) {
      console.error("Error initializing bulk session:", error)
      setError(error.message)
      toast({
        title: "ERROR DE SESIÓN",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleImagesChange = useCallback((newImages: UploadedImage[], assetsMap: Record<string, any>) => {
    setImages(newImages)
    setAssets(prev => ({ ...prev, ...assetsMap }))
  }, [])

  const handleDraftsChange = useCallback((newDrafts: ProductDraft[]) => {
    setDrafts(newDrafts)
  }, [])

  const handlePhaseComplete = async (phase: Phase) => {
    if (phase === "upload" && sessionId) {
      // Recargar la sesión del backend para obtener los drafts generados automáticamente
      // con las imágenes ya asignadas
      try {
        const sessionResult = await api.getBulkSession(sessionId)
        if (sessionResult.success && sessionResult.session) {
          const sessionDrafts = sessionResult.session.drafts || []
          if (sessionDrafts.length > 0) {
            // Cargar assets actualizados
            const sessionAssets = sessionResult.session.assets || {}
            setAssets(sessionAssets)
            setDrafts(sessionDrafts)
            
            // Convertir assets a UploadedImage[] para pasarlos al editor
            const loadedImages: UploadedImage[] = Object.entries(sessionAssets).map(([key, asset]: [string, any]) => ({
              id: key,
              originalName: asset.originalName || key,
              url: asset.url,
              size: asset.size || 0,
              width: asset.width,
              height: asset.height,
              status: "ready" as const
            }))
            setImages(loadedImages)
          }
        }
      } catch (e) {
        console.warn("Error fetching updated session:", e)
      }
    }
    
    const phaseIndex = PHASES.findIndex(p => p.id === phase)
    if (phaseIndex < PHASES.length - 1) {
      setCurrentPhase(PHASES[phaseIndex + 1].id)
    }
  }

  const handleBack = (phase: Phase) => {
    const phaseIndex = PHASES.findIndex(p => p.id === phase)
    if (phaseIndex > 0) {
      setCurrentPhase(PHASES[phaseIndex - 1].id)
    }
  }

  const handleComplete = () => {
    router.push("/admin/products")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-1 bg-neutral-100 overflow-hidden">
            <div className="w-full h-full bg-neutral-900 animate-progress-fast"></div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] animate-pulse text-neutral-500">
            Inicializando Protocolo de Carga Masiva...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 space-y-8 bg-transparent min-h-screen">
        <div className="border-2 border-red-300 bg-red-50/50 p-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">ERROR DE PROTOCOLO</h2>
          <p className="text-[10px] font-bold text-red-700 mb-6">{error}</p>
          <div className="flex gap-4 justify-center">
            <Button
              onClick={initSession}
              className="rounded-none bg-neutral-900 text-white h-14 px-10 text-[10px] font-black uppercase tracking-widest"
            >
              REINTENTAR
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/admin/products")}
              className="rounded-none border-neutral-200 h-14 px-10 text-[10px] font-bold uppercase tracking-widest"
            >
              VOLVER AL CATÁLOGO
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-8 bg-transparent min-h-screen max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-neutral-200 pb-8">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-neutral-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" /> VOLVER AL CATÁLOGO
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-kaosNeon animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
              Protocolo de Inyección Masiva • KAOS
            </span>
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">
            Carga Masiva
          </h1>
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-2 flex items-center gap-2">
            <Zap className="h-3 w-3" /> 
            {PHASES.find(p => p.id === currentPhase)?.description || ""}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {sessionId && (
            <span className="text-[8px] font-bold text-neutral-400 bg-neutral-100 px-2 py-1">
              SESSION: {sessionId.substring(0, 8)}...
            </span>
          )}
          <div className="w-12 h-12 bg-neutral-900 flex items-center justify-center text-kaosNeon">
            <Upload className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Phase Indicator */}
      <div className="bg-white border border-neutral-200 p-1">
        <div className="grid grid-cols-3 gap-1">
          {PHASES.map((phase, idx) => {
            const isActive = currentPhase === phase.id
            const isPast = PHASES.findIndex(p => p.id === currentPhase) > idx
            const Icon = phase.icon
            return (
              <button
                key={phase.id}
                onClick={() => {
                  // Permitir navegación solo a fases pasadas
                  if (isPast) setCurrentPhase(phase.id)
                }}
                disabled={!isPast && !isActive}
                className={cn(
                  "flex items-center gap-4 p-4 md:p-6 transition-all duration-300",
                  isActive && "bg-neutral-900 text-white",
                  isPast && "bg-kaosNeon/10 text-neutral-600 cursor-pointer hover:bg-kaosNeon/20",
                  !isActive && !isPast && "bg-neutral-50 text-neutral-300 cursor-not-allowed"
                )}
              >
                <div className={cn(
                  "w-10 h-10 flex items-center justify-center border-2 text-xs font-black transition-all",
                  isActive && "border-white text-white",
                  isPast && "border-neutral-900 text-neutral-900 bg-white",
                  !isActive && !isPast && "border-neutral-200 text-neutral-300"
                )}>
                  {isPast ? <CheckCircle2 className="h-5 w-5" /> : String(idx + 1).padStart(2, '0')}
                </div>
                <div className="hidden md:block">
                  <p className={cn(
                    "text-[9px] font-black uppercase tracking-widest",
                    isActive ? "text-white/60" : "text-neutral-400"
                  )}>
                    FASE {idx + 1}
                  </p>
                  <p className={cn(
                    "text-sm font-black uppercase tracking-tight",
                    isActive && "text-white"
                  )}>
                    {phase.label}
                  </p>
                </div>
                <div className="md:hidden">
                  <Icon className={cn(
                    "h-5 w-5",
                    isActive && "text-white",
                    isPast && "text-neutral-900"
                  )} />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Session Info Bar */}
      <div className="bg-white border border-neutral-200 p-4 flex flex-wrap items-center gap-6 text-[9px] font-bold uppercase tracking-widest text-neutral-500">
        <span className="flex items-center gap-1.5">
          <Package className="h-3.5 w-3.5" /> {drafts.length} Productos
        </span>
        <span className="flex items-center gap-1.5">
          <ImageIcon className="h-3.5 w-3.5" /> {images.length} Imágenes
        </span>
        <span className="flex items-center gap-1.5">
          <ListChecks className="h-3.5 w-3.5" /> {drafts.filter(d => d.errors.length === 0).length} Válidos
        </span>
        <span className="flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5" /> {drafts.reduce((s, d) => s + d.errors.length, 0)} Errores
        </span>
      </div>

      {/* Phase Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPhase}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {currentPhase === "upload" && (
            <BulkImageUploader
              sessionId={sessionId}
              existingAssets={assets}
              onImagesChange={handleImagesChange}
              onComplete={() => handlePhaseComplete("upload")}
            />
          )}

          {currentPhase === "edit" && (
            <BulkDraftEditor
              drafts={drafts}
              categories={categories}
              onDraftsChange={handleDraftsChange}
              onBack={() => handleBack("edit")}
              onComplete={() => handlePhaseComplete("edit")}
              assets={assets}
              allImages={images}
            />
          )}

          {currentPhase === "validate" && (
            <BulkValidationPanel
              drafts={drafts}
              sessionId={sessionId}
              onBack={() => handleBack("validate")}
              onComplete={handleComplete}
              onDraftsChange={handleDraftsChange}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #000; }
      `}</style>
    </div>
  )
}
