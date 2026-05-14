"use client"

import React, { useState } from "react"
import { Plus, Trash2, Image as ImageIcon, X, ChevronDown, ChevronUp, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"
import { api, cleanImageUrl } from "@/lib/api"
import { toast } from "sonner"

interface SizeStock {
  size: string
  stock: number
  sku?: string
}

interface VariantImage {
  url: string
  isMain?: boolean
}

interface Variant {
  id?: string
  color: string
  colorHex: string
  images: VariantImage[]
  sizes: SizeStock[]
}

interface ProductVariantEditorProps {
  variants: Variant[]
  onChange: (variants: Variant[]) => void
  availableSizes?: string[]
}

export function ProductVariantEditor({ variants, onChange, availableSizes = [] }: ProductVariantEditorProps) {
  const [uploading, setUploading] = useState<number | null>(null)

  const addVariant = () => {
    console.log("➕ [VariantEditor] Añadiendo nueva variante con tallas:", availableSizes);
    const newVariant: Variant = {
      color: "",
      colorHex: "#000000",
      images: [],
      sizes: availableSizes.map(size => ({ size, stock: 0 }))
    }
    onChange([...variants, newVariant])
  }

  const removeVariant = (index: number) => {
    const newVariants = [...variants]
    newVariants.splice(index, 1)
    onChange(newVariants)
  }

  const updateVariant = (index: number, field: keyof Variant, value: any) => {
    console.log(`🎨 [VariantEditor] Actualizando VARIANTE index:${index}, campo:${field}:`, value);
    const newVariants = [...variants]
    newVariants[index] = { ...newVariants[index], [field]: value }
    onChange(newVariants)
  }

  const addSize = (variantIndex: number) => {
    const newVariants = [...variants]
    newVariants[variantIndex].sizes.push({ size: "", stock: 0 })
    onChange(newVariants)
  }

  const removeSize = (variantIndex: number, sizeIndex: number) => {
    const newVariants = [...variants]
    newVariants[variantIndex].sizes.splice(sizeIndex, 1)
    onChange(newVariants)
  }

  const updateSize = (variantIndex: number, sizeIndex: number, field: keyof SizeStock, value: any) => {
    console.log(`📏 [VariantEditor] Actualizando TALLA var:${variantIndex}, size:${sizeIndex}, campo:${field}:`, value);
    const newVariants = [...variants]
    const size = newVariants[variantIndex].sizes[sizeIndex]
    newVariants[variantIndex].sizes[sizeIndex] = { ...size, [field]: value }
    onChange(newVariants)
  }

   const handleImageUpload = async (variantIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return

    const files = Array.from(e.target.files);
    console.log(`🖼️ [VariantEditor] Iniciando carga de ${files.length} imágenes para VARIANTE index:${variantIndex}`);
    setUploading(variantIndex)
    const formData = new FormData()
    files.forEach((file) => {
      formData.append("images", file)
    })

    try {
      // Usar endpoint de carga temporal
      console.log("📤 [VariantEditor] Enviando a temp-upload...");
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/temp-upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("kaoz_admin_token")}`,
        },
        body: formData,
      })

      const data = await response.json()
      console.log("🏁 [VariantEditor] Respuesta de subida:", data);

      if (data.success) {
        const newImages = data.urls.map((url: string) => ({ url, isMain: false }))
        const updatedImages = [...variants[variantIndex].images, ...newImages]
        console.log("✨ [VariantEditor] Nuevas imágenes añadidas a la variante:", updatedImages);
        updateVariant(variantIndex, "images", updatedImages)
        toast.success("Imágenes subidas correctamente")
      } else {
        console.error("❌ [VariantEditor] Error del servidor al subir:", data);
        toast.error("Error al subir imágenes")
      }
    } catch (error) {
      console.error("💥 [VariantEditor] Excepción en subida:", error)
      toast.error("Error de conexión al subir imágenes")
    } finally {
      setUploading(null)
    }
  }

  const removeImage = (variantIndex: number, imageIndex: number) => {
    const newImages = [...variants[variantIndex].images]
    newImages.splice(imageIndex, 1)
    updateVariant(variantIndex, "images", newImages)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-white">Variantes y Stock</h3>
          <p className="text-sm text-zinc-400">Gestiona los colores, imágenes y existencias por talla.</p>
        </div>
        <Button onClick={addVariant} variant="outline" className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800">
          <Plus className="mr-2 h-4 w-4" />
          Añadir Variante
        </Button>
      </div>

      <AnimatePresence>
        {variants.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-dashed border-zinc-800 p-12 text-center"
          >
            <Palette className="mx-auto h-12 w-12 text-zinc-700" />
            <h4 className="mt-4 text-zinc-300">No hay variantes definidas</h4>
            <p className="mt-1 text-sm text-zinc-500">Añade una variante para configurar tallas y stock.</p>
            <Button onClick={addVariant} variant="link" className="mt-4 text-indigo-400">
              Crear mi primera variante
            </Button>
          </motion.div>
        ) : (
          <Accordion type="multiple" className="space-y-4">
            {variants.map((variant, vIdx) => (
              <AccordionItem
                key={vIdx}
                value={`variant-${vIdx}`}
                className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-sm"
              >
                <div className="flex items-center px-4 py-2">
                  <AccordionTrigger className="flex-1 hover:no-underline">
                    <div className="flex items-center gap-4">
                      <div
                        className="h-6 w-6 rounded-full border border-zinc-700 shadow-inner"
                        style={{ backgroundColor: variant.colorHex }}
                      />
                      <span className="font-medium text-zinc-200">{variant.color}</span>
                      <Badge variant="outline" className="border-zinc-800 text-zinc-500">
                        {variant.sizes.length} tallas
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeVariant(vIdx)
                    }}
                    className="h-8 w-8 text-zinc-500 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <AccordionContent className="border-t border-zinc-900 p-6">
                  <div className="grid gap-8 md:grid-cols-2">
                    {/* Configuración de Color */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-zinc-400">Nombre del Color</Label>
                          <Input
                            value={variant.color}
                            onChange={(e) => updateVariant(vIdx, "color", e.target.value)}
                            className="border-zinc-800 bg-zinc-900 text-white focus:ring-indigo-500"
                            placeholder="Ej: Azul Marino"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-zinc-400">Código Hex</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={variant.colorHex}
                              onChange={(e) => updateVariant(vIdx, "colorHex", e.target.value)}
                              className="h-10 w-12 cursor-pointer border-none bg-transparent p-0"
                            />
                            <Input
                              value={variant.colorHex}
                              onChange={(e) => updateVariant(vIdx, "colorHex", e.target.value)}
                              className="flex-1 border-zinc-800 bg-zinc-900 text-white uppercase"
                              placeholder="#000000"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Imágenes de la Variante */}
                      <div className="space-y-2">
                        <Label className="text-zinc-400">Imágenes de la Variante</Label>
                        <div className="grid grid-cols-4 gap-2">
                          {variant.images.map((img, imgIdx) => (
                            <div key={imgIdx} className="group relative aspect-square rounded-lg border border-zinc-800 bg-zinc-900">
                              <img src={cleanImageUrl(img.url)} alt="Variant" className="h-full w-full object-cover rounded-lg" />
                              <button
                                onClick={() => removeImage(vIdx, imgIdx)}
                                className="absolute -right-1 -top-1 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 transition-colors">
                            {uploading === vIdx ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                            ) : (
                              <>
                                <Plus className="h-5 w-5 text-zinc-500" />
                                <span className="mt-1 text-[10px] text-zinc-500 uppercase">Subir</span>
                              </>
                            )}
                            <input
                              type="file"
                              multiple
                              className="hidden"
                              onChange={(e) => handleImageUpload(vIdx, e)}
                              disabled={uploading !== null}
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Stock por Talla */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-zinc-400">Tallas e Inventario</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => addSize(vIdx)}
                          className="h-7 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10"
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          Añadir Talla
                        </Button>
                      </div>

                      <div className="rounded-lg border border-zinc-900 overflow-hidden">
                        <Table>
                          <TableHeader className="bg-zinc-900/50">
                            <TableRow className="border-zinc-800 hover:bg-transparent">
                              <TableHead className="w-[100px] text-zinc-500">Talla</TableHead>
                              <TableHead className="text-zinc-500">Stock</TableHead>
                              <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {variant.sizes.map((size, sIdx) => (
                              <TableRow key={sIdx} className="border-zinc-800 hover:bg-zinc-900/30">
                                <TableCell className="py-2">
                                  <Input
                                    value={size.size}
                                    onChange={(e) => updateSize(vIdx, sIdx, "size", e.target.value)}
                                    className="h-8 border-zinc-800 bg-transparent text-white focus:bg-zinc-800"
                                    placeholder="Ej: XL"
                                  />
                                </TableCell>
                                <TableCell className="py-2">
                                  <Input
                                    type="number"
                                    value={size.stock}
                                    onChange={(e) => updateSize(vIdx, sIdx, "stock", parseInt(e.target.value) || 0)}
                                    className="h-8 border-zinc-800 bg-transparent text-white focus:bg-zinc-800"
                                  />
                                </TableCell>
                                <TableCell className="py-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeSize(vIdx, sIdx)}
                                    className="h-8 w-8 text-zinc-600 hover:text-red-400"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </AnimatePresence>
    </div>
  )
}
