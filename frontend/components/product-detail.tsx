"use client"

import { useState, useEffect } from "react"
import { useCart } from "@/contexts/cart-context"
import { api } from "@/lib/api"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ShoppingBag, Plus, Minus, Truck, ShieldCheck, Check } from "lucide-react"

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
  const [isAdded, setIsAdded] = useState(false)

  // Obtener la variante actual basada en el color seleccionado
  const currentVariant = product.variants?.find((v: any) => v.color === selectedColor)
  
  // Obtener las tallas disponibles para el color seleccionado
  const availableSizes = currentVariant?.sizes || []
  
  // Obtener el stock de la talla seleccionada
  const currentSizeData = availableSizes.find((s: any) => s.size === selectedSize)
  const currentStock = currentSizeData?.stock || 0
  const isOutOfStock = currentStock <= 0

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
          
          const initialImgs = firstVariant.images?.length > 0 ? firstVariant.images : (prod.images || [])
          setCurrentImages(initialImgs)
          
          if (firstVariant.sizes?.length > 0) {
            // Seleccionar la primera talla que tenga stock si es posible
            const sizeWithStock = firstVariant.sizes.find((s: any) => s.stock > 0) || firstVariant.sizes[0]
            setSelectedSize(sizeWithStock.size)
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
    if (isOutOfStock) return

    const mainImage = currentImages[selectedImageIndex]?.url || product.images?.[0]?.url
    
    await addItem({
      id: product.id || product._id,
      name: product.name,
      price: product.price,
      image: mainImage,
      size: selectedSize,
      color: selectedColor,
    }, quantity)

    setIsAdded(true)
    setTimeout(() => setIsAdded(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="w-12 h-12 rounded-full border-4 border-gray-100 border-t-black animate-spin mb-4"></div>
        <span className="font-black text-[10px] uppercase tracking-widest text-gray-400">Cargando colección...</span>
      </div>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen bg-white"
    >
      {/* Navigation Header */}
      <div className="bg-white py-6 px-4 md:px-10 flex justify-between items-center border-b border-gray-100 sticky top-0 z-50">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-black transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Volver al Catálogo
        </button>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 md:px-10 py-10 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
          
          {/* Left: Image Gallery */}
          <div className="space-y-6">
            <div className="relative aspect-[4/5] bg-gray-50 rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
              <AnimatePresence mode="wait">
                <motion.img 
                  key={selectedImageIndex}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  src={currentImages[selectedImageIndex]?.url || "/placeholder.svg"} 
                  className={`w-full h-full object-cover ${isOutOfStock ? 'grayscale opacity-80' : ''}`} 
                  alt={product.name} 
                />
              </AnimatePresence>
              
              <div className="absolute top-6 left-6 z-10 flex flex-col gap-2">
                {product.isNew && (
                  <span className="bg-kaosNeon text-black font-black uppercase text-[10px] tracking-widest px-4 py-2 rounded-full shadow-lg">
                    Nuevo
                  </span>
                )}
                {isOutOfStock && (
                  <span className="bg-red-500 text-white font-black uppercase text-[10px] tracking-widest px-4 py-2 rounded-full shadow-lg">
                    Agotado
                  </span>
                )}
              </div>
            </div>

            {currentImages.length > 1 && (
              <div className="grid grid-cols-5 gap-3 md:gap-4">
                {currentImages.map((img, i) => (
                  <button 
                    key={i}
                    onClick={() => setSelectedImageIndex(i)}
                    className={`relative aspect-square rounded-2xl overflow-hidden transition-all duration-300 ${
                      selectedImageIndex === i 
                        ? "ring-2 ring-black ring-offset-2 scale-100" 
                        : "opacity-60 hover:opacity-100 hover:scale-105"
                    }`}
                  >
                    <img src={img.url} className={`w-full h-full object-cover bg-gray-50 ${isOutOfStock ? 'grayscale' : ''}`} alt={`View ${i+1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Technical Specs */}
          <div className="flex flex-col">
            <div className="space-y-6 mb-10">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  {product.category?.name || "URBAN"}
                </span>
                <div className="w-1.5 h-1.5 rounded-full bg-kaosNeon"></div>
                {currentStock > 0 && currentStock < 5 && (
                  <span className="text-[10px] font-black uppercase tracking-widest text-red-500 animate-pulse">
                    ¡Últimas {currentStock} unidades!
                  </span>
                )}
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black uppercase leading-[0.9] tracking-tighter italic text-black">
                {product.name}
              </h1>
              
              <div className="flex items-end gap-4 pt-2">
                <span className="text-3xl font-black text-black leading-none">${product.price.toFixed(2)}</span>
                {product.originalPrice && (
                  <span className="text-sm font-bold text-gray-400 line-through mb-1">${product.originalPrice.toFixed(2)}</span>
                )}
              </div>
            </div>

            <div className="space-y-10 flex-1">
              {/* Description */}
              <p className="text-sm md:text-base text-gray-600 leading-relaxed font-medium">
                {product.description || "Prenda diseñada para movimiento continuo, asegurando confort total durante entrenamientos intensos y rutinas diarias."}
              </p>

              <hr className="border-gray-100" />

              {/* Variants */}
              {product.variants?.length > 0 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-black">Color</h3>
                    <span className="text-xs font-bold text-gray-400 uppercase">{selectedColor}</span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {product.variants.map((v: any) => {
                      const hasColorStock = v.sizes.some((s: any) => s.stock > 0)
                      return (
                        <button 
                          key={v.color}
                          onClick={() => {
                            setSelectedColor(v.color)
                            // Actualizar galería de imágenes para la variante seleccionada
                            const variantImages = v.images?.length > 0 ? v.images : product.images;
                            setCurrentImages(variantImages);
                            setSelectedImageIndex(0);

                            // Al cambiar color, intentar mantener la misma talla o elegir una con stock
                            const hasSizeInNewColor = v.sizes.find((s: any) => s.size === selectedSize && s.stock > 0)
                            if (!hasSizeInNewColor) {
                              const firstSizeWithStock = v.sizes.find((s: any) => s.stock > 0)
                              if (firstSizeWithStock) setSelectedSize(firstSizeWithStock.size)
                            }
                          }}
                          className="relative group flex items-center justify-center"
                        >
                          <div 
                            className={`w-12 h-12 rounded-full border-2 transition-all ${
                              selectedColor === v.color 
                                ? "border-black ring-4 ring-black/5 scale-110 shadow-md" 
                                : "border-white shadow-sm hover:scale-105"
                            } ${!hasColorStock ? 'opacity-40' : ''}`}
                            style={{ backgroundColor: v.colorHex || '#000' }} 
                          />
                          {!hasColorStock && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="w-8 h-0.5 bg-red-500/50 rotate-45" />
                            </div>
                          )}
                          {selectedColor === v.color && hasColorStock && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className={`w-3 h-3 rounded-full ${v.color.toLowerCase() === 'blanco' || v.color.toLowerCase() === 'white' ? 'bg-black' : 'bg-white shadow-sm'}`} />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Sizes */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-black">Talla</h3>
                  <button className="text-[10px] font-black uppercase tracking-widest text-gray-400 underline decoration-gray-300 hover:text-black hover:decoration-black transition-colors">
                    Guía de tallas
                  </button>
                </div>
                <div className="grid grid-cols-4 md:grid-cols-5 gap-3">
                  {availableSizes.length > 0 ? (
                    availableSizes.map((s: any) => {
                      const hasStock = s.stock > 0
                      return (
                        <button 
                          key={s.size}
                          disabled={!hasStock}
                          onClick={() => setSelectedSize(s.size)}
                          className={`relative py-4 rounded-2xl font-black text-xs uppercase transition-all duration-300 border-2 overflow-hidden ${
                            selectedSize === s.size 
                              ? "bg-black text-white border-black shadow-lg scale-105" 
                              : hasStock
                                ? "bg-white text-gray-500 border-gray-100 hover:border-gray-300 hover:bg-gray-50"
                                : "bg-gray-50 text-gray-300 border-gray-50 cursor-not-allowed"
                          }`}
                        >
                          <span className={!hasStock ? "opacity-40" : ""}>{s.size}</span>
                          {!hasStock && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-full h-0.5 bg-gray-200 -rotate-45" />
                            </div>
                          )}
                        </button>
                      )
                    })
                  ) : (
                    ['S', 'M', 'L', 'XL', 'XXL'].map((size) => (
                      <div key={size} className="py-4 rounded-2xl bg-gray-50 border-2 border-gray-50 flex items-center justify-center opacity-30">
                        <span className="font-black text-xs text-gray-300">{size}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                {!isOutOfStock && (
                  <div className="flex items-center bg-gray-50 rounded-full border border-gray-100 px-2 h-16 w-full sm:w-auto shrink-0">
                    <button 
                      onClick={() => setQuantity(Math.max(1, quantity - 1))} 
                      className="p-3 hover:bg-white rounded-full transition-colors text-black"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-black text-sm w-12 text-center">{quantity}</span>
                    <button 
                      onClick={() => setQuantity(Math.min(currentStock, quantity + 1))} 
                      className="p-3 hover:bg-white rounded-full transition-colors text-black"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                <button 
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className={`flex-1 rounded-full h-16 font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 transition-all duration-300 shadow-xl ${
                    isOutOfStock
                      ? "bg-gray-100 text-gray-400 border-2 border-gray-200 cursor-not-allowed shadow-none"
                      : isAdded 
                        ? "bg-kaosNeon text-black border-2 border-transparent" 
                        : "bg-black text-white hover:bg-kaosNeon hover:text-black border-2 border-black hover:border-transparent hover:shadow-2xl hover:-translate-y-1"
                  }`}
                >
                  {isOutOfStock ? (
                    "Agotado"
                  ) : isAdded ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2">
                      <Check className="w-5 h-5" />
                      Agregado
                    </motion.div>
                  ) : (
                    <>
                      <ShoppingBag className="w-5 h-5" />
                      Añadir al Carrito
                    </>
                  )}
                </button>
              </div>

              {/* Out of Stock Warning */}
              {isOutOfStock && (
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest text-center mt-2 animate-bounce">
                  Este producto no está disponible en la combinación seleccionada.
                </p>
              )}

              {/* Trust Footer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-10 mt-10 border-t border-gray-100">
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50">
                  <Truck className="w-6 h-6 text-black shrink-0" />
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase tracking-tight text-black">Envío Seguro</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">A todo el país</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50">
                  <ShieldCheck className="w-6 h-6 text-black shrink-0" />
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase tracking-tight text-black">Pago Protegido</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Datos encriptados</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}