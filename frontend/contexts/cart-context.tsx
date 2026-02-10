"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { api } from "@/lib/api"
import { toast } from "sonner"

export interface CartItem {
  _id?: string
  id: string
  name: string
  price: number
  originalPrice?: number
  image: string
  size: string
  color: string
  quantity: number
  availableStock?: number
}

interface CartContextType {
  items: CartItem[]
  addItem: (item: Omit<CartItem, "quantity" | "_id">, quantity?: number) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  updateQuantity: (itemId: string, quantity: number) => Promise<void>
  clearCart: () => Promise<void>
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  total: number
  loading: boolean
  refreshCart: () => Promise<void>
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Cargar carrito al montar el componente
  useEffect(() => {
    refreshCart()
  }, [])

  // Escuchar eventos de sincronización y logout
  useEffect(() => {
    const handleCartSync = () => {
      refreshCart()
    }
    
    const handleCartLogout = () => {
      setItems([])
      refreshCart()
    }

    window.addEventListener('cart-sync', handleCartSync)
    window.addEventListener('cart-logout', handleCartLogout)

    return () => {
      window.removeEventListener('cart-sync', handleCartSync)
      window.removeEventListener('cart-logout', handleCartLogout)
    }
  }, [])

  const refreshCart = async () => {
    try {
      setLoading(true)
      const result = await api.getCart()
      if (result.success && result.cart && result.cart.items) {
        // Filtrar items con productos válidos y mapear correctamente
        const validItems = result.cart.items
          .filter((item: any) => item.product && (item.product._id || item.product))
          .map((item: any) => {
            // Manejar tanto productos populados como referencias
            const productId = typeof item.product === 'object' && item.product._id 
              ? item.product._id 
              : item.product

            // Asegurarnos de usar el precio correcto del item
            // El backend debe guardar el precio con descuento en item.price
            return {
              _id: item._id,
              id: productId,
              name: item.name,
              price: item.price, // Precio actual (con descuento si aplica)
              originalPrice: item.originalPrice || undefined, // Precio original (antes del descuento)
              image: item.image,
              size: item.size,
              color: item.color,
              quantity: item.quantity,
            }
          })
        
        setItems(validItems)
      } else {
        setItems([])
      }
    } catch (error) {
      console.error('Error al cargar carrito:', error)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const addItem = async (newItem: Omit<CartItem, "quantity" | "_id">, quantity = 1) => {
    try {
      setLoading(true)
      
      // Enviar todos los datos necesarios al backend incluyendo los precios
      const result = await api.addToCart({
        productId: newItem.id,
        color: newItem.color,
        size: newItem.size,
        quantity,
        price: newItem.price, // Enviar el precio actual
        originalPrice: newItem.originalPrice, // Enviar el precio original si existe
        name: newItem.name,
        image: newItem.image,
      })

      // if (result.success) {
      //   await refreshCart()
      //   toast.success(`${newItem.name} agregado al carrito`, {
      //     description: `${quantity} unidad${quantity > 1 ? 'es' : ''} agregada${quantity > 1 ? 's' : ''}`,
      //   })
      //   setIsOpen(true)
      // } 
      if (result.success) {
        await refreshCart()
        window.dispatchEvent(new CustomEvent("cart-added", { detail: newItem }))
      } else {
        toast.error(result.message || 'Error al agregar al carrito', {
          description: result.availableStock !== undefined 
            ? `Stock disponible: ${result.availableStock} unidades` 
            : undefined,
        })
      }
    } catch (error: any) {
      console.error('Error al agregar al carrito:', error)
      toast.error('Error al agregar al carrito', {
        description: error.message || 'Por favor, intenta de nuevo',
      })
    } finally {
      setLoading(false)
    }
  }

  const removeItem = async (itemId: string) => {
    try {
      setLoading(true)
      const result = await api.removeFromCart(itemId)
      
      if (result.success) {
        await refreshCart()
        toast.success('Producto eliminado del carrito')
      } else {
        toast.error(result.message || 'Error al eliminar del carrito')
      }
    } catch (error) {
      console.error('Error al eliminar del carrito:', error)
      toast.error('Error al eliminar del carrito')
    } finally {
      setLoading(false)
    }
  }

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) {
      await removeItem(itemId)
      return
    }

    try {
      setLoading(true)
      const result = await api.updateCartItem(itemId, quantity)

      if (result.success) {
        await refreshCart()
      } else {
        toast.error(result.message || 'Error al actualizar cantidad', {
          description: result.availableStock !== undefined 
            ? `Stock disponible: ${result.availableStock} unidades` 
            : undefined,
        })
        await refreshCart() // Refrescar para volver a la cantidad válida
      }
    } catch (error: any) {
      console.error('Error al actualizar cantidad:', error)
      toast.error('Error al actualizar cantidad', {
        description: error.message || 'Por favor, intenta de nuevo',
      })
      await refreshCart()
    } finally {
      setLoading(false)
    }
  }

  const clearCart = async () => {
    try {
      setLoading(true)
      const result = await api.clearCart()
      
      if (result.success) {
        setItems([])
        toast.success('Carrito vaciado')
      } else {
        toast.error(result.message || 'Error al vaciar carrito')
      }
    } catch (error) {
      console.error('Error al vaciar carrito:', error)
      toast.error('Error al vaciar carrito')
    } finally {
      setLoading(false)
    }
  }

  // Calcular total usando el precio actual (con descuento)
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        isOpen,
        setIsOpen,
        total,
        loading,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}