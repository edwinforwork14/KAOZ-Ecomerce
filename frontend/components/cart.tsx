"use client"

import { useState, useEffect } from "react"
import { X, Plus, Minus, ShoppingBag, Trash2, Loader2, Tag, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCart } from "@/contexts/cart-context"
import { api } from "@/lib/api"
import { brandConfig } from "@/lib/config"
import { motion, AnimatePresence } from "framer-motion"

interface CartProps {
  onCheckout?: () => void
}

export default function Cart({ onCheckout }: CartProps) {
  const { items, isOpen, setIsOpen, updateQuantity, removeItem, total, loading } = useCart()
  const [settings, setSettings] = useState<any>(null)
  const [loadingSettings, setLoadingSettings] = useState(true)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await api.getPublicSettings()
        if (result.success) {
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
  }, [isOpen])

  const handleCheckout = () => {
    if (items.length === 0) return
    setIsOpen(false)
    if (onCheckout) onCheckout()
  }

  const formatPrice = (price: number) => {
    const symbol = settings?.currency?.symbol || '$'
    return `${symbol}${price.toFixed(2)}`
  }

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b flex items-center justify-between bg-primary text-primary-foreground">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Tu Carrito</h2>
                <p className="text-xs opacity-70">{totalItems} productos seleccionados</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/10 text-white"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center">
                    <ShoppingBag className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-medium">Tu carrito está vacío</p>
                  <Button onClick={() => setIsOpen(false)} variant="outline" className="rounded-full">
                    Continuar Comprando
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {items.map((item) => (
                    <div key={`${item.id}-${item.size}-${item.color}`} className="flex gap-4">
                      <div className="w-24 h-24 bg-secondary rounded-2xl overflow-hidden shrink-0">
                        <img 
                          src={item.image || "/placeholder.svg"} 
                          alt={item.name} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h3 className="font-bold text-sm truncate uppercase">{item.name}</h3>
                            <button 
                              onClick={() => removeItem(item._id || item.id)}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{item.color} • {item.size}</p>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center gap-3 border rounded-full px-2 py-1">
                            <button 
                              onClick={() => updateQuantity(item._id || item.id, item.quantity - 1)}
                              className="w-6 h-6 flex items-center justify-center hover:bg-secondary rounded-full"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item._id || item.id, item.quantity + 1)}
                              className="w-6 h-6 flex items-center justify-center hover:bg-secondary rounded-full"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="font-bold text-sm">{formatPrice(item.price * item.quantity)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="p-6 border-t bg-secondary/30 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground uppercase tracking-widest font-bold">Subtotal</span>
                  <span className="text-2xl font-bold">{formatPrice(total)}</span>
                </div>
                <div className="space-y-3">
                  <Button 
                    onClick={handleCheckout}
                    className="w-full h-14 rounded-2xl bg-accent text-accent-foreground font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    <CreditCard className="w-5 h-5 mr-2" /> Finalizar Compra
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => setIsOpen(false)}
                    className="w-full text-xs uppercase tracking-widest font-bold text-muted-foreground"
                  >
                    Seguir Comprando
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}