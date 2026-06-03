"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  XCircle,
  Package,
  Image as ImageIcon,
  Palette,
  HardDrive,
  Bug,
  Check,
  X,
  ArrowLeft,
  ArrowRight,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Zap,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit3,
  Save,
  Ban,
  Clock
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ProductDraft } from "./BulkDraftEditor"
import { api } from "@/lib/api"
import { toast } from "sonner"

interface BulkValidationPanelProps {
  drafts: ProductDraft[]
  sessionId: string | null
  onBack: () => void
  onComplete: () => void
  onDraftsChange: (drafts: ProductDraft[]) => void
}

interface ValidationResult {
  total: number
  valid: number
  invalid: number
  totalErrors: number
  totalWarnings: number
  totalImages: number
  totalVariants: number
}

interface IssueRow {
  productIndex: number
  productName: string
  field: string
  type: "error" | "warning"
  description: string
  severity: "critical" | "minor"
}

export function BulkValidationPanel({
  drafts,
  sessionId,
  onBack,
  onComplete,
  onDraftsChange
}: BulkValidationPanelProps) {
  const [publishing, setPublishing] = useState(false)
  const [publishProgress, setPublishProgress] = useState(0)
  const [publishResults, setPublishResults] = useState<any>(null)
  const [selectedIssueIndex, setSelectedIssueIndex] = useState<number | null>(null)
  const [quickFixValue, setQuickFixValue] = useState("")
  const [expandedProduct, setExpandedProduct] = useState<number | null>(null)
  const [validating, setValidating] = useState(false)

  const validationResult: ValidationResult = useMemo(() => ({
    total: drafts.length,
    valid: drafts.filter(d => d.errors.length === 0).length,
    invalid: drafts.filter(d => d.errors.length > 0).length,
    totalErrors: drafts.reduce((sum, d) => sum + d.errors.length, 0),
    totalWarnings: drafts.reduce((sum, d) => sum + (d.warnings?.length || 0), 0),
    totalImages: drafts.reduce((sum, d) => sum + d.images.length, 0),
    totalVariants: drafts.reduce((sum, d) => sum + d.variants.length, 0)
  }), [drafts])

  const allIssues: IssueRow[] = useMemo(() => {
    const issues: IssueRow[] = []
    drafts.forEach((draft, di) => {
      draft.errors.forEach(err => {
        issues.push({
          productIndex: di,
          productName: draft.name,
          field: err.field,
          type: "error",
          description: err.message,
          severity: "critical"
        })
      })
      draft.warnings?.forEach(warn => {
        issues.push({
          productIndex: di,
          productName: draft.name,
          field: warn.field,
          type: "warning",
          description: warn.message,
          severity: "minor"
        })
      })
    })
    return issues
  }, [drafts])

  const canPublish = validationResult.invalid === 0 && validationResult.total > 0

  const handleQuickFix = (issue: IssueRow) => {
    const draft = drafts[issue.productIndex]
    if (!draft) return

    const field = issue.field
    if (field === "name") {
      const newName = quickFixValue.toUpperCase().trim()
      if (newName.length >= 3) {
        const updated = [...drafts]
        updated[issue.productIndex] = { ...draft, name: newName }
        onDraftsChange(updated)
        toast.success("Nombre corregido")
        setSelectedIssueIndex(null)
        setQuickFixValue("")
      }
    } else if (field === "price") {
      const val = parseFloat(quickFixValue)
      if (val > 0) {
        const updated = [...drafts]
        updated[issue.productIndex] = { ...draft, price: val }
        onDraftsChange(updated)
        toast.success("Precio corregido")
        setSelectedIssueIndex(null)
        setQuickFixValue("")
      }
    } else if (field === "images") {
      toast.warning("Asigna al menos una imagen desde la edición del producto")
    } else if (field === "categoryId") {
      toast.warning("Selecciona una categoría desde el editor del producto")
    }
  }

  const confirmPublish = async () => {
    const confirmMsg = `¿CONFIRMAR PUBLICACIÓN DE ${validationResult.valid} PRODUCTOS?\n\nEsta acción creará los productos en el sistema y no podrá deshacerse masivamente.`
    if (!window.confirm(confirmMsg)) return

    if (!sessionId) {
      toast.error("Sesión no disponible. Inicia una nueva carga.")
      return
    }

    setPublishing(true)
    setPublishProgress(0)

    try {
      // Guardar drafts actualizados primero
      const saveResult = await api.updateBulkDrafts(sessionId, drafts)
      if (!saveResult.success) {
        throw new Error(saveResult.error || "Error al guardar drafts")
      }

      // Publicar
      const result = await api.publishBulkSession(sessionId)

      if (result.success) {
        setPublishResults(result.results)
        setPublishProgress(100)
        toast.success(`${result.results.created} producto(s) creados exitosamente`)
        
        if (result.results.failed > 0) {
          toast.error(`${result.results.failed} producto(s) fallaron`)
        }
      } else {
        throw new Error(result.error || "Error al publicar")
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`)
    } finally {
      setPublishing(false)
    }
  }

  const getSeverityIcon = (type: string) => {
    if (type === "error") return <XCircle className="h-4 w-4 text-red-500" />
    return <AlertTriangle className="h-4 w-4 text-amber-500" />
  }

  // Render results after publishing
  if (publishResults) {
    const hasErrors = publishResults.failed > 0 || publishResults.errors?.length > 0
    return (
      <div className="space-y-8">
        <div className={cn(
          "border-2 p-12 text-center",
          hasErrors ? "border-amber-500 bg-amber-50/30" : "border-green-500 bg-green-50/30"
        )}>
          <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center border-2 border-neutral-900">
            {hasErrors ? (
              <AlertCircle className="h-10 w-10 text-amber-500" />
            ) : (
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            )}
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">
            {hasErrors ? "PUBLICACIÓN PARCIAL" : "PUBLICACIÓN EXITOSA"}
          </h2>
          <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest mb-8">
            {publishResults.created} producto(s) creados · {publishResults.failed} fallos · {publishResults.skipped} omitidos
          </p>

          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mb-8">
            {[
              { label: "Creados", value: publishResults.created, color: "text-green-600" },
              { label: "Fallidos", value: publishResults.failed, color: "text-red-600" },
              { label: "Omitidos", value: publishResults.skipped, color: "text-amber-600" }
            ].map((s, i) => (
              <div key={i} className="bg-white border border-neutral-200 p-4">
                <p className="text-[8px] font-bold uppercase tracking-widest text-neutral-400">{s.label}</p>
                <p className={cn("text-2xl font-black", s.color)}>{String(s.value).padStart(2, '0')}</p>
              </div>
            ))}
          </div>

          {publishResults.errors?.length > 0 && (
            <div className="max-w-lg mx-auto text-left space-y-2 mb-8">
              <p className="text-[9px] font-bold uppercase tracking-widest text-red-600">Errores de publicación:</p>
              {publishResults.errors.map((err: any, i: number) => (
                <div key={i} className="bg-red-50 border border-red-100 p-3 text-[9px] font-bold text-red-700">
                  {err.name}: {err.error}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-4 justify-center">
            <Button
              onClick={onComplete}
              className="rounded-none bg-neutral-900 text-white h-14 px-12 text-[10px] font-black uppercase tracking-widest hover:bg-neutral-800"
            >
              VOLVER AL CATÁLOGO
            </Button>
            {hasErrors && (
              <Button
                onClick={() => setPublishResults(null)}
                variant="outline"
                className="rounded-none border-neutral-200 h-14 px-10 text-[10px] font-bold uppercase tracking-widest"
              >
                REVISAR ERRORES
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Validation Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Productos", value: validationResult.total, icon: Package, color: "text-neutral-900" },
          { label: "Válidos", value: validationResult.valid, icon: CheckCircle2, color: "text-green-600" },
          { label: "Con Errores", value: validationResult.invalid, icon: XCircle, color: "text-red-600" },
          { label: "Advertencias", value: validationResult.totalWarnings, icon: AlertTriangle, color: "text-amber-600" }
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-neutral-200 p-5 flex items-center gap-4 shadow-sm">
            <stat.icon className={cn("h-6 w-6 shrink-0", stat.color)} />
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">{stat.label}</p>
              <p className={cn("text-2xl font-black tracking-tight", stat.color)}>
                {String(stat.value).padStart(2, '0')}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Secondary stats */}
      <div className="flex items-center gap-6 bg-white border border-neutral-200 p-4">
        {[
          { label: "Imágenes", value: validationResult.totalImages, icon: ImageIcon },
          { label: "Variantes", value: validationResult.totalVariants, icon: Palette },
          { label: "Errores", value: validationResult.totalErrors, icon: Bug },
        ].map((stat, i) => (
          <div key={i} className="flex items-center gap-2">
            <stat.icon className="h-4 w-4 text-neutral-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">
              {stat.label}: <span className="text-neutral-900">{stat.value}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Issues Table */}
      {allIssues.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black uppercase tracking-tight text-neutral-900">
              TABLA DE INCIDENCIAS
            </h3>
            <Badge variant="outline" className="rounded-none border-neutral-200 text-[9px] font-bold">
              {allIssues.length} problema(s)
            </Badge>
          </div>
          <div className="border border-neutral-200 overflow-hidden bg-white">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-4 py-3 text-[8px] font-bold uppercase tracking-widest text-neutral-500 text-left">Producto</th>
                  <th className="px-4 py-3 text-[8px] font-bold uppercase tracking-widest text-neutral-500 text-left">Campo</th>
                  <th className="px-4 py-3 text-[8px] font-bold uppercase tracking-widest text-neutral-500 text-left">Tipo</th>
                  <th className="px-4 py-3 text-[8px] font-bold uppercase tracking-widest text-neutral-500 text-left">Descripción</th>
                  <th className="px-4 py-3 text-[8px] font-bold uppercase tracking-widest text-neutral-500 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {allIssues.map((issue, idx) => (
                  <tr
                    key={idx}
                    className={cn(
                      "transition-colors",
                      issue.type === "error" ? "hover:bg-red-50/50" : "hover:bg-amber-50/50",
                      selectedIssueIndex === idx && "bg-neutral-50"
                    )}
                  >
                    <td className="px-4 py-3">
                      <span className="text-[9px] font-bold uppercase text-neutral-800">{issue.productName || "SIN NOMBRE"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-[8px] font-bold bg-neutral-100 px-1.5 py-0.5 text-neutral-600">{issue.field}</code>
                    </td>
                    <td className="px-4 py-3">
                      {getSeverityIcon(issue.type)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "text-[9px] font-bold",
                        issue.type === "error" ? "text-red-700" : "text-amber-700"
                      )}>
                        {issue.description}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setSelectedIssueIndex(selectedIssueIndex === idx ? null : idx)
                          setQuickFixValue("")
                        }}
                        className="text-[8px] font-bold uppercase tracking-widest text-neutral-500 hover:text-neutral-900 border border-neutral-200 hover:border-neutral-400 px-3 py-1.5 transition-all"
                      >
                        CORREGIR
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Quick Fix Panel */}
          <AnimatePresence>
            {selectedIssueIndex !== null && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-neutral-900 text-white p-6 mt-4"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Zap className="h-5 w-5 text-kaosNeon" />
                    <div>
                      <p className="text-sm font-black uppercase tracking-tight">CORRECCIÓN RÁPIDA</p>
                      <p className="text-[9px] text-white/50 uppercase tracking-widest">
                        {allIssues[selectedIssueIndex]?.productName} → {allIssues[selectedIssueIndex]?.field}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedIssueIndex(null)}
                    className="text-white/50 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex gap-4">
                  <Input
                    value={quickFixValue}
                    onChange={(e) => setQuickFixValue(e.target.value)}
                    placeholder="NUEVO VALOR..."
                    className="flex-1 rounded-none border-white/20 bg-white/10 text-white placeholder:text-white/30 h-12 text-xs font-bold uppercase"
                  />
                  <Button
                    onClick={() => handleQuickFix(allIssues[selectedIssueIndex])}
                    disabled={!quickFixValue.trim()}
                    className="rounded-none bg-kaosNeon text-black h-12 px-8 text-[10px] font-black uppercase tracking-widest hover:brightness-110"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    APLICAR
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setExpandedProduct(allIssues[selectedIssueIndex].productIndex)
                      setSelectedIssueIndex(null)
                    }}
                    className="rounded-none border-white/20 text-white h-12 px-6 text-[9px] font-bold uppercase tracking-widest"
                  >
                    <Edit3 className="h-4 w-4 mr-1" />
                    EDITAR COMPLETO
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Product details for issues */}
      {expandedProduct !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="border border-neutral-200 bg-white p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-black uppercase tracking-tight">
              {drafts[expandedProduct]?.name || "Producto"}
            </h4>
            <button onClick={() => setExpandedProduct(null)} className="text-neutral-400 hover:text-neutral-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3">
            {drafts[expandedProduct]?.errors.map((err, idx) => (
              <div key={idx} className="flex items-center gap-2 text-[9px] font-bold text-red-600 bg-red-50 border border-red-100 px-3 py-2">
                <XCircle className="h-3.5 w-3.5 shrink-0" /> {err.field}: {err.message}
              </div>
            ))}
            {drafts[expandedProduct]?.warnings?.map((warn, idx) => (
              <div key={idx} className="flex items-center gap-2 text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {warn.field}: {warn.message}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* All Valid Message */}
      {canPublish && allIssues.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-2 border-green-200 bg-green-50/50 p-10 text-center"
        >
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-black uppercase tracking-tight text-green-800 mb-2">
            TODOS LOS PRODUCTOS SON VÁLIDOS
          </h3>
          <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest">
            {validationResult.valid} producto(s) listos para publicar
          </p>
        </motion.div>
      )}

      {/* Progress during publishing */}
      <AnimatePresence>
        {publishing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-neutral-900 text-white p-6"
          >
            <div className="flex items-center gap-4">
              <Loader2 className="h-6 w-6 animate-spin text-kaosNeon" />
              <div className="flex-1">
                <p className="text-sm font-black uppercase tracking-tight">PUBLICANDO PRODUCTOS...</p>
                <div className="mt-2 h-1.5 bg-white/10 overflow-hidden">
                  <motion.div
                    className="h-full bg-kaosNeon"
                    initial={{ width: 0 }}
                    animate={{ width: `${publishProgress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <p className="text-[9px] text-white/50 mt-1 uppercase tracking-widest">
                  Procesando lote...
                </p>
              </div>
              <span className="text-2xl font-black text-kaosNeon">{publishProgress}%</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between border-t border-neutral-200 pt-8">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={publishing}
          className="rounded-none border-neutral-200 h-14 px-10 text-[10px] font-bold uppercase tracking-widest"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          VOLVER A PRODUCTOS
        </Button>

        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={onComplete}
            disabled={publishing}
            className="rounded-none border-neutral-200 h-14 px-8 text-[10px] font-bold uppercase tracking-widest"
          >
            CANCELAR
          </Button>
          {canPublish && (
            <Button
              onClick={confirmPublish}
              disabled={publishing}
              className="rounded-none bg-neutral-900 text-white h-14 px-12 text-[10px] font-black uppercase tracking-widest hover:bg-neutral-800 transition-all disabled:opacity-50"
            >
              {publishing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  PUBLICANDO...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  CONFIRMAR PUBLICACIÓN ({validationResult.valid})
                </>
              )}
            </Button>
          )}
          {!canPublish && (
            <div className="flex items-center gap-3 px-6 bg-red-50 border border-red-200">
              <Ban className="h-4 w-4 text-red-500" />
              <span className="text-[9px] font-bold text-red-700 uppercase tracking-widest">
                CORRIGE {validationResult.invalid} ERROR(ES) PARA PUBLICAR
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
