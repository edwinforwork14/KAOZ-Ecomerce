"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
  ArrowLeft, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Zap,
  ShieldCheck,
  Package
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export default function BulkUploadPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [jsonInput, setJsonInput] = useState("")
  const [previewData, setPreviewData] = useState<any[]>([])

  const handlePreview = () => {
    try {
      const data = JSON.parse(jsonInput)
      if (Array.isArray(data)) {
        setPreviewData(data)
      } else {
        toast({
          title: "ERROR DE FORMATO",
          description: "EL JSON DEBE SER UN ARRAY DE OBJETOS",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "JSON INVÁLIDO",
        description: "POR FAVOR REVISA LA SINTAXIS DEL JSON",
        variant: "destructive"
      })
    }
  }

  const handleUpload = async () => {
    if (previewData.length === 0) return
    setLoading(true)
    try {
      // Formatear datos para el backend
      const formattedData = previewData.map(d => ({
        name: d.name,
        description: d.description || "",
        price: parseFloat(d.price),
        category: d.category, // El backend debe manejar el ID o nombre
        brand: d.brand || "KAOS",
        gender: d.gender || "UNISEX",
        images: d.images || [],
        variants: d.variants || [],
        isFeatured: !!d.isFeatured,
        isNew: true
      }))

      const result = await api.bulkUploadProducts(formattedData)
      if (result.success) {
        toast({
          title: "PROTOCOLO COMPLETADO",
          description: `${result.count} PRODUCTOS SINCRONIZADOS CON EL CORE`,
        })
        router.push("/admin/products")
      }
    } catch (error: any) {
      toast({
        title: "FALLO DE SINCRONIZACIÓN",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-8 bg-transparent min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-black/10 pb-8">
        <div>
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-black/40 hover:text-black mb-4 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" /> VOLVER AL CATÁLOGO
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-kaosNeon animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-black/40">Inyección Masiva de Datos • KAOS</span>
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">
            Bulk Upload
          </h1>
          <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest mt-2">Protocolo de Carga Industrial</p>
        </div>
        <div className="flex items-center gap-6">
           <div className="flex flex-col items-end">
              <span className="text-[9px] font-black uppercase tracking-widest text-black/20">Modo de Carga</span>
              <span className="text-sm font-black text-kaosNeon">JSON INJECTION</span>
           </div>
           <div className="w-12 h-12 bg-black flex items-center justify-center text-kaosNeon">
              <Zap className="h-6 w-6" />
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Editor Side */}
        <div className="xl:col-span-7 space-y-6">
          <div className="bg-white border border-black p-8">
             <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-black text-white flex items-center justify-center"><FileText className="h-5 w-5" /></div>
                   <div>
                     <h3 className="text-xl font-black uppercase tracking-tighter">Editor de Manifiesto</h3>
                     <p className="text-[9px] font-bold text-black/30 uppercase tracking-widest">Pega el JSON estructurado aquí</p>
                   </div>
                </div>
                <Button 
                  variant="outline"
                  onClick={() => setJsonInput('[\n  {\n    "name": "PRODUCTO EJEMPLO",\n    "price": 29.99,\n    "category": "ID_CATEGORIA",\n    "brand": "KAOS",\n    "gender": "UNISEX"\n  }\n]')}
                  className="rounded-none border-black text-[10px] font-black uppercase tracking-widest hover:bg-black hover:text-white"
                >
                  CARGAR TEMPLATE
                </Button>
             </div>

             <textarea
               value={jsonInput}
               onChange={(e) => setJsonInput(e.target.value)}
               placeholder='[ { "name": "...", "price": ... } ]'
               className="w-full h-[400px] p-6 font-mono text-xs bg-black text-kaosNeon border-none focus:ring-0 resize-none custom-scrollbar"
             />

             <div className="mt-6 flex gap-4">
                <Button 
                  onClick={handlePreview}
                  className="flex-1 bg-black text-white rounded-none h-14 font-black uppercase tracking-widest hover:bg-gray-800 transition-all"
                >
                  VALIDAR ESTRUCTURA
                </Button>
                <Button 
                  onClick={handleUpload}
                  disabled={loading || previewData.length === 0}
                  className="flex-1 bg-kaosNeon text-black rounded-none h-14 font-black uppercase tracking-widest hover:brightness-110 disabled:opacity-50 transition-all"
                >
                  {loading ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Upload className="h-5 w-5 mr-2" /> 
                      INICIAR SINCRONIZACIÓN ({previewData.length})
                    </>
                  )}
                </Button>
             </div>
          </div>
        </div>

        {/* Info/Preview Side */}
        <div className="xl:col-span-5 space-y-6">
          <div className="bg-black text-white p-8">
             <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-kaosNeon text-black flex items-center justify-center"><ShieldCheck className="h-5 w-5" /></div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tighter text-white">Reglas de Integración</h3>
                  <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Requisitos del Esquema</p>
                </div>
             </div>

             <div className="space-y-4">
                {[
                  { field: "name", req: "REQUERIDO", desc: "Nombre comercial del producto" },
                  { field: "price", req: "REQUERIDO", desc: "Valor numérico (punto decimal)" },
                  { field: "category", req: "REQUERIDO", desc: "Nombre o ID de la categoría" },
                  { field: "brand", req: "OPCIONAL", desc: "Default: KAOS" },
                  { field: "variants", req: "REQUERIDO", desc: "Array de { color, sizes: [{ size, stock }] }" },
                ].map((rule, i) => (
                  <div key={i} className="border-b border-white/5 pb-4 last:border-0">
                    <div className="flex justify-between items-center mb-1">
                       <code className="text-kaosNeon font-black text-xs">{rule.field}</code>
                       <span className="text-[8px] font-black px-1.5 py-0.5 bg-white/10 text-white/40 uppercase">{rule.req}</span>
                    </div>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-tight">{rule.desc}</p>
                  </div>
                ))}
             </div>
          </div>

          {previewData.length > 0 && (
            <div className="bg-white border border-black p-8 animate-in fade-in slide-in-from-right-4 duration-500">
               <div className="flex items-center gap-3 mb-6">
                  <CheckCircle2 className="h-5 w-5 text-kaosNeon" />
                  <h3 className="text-xl font-black uppercase tracking-tighter">Preview de Inyección</h3>
               </div>
               <div className="space-y-3 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                  {previewData.map((item, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 bg-black/[0.02] border border-black/5">
                       <div className="w-8 h-8 bg-black flex items-center justify-center text-white"><Package className="w-4 h-4" /></div>
                       <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase truncate">{item.name || "PRODUCTO SIN NOMBRE"}</p>
                          <p className="text-[9px] font-bold text-black/30 uppercase tracking-widest">${item.price || "0.00"}</p>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}
        </div>
      </div>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #000; }
      `}</style>
    </div>
  )
}
