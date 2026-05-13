"use client"

import { useEffect, useState } from "react"
import { 
  Loader2, 
  Search, 
  RefreshCw, 
  Truck, 
  Calendar, 
  Clock, 
  Eye, 
  FileDown, 
  MoreVertical, 
  Package,
  User,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock4,
  ChevronRight,
  ArrowRight,
  Printer
} from "lucide-react"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export default function OrdersPage() {
  const { toast } = useToast()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [updating, setUpdating] = useState(false)

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
      toast({ title: "Error", description: "No se pudieron cargar los pedidos.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (orderId: string, status: string, paymentStatus?: string) => {
    setUpdating(true)
    try {
      const res = await api.updateOrderStatus(orderId, { 
        orderStatus: status, 
        paymentStatus: paymentStatus 
      })
      if (res.success) {
        toast({ title: "Pedido Actualizado", description: `El estado ahora es ${status}.` })
        loadOrders()
        if (selectedOrder?.id === orderId) {
          setShowDetails(false)
        }
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setUpdating(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered': return <Badge className="bg-green-500 hover:bg-green-600 border-none rounded-none text-[8px] font-black uppercase tracking-widest">Entregado</Badge>
      case 'cancelled': return <Badge className="bg-red-500 hover:bg-red-600 border-none rounded-none text-[8px] font-black uppercase tracking-widest">Cancelado</Badge>
      case 'shipped': return <Badge className="bg-blue-500 hover:bg-blue-600 border-none rounded-none text-[8px] font-black uppercase tracking-widest">Enviado</Badge>
      case 'processing': return <Badge className="bg-orange-500 hover:bg-orange-600 border-none rounded-none text-[8px] font-black uppercase tracking-widest">En Proceso</Badge>
      case 'confirmed': return <Badge className="bg-black hover:bg-black border-none rounded-none text-[8px] font-black uppercase tracking-widest text-white">Confirmado</Badge>
      default: return <Badge className="bg-slate-200 text-slate-500 hover:bg-slate-200 border-none rounded-none text-[8px] font-black uppercase tracking-widest">Pendiente</Badge>
    }
  }

  const filteredOrders = orders.filter(o => 
    o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
    o.customerInfo?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
    o.customerInfo?.email?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-1 bg-black overflow-hidden">
            <div className="w-full h-full bg-kaosNeon animate-progress-fast"></div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] animate-pulse text-black">Sincronizando Archivo Maestro...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-8 bg-transparent min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-black/10 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-kaosNeon animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-black/40">Logística de Transacciones • KAOZ</span>
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">Pedidos</h1>
        </div>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/20" />
            <Input 
              placeholder="BUSCAR POR # O CLIENTE..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-14 w-full md:w-80 rounded-none border-black focus:ring-0 font-bold uppercase text-[10px] tracking-widest"
            />
          </div>
          <Button onClick={loadOrders} className="bg-black text-white rounded-none hover:bg-kaosNeon hover:text-black transition-all h-14 px-8 text-xs font-black uppercase tracking-widest">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Orders List */}
      <div className="grid gap-4">
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order) => (
            <div 
              key={order.id} 
              className="group border border-black/10 shadow-sm p-6 flex flex-col md:flex-row justify-between items-start md:items-center bg-white hover:border-black transition-all cursor-default"
              onClick={() => { setSelectedOrder(order); setShowDetails(true); }}
            >
              <div className="flex items-center gap-6 w-full md:w-auto">
                <div className="p-4 bg-black text-white flex-shrink-0">
                  <Package className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="text-2xl font-black uppercase tracking-tighter">#{order.orderNumber}</p>
                    {getStatusBadge(order.orderStatus)}
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-bold text-black/40 uppercase tracking-widest">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(order.createdAt).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1"><User className="h-3 w-3" /> {order.customerInfo?.firstName} {order.customerInfo?.lastName}</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 md:mt-0 flex items-center justify-between w-full md:w-auto gap-12">
                <div className="flex flex-col items-end">
                  <p className="text-[10px] font-black text-black/20 uppercase tracking-widest mb-1">Total Transacción</p>
                  <p className="text-3xl font-black">${order.total?.toFixed(0)}</p>
                </div>
                <Button variant="ghost" size="icon" className="rounded-none border border-black/10 group-hover:border-black group-hover:bg-black group-hover:text-white transition-all">
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="border border-dashed border-black/10 p-20 text-center bg-black/[0.01]">
            <Package className="h-12 w-12 text-black/10 mx-auto mb-4" />
            <p className="text-black/40 text-[10px] font-black uppercase tracking-[0.2em]">No se registran transacciones bajo este criterio</p>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl rounded-none border-black p-0 overflow-hidden bg-white">
          <DialogHeader className="bg-black text-white p-8">
            <div className="flex justify-between items-start">
              <div>
                <Badge className="bg-kaosNeon text-black border-none rounded-none text-[8px] font-black uppercase tracking-widest mb-4">Detalles del Protocolo</Badge>
                <DialogTitle className="text-5xl font-black uppercase tracking-tighter leading-none">
                  ORDEN #{selectedOrder?.orderNumber}
                </DialogTitle>
                <DialogDescription className="text-white/40 font-bold text-[10px] uppercase tracking-widest mt-2 flex items-center gap-3">
                  <span>{new Date(selectedOrder?.createdAt).toLocaleString()}</span>
                  <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                  <span>{selectedOrder?.items?.length || 0} ÍTEMS REGISTRADOS</span>
                </DialogDescription>
              </div>
              <div className="text-right">
                <p className="text-white/20 text-[10px] font-black uppercase tracking-widest mb-1">Balance Final</p>
                <p className="text-5xl font-black">${selectedOrder?.total?.toFixed(2)}</p>
              </div>
            </div>
          </DialogHeader>

          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Info Client */}
            <div className="space-y-6">
              <div className="industrial-section">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-black/20 border-b border-black/5 pb-2 mb-4 flex items-center gap-2">
                  <User className="h-3 w-3" /> Datos del Cliente
                </h4>
                <div className="space-y-2">
                  <p className="text-xl font-black uppercase tracking-tight">{selectedOrder?.customerInfo?.firstName} {selectedOrder?.customerInfo?.lastName}</p>
                  <p className="text-xs font-bold text-black/60">{selectedOrder?.customerInfo?.email}</p>
                  <p className="text-xs font-bold text-black/60">{selectedOrder?.customerInfo?.phone}</p>
                </div>
              </div>

              <div className="industrial-section">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-black/20 border-b border-black/5 pb-2 mb-4 flex items-center gap-2">
                  <Truck className="h-3 w-3" /> Logística de Envío
                </h4>
                <div className="space-y-2">
                  <p className="text-xs font-black uppercase tracking-widest">{selectedOrder?.shippingMethod?.name || 'ESTÁNDAR'}</p>
                  {selectedOrder?.shippingAddress && (
                    <p className="text-[10px] font-bold text-black/60 uppercase leading-relaxed">
                      {selectedOrder.shippingAddress.address}<br />
                      {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state}
                    </p>
                  )}
                </div>
              </div>

              <div className="industrial-section">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-black/20 border-b border-black/5 pb-2 mb-4 flex items-center gap-2">
                  <CreditCard className="h-3 w-3" /> Método de Pago
                </h4>
                <div className="flex items-center gap-3">
                   <div className={cn(
                     "px-3 py-1 text-[10px] font-black uppercase tracking-widest border",
                     selectedOrder?.paymentStatus === 'paid' ? 'bg-green-500 border-green-500 text-white' : 'border-black'
                   )}>
                     {selectedOrder?.paymentMethod?.name || 'DESCONOCIDO'}
                   </div>
                   <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">
                     {selectedOrder?.paymentStatus === 'paid' ? 'PAGADO' : 'PENDIENTE'}
                   </span>
                </div>
              </div>
            </div>

            {/* Ítems List */}
            <div>
               <h4 className="text-[10px] font-black uppercase tracking-widest text-black/20 border-b border-black/5 pb-2 mb-4">
                 Manifiesto de Carga
               </h4>
               <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                 {selectedOrder?.items?.map((item: any, idx: number) => (
                   <div key={idx} className="flex items-center gap-4 border-b border-black/5 pb-4">
                     <div className="w-12 h-12 bg-black/5 flex-shrink-0">
                       {item.image && <img src={item.image} className="w-full h-full object-cover grayscale contrast-125" />}
                     </div>
                     <div className="flex-1 min-w-0">
                       <p className="text-[10px] font-black uppercase tracking-tight truncate">{item.name}</p>
                       <p className="text-[9px] font-bold text-black/40 uppercase tracking-widest">TALLA: {item.size} • COLOR: {item.color}</p>
                     </div>
                     <div className="text-right">
                       <p className="text-[10px] font-black">{item.quantity}X</p>
                       <p className="text-[10px] font-black">${item.price}</p>
                     </div>
                   </div>
                 ))}
               </div>
               
               <div className="mt-8 pt-6 border-t-2 border-black space-y-2">
                 <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-black/40">
                   <span>Subtotal</span>
                   <span>${selectedOrder?.subtotal?.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-black/40">
                   <span>Envío</span>
                   <span>${selectedOrder?.shipping?.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between items-center pt-2">
                   <span className="text-xs font-black uppercase tracking-widest">Total</span>
                   <span className="text-xl font-black">${selectedOrder?.total?.toFixed(2)}</span>
                 </div>
               </div>
            </div>
          </div>

          <DialogFooter className="bg-slate-50 p-8 flex flex-col md:flex-row gap-3">
             <div className="flex-1 flex gap-2">
                <Button 
                  onClick={() => window.print()}
                  variant="outline" 
                  className="rounded-none border-black h-12 font-black uppercase text-[10px] tracking-widest px-6"
                >
                  <Printer className="h-4 w-4 mr-2" /> Imprimir
                </Button>
             </div>
             <div className="flex gap-2">
               {selectedOrder?.orderStatus !== 'delivered' && selectedOrder?.orderStatus !== 'cancelled' && (
                 <>
                  <Button 
                    onClick={() => updateStatus(selectedOrder.id, 'confirmed', 'paid')}
                    disabled={updating}
                    className="rounded-none bg-green-500 hover:bg-green-600 text-white h-12 font-black uppercase text-[10px] tracking-widest px-6"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Confirmar Pago
                  </Button>
                  <Button 
                    onClick={() => updateStatus(selectedOrder.id, 'cancelled')}
                    disabled={updating}
                    className="rounded-none border-red-500 text-red-500 hover:bg-red-500 hover:text-white h-12 font-black uppercase text-[10px] tracking-widest px-6"
                    variant="outline"
                  >
                    <XCircle className="h-4 w-4 mr-2" /> Denegar
                  </Button>
                 </>
               )}
               {selectedOrder?.orderStatus === 'confirmed' && (
                 <Button 
                    onClick={() => updateStatus(selectedOrder.id, 'processing')}
                    disabled={updating}
                    className="rounded-none bg-black text-white h-12 font-black uppercase text-[10px] tracking-widest px-6"
                  >
                    <Clock4 className="h-4 w-4 mr-2" /> En Proceso
                  </Button>
               )}
               {selectedOrder?.orderStatus === 'processing' && (
                 <Button 
                    onClick={() => updateStatus(selectedOrder.id, 'delivered')}
                    disabled={updating}
                    className="rounded-none bg-black text-white h-12 font-black uppercase text-[10px] tracking-widest px-6"
                  >
                    <Truck className="h-4 w-4 mr-2" /> Marcar Entregado
                  </Button>
               )}
             </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}