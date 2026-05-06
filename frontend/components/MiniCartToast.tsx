"use client"
import { useEffect, useState } from "react"
import { X, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/contexts/cart-context"
import { motion, AnimatePresence } from "framer-motion"

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
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-10 left-0 right-0 flex justify-center z-[100] pointer-events-none px-4"
        >
          <div className="pointer-events-auto glass rounded-3xl p-3 w-full max-w-sm flex items-center gap-4 border shadow-2xl">
            <div className="relative w-16 h-16 shrink-0">
              <img
                src={item.image || "/placeholder.svg"}
                className="w-full h-full rounded-2xl object-cover"
                alt={item.name}
              />
              <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1 border-2 border-white">
                <CheckCircle2 className="w-3 h-3 text-white" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate uppercase">{item.name}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Agregado con éxito</p>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="primary" 
                onClick={() => { setIsOpen(true); setVisible(false); }}
                className="rounded-full text-xs px-4"
              >
                Ver Carrito
              </Button>
              <button 
                onClick={() => setVisible(false)}
                className="p-1 hover:bg-black/5 rounded-full transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
