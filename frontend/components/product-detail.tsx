"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Heart, ShoppingBag, Minus, Plus, Check, Shield, ChevronLeft, ChevronRight, X, Maximize2, Tag, Truck, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCart } from "@/contexts/cart-context"
import { api } from "@/lib/api"

interface ProductDetailProps {
  product: any
  onBack: () => void
  onCheckout: () => void
}

interface PublicSettings {
  currency: {
    symbol: string
    code: string
    showBsPrice: boolean
  }
  exchangeRate: {
    usd: number
    eur: number
    date?: string
  }
}

export default function ProductDetail({ product: initialProduct, onBack, onCheckout }: ProductDetailProps) {
  const [product, setProduct] = useState(initialProduct)
  const [settings, setSettings] = useState<PublicSettings | null>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [selectedColor, setSelectedColor] = useState("")
  const [selectedSize, setSelectedSize] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [showAddedNotification, setShowAddedNotification] = useState(false)
  const [showLightbox, setShowLightbox] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 })
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [currentImages, setCurrentImages] = useState<any[]>([])
  const { addItem } = useCart()

  const minSwipeDistance = 50

  // ASEGURAR que siempre estemos en el top cuando este componente se monta
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    if (initialProduct._id) {
      loadData()
    }
  }, [initialProduct._id])

  useEffect(() => {
    if (product && selectedColor) {
      const variant = product.variants?.find((v: any) => v.color === selectedColor)
      if (variant && variant.images && variant.images.length > 0) {
        setCurrentImages(variant.images)
      } else {
        setCurrentImages(product.images || [])
      }
      setSelectedImageIndex(0)
    }
  }, [selectedColor, product])

  useEffect(() => {
    const availableStock = getAvailableStock()
    if (availableStock > 0 && quantity > availableStock) {
      setQuantity(availableStock)
    }
  }, [selectedSize, selectedColor])

  useEffect(() => {
    if (showLightbox) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [showLightbox])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showLightbox) closeLightbox()
    }
    if (showLightbox) document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [showLightbox])

  const loadData = async () => {
    try {
      const [productResult, settingsResult, categoriesResult] = await Promise.all([
        api.getProduct(initialProduct._id),
        api.getPublicSettings(),
        api.getCategories()
      ])
      
      if (productResult.success) {
        setProduct(productResult.product)
        const prod = productResult.product
        
        if (prod.variants?.length > 0) {
          const firstAvailableVariant = prod.variants.find((v: any) => 
            v.sizes.some((s: any) => s.stock > 0)
          ) || prod.variants[0]
          
          setSelectedColor(firstAvailableVariant.color)
          
          if (firstAvailableVariant.images && firstAvailableVariant.images.length > 0) {
            setCurrentImages(firstAvailableVariant.images)
          } else {
            setCurrentImages(prod.images || [])
          }
          
          const firstAvailableSize = firstAvailableVariant.sizes.find((s: any) => s.stock > 0)
          if (firstAvailableSize) {
            setSelectedSize(firstAvailableSize.size)
          } else if (firstAvailableVariant.sizes.length > 0) {
            setSelectedSize(firstAvailableVariant.sizes[0].size)
          }
        } else {
          setCurrentImages(prod.images || [])
        }
      }
      
      if (settingsResult.success) {
        setSettings({
          currency: settingsResult.settings.currency,
          exchangeRate: settingsResult.exchangeRate
        })
      }

      if (categoriesResult.success) {
        setCategories(categoriesResult.categories || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getSubcategoryName = () => {
    if (!product.subcategory) return null
    
    // Si subcategory es un objeto, devolver su nombre
    if (typeof product.subcategory === 'object' && product.subcategory.name) {
      return product.subcategory.name
    }
    
    // Si es un ID (string), buscar en el array de categorías
    if (typeof product.subcategory === 'string') {
      const subcategory = categories.find(cat => cat._id === product.subcategory)
      return subcategory?.name || null
    }
    
    return null
  }

  const formatPrice = (price: number, showBs = false) => {
    const symbol = settings?.currency?.symbol || '$'
    const formatted = `${symbol}${price.toFixed(2)}`
    
    if (showBs && settings?.currency?.showBsPrice && settings?.exchangeRate) {
      const rate = settings.currency.code === 'EUR' 
        ? settings.exchangeRate.eur 
        : settings.exchangeRate.usd
      const bsPrice = price * rate
      return { main: formatted, bs: `Bs. ${bsPrice.toFixed(2)}`, rate }
    }
    
    return { main: formatted, bs: null, rate: null }
  }

  const handleBack = () => {
    onBack()
  }

  const handleAddToCart = async () => {
    const mainImage = currentImages[0]?.url || product.images?.[0]?.url
    
    await addItem({
      id: product._id,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice && product.originalPrice > product.price 
        ? product.originalPrice 
        : undefined,
      image: mainImage,
      size: selectedSize,
      color: selectedColor,
    }, quantity)

    setShowAddedNotification(true)
    setTimeout(() => setShowAddedNotification(false), 3000)
  }

  const getCurrentVariant = () => {
    return product.variants?.find((v: any) => v.color === selectedColor)
  }

  const getAvailableStock = () => {
    const variant = getCurrentVariant()
    const sizeStock = variant?.sizes.find((s: any) => s.size === selectedSize)
    return sizeStock?.stock || 0
  }

  const getColorStyle = (colorName: string, colorHex?: string) => {
    if (colorHex) return { backgroundColor: colorHex }

    const colorMap: { [key: string]: string } = {
      'negro': '#000000', 'black': '#000000',
      'blanco': '#FFFFFF', 'white': '#FFFFFF',
      'rojo': '#DC2626', 'red': '#DC2626',
      'azul': '#2563EB', 'blue': '#2563EB',
      'verde': '#16A34A', 'green': '#16A34A',
      'amarillo': '#EAB308', 'yellow': '#EAB308',
      'naranja': '#EA580C', 'orange': '#EA580C',
      'morado': '#9333EA', 'purple': '#9333EA',
      'rosa': '#EC4899', 'pink': '#EC4899',
      'gris': '#6B7280', 'gray': '#6B7280',
    }

    return { backgroundColor: colorMap[colorName.toLowerCase()] || '#9CA3AF' }
  }

  const nextImage = () => {
    setSelectedImageIndex((prev) => prev === currentImages.length - 1 ? 0 : prev + 1)
  }

  const prevImage = () => {
    setSelectedImageIndex((prev) => prev === 0 ? currentImages.length - 1 : prev - 1)
  }

  const hasVariantStock = (variant: any) => {
    return variant.sizes.some((s: any) => s.stock > 0)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setMousePosition({ x, y })
  }

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    if (distance > minSwipeDistance) nextImage()
    if (distance < -minSwipeDistance) prevImage()
  }

  const closeLightbox = () => setShowLightbox(false)

  const price = formatPrice(product.price, true)
  const originalPrice = product.originalPrice && product.originalPrice > product.price 
    ? formatPrice(product.originalPrice, false) 
    : null
  const discountPercent = originalPrice 
    ? Math.round((1 - product.price / product.originalPrice) * 100) 
    : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-8">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-black"></div>
          </div>
        </div>
      </div>
    )
  }

  const subcategoryName = getSubcategoryName()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Added to Cart Notification */}
      {showAddedNotification && (
        <div className="fixed top-20 right-4 z-50 animate-slideInRight">
          <div className="bg-gradient-to-r from-black to-gray-800 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-3 backdrop-blur-sm">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <Check className="h-5 w-5 text-black" strokeWidth={3} />
            </div>
            <div>
              <p className="font-bold text-sm uppercase tracking-wide">¡Agregado!</p>
              <p className="text-xs text-gray-200">{quantity} artículo(s) al carrito</p>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {showLightbox && (
        <div 
          className="fixed inset-0 bg-black flex items-center justify-center"
          style={{ zIndex: 999999 }}
          onClick={closeLightbox}
        >
          <button
            onClick={(e) => { e.stopPropagation(); closeLightbox() }}
            className="fixed top-4 right-4 z-[1000000] text-white bg-white/20 backdrop-blur-md rounded-full p-3 hover:bg-white/30"
          >
            <X className="h-7 w-7" strokeWidth={3} />
          </button>

          <div 
            className="relative w-full h-full flex items-center justify-center p-4 md:p-8"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {currentImages.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); prevImage() }}
                  className="hidden md:flex absolute left-8 z-10 text-white bg-white/20 backdrop-blur-md rounded-2xl p-4 hover:bg-white/30"
                >
                  <ChevronLeft className="h-10 w-10" strokeWidth={3} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); nextImage() }}
                  className="hidden md:flex absolute right-8 z-10 text-white bg-white/20 backdrop-blur-md rounded-2xl p-4 hover:bg-white/30"
                >
                  <ChevronRight className="h-10 w-10" strokeWidth={3} />
                </button>
              </>
            )}

            <img
              src={currentImages[selectedImageIndex]?.url ? `https://yenfit.shop${currentImages[selectedImageIndex].url}` : "/placeholder.svg"}
              alt={`${product.name} ${selectedImageIndex + 1}`}
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
              draggable={false}
              style={{ maxHeight: 'calc(100vh - 160px)', maxWidth: 'calc(100vw - 32px)' }}
            />
          </div>

          {currentImages.length > 1 && (
            <div className="fixed bottom-6 left-0 right-0 z-[1000000] flex flex-col items-center gap-3">
              <div className="bg-white/20 backdrop-blur-md text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-2xl">
                {selectedImageIndex + 1} / {currentImages.length}
              </div>
              <div className="flex gap-2 bg-black/50 backdrop-blur-md px-4 py-2.5 rounded-full shadow-2xl">
                {currentImages.map((_: any, index: number) => (
                  <button
                    key={index}
                    onClick={(e) => { e.stopPropagation(); setSelectedImageIndex(index) }}
                    className={`transition-all duration-300 rounded-full ${
                      index === selectedImageIndex ? 'w-8 h-2 bg-white' : 'w-2 h-2 bg-white/50 hover:bg-white/75'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Breadcrumb */}
      <div className="border-b bg-white/80 backdrop-blur-sm sticky top-16 z-40">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={handleBack}
            className="flex items-center text-sm font-semibold uppercase hover:underline transition-all group bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-full"
          >
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Volver
          </button>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Images Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative group overflow-hidden bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500">
              <div 
                className="aspect-[3/4] cursor-pointer overflow-hidden"
                onClick={() => setShowLightbox(true)}
                onMouseMove={handleMouseMove}
              >
                <img
                  src={currentImages[selectedImageIndex]?.url ? `https://yenfit.shop${currentImages[selectedImageIndex].url}` : "/placeholder.svg"}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                  style={{ transformOrigin: `${mousePosition.x}% ${mousePosition.y}%` }}
                  onError={(e) => { e.currentTarget.src = "/placeholder.svg" }}
                />
              </div>

              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              {currentImages.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); prevImage() }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/95 hover:bg-white text-black p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-2xl hover:scale-110"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); nextImage() }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/95 hover:bg-white text-black p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-2xl hover:scale-110"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}

              <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm text-white p-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300">
                <Maximize2 className="h-4 w-4" />
              </div>

              {currentImages.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-full text-xs font-medium">
                  {selectedImageIndex + 1} / {currentImages.length}
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {currentImages.length > 1 && (
              <div className="grid grid-cols-6 gap-3">
                {currentImages.map((img: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImageIndex(i)}
                    className={`relative aspect-square bg-white overflow-hidden transition-all duration-300 rounded-2xl shadow-md hover:shadow-xl ${
                      selectedImageIndex === i
                        ? 'ring-3 ring-black ring-offset-2 scale-105'
                        : 'hover:ring-2 hover:ring-gray-300 hover:scale-105'
                    }`}
                  >
                    <img
                      src={img.url ? `https://yenfit.shop${img.url}` : "/placeholder.svg"}
                      alt={`${product.name} ${i + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.src = "/placeholder.svg" }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Badges */}
            <div className="flex gap-2 flex-wrap">
              {product.isNew && (
                <Badge className="bg-gradient-to-r from-black to-gray-800 text-white px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-full shadow-lg">
                  Nuevo
                </Badge>
              )}
              {originalPrice && (
                <Badge className="bg-gradient-to-r from-red-600 to-red-500 text-white px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-full shadow-lg">
                  <Tag className="h-3 w-3 mr-1" />
                  -{discountPercent}% OFF
                </Badge>
              )}
            </div>

            {/* Category & Name */}
            <div>
              {product.category && (
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  {product.category.name}
                  {subcategoryName && ` / ${subcategoryName}`}
                </p>
              )}
              <p className="text-sm text-gray-400 mb-2">{product.brand}</p>
              <h1 className="text-3xl md:text-4xl font-black uppercase mb-3 leading-tight">
                {product.name}
              </h1>
            </div>

            {/* Price */}
            <div className="bg-gradient-to-r from-gray-50 to-white p-5 rounded-2xl border-2 border-gray-100">
              <div className="flex items-baseline gap-3 flex-wrap">
                {originalPrice ? (
                  <>
                    <span className="text-4xl font-black text-red-600">{price.main}</span>
                    <span className="text-xl text-gray-400 line-through">{originalPrice.main}</span>
                    <Badge className="bg-red-100 text-red-600 border-red-200">
                      Ahorras {settings?.currency?.symbol}{(product.originalPrice - product.price).toFixed(2)}
                    </Badge>
                  </>
                ) : (
                  <span className="text-4xl font-black text-black">{price.main}</span>
                )}
              </div>
              
              {/* Bs Price */}
              {price.bs && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-gray-700">{price.bs}</span>
                    <Badge variant="outline" className="text-xs">
                      Tasa: Bs. {price.rate?.toFixed(2)}
                    </Badge>
                  </div>
                </div>
              )}
            </div>

            {/* Color Selection */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  Color: <span className="font-normal text-gray-600">{selectedColor}</span>
                </h3>
              </div>
              <div className="flex flex-wrap gap-3">
                {product.variants?.map((variant: any) => {
                  const isSelected = selectedColor === variant.color
                  const hasStock = hasVariantStock(variant)
                  const hasImages = variant.images && variant.images.length > 0
                  
                  return (
                    <button
                      key={variant.color}
                      onClick={() => {
                        if (hasStock) {
                          setSelectedColor(variant.color)
                          const firstAvailableSize = variant.sizes.find((s: any) => s.stock > 0)
                          if (firstAvailableSize) setSelectedSize(firstAvailableSize.size)
                        }
                      }}
                      disabled={!hasStock}
                      className={`group relative transition-all duration-200 ${!hasStock ? 'cursor-not-allowed opacity-40' : ''}`}
                      title={variant.color}
                    >
                      <div
                        className={`w-12 h-12 rounded-full border-3 transition-all duration-200 shadow-md ${
                          isSelected
                            ? 'border-black scale-110 shadow-xl ring-2 ring-black ring-offset-2'
                            : hasStock
                            ? 'border-gray-300 hover:border-gray-400 hover:scale-110'
                            : 'border-gray-200'
                        }`}
                        style={getColorStyle(variant.color, variant.colorHex)}
                      />
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Check className="h-5 w-5 text-white drop-shadow-lg" strokeWidth={3} />
                        </div>
                      )}
                      {!hasStock && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-full h-0.5 bg-gray-400 rotate-45"></div>
                        </div>
                      )}
                      {hasImages && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                          <Package className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Size Selection */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  Talla: <span className="font-normal text-gray-600">{selectedSize}</span>
                </h3>
                <button className="text-xs underline font-medium hover:text-gray-600 transition-colors bg-gray-100 px-3 py-1.5 rounded-full hover:bg-gray-200">
                  Guía de tallas
                </button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {getCurrentVariant()?.sizes.map((sizeItem: any) => (
                  <button
                    key={sizeItem.size}
                    onClick={() => setSelectedSize(sizeItem.size)}
                    disabled={sizeItem.stock === 0}
                    className={`relative py-4 text-sm font-bold uppercase border-3 transition-all duration-200 rounded-2xl shadow-sm hover:shadow-lg ${
                      selectedSize === sizeItem.size
                        ? "bg-gradient-to-br from-black to-gray-800 text-white border-black scale-105 shadow-xl"
                        : sizeItem.stock === 0
                        ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                        : "bg-white text-black border-gray-300 hover:border-black hover:scale-105"
                    }`}
                  >
                    {sizeItem.size}
                    {sizeItem.stock > 0 && sizeItem.stock <= 5 && (
                      <span className="absolute -top-2 -right-2 bg-gradient-to-r from-red-600 to-red-500 text-white text-xs px-2 py-1 rounded-full leading-none shadow-lg">
                        {sizeItem.stock}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              
              {/* Stock indicator */}
              <div className="mt-3 flex items-center gap-2 bg-white p-3 rounded-2xl border border-gray-200">
                <div className={`w-2 h-2 rounded-full ${
                  getAvailableStock() > 10 ? 'bg-green-500' :
                  getAvailableStock() > 0 ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
                }`} />
                <p className="text-sm font-semibold text-gray-700">
                  {getAvailableStock() > 10 ? 'En Stock' :
                   getAvailableStock() > 0 ? `¡Solo quedan ${getAvailableStock()}!` :
                   'Sin Stock'}
                </p>
              </div>
            </div>

            {/* Quantity */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider mb-3">Cantidad</h3>
              <div className="flex items-center border-3 border-gray-300 w-40 rounded-2xl overflow-hidden shadow-md">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-12 h-14 flex items-center justify-center hover:bg-gray-100 transition-colors active:bg-gray-200"
                >
                  <Minus className="h-5 w-5" />
                </button>
                <span className="flex-1 text-center font-bold text-xl">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(getAvailableStock(), quantity + 1))}
                  className="w-12 h-14 flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-50 active:bg-gray-200"
                  disabled={quantity >= getAvailableStock()}
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Add to Cart Buttons */}
            <div className="space-y-3 pt-4">
              <Button
                className="w-full bg-gradient-to-r from-black to-gray-800 text-white hover:from-gray-800 hover:to-black rounded-2xl h-16 text-base font-bold uppercase tracking-wide transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 shadow-2xl"
                onClick={handleAddToCart}
                disabled={getAvailableStock() === 0}
              >
                <ShoppingBag className="h-5 w-5 mr-2" />
                {getAvailableStock() === 0 ? 'Sin Stock' : `Agregar al Carrito - ${price.main}`}
              </Button>

              <Button
                variant="outline"
                className="w-full border-3 border-black rounded-2xl h-16 text-base font-bold uppercase hover:bg-black hover:text-white transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <Heart className="h-5 w-5 mr-2" />
                Favoritos
              </Button>
            </div>

            {/* Description */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-2xl border border-blue-100">
              <h3 className="text-sm font-bold uppercase tracking-wider mb-3">Descripción</h3>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{product.description}</p>
            </div>

            {/* Features */}
            {product.features && product.features.length > 0 && (
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider mb-3">Características</h3>
                <div className="flex flex-wrap gap-2">
                  {product.features.map((feature: string, idx: number) => (
                    <Badge key={idx} variant="secondary" className="px-3 py-1">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Trust Badges */}
            <div className="border-t-2 pt-6 grid grid-cols-2 gap-4">
              <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-md hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-gradient-to-br from-black to-gray-800 text-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Truck className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-sm uppercase">Envío</p>
                  <p className="text-xs text-gray-600">A todo el país</p>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-md hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-gradient-to-br from-black to-gray-800 text-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-sm uppercase">Pago Seguro</p>
                  <p className="text-xs text-gray-600">100% protegido</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}