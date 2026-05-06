"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Heart, ShoppingBag, Minus, Plus, Check, Shield, Maximize2, Tag, Truck, Package, X, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCart } from "@/contexts/cart-context"
import { api } from "@/lib/api"
import { motion, AnimatePresence } from "framer-motion"

interface ProductDetailProps {
  product: any
  onBack: () => void
  onCheckout: () => void
}

export default function ProductDetail({ product: initialProduct, onBack, onCheckout }: ProductDetailProps) {
  const [product, setProduct] = useState(initialProduct)
  const [selectedColor, setSelectedColor] = useState("")
  const [selectedSize, setSelectedSize] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [currentImages, setCurrentImages] = useState<any[]>([])
  const { addItem } = useCart()

  useEffect(() => {
    window.scrollTo(0, 0)
    loadData()
  }, [initialProduct.id])

  const loadData = async () => {
    try {
      const result = await api.getProduct(initialProduct.id || initialProduct._id)
      if (result.success) {
        const prod = result.product
        setProduct(prod)
        
        if (prod.variants?.length > 0) {
          const firstVariant = prod.variants[0]
          setSelectedColor(firstVariant.color)
          setCurrentImages(prod.images || [])
          
          if (firstVariant.sizes?.length > 0) {
            setSelectedSize(firstVariant.sizes[0].size)
          }
        } else {
          setCurrentImages(prod.images || [])
        }
      }
    } catch (error) {
      console.error('Error loading product:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = async () => {
    const mainImage = currentImages[selectedImageIndex]?.url || product.images?.[0]?.url
    
    await addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: mainImage,
      size: selectedSize,
      color: selectedColor,
    }, quantity)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Navigation */}
      <div className="sticky top-20 z-40 bg-white/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-6 py-4">
          <Button variant="ghost" onClick={onBack} className="rounded-full group">
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Volver al catálogo
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Gallery */}
          <div className="space-y-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative aspect-[4/5] rounded-[2.5rem] overflow-hidden bg-secondary shadow-2xl"
            >
              <img 
                src={currentImages[selectedImageIndex]?.url || "/placeholder.svg"} 
                className="w-full h-full object-cover" 
                alt={product.name} 
              />
              <div className="absolute top-6 right-6">
                <Button size="icon" variant="secondary" className="rounded-full shadow-xl">
                  <Maximize2 className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>

            {currentImages.length > 1 && (
              <div className="grid grid-cols-5 gap-4">
                {currentImages.map((img, i) => (
                  <button 
                    key={i}
                    onClick={() => setSelectedImageIndex(i)}
                    className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all ${
                      selectedImageIndex === i ? "border-primary scale-105 shadow-lg" : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={img.url} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="outline" className="rounded-full px-4 py-1 text-[10px] uppercase tracking-widest font-bold">
                  {product.category?.name || "Premium"}
                </Badge>
                {product.is_new && (
                  <Badge className="bg-accent text-accent-foreground rounded-full px-4 py-1 text-[10px] uppercase tracking-widest font-bold">
                    Nuevo Ingreso
                  </Badge>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4 uppercase">{product.name}</h1>
              <div className="flex items-baseline gap-4">
                <span className="text-3xl font-bold text-primary">${product.price.toFixed(2)}</span>
                {product.original_price && (
                  <span className="text-xl text-muted-foreground line-through opacity-50">${product.original_price.toFixed(2)}</span>
                )}
              </div>
            </div>

            <div className="space-y-8">
              {/* Description */}
              <p className="text-muted-foreground leading-relaxed text-lg">
                {product.description}
              </p>

              {/* Variants */}
              {product.variants?.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-widest">Color: {selectedColor}</h3>
                  <div className="flex gap-3">
                    {product.variants.map((v: any) => (
                      <button 
                        key={v.color}
                        onClick={() => setSelectedColor(v.color)}
                        className={`w-12 h-12 rounded-full border-2 p-1 transition-all ${
                          selectedColor === v.color ? "border-primary scale-110 shadow-lg" : "border-transparent opacity-60"
                        }`}
                      >
                        <div className="w-full h-full rounded-full" style={{ backgroundColor: v.color_hex || '#000' }} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sizes */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest">Talla: {selectedSize}</h3>
                <div className="grid grid-cols-4 gap-3">
                  {['S', 'M', 'L', 'XL'].map((size) => (
                    <button 
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`py-4 rounded-2xl border-2 font-bold transition-all ${
                        selectedSize === size ? "bg-primary text-white border-primary shadow-xl scale-105" : "hover:border-primary/30"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-8">
                <div className="flex items-center gap-4 bg-secondary rounded-2xl px-4 py-2 border">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-2 hover:bg-white rounded-xl transition-colors">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-bold w-6 text-center">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="p-2 hover:bg-white rounded-xl transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <Button 
                  onClick={handleAddToCart}
                  className="flex-1 h-16 rounded-2xl bg-accent text-accent-foreground font-bold uppercase tracking-widest shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <ShoppingBag className="w-5 h-5 mr-3" /> Añadir al Carrito
                </Button>
                <Button size="icon" variant="outline" className="h-16 w-16 rounded-2xl shadow-xl">
                  <Heart className="w-6 h-6" />
                </Button>
              </div>

              {/* Trust */}
              <div className="grid grid-cols-2 gap-6 pt-12 border-t">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Envío Express</p>
                    <p className="text-xs text-muted-foreground">En 24/48 horas</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Pago Seguro</p>
                    <p className="text-xs text-muted-foreground">Cifrado de extremo a extremo</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}