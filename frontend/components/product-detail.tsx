"use client"

import { useState, useEffect } from "react"
import { useCart } from "@/contexts/cart-context"
import { api } from "@/lib/api"

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
      id: product.id || product._id,
      name: product.name,
      price: product.price,
      image: mainImage,
      size: selectedSize,
      color: selectedColor,
    }, quantity)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="w-12 h-12 border-2 border-tertiary border-t-transparent animate-spin mb-4"></div>
        <span className="font-mono-data text-label-caps text-on-surface-variant uppercase tracking-widest">Initialising Asset_Data...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background border-t border-outline-variant/30">
      {/* Navigation Header */}
      <div className="border-b border-outline-variant/30 bg-surface-container-lowest py-4 px-gutter md:px-margin flex justify-between items-center">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 font-mono-data text-label-caps text-on-surface-variant hover:text-tertiary transition-colors uppercase"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Return_to_Catalog
        </button>
        <div className="font-mono-data text-label-caps text-on-surface-variant hidden md:block">
          REF: {product.id?.slice(-8) || product._id?.slice(-8)} // ASSET_PROT_V2
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* Left: Technical Gallery */}
        <div className="border-r border-outline-variant/30 bg-surface-container-lowest">
          <div className="sticky top-24 p-gutter md:p-12 space-y-8">
            <div className="relative aspect-[4/5] bg-surface-container overflow-hidden border border-outline-variant/30">
              <img 
                src={currentImages[selectedImageIndex]?.url || "/placeholder.svg"} 
                className="w-full h-full object-cover mix-blend-luminosity hover:mix-blend-normal transition-all duration-700" 
                alt={product.name} 
              />
              <div className="absolute top-4 left-4 bg-tertiary text-on-tertiary px-2 py-1 font-mono-data text-[10px] uppercase">
                IMG_0{selectedImageIndex + 1} // RAW_DATA
              </div>
            </div>

            {currentImages.length > 1 && (
              <div className="grid grid-cols-5 gap-4">
                {currentImages.map((img, i) => (
                  <button 
                    key={i}
                    onClick={() => setSelectedImageIndex(i)}
                    className={`aspect-square border transition-all ${
                      selectedImageIndex === i ? "border-tertiary scale-105" : "border-outline-variant/30 opacity-50 hover:opacity-100"
                    }`}
                  >
                    <img src={img.url} className="w-full h-full object-cover mix-blend-luminosity" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Technical Specs */}
        <div className="p-gutter md:p-12 lg:p-24 space-y-12">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="bg-tertiary text-on-tertiary px-2 py-1 font-mono-data text-label-caps uppercase">
                {product.category?.name || "COLLECTION"}
              </div>
              {product.isNew && (
                <span className="font-mono-data text-on-surface-variant text-label-caps uppercase border border-outline-variant/30 px-2 py-1">
                  NEW_RELEASE
                </span>
              )}
            </div>
            
            <h1 className="font-display text-display text-on-background uppercase leading-none tracking-tight">
              {product.name}
            </h1>
            
            <div className="flex items-end gap-4 border-l-2 border-tertiary pl-6 py-2">
              <span className="font-display text-h2 text-tertiary leading-none">USD {product.price.toFixed(2)}</span>
              {product.originalPrice && (
                <span className="font-mono-data text-body-lg text-on-surface-variant line-through opacity-50 decoration-tertiary">USD {product.originalPrice.toFixed(2)}</span>
              )}
            </div>
          </div>

          <div className="space-y-12 max-w-xl">
            {/* Description */}
            <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed border-t border-outline-variant/20 pt-8">
              {product.description || "No technical description provided for this asset."}
            </p>

            {/* Variants */}
            {product.variants?.length > 0 && (
              <div className="space-y-6">
                <h3 className="font-mono-data text-label-caps text-on-surface-variant uppercase">Select_Tone: {selectedColor}</h3>
                <div className="flex flex-wrap gap-4">
                  {product.variants.map((v: any) => (
                    <button 
                      key={v.color}
                      onClick={() => setSelectedColor(v.color)}
                      className={`w-12 h-12 border transition-all relative ${
                        selectedColor === v.color ? "border-tertiary p-1" : "border-outline-variant/30 grayscale hover:grayscale-0"
                      }`}
                    >
                      <div className="w-full h-full" style={{ backgroundColor: v.color_hex || '#000' }} />
                      {selectedColor === v.color && (
                        <div className="absolute -top-1 -right-1 bg-tertiary w-3 h-3"></div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sizes */}
            <div className="space-y-6">
              <h3 className="font-mono-data text-label-caps text-on-surface-variant uppercase">Select_Dimension: {selectedSize}</h3>
              <div className="grid grid-cols-4 gap-2">
                {['S', 'M', 'L', 'XL', 'XXL'].map((size) => (
                  <button 
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`py-4 font-mono-data text-label-caps uppercase transition-all border ${
                      selectedSize === size ? "bg-tertiary text-on-tertiary border-tertiary" : "border-outline-variant/30 hover:border-tertiary/50"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 pt-12">
              <div className="flex items-center border border-outline-variant/30 bg-surface-container-lowest">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))} 
                  className="p-5 hover:bg-surface-container transition-colors border-r border-outline-variant/30"
                >
                  <span className="material-symbols-outlined text-sm">remove</span>
                </button>
                <span className="font-mono-data text-label-caps w-16 text-center">{quantity.toString().padStart(2, '0')}</span>
                <button 
                  onClick={() => setQuantity(quantity + 1)} 
                  className="p-5 hover:bg-surface-container transition-colors border-l border-outline-variant/30"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                </button>
              </div>
              
              <button 
                onClick={handleAddToCart}
                className="flex-1 bg-tertiary text-on-tertiary font-label-caps text-label-caps uppercase px-12 py-5 hover:bg-surface-container-highest hover:text-tertiary transition-all duration-300 border border-tertiary flex items-center justify-center gap-2 group"
              >
                <span className="material-symbols-outlined text-sm">shopping_cart</span>
                ACQUIRE_ASSET
              </button>
            </div>

            {/* Technical Trust Footer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-12 border-t border-outline-variant/20">
              <div className="flex items-start gap-4">
                <span className="material-symbols-outlined text-tertiary">local_shipping</span>
                <div className="space-y-1">
                  <p className="font-mono-data text-label-caps text-on-background uppercase">Logistics: Fast</p>
                  <p className="font-body-sm text-xs text-on-surface-variant uppercase tracking-widest opacity-70">ETA: 24-48H_GLOBAL</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="material-symbols-outlined text-tertiary">verified_user</span>
                <div className="space-y-1">
                  <p className="font-mono-data text-label-caps text-on-background uppercase">Protocol: Secure</p>
                  <p className="font-body-sm text-xs text-on-surface-variant uppercase tracking-widest opacity-70">AES_256_ENCRYPTED</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}