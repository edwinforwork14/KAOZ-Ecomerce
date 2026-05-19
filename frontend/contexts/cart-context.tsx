"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { api, cleanImageUrl } from "@/lib/api"
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
        // Mapear items del backend al formato del frontend
        const validItems = result.cart.items
          .filter((item: any) => item.productId || (item.product && (item.product._id || item.product.id)))
          .map((item: any) => {
            // Manejar tanto formato backend (productId) como populado (product._id)
            const productId = item.productId 
              || (typeof item.product === 'object' ? (item.product._id || item.product.id) : item.product)

            return {
              _id: item._id || item.id,
              id: productId,
              name: item.name,
              price: item.price,
              originalPrice: item.originalPrice || undefined,
              image: cleanImageUrl(item.image),
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
    // 1. Guardar copia del estado anterior para revertir en caso de error
    const previousItems = [...items]

    // 2. Crear o actualizar el item de forma optimista
    const existingItemIndex = items.findIndex(
      (item) => item.id === newItem.id && item.size === newItem.size && item.color === newItem.color
    )

    let updatedItems = [...items]
    if (existingItemIndex > -1) {
      updatedItems[existingItemIndex] = {
        ...updatedItems[existingItemIndex],
        quantity: updatedItems[existingItemIndex].quantity + quantity
      }
    } else {
      updatedItems.push({
        ...newItem,
        quantity,
        _id: `temp_${Date.now()}` // ID temporal
      })
    }

    // 3. Actualizar la interfaz de forma INSTANTÁNEA
    setItems(updatedItems)
    setIsOpen(true) // Abre el carrito de inmediato

    // Disparar evento para animaciones visuales
    window.dispatchEvent(new CustomEvent("cart-added", { detail: newItem }))

    // 4. Sincronizar en segundo plano con el servidor
    try {
      const result = await api.addToCart({
        productId: newItem.id,
        color: newItem.color,
        size: newItem.size,
        quantity,
        price: newItem.price,
        originalPrice: newItem.originalPrice,
        name: newItem.name,
        image: newItem.image,
      })

      if (result.success) {
        // Sincronización silenciosa para actualizar IDs finales del backend
        const cartResult = await api.getCart()
        if (cartResult.success && cartResult.cart && cartResult.cart.items) {
          const validItems = cartResult.cart.items
            .filter((item: any) => item.productId || (item.product && (item.product._id || item.product.id)))
            .map((item: any) => {
              const productId = item.productId 
                || (typeof item.product === 'object' ? (item.product._id || item.product.id) : item.product)

              return {
                _id: item._id || item.id,
                id: productId,
                name: item.name,
                price: item.price,
                originalPrice: item.originalPrice || undefined,
                image: cleanImageUrl(item.image),
                size: item.size,
                color: item.color,
                quantity: item.quantity,
              }
            })
          setItems(validItems)
        }
      } else {
        // Revertir en caso de error
        setItems(previousItems)
        toast.error(result.message || 'Error al agregar al carrito', {
          description: result.availableStock !== undefined 
            ? `Stock disponible: ${result.availableStock} unidades` 
            : undefined,
        })
      }
    } catch (error: any) {
      console.error('Error al agregar al carrito:', error)
      setItems(previousItems)
      toast.error('Error al agregar al carrito', {
        description: error.message || 'Por favor, intenta de nuevo',
      })
    }
  }

  const removeItem = async (itemId: string) => {
    const previousItems = [...items]
    
    // Eliminación optimista instantánea
    const updatedItems = items.filter(item => item._id !== itemId && item.id !== itemId)
    setItems(updatedItems)

    try {
      const result = await api.removeFromCart(itemId)
      
      if (result.success) {
        toast.success('Producto eliminado del carrito')
        // Sincronización silenciosa en segundo plano
        const cartResult = await api.getCart()
        if (cartResult.success && cartResult.cart && cartResult.cart.items) {
          const validItems = cartResult.cart.items
            .filter((item: any) => item.productId || (item.product && (item.product._id || item.product.id)))
            .map((item: any) => {
              const productId = item.productId 
                || (typeof item.product === 'object' ? (item.product._id || item.product.id) : item.product)

              return {
                _id: item._id || item.id,
                id: productId,
                name: item.name,
                price: item.price,
                originalPrice: item.originalPrice || undefined,
                image: cleanImageUrl(item.image),
                size: item.size,
                color: item.color,
                quantity: item.quantity,
              }
            })
          setItems(validItems)
        }
      } else {
        setItems(previousItems)
        toast.error(result.message || 'Error al eliminar del carrito')
      }
    } catch (error) {
      console.error('Error al eliminar del carrito:', error)
      setItems(previousItems)
      toast.error('Error al eliminar del carrito')
    }
  }

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) {
      await removeItem(itemId)
      return
    }

    const previousItems = [...items]

    // Actualización optimista de cantidad instantánea
    const updatedItems = items.map(item => {
      if (item._id === itemId || item.id === itemId) {
        return { ...item, quantity }
      }
      return item
    })
    setItems(updatedItems)

    try {
      const result = await api.updateCartItem(itemId, quantity)

      if (result.success) {
        // Sincronización silenciosa en segundo plano
        const cartResult = await api.getCart()
        if (cartResult.success && cartResult.cart && cartResult.cart.items) {
          const validItems = cartResult.cart.items
            .filter((item: any) => item.productId || (item.product && (item.product._id || item.product.id)))
            .map((item: any) => {
              const productId = item.productId 
                || (typeof item.product === 'object' ? (item.product._id || item.product.id) : item.product)

              return {
                _id: item._id || item.id,
                id: productId,
                name: item.name,
                price: item.price,
                originalPrice: item.originalPrice || undefined,
                image: cleanImageUrl(item.image),
                size: item.size,
                color: item.color,
                quantity: item.quantity,
              }
            })
          setItems(validItems)
        }
      } else {
        setItems(previousItems)
        toast.error(result.message || 'Error al actualizar cantidad', {
          description: result.availableStock !== undefined 
            ? `Stock disponible: ${result.availableStock} unidades` 
            : undefined,
        })
      }
    } catch (error: any) {
      console.error('Error al actualizar cantidad:', error)
      setItems(previousItems)
      toast.error('Error al actualizar cantidad', {
        description: error.message || 'Por favor, intenta de nuevo',
      })
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