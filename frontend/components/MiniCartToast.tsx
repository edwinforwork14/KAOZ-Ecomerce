"use client"
import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/contexts/cart-context"

export default function MiniCartToast() {
  const { setIsOpen } = useCart()
  const [item, setItem] = useState<any>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handler = (e: any) => {
      setItem(e.detail)
      setVisible(true)
      setTimeout(() => setVisible(false), 4200)
      setTimeout(() => setItem(null), 4500)
    }

    window.addEventListener("cart-added", handler)
    return () => window.removeEventListener("cart-added", handler)
  }, [])

  if (!item) return null

  return (
    <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 pointer-events-none">
      <div
        className={`pointer-events-auto transition-all duration-500 ease-out
          ${visible
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-6"
          }
        `}
      >
        <div className="bg-white shadow-2xl rounded-2xl p-4 w-80 flex items-center gap-4 border">
          <img
            src={item.image ? `https://yenfit.shop${item.image}` : "/placeholder.svg"}
            className="w-14 h-14 rounded-xl object-cover"
          />

          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold uppercase truncate">{item.name}</p>
            <p className="text-xs text-gray-500">Agregado al carrito</p>
          </div>

          <Button size="sm" onClick={() => setIsOpen(true)}>Ver</Button>

          <button onClick={() => setVisible(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
