"use client"

import { useState, useEffect } from "react"
import { X, Plus, Minus, ShoppingBag, Trash2, Loader2, AlertCircle, Tag, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCart } from "@/contexts/cart-context"
import { api } from "@/lib/api"
import { brandConfig } from "@/lib/config"

interface CartProps {
  onCheckout?: () => void
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

export default function Cart({ onCheckout }: CartProps) {
  const { items, isOpen, setIsOpen, updateQuantity, removeItem, total, clearCart, loading } = useCart()
  const [settings, setSettings] = useState<PublicSettings | null>(null)
  const [isClosing, setIsClosing] = useState(false)
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set())
  const [loadingSettings, setLoadingSettings] = useState(true)

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await api.getPublicSettings()
        if (result.success) {
          // Combine settings and exchangeRate into expected structure
          setSettings({
            currency: result.settings.currency,
            exchangeRate: result.exchangeRate
          })
        }
      } catch (error) {
        console.error('Error loading settings:', error)
      } finally {
        setLoadingSettings(false)
      }
    }
    
    if (isOpen) {
      loadSettings()
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsOpen(false)
      setIsClosing(false)
    }, 300)
  }

  const handleCheckout = () => {
    if (items.length === 0) return
    
    setIsClosing(true)
    setTimeout(() => {
      setIsOpen(false)
      setIsClosing(false)
      if (onCheckout) {
        onCheckout()
      }
    }, 300)
  }

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    await updateQuantity(itemId, newQuantity)
  }

  const handleRemoveItem = (itemId: string) => {
    setRemovingItems(prev => new Set(prev).add(itemId))
    setTimeout(async () => {
      await removeItem(itemId)
      setRemovingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(itemId)
        return newSet
      })
    }, 300)
  }

  // Format price with currency
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

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalSavings = items.reduce((sum, item) => {
    if (item.originalPrice && item.originalPrice > item.price) {
      return sum + (item.originalPrice - item.price) * item.quantity
    }
    return sum
  }, 0)

  const currencySymbol = settings?.currency?.symbol || '$'
  const totalFormatted = formatPrice(total, true)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-all duration-300 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={handleClose}
      />

      {/* Cart Panel */}
      <div 
        className={`absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl transition-all duration-300 ease-out ${
          isClosing ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div 
            className="flex items-center justify-between border-b px-6 py-5 text-white rounded-b-2xl"
            style={{ background: `linear-gradient(135deg, ${brandConfig.colors.primary} 0%, ${brandConfig.colors.secondary} 100%)` }}
          >
            <div>
              <h2 className="text-lg font-black uppercase tracking-wider">
                Tu Carrito
              </h2>
              <p className="text-xs text-white/80 mt-1">
                {totalItems} artículo{totalItems !== 1 ? 's' : ''}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-white hover:bg-white/10 rounded-full p-2 transition-transform hover:scale-110"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          {/* Exchange Rate Banner */}
          {settings?.currency?.showBsPrice && settings?.exchangeRate && (
            <div className="px-6 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Tasa del día:</span>
                <Badge variant="outline" className="text-xs font-semibold">
                  Bs. {settings.currency.code === 'EUR' 
                    ? settings.exchangeRate.eur?.toFixed(2) 
                    : settings.exchangeRate.usd?.toFixed(2)
                  } / {settings.currency.code || 'USD'}
                </Badge>
              </div>
            </div>
          )}

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {loading && items.length === 0 ? (
              <div className="text-center py-16">
                <Loader2 className="h-12 w-12 text-gray-400 animate-spin mx-auto mb-4" />
                <p className="text-gray-500 font-medium">Cargando carrito...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-16 animate-fadeIn">
                <div 
                  className="inline-flex items-center justify-center w-24 h-24 rounded-3xl mb-6 shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${brandConfig.colors.primary}20 0%, ${brandConfig.colors.secondary}20 100%)` }}
                >
                  <ShoppingBag className="h-12 w-12" style={{ color: brandConfig.colors.primary }} />
                </div>
                <p className="text-gray-500 font-semibold mb-8 text-lg">Tu carrito está vacío</p>
                <Button
                  onClick={handleClose}
                  className="text-white rounded-2xl px-10 py-6 font-bold uppercase text-sm transition-all hover:scale-105 shadow-xl"
                  style={{ background: `linear-gradient(135deg, ${brandConfig.colors.primary} 0%, ${brandConfig.colors.secondary} 100%)` }}
                >
                  Continuar Comprando
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                {items.map((item) => {
                  const itemId = item._id || `${item.id}-${item.size}-${item.color}`
                  const isRemoving = removingItems.has(itemId)
                  const hasDiscount = item.originalPrice && item.originalPrice > item.price
                  const discountPercent = hasDiscount 
                    ? Math.round(((item.originalPrice! - item.price) / item.originalPrice!) * 100)
                    : 0
                  
                  const itemPrice = formatPrice(item.price * item.quantity, true)
                  const originalItemPrice = hasDiscount ? formatPrice(item.originalPrice! * item.quantity, false) : null
                  
                  return (
                    <div
                      key={itemId}
                      className={`flex gap-4 pb-5 border-b border-gray-100 transition-all duration-300 ${
                        isRemoving 
                          ? 'opacity-0 -translate-x-full scale-95' 
                          : 'opacity-100 translate-x-0 scale-100'
                      }`}
                    >
                      {/* Image */}
                      <div className="w-24 h-24 bg-gray-100 flex-shrink-0 rounded-2xl overflow-hidden group relative shadow-md">
                        <img
                          src={item.image ? `https://yenfit.shop${item.image}` : "/placeholder.svg"}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.svg"
                          }}
                        />
                        {hasDiscount && (
                          <div className="absolute top-2 left-2 bg-gradient-to-r from-red-600 to-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                            -{discountPercent}%
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between gap-2 mb-2">
                          <h3 className="font-bold text-sm uppercase truncate">
                            {item.name}
                          </h3>
                          <button
                            onClick={() => handleRemoveItem(itemId)}
                            className="text-gray-400 hover:text-red-600 transition-all hover:scale-110 flex-shrink-0 p-1 rounded-full hover:bg-red-50"
                            title="Eliminar"
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <p className="text-xs text-gray-500 mb-3 bg-gray-50 px-2 py-1 rounded-lg inline-block">
                          {item.color} • {item.size}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center border-2 border-gray-300 rounded-xl overflow-hidden shadow-sm">
                            <button
                              onClick={() => handleUpdateQuantity(itemId, item.quantity - 1)}
                              className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 transition-colors active:scale-95 disabled:opacity-50"
                              disabled={loading}
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-10 text-center text-sm font-bold">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleUpdateQuantity(itemId, item.quantity + 1)}
                              className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 transition-colors active:scale-95 disabled:opacity-50"
                              disabled={loading}
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="text-right">
                            {hasDiscount && originalItemPrice && (
                              <p className="text-xs text-gray-400 line-through">
                                {originalItemPrice.main}
                              </p>
                            )}
                            <span className={`font-black text-base ${hasDiscount ? 'text-red-600' : ''}`}>
                              {itemPrice.main}
                            </span>
                            {itemPrice.bs && (
                              <p className="text-xs text-gray-500">{itemPrice.bs}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t px-6 py-5 space-y-4 bg-gradient-to-br from-gray-50 to-white rounded-t-2xl">
              {/* Savings Badge */}
              {totalSavings > 0 && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Tag className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-sm text-green-800 font-medium">
                    ¡Estás ahorrando <span className="font-black">{currencySymbol}{totalSavings.toFixed(2)}</span>!
                  </p>
                </div>
              )}

              {/* Subtotal */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center text-gray-600">
                  <span>Subtotal ({totalItems} artículos)</span>
                  <span className="font-semibold">{totalFormatted.main}</span>
                </div>
                <div className="flex justify-between items-center text-gray-600">
                  <span>Envío</span>
                  <span className="text-green-600 font-medium">Calcular al pagar</span>
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-between items-baseline pt-3 border-t-2 border-gray-200">
                <span className="text-lg font-black uppercase">Total</span>
                <div className="text-right">
                  <span className="text-3xl font-black" style={{ color: brandConfig.colors.primary }}>
                    {totalFormatted.main}
                  </span>
                  {totalFormatted.bs && (
                    <p className="text-sm text-gray-500 font-medium">{totalFormatted.bs}</p>
                  )}
                </div>
              </div>

              {/* Checkout Button */}
              <Button
                className="w-full text-white rounded-2xl h-14 text-base font-bold uppercase tracking-wide transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-xl hover:shadow-2xl"
                style={{ background: `linear-gradient(135deg, ${brandConfig.colors.primary} 0%, ${brandConfig.colors.secondary} 100%)` }}
                onClick={handleCheckout}
                disabled={loading || items.length === 0}
              >
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="h-5 w-5 mr-2" />
                    Proceder al Pago
                  </>
                )}
              </Button>

              {/* Continue Shopping */}
              <Button
                variant="outline"
                className="w-full border-2 border-black rounded-2xl h-12 font-bold uppercase text-sm hover:bg-black hover:text-white transition-all hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
                onClick={handleClose}
                disabled={loading}
              >
                Continuar Comprando
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}