"use client"
import { useEffect, useState } from "react"
import { X, Check, ShoppingBag } from "lucide-react"
import { useCart } from "@/contexts/cart-context"
import { motion, AnimatePresence } from "framer-motion"
import { cleanImageUrl } from "@/lib/api"

export default function MiniCartToast() {
  const { setIsOpen } = useCart()
  const [item, setItem] = useState<any>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handler = (e: any) => {
      setItem(e.detail)
      setVisible(true)
      const timer = setTimeout(() => setVisible(false), 4000)
      return () => clearTimeout(timer)
    }

    window.addEventListener("cart-added", handler)
    return () => window.removeEventListener("cart-added", handler)
  }, [])

  return (
    <AnimatePresence>
      {visible && item && (
        <motion.div 
          initial={{ opacity: 0, y: 60, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-8 left-0 right-0 flex justify-center z-[110] pointer-events-none px-4"
        >
          <div className="pointer-events-auto bg-white rounded-full pl-3 pr-2 py-2 flex items-center gap-4 shadow-2xl border border-gray-100 max-w-sm w-full">
            {/* Product Image */}
            <div className="relative w-12 h-12 shrink-0">
              <img
                src={cleanImageUrl(item.image)}
                className="w-full h-full rounded-full object-cover"
                alt={item.name}
              />
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className="absolute -top-1 -right-1 bg-kaosNeon rounded-full w-5 h-5 flex items-center justify-center shadow-sm"
              >
                <Check className="w-3 h-3 text-black" strokeWidth={3} />
              </motion.div>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black truncate uppercase tracking-wider text-black">{item.name}</p>
              <p className="text-[8px] text-gray-400 uppercase tracking-[0.2em] font-bold">Agregado al carrito</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setIsOpen(true); setVisible(false); }}
                className="bg-black text-white rounded-full px-5 py-2.5 text-[9px] font-black uppercase tracking-widest hover:bg-kaosNeon hover:text-black transition-all flex items-center gap-2"
              >
                <ShoppingBag className="w-3 h-3" />
                Ver
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setVisible(false)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
              >
                <X className="h-3.5 w-3.5 text-gray-400" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
