"use client"

import { useState, useEffect } from "react"
import { Plus, Minus, ShoppingBag, Trash2, CreditCard, Package, ArrowRight, X } from "lucide-react"
import { useCart } from "@/contexts/cart-context"
import { api, cleanImageUrl } from "@/lib/api"
import { motion, AnimatePresence } from "framer-motion"

interface CartProps {
  onCheckout?: () => void
}

export default function Cart({ onCheckout }: CartProps) {
  const { items, isOpen, setIsOpen, updateQuantity, removeItem, total, loading } = useCart()
  const [settings, setSettings] = useState<any>(null)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [removingId, setRemovingId] = useState<string | null>(null)

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
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  const handleCheckout = () => {
    if (items.length === 0) return
    setIsOpen(false)
    if (onCheckout) onCheckout()
  }

  const handleRemove = async (id: string) => {
    setRemovingId(id)
    await removeItem(id)
    setRemovingId(null)
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
            transition={{ duration: 0.3 }}
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="relative w-full max-w-[420px] h-full bg-white shadow-2xl flex flex-col"
          >
            {/* ── Header ── */}
            <div className="px-8 py-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-kaosNeon animate-pulse"></div>
                    <h2 className="text-[11px] font-black uppercase tracking-[0.25em] text-black">Tu Carrito</h2>
                  </div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium mt-1 ml-5">
                    {totalItems} {totalItems === 1 ? 'producto' : 'productos'}
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsOpen(false)}
                  className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-black hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            {/* ── Items ── */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
              {items.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="h-full flex flex-col items-center justify-center text-center"
                >
                  <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                    <ShoppingBag className="w-10 h-10 text-gray-300" />
                  </div>
                  <p className="text-sm font-black uppercase tracking-widest text-gray-300 mb-2">Carrito Vacío</p>
                  <p className="text-[10px] text-gray-400 font-medium tracking-wider mb-8">Explora nuestra colección y añade productos</p>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setIsOpen(false)}
                    className="bg-black text-white px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-kaosNeon hover:text-black transition-all"
                  >
                    Explorar Tienda
                  </motion.button>
                </motion.div>
              ) : (
                <div className="space-y-0">
                  <AnimatePresence>
                    {items.map((item, index) => (
                      <motion.div
                        key={`${item.id}-${item.size}-${item.color}`}
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -30, height: 0, marginBottom: 0 }}
                        transition={{ delay: index * 0.05, duration: 0.3 }}
                        className={`flex gap-5 py-5 ${index !== items.length - 1 ? 'border-b border-gray-100' : ''}`}
                      >
                        {/* Product Image */}
                        <motion.div 
                          whileHover={{ scale: 1.05 }}
                          className="w-[88px] h-[88px] bg-gray-50 rounded-2xl overflow-hidden shrink-0 relative group"
                        >
                          <img 
                            src={cleanImageUrl(item.image)} 
                            alt={item.name} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        </motion.div>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <h3 className="font-black text-[11px] uppercase tracking-wider leading-tight text-black">
                                {item.name}
                              </h3>
                              <motion.button
                                whileHover={{ scale: 1.2 }}
                                whileTap={{ scale: 0.8 }}
                                onClick={() => handleRemove(item._id || item.id)}
                                disabled={removingId === (item._id || item.id)}
                                className="text-gray-300 hover:text-red-500 transition-colors p-1 -mr-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </motion.button>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">{item.color}</span>
                              <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                              <span className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">{item.size}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-3">
                            {/* Quantity Controls */}
                            <div className="flex items-center gap-0 bg-gray-100 rounded-full">
                              <motion.button
                                whileTap={{ scale: 0.85 }}
                                onClick={() => updateQuantity(item._id || item.id, item.quantity - 1)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded-full transition-colors"
                              >
                                <Minus className="w-3 h-3" />
                              </motion.button>
                              <span className="text-[11px] font-black w-6 text-center">{item.quantity}</span>
                              <motion.button
                                whileTap={{ scale: 0.85 }}
                                onClick={() => updateQuantity(item._id || item.id, item.quantity + 1)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded-full transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                              </motion.button>
                            </div>

                            {/* Price */}
                            <div className="text-right">
                              {item.originalPrice && item.originalPrice > item.price && (
                                <p className="text-[9px] text-gray-400 line-through font-medium">
                                  {formatPrice(item.originalPrice * item.quantity)}
                                </p>
                              )}
                              <p className="font-black text-sm tracking-tight">{formatPrice(item.price * item.quantity)}</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* ── Footer ── */}
            {items.length > 0 && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="px-8 py-6 border-t border-gray-100 bg-gray-50/50"
              >
                {/* Shipping hint */}
                <div className="flex items-center gap-2 mb-4 bg-white rounded-full px-4 py-2.5 border border-gray-100">
                  <Package className="w-3.5 h-3.5 text-kaosNeon" />
                  <span className="text-[9px] uppercase tracking-widest font-bold text-gray-500">
                    Envío gratis desde $100
                  </span>
                </div>

                {/* Subtotal */}
                <div className="flex justify-between items-end mb-5">
                  <div>
                    <p className="text-[9px] text-gray-400 uppercase tracking-[0.2em] font-bold">Subtotal</p>
                    <p className="text-[9px] text-gray-400 uppercase tracking-widest font-medium mt-0.5">
                      Impuestos calculados al pagar
                    </p>
                  </div>
                  <motion.p 
                    key={total}
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    className="text-2xl font-black tracking-tight"
                  >
                    {formatPrice(total)}
                  </motion.p>
                </div>

                {/* CTA Buttons */}
                <div className="space-y-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCheckout}
                    className="w-full h-14 rounded-full bg-black text-white font-black text-[10px] uppercase tracking-[0.25em] 
                               hover:bg-kaosNeon hover:text-black transition-all flex items-center justify-center gap-3
                               shadow-xl hover:shadow-kaosNeon/20"
                  >
                    <CreditCard className="w-4 h-4" />
                    Finalizar Compra
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-full py-3 text-[9px] uppercase tracking-[0.2em] font-black text-gray-400 hover:text-black transition-colors text-center"
                  >
                    Seguir Comprando
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}