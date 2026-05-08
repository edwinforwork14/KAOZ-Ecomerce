"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Loader2, Search, RefreshCw, Truck, Calendar, Clock, Eye, FileDown, MoreVertical, Package
} from "lucide-react"
import { api } from "@/lib/api"
import { brandConfig } from "@/lib/config"
import { useToast } from "@/hooks/use-toast"

export default function OrdersPage() {
  const { toast } = useToast()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const result = await api.getAllOrders()
      if (result.success) {
        setOrders(result.orders || [])
      }
    } catch (error) {
      console.error('Error loading orders:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-1 bg-black overflow-hidden">
            <div className="w-full h-full bg-kaosNeon animate-progress-fast"></div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">Sincronizando Pedidos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-8 bg-transparent min-h-screen">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-black/10 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-kaosNeon animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-black/40">Operaciones en Tiempo Real • KAOZ</span>
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">Pedidos</h1>
        </div>
        <Button onClick={loadOrders} className="bg-black text-white rounded-none hover:bg-kaosNeon hover:text-black transition-all h-14 px-8 text-xs font-black uppercase tracking-widest">
          <RefreshCw className="h-4 w-4 mr-2" /> Actualizar
        </Button>
      </div>

      <div className="grid gap-4">
        {orders.length > 0 ? (
          orders.map((order) => (
            <div key={order._id} className="group border border-black/10 shadow-sm p-6 flex flex-col md:flex-row justify-between items-start md:items-center bg-white hover:border-black transition-all cursor-default">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-black text-white">
                  <Package className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xl font-black uppercase tracking-tighter">#{order.orderNumber}</p>
                  <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">{new Date(order.createdAt).toLocaleString()}</p>
                </div>
              </div>
              
              <div className="mt-4 md:mt-0 flex flex-col md:items-end">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest border ${
                    order.orderStatus === 'delivered' ? 'border-green-500 text-green-500' :
                    order.orderStatus === 'cancelled' ? 'border-red-500 text-red-500' :
                    'border-kaosNeon text-black bg-kaosNeon'
                  }`}>
                    {order.orderStatus}
                  </span>
                </div>
                <p className="text-2xl font-black mt-1">${order.total?.toFixed(0)}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="border border-dashed border-black/10 p-20 text-center bg-black/[0.01]">
            <Package className="h-12 w-12 text-black/10 mx-auto mb-4" />
            <p className="text-black/40 text-[10px] font-black uppercase tracking-[0.2em]">No se registran transacciones</p>
          </div>
        )}
      </div>
    </div>
  )
}