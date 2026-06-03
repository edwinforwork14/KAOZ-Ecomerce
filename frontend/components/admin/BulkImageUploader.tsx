"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Upload,
  X,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  FileWarning,
  Loader2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Search,
  ZoomIn,
  ZoomOut,
  Grid3x3,
  List,
  FileImage,
  HardDrive,
  Maximize2,
  Minimize2,
  ArrowRight,
  ScanLine
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { toast } from "sonner"

export interface UploadedImage {
  id: string
  originalName: string
  url: string
  size: number
  width?: number
  height?: number
  status: "pending" | "uploading" | "ready" | "error"
  error?: string
  selected?: boolean
}

interface BulkImageUploaderProps {
  sessionId: string | null
  existingAssets: Record<string, any>
  onImagesChange: (images: UploadedImage[], assetsMap: Record<string, any>) => void
  onComplete: () => void
}

export function BulkImageUploader({
  sessionId,
  existingAssets,
  onImagesChange,
  onComplete
}: BulkImageUploaderProps) {
  const [images, setImages] = useState<UploadedImage[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [dragOver, setDragOver] = useState(false)
  const [searchFilter, setSearchFilter] = useState("")
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Cargar assets existentes al montar
  useEffect(() => {
    if (existingAssets && Object.keys(existingAssets).length > 0) {
      const loaded: UploadedImage[] = Object.entries(existingAssets).map(([key, asset]: [string, any]) => ({
        id: key,
        originalName: asset.originalName || key,
        url: asset.url,
        size: asset.size || 0,
        width: asset.width,
        height: asset.height,
        status: "ready" as const
      }))
      setImages(loaded)
    }
  }, [existingAssets])

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
  }

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    
    // Validar formatos y tamaños
    const validFiles = fileArray.filter(file => {
      const ext = file.name.split('.').pop()?.toLowerCase()
      const allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'avif']
      if (!ext || !allowed.includes(ext)) {
        toast.error(`Formato no soportado: ${file.name}`)
        return false
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`Archivo demasiado grande: ${file.name} (máx. 10MB)`)
        return false
      }
      return true
    })

    if (validFiles.length === 0) return

    // Detectar duplicados
    const newImages: UploadedImage[] = []
    const duplicates: string[] = []

    validFiles.forEach(file => {
      const isDuplicate = images.some(img => img.originalName === file.name)
      if (isDuplicate) {
        duplicates.push(file.name)
        return
      }
      newImages.push({
        id: `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        originalName: file.name,
        url: URL.createObjectURL(file),
        size: file.size,
        status: "pending"
      })
    })

    if (duplicates.length > 0) {
      toast.warning(`${duplicates.length} archivo(s) duplicado(s) omitido(s)`)
    }

    if (newImages.length === 0) return

    setImages(prev => [...prev, ...newImages])
    setUploading(true)

    // Subir por lotes de 5
    const batchSize = 5
    const assetsMap: Record<string, any> = {}
    let uploaded = 0

    for (let i = 0; i < validFiles.length; i += batchSize) {
      const batch = validFiles.slice(i, i + batchSize)
      
      // Marcar como "uploading"
      setImages(prev => prev.map(img => 
        batch.some(f => f.name === img.originalName) 
          ? { ...img, status: "uploading" as const } 
          : img
      ))

      try {
        const formData = new FormData()
        batch.forEach(file => formData.append("images", file))

        const result = await api.uploadBulkImages(sessionId!, formData)

        if (result.success) {
          const sessionAssets = result.session?.assets || {}
          Object.entries(sessionAssets).forEach(([key, val]: [string, any]) => {
            assetsMap[key] = val
          })

          // Marcar como "ready" los que se subieron
          setImages(prev => prev.map(img => {
            const uploadedAsset = Object.entries(sessionAssets).find(
              ([_, a]: [string, any]) => a.originalName === img.originalName
            )
            if (uploadedAsset && img.status === "uploading") {
              return {
                ...img,
                id: uploadedAsset[0],
                url: (uploadedAsset[1] as any).url,
                width: (uploadedAsset[1] as any).width,
                height: (uploadedAsset[1] as any).height,
                status: "ready" as const
              }
            }
            return img
          }))
          uploaded += batch.length
        } else {
          throw new Error(result.error || "Error de servidor")
        }
      } catch (error: any) {
        // Marcar como error
        setImages(prev => prev.map(img => 
          batch.some(f => f.name === img.originalName)
            ? { ...img, status: "error" as const, error: error.message }
            : img
        ))
        toast.error(`Error al subir lote: ${error.message}`)
      }

      setUploadProgress(Math.round((uploaded / validFiles.length) * 100))
    }

    setUploading(false)
    setUploadProgress(100)

    // Notificar al padre
    const readyImages = images.filter(img => img.status === "ready")
    onImagesChange(readyImages, assetsMap)

    setTimeout(() => setUploadProgress(0), 1000)
  }, [images, sessionId, onImagesChange])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const removeImage = async (id: string) => {
    const image = images.find(img => img.id === id)
    if (!image) return

    // Revocar blob URL
    if (image.url.startsWith('blob:')) {
      URL.revokeObjectURL(image.url)
    }

    // Eliminar del servidor si está ready
    if (image.status === "ready" && sessionId) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/bulk/${sessionId}/assets/${encodeURIComponent(image.id)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${localStorage.getItem("kaoz_admin_token")}` }
        })
      } catch (e) {
        console.warn("No se pudo eliminar del servidor:", e)
      }
    }

    setImages(prev => prev.filter(img => img.id !== id))
    setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next })
  }

  const removeSelected = () => {
    selectedIds.forEach(id => {
      const img = images.find(i => i.id === id)
      if (img?.url.startsWith('blob:')) URL.revokeObjectURL(img.url)
    })
    setImages(prev => prev.filter(img => !selectedIds.has(img.id)))
    setSelectedIds(new Set())
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    const filtered = filteredImages
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(img => img.id)))
    }
  }

  const filteredImages = searchFilter
    ? images.filter(img => img.originalName.toLowerCase().includes(searchFilter.toLowerCase()))
    : images

  const stats = {
    total: images.length,
    ready: images.filter(i => i.status === "ready").length,
    uploading: images.filter(i => i.status === "uploading").length,
    error: images.filter(i => i.status === "error").length,
    pending: images.filter(i => i.status === "pending").length,
    totalSize: images.reduce((sum, i) => sum + i.size, 0)
  }

  return (
    <div className="space-y-8">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Activos", value: stats.total, icon: FileImage, color: "text-neutral-900" },
          { label: "Listos", value: stats.ready, icon: CheckCircle2, color: "text-green-600" },
          { label: "Subiendo", value: stats.uploading, icon: Loader2, color: "text-blue-600" },
          { label: "Errores", value: stats.error, icon: AlertCircle, color: "text-red-600" },
          { label: "Pendientes", value: stats.pending, icon: FileWarning, color: "text-amber-600" }
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-neutral-200 p-4 flex items-center gap-3 shadow-sm">
            <stat.icon className={cn("h-5 w-5 shrink-0", stat.color, stat.label === "Subiendo" && stats.uploading > 0 && "animate-spin")} />
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">{stat.label}</p>
              <p className={cn("text-xl font-black tracking-tight", stat.color)}>{String(stat.value).padStart(2, '0')}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Progress Bar */}
      <AnimatePresence>
        {uploadProgress > 0 && uploadProgress < 100 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-neutral-900 text-white p-4 flex items-center gap-4"
          >
            <Loader2 className="h-5 w-5 animate-spin text-kaosNeon shrink-0" />
            <div className="flex-1">
              <div className="flex justify-between mb-1">
                <span className="text-[9px] font-black uppercase tracking-widest">Procesando Activos...</span>
                <span className="text-[9px] font-black text-kaosNeon">{uploadProgress}%</span>
              </div>
              <div className="h-1 bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full bg-kaosNeon"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative border-2 border-dashed transition-all duration-300 p-16 flex flex-col items-center justify-center cursor-pointer group",
          dragOver
            ? "border-neutral-900 bg-neutral-50 scale-[1.01]"
            : "border-neutral-200 hover:border-neutral-400 bg-white"
        )}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif,image/avif"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />

        <motion.div
          animate={dragOver ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
          className="flex flex-col items-center gap-4"
        >
          <div className={cn(
            "w-20 h-20 border-2 flex items-center justify-center transition-all",
            dragOver ? "bg-neutral-900 border-neutral-900" : "bg-neutral-50 border-neutral-200 group-hover:bg-neutral-100 group-hover:border-neutral-400"
          )}>
            <Upload className={cn(
              "h-8 w-8 transition-colors",
              dragOver ? "text-white" : "text-neutral-400 group-hover:text-neutral-600"
            )} />
          </div>
          <div className="text-center">
            <p className={cn(
              "text-sm font-black uppercase tracking-tight transition-colors",
              dragOver ? "text-neutral-900" : "text-neutral-700"
            )}>
              {dragOver ? "SOLTAR ARCHIVOS AQUÍ" : "ARRASTRAR Y SOLTAR IMÁGENES"}
            </p>
            <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mt-1">
              o hacer clic para seleccionar · JPG, PNG, WEBP, HEIC · Máx. 10MB c/u
            </p>
          </div>
        </motion.div>
      </div>

      {/* Toolbar */}
      {images.length > 0 && (
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white border border-neutral-200 p-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
              <Input
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="FILTRAR POR NOMBRE..."
                className="pl-9 h-10 w-48 rounded-none border-neutral-200 text-[9px] font-bold uppercase tracking-widest"
              />
            </div>
            <div className="flex border border-neutral-200">
              <button
                onClick={() => setViewMode("grid")}
                className={cn("h-10 w-10 flex items-center justify-center transition-all", viewMode === "grid" ? "bg-neutral-900 text-white" : "text-neutral-400 hover:text-neutral-600")}
              >
                <Grid3x3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn("h-10 w-10 flex items-center justify-center transition-all", viewMode === "list" ? "bg-neutral-900 text-white" : "text-neutral-400 hover:text-neutral-600")}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectMode(!selectMode)}
              className={cn(
                "h-10 px-4 text-[9px] font-bold uppercase tracking-widest border transition-all",
                selectMode ? "bg-neutral-900 text-white border-neutral-900" : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
              )}
            >
              {selectMode ? "SALIR SELECCIÓN" : "SELECCIONAR"}
            </button>
            {selectMode && selectedIds.size > 0 && (
              <>
                <button
                  onClick={toggleSelectAll}
                  className="h-10 px-4 border border-neutral-200 text-[9px] font-bold uppercase tracking-widest text-neutral-600 hover:border-neutral-400"
                >
                  {selectedIds.size === filteredImages.length ? "DESELECCIONAR" : `SELECC. ${filteredImages.length}`}
                </button>
                <button
                  onClick={removeSelected}
                  className="h-10 px-4 border border-red-200 text-[9px] font-bold uppercase tracking-widest text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5 inline mr-1" />
                  ELIMINAR ({selectedIds.size})
                </button>
              </>
            )}
            <div className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest ml-4 hidden md:block">
              <HardDrive className="h-3.5 w-3.5 inline mr-1" />
              {formatSize(stats.totalSize)}
            </div>
          </div>
        </div>
      )}

      {/* Image Grid */}
      {filteredImages.length > 0 && (
        <div className={cn(
          viewMode === "grid"
            ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
            : "space-y-2"
        )}>
          <AnimatePresence>
            {filteredImages.map((image) => (
              <motion.div
                key={image.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={cn(
                  "group relative bg-white border transition-all",
                  image.status === "ready" && "border-neutral-200 hover:border-neutral-400 hover:shadow-md",
                  image.status === "error" && "border-red-300 bg-red-50/30",
                  image.status === "uploading" && "border-blue-200 bg-blue-50/30",
                  image.status === "pending" && "border-amber-200 border-dashed bg-amber-50/20",
                  selectMode && selectedIds.has(image.id) && "ring-2 ring-neutral-900 border-neutral-900",
                  viewMode === "list" && "flex items-center gap-4 p-3"
                )}
              >
                {/* Select Checkbox */}
                {selectMode && (
                  <div className={cn(
                    "absolute top-2 left-2 z-20",
                    viewMode === "list" && "relative top-0 left-0"
                  )}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(image.id)}
                      onChange={() => toggleSelect(image.id)}
                      className="w-4 h-4 accent-neutral-900 cursor-pointer"
                    />
                  </div>
                )}

                {/* Thumbnail */}
                {viewMode === "grid" ? (
                  <div className="aspect-square overflow-hidden bg-neutral-50 relative">
                    <img
                      src={image.url}
                      alt={image.originalName}
                      className={cn(
                        "w-full h-full object-cover transition-transform duration-500 group-hover:scale-105",
                        image.status === "error" && "opacity-50"
                      )}
                      loading="lazy"
                    />
                    
                    {/* Status Overlay */}
                    {image.status === "uploading" && (
                      <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center backdrop-blur-[1px]">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                      </div>
                    )}
                    {image.status === "error" && (
                      <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center backdrop-blur-[1px]">
                        <AlertCircle className="h-8 w-8 text-red-500" />
                      </div>
                    )}
                    {image.status === "pending" && (
                      <div className="absolute inset-0 bg-amber-500/5 flex items-center justify-center">
                        <FileWarning className="h-8 w-8 text-amber-500" />
                      </div>
                    )}
                    {image.status === "ready" && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500 drop-shadow-sm" />
                      </div>
                    )}

                    {/* Hover actions */}
                    <div className="absolute inset-x-0 bottom-0 p-2 translate-y-full group-hover:translate-y-0 transition-transform duration-200 flex gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); removeImage(image.id) }}
                        className="flex-1 bg-red-500 text-white h-8 text-[8px] font-bold uppercase tracking-widest hover:bg-red-600 transition-colors"
                      >
                        ELIMINAR
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 bg-neutral-50 overflow-hidden shrink-0 relative">
                      <img src={image.url} alt={image.originalName} className="w-full h-full object-cover" />
                      {image.status === "uploading" && <Loader2 className="absolute inset-0 m-auto h-5 w-5 animate-spin text-blue-600" />}
                      {image.status === "error" && <AlertCircle className="absolute inset-0 m-auto h-5 w-5 text-red-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-tight truncate text-neutral-800">{image.originalName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[8px] font-bold text-neutral-400">{formatSize(image.size)}</span>
                        {image.width && image.height && (
                          <>
                            <span className="text-[6px] text-neutral-300">|</span>
                            <span className="text-[8px] font-bold text-neutral-400">{image.width}×{image.height}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className={cn(
                      "text-[8px] font-bold uppercase px-1.5 py-0.5",
                      image.status === "ready" && "bg-green-100 text-green-700",
                      image.status === "uploading" && "bg-blue-100 text-blue-700",
                      image.status === "error" && "bg-red-100 text-red-700",
                      image.status === "pending" && "bg-amber-100 text-amber-700"
                    )}>
                      {image.status === "ready" ? "LISTO" : image.status === "uploading" ? "SUBIENDO" : image.status === "error" ? "ERROR" : "PENDIENTE"}
                    </span>
                    <button
                      onClick={() => removeImage(image.id)}
                      className="h-8 w-8 flex items-center justify-center text-neutral-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-200"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}

                {/* Info (grid mode) */}
                {viewMode === "grid" && (
                  <div className="p-3 border-t border-neutral-100">
                    <p className="text-[9px] font-bold uppercase tracking-tight truncate text-neutral-700" title={image.originalName}>{image.originalName}</p>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-bold text-neutral-400">{formatSize(image.size)}</span>
                        {image.width && image.height && (
                          <>
                            <span className="text-[6px] text-neutral-300">|</span>
                            <span className="text-[8px] font-bold text-neutral-400">{image.width}×{image.height}</span>
                          </>
                        )}
                      </div>
                      <span className={cn(
                        "text-[7px] font-bold uppercase px-1",
                        image.status === "ready" && "text-green-600",
                        image.status === "error" && "text-red-500",
                        image.status === "uploading" && "text-blue-500",
                        image.status === "pending" && "text-amber-500"
                      )}>
                        {image.status}
                      </span>
                    </div>
                  </div>
                )}

                {/* Error message */}
                {image.error && (
                  <div className="absolute -bottom-6 left-0 right-0">
                    <p className="text-[8px] font-bold text-red-500 truncate">{image.error}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Empty state */}
      {filteredImages.length === 0 && images.length > 0 && (
        <div className="border border-dashed border-neutral-200 p-12 text-center">
          <Search className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
          <p className="text-sm font-bold uppercase text-neutral-400">Sin resultados para &quot;{searchFilter}&quot;</p>
        </div>
      )}

      {/* Next Step Button */}
      {stats.ready > 0 && (
        <div className="flex justify-end border-t border-neutral-200 pt-8">
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">
                {stats.ready} activos listos · {stats.total - stats.ready} pendientes
              </p>
            </div>
            <Button
              onClick={onComplete}
              disabled={stats.ready === 0}
              className="rounded-none bg-neutral-900 text-white h-14 px-12 text-[10px] font-black uppercase tracking-widest hover:bg-neutral-800 transition-all disabled:opacity-50"
            >
              CONTINUAR A PRODUCTOS
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
