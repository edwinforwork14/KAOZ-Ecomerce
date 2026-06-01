"use client"

import { useEffect, useState, useMemo } from "react"
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
  Printer,
  Filter,
  Trash2,
  Banknote,
  RotateCcw,
  Mail,
  MapPin,
  MoreHorizontal
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
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const statusConfig: { [key: string]: { label: string; color: string; bgColor: string; icon: any } } = {
  pending: { label: 'PENDIENTE', color: 'text-neutral-600', bgColor: 'bg-neutral-100 border-neutral-200', icon: Clock },
  confirmed: { label: 'CONFIRMADO', color: 'text-neutral-700', bgColor: 'bg-neutral-100 border-neutral-200', icon: CheckCircle2 },
  processing: { label: 'EN PROCESO', color: 'text-neutral-800', bgColor: 'bg-neutral-200 border-neutral-300', icon: RotateCcw },
  shipped: { label: 'ENVIADO', color: 'text-white', bgColor: 'bg-neutral-900 border-transparent', icon: Truck },
  delivered: { label: 'ENTREGADO', color: 'text-neutral-850', bgColor: 'bg-neutral-100 border-neutral-200', icon: CheckCircle2 },
  cancelled: { label: 'CANCELADO', color: 'text-red-600', bgColor: 'bg-red-50 border-red-150', icon: XCircle },
}

const paymentStatusConfig: { [key: string]: { label: string; color: string } } = {
  pending: { label: 'PAGO PENDIENTE', color: 'bg-neutral-100 text-neutral-600 border-neutral-200' },
  paid: { label: 'PAGADO', color: 'bg-neutral-100 text-neutral-800 border-neutral-200' },
  failed: { label: 'FALLIDO', color: 'bg-red-50 text-red-650 border-red-150' },
  refunded: { label: 'REEMBOLSADO', color: 'bg-neutral-50 text-neutral-500 border-neutral-200' },
}

export default function OrdersPage() {
  const { toast } = useToast()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>('all')
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)
  const [settings, setSettings] = useState<any>(null)
  const currencySymbol = settings?.currency?.symbol || "$"

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const [ordersRes, settingsRes] = await Promise.all([
        api.getAllOrders({ includeDeleted: showDeleted }),
        api.getSettings()
      ])

      if (ordersRes.success) {
        setOrders(ordersRes.orders || [])
      }
      if (settingsRes.success) {
        setSettings(settingsRes.settings)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast({ title: "Error", description: "No se pudieron cargar los datos.", variant: "destructive" })
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

  const handleDeleteOrder = async (id: string) => {
    if (!confirm("¿EJECUTAR PROTOCOLO DE ELIMINACIÓN DE REGISTRO?")) return
    setUpdating(true)
    try {
      const result = await api.deleteOrder(id)
      if (result.success) {
        toast({ title: "ELIMINADO", description: "PEDIDO REMOVIDO DEL REGISTRO ACTIVO" })
        loadOrders()
      }
    } catch (error) {
      toast({ title: "Error", description: "Error al eliminar pedido", variant: "destructive" })
    } finally {
      setUpdating(false)
    }
  }

  const handleRestoreOrder = async (id: string) => {
    setUpdating(true)
    try {
      const result = await api.restoreOrder(id)
      if (result.success) {
        toast({ title: "RESTAURADO", description: "PEDIDO REINTEGRADO AL SISTEMA" })
        loadOrders()
      }
    } catch (error) {
      toast({ title: "Error", description: "Error al restaurar pedido", variant: "destructive" })
    } finally {
      setUpdating(false)
    }
  }

  const filteredOrders = orders.filter(o => {
    const matchesSearch = (o.orderNumber || "").toLowerCase().includes(search.toLowerCase()) ||
                         o.customerInfo?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
                         o.customerInfo?.email?.toLowerCase().includes(search.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || o.orderStatus === filterStatus
    const matchesPayment = filterPaymentStatus === 'all' || o.paymentStatus === filterPaymentStatus
    const matchesDeleted = showDeleted ? o.isDeleted : !o.isDeleted
    
    return matchesSearch && matchesStatus && matchesPayment && matchesDeleted
  })

  const stats = useMemo(() => {
    const activeOrders = orders.filter(o => !o.isDeleted)
    return {
      total: activeOrders.length,
      pending: activeOrders.filter(o => o.orderStatus === 'pending').length,
      delivered: activeOrders.filter(o => o.orderStatus === 'delivered').length,
      cancelled: activeOrders.filter(o => o.orderStatus === 'cancelled').length,
      totalRevenue: activeOrders.reduce((sum, o) => sum + (o.total || 0), 0)
    }
  }, [orders])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-1 bg-neutral-100 overflow-hidden">
            <div className="w-full h-full bg-neutral-900 animate-progress-fast"></div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] animate-pulse text-neutral-500">Sincronizando Archivo Maestro...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-8 bg-transparent min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-neutral-200 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-neutral-400 animate-pulse"></div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-450">Logística de Transacciones • KAOS</span>
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tighter leading-none text-neutral-900">Gestión de Pedidos</h1>
          <p className="text-[10px] font-bold text-neutral-450 uppercase tracking-widest mt-2">Control centralizado de operaciones comerciales</p>
        </div>
        <div className="flex gap-2">
           <Button onClick={loadOrders} variant="outline" className="rounded-none border-neutral-200 h-12 font-bold uppercase text-[10px] tracking-widest px-6 bg-transparent text-neutral-600 hover:bg-neutral-50 transition-all shadow-none">
             <RefreshCw className="h-4 w-4 mr-2" /> Actualizar
           </Button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
         {[
           { label: 'Total', value: stats.total, icon: Package, color: 'bg-neutral-900 text-white border-transparent' },
           { label: 'Pendientes', value: stats.pending, icon: Clock, color: 'bg-white text-neutral-800 border border-neutral-200 shadow-sm' },
           { label: 'Entregados', value: stats.delivered, icon: CheckCircle2, color: 'bg-white text-neutral-800 border border-neutral-200 shadow-sm' },
           { label: 'Cancelados', value: stats.cancelled, icon: XCircle, color: 'bg-white text-neutral-800 border border-neutral-200 shadow-sm' },
           { label: 'Ingresos', value: `${currencySymbol}${stats.totalRevenue.toLocaleString()}`, icon: Banknote, color: 'bg-white text-neutral-900 border border-neutral-200 shadow-sm' },
         ].map((s, i) => (
           <div key={i} className={cn("border p-5 transition-all group rounded-none", s.color)}>
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-neutral-50 text-neutral-500 border border-neutral-100 group-hover:bg-neutral-100/50">
                    <s.icon className="h-5 w-5" />
                 </div>
                 <div>
                    <p className="text-xl font-black tracking-tight leading-none mb-1 text-neutral-800">{s.value}</p>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-neutral-450">{s.label}</p>
                 </div>
              </div>
           </div>
         ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-neutral-50 text-neutral-800 p-6 flex flex-col lg:flex-row gap-6 items-center border border-neutral-200 shadow-sm rounded-none">
         <div className="relative flex-1 w-full lg:w-auto group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-350 group-focus-within:text-neutral-500 transition-colors" />
            <Input 
              placeholder="BUSCAR POR # O CLIENTE..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-14 w-full rounded-none border-neutral-200 bg-white focus:border-neutral-400 transition-all font-bold uppercase text-[10px] tracking-widest text-neutral-800 placeholder:text-neutral-400"
            />
         </div>

         <div className="flex flex-wrap gap-3 w-full lg:w-auto">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-14 w-[200px] rounded-none border-neutral-200 bg-white font-bold uppercase text-[10px] tracking-widest text-neutral-700">
                <Filter className="h-3 w-3 mr-2 text-neutral-400" />
                <SelectValue placeholder="Estado Pedido" />
              </SelectTrigger>
              <SelectContent className="rounded-none border-neutral-200 bg-white text-white">
                <SelectItem value="all" className="text-[10px] font-bold uppercase">TODOS LOS ESTADOS</SelectItem>
                <SelectItem value="pending" className="text-[10px] font-bold uppercase">PENDIENTES</SelectItem>
                <SelectItem value="confirmed" className="text-[10px] font-bold uppercase">CONFIRMADOS</SelectItem>
                <SelectItem value="processing" className="text-[10px] font-bold uppercase">EN PROCESO</SelectItem>
                <SelectItem value="shipped" className="text-[10px] font-bold uppercase">ENVIADOS</SelectItem>
                <SelectItem value="delivered" className="text-[10px] font-bold uppercase">ENTREGADOS</SelectItem>
                <SelectItem value="cancelled" className="text-[10px] font-bold uppercase">CANCELADOS</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPaymentStatus} onValueChange={setFilterPaymentStatus}>
              <SelectTrigger className="h-14 w-[200px] rounded-none border-neutral-200 bg-white font-bold uppercase text-[10px] tracking-widest text-neutral-700">
                <CreditCard className="h-3 w-3 mr-2 text-neutral-400" />
                <SelectValue placeholder="Estado Pago" />
              </SelectTrigger>
              <SelectContent className="rounded-none border-neutral-200 bg-white text-white">
                <SelectItem value="all" className="text-[10px] font-bold uppercase">TODOS LOS PAGOS</SelectItem>
                <SelectItem value="pending" className="text-[10px] font-bold uppercase">PAGO PENDIENTE</SelectItem>
                <SelectItem value="paid" className="text-[10px] font-bold uppercase">PAGADO</SelectItem>
                <SelectItem value="failed" className="text-[10px] font-bold uppercase">FALLIDO</SelectItem>
                <SelectItem value="refunded" className="text-[10px] font-bold uppercase">REEMBOLSADO</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={showDeleted ? "default" : "outline"}
              onClick={() => {
                setShowDeleted(!showDeleted)
                setTimeout(() => loadOrders(), 0)
              }}
              className={cn(
                "h-14 rounded-none border-neutral-200 font-bold uppercase text-[10px] tracking-widest gap-2 px-6",
                showDeleted ? "bg-neutral-900 text-white border-transparent" : "bg-white text-neutral-600 hover:bg-neutral-50"
              )}
            >
              <Trash2 className="h-4 w-4" />
              {showDeleted ? 'OCULTAR ELIMINADOS' : 'VER ELIMINADOS'}
            </Button>
         </div>
      </div>

      {/* Orders Transaction List */}
      <div className="space-y-4">
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order) => {
            const status = statusConfig[order.orderStatus] || statusConfig.pending
            const paymentStatus = paymentStatusConfig[order.paymentStatus] || paymentStatusConfig.pending

            return (
              <div 
                key={order.id} 
                className="group bg-white border border-neutral-200 p-8 flex flex-col lg:flex-row justify-between items-start lg:items-center hover:border-neutral-450 hover:shadow-md transition-all duration-200 cursor-pointer relative overflow-hidden rounded-none shadow-sm"
                onClick={() => { setSelectedOrder(order); setShowDetails(true); }}
              >
                {/* Status Bar Left */}
                <div className={cn("absolute left-0 top-0 bottom-0 w-1", status.bgColor.replace('bg-opacity-10', ''))}></div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 w-full">
                   {/* Order ID & Status */}
                   <div>
                      <p className="text-[8px] font-bold uppercase tracking-widest text-neutral-400 mb-2">ID TRANSACCIÓN</p>
                      <p className="text-xl font-black uppercase tracking-tight mb-4 text-neutral-800 transition-colors">#{order.orderNumber}</p>
                      <div className="flex flex-wrap gap-2">
                         <Badge className={cn("rounded-none border text-[8px] font-bold uppercase tracking-widest h-6 px-2.5 bg-transparent", status.bgColor, status.color)}>
                            {status.label}
                         </Badge>
                         <Badge className={cn("rounded-none border text-[8px] font-bold uppercase tracking-widest h-6 px-2.5 bg-transparent", paymentStatus.color.replace('bg-', 'border-').replace('text-', 'border-'))}>
                            {paymentStatus.label}
                         </Badge>
                      </div>
                   </div>

                   {/* Customer Info */}
                   <div className="flex flex-col justify-center">
                      <p className="text-[8px] font-bold uppercase tracking-widest text-neutral-400 mb-4 flex items-center gap-2">
                         <User className="h-3 w-3 text-neutral-400" /> CLIENTE
                      </p>
                      <p className="text-base font-bold uppercase tracking-tight text-neutral-800 mb-1">{order.customerInfo?.firstName} {order.customerInfo?.lastName}</p>
                      <p className="text-[10px] font-medium text-neutral-450 truncate tracking-widest">{order.customerInfo?.email}</p>
                   </div>

                   {/* Logistics & Date */}
                   <div className="flex flex-col justify-center">
                      <p className="text-[8px] font-bold uppercase tracking-widest text-neutral-400 mb-4 flex items-center gap-2">
                         <Truck className="h-3 w-3 text-neutral-400" /> LOGÍSTICA
                      </p>
                      <p className="text-xs font-bold text-neutral-700 mb-1">{new Date(order.createdAt).toLocaleDateString()}</p>
                      <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest truncate">{order.shippingMethod?.name || 'ENTREGA ESTÁNDAR'}</p>
                   </div>

                   {/* Payment & Price */}
                   <div className="flex items-center justify-between lg:justify-end gap-12">
                      <div className="text-right">
                         <p className="text-[8px] font-bold uppercase tracking-widest text-neutral-400 mb-2">MONTO TOTAL</p>
                         <p className="text-2xl font-black text-neutral-800">${order.total?.toLocaleString()}</p>
                      </div>
                      <div className="flex gap-2">
                        {order.isDeleted ? (
                          <Button 
                            onClick={(e) => { e.stopPropagation(); handleRestoreOrder(order.id); }}
                            variant="outline" 
                            className="rounded-none border-neutral-200 text-neutral-600 hover:bg-neutral-50 h-14 px-4 font-bold uppercase text-[9px]"
                          >
                            RESTAURAR
                          </Button>
                        ) : (
                          <>
                            {settings?.orders?.allowDelete && (
                              <Button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id); }}
                                variant="destructive" 
                                className="rounded-none bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border border-transparent h-14 w-14 p-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="outline" size="icon" className="rounded-none border-neutral-200 text-neutral-400 hover:border-neutral-400 hover:bg-neutral-50 hover:text-neutral-750 shadow-none h-14 w-14">
                              <ChevronRight className="h-6 w-6" />
                            </Button>
                          </>
                        )}
                      </div>
                   </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="border border-dashed border-neutral-200 p-20 text-center bg-neutral-50/20">
            <Package className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-400 text-[10px] font-bold uppercase tracking-widest">No se registran transacciones bajo este criterio</p>
          </div>
        )}
      </div>

      {/* Order Details Modal (Same Industrial Style) */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-none border-neutral-200 p-0 bg-white shadow-2xl">
          <DialogHeader className="bg-neutral-900 text-white p-8">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
              <div>
                <Badge className="bg-neutral-800 text-neutral-250 border border-neutral-700 rounded-none text-[8px] font-bold uppercase tracking-widest mb-4">Protocolo de Transacción</Badge>
                <DialogTitle className="text-3xl font-black uppercase tracking-tighter leading-none text-white">
                  ORDEN #{selectedOrder?.orderNumber}
                </DialogTitle>
                <DialogDescription className="text-neutral-400 font-bold text-[10px] uppercase tracking-widest mt-2 flex items-center gap-3">
                  <span>{new Date(selectedOrder?.createdAt).toLocaleString()}</span>
                  <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                  <span>{selectedOrder?.items?.length || 0} COMPONENTES REGISTRADOS</span>
                </DialogDescription>
              </div>
              <div className="text-right">
                <p className="text-neutral-450 text-[10px] font-bold uppercase tracking-widest mb-1">Monto Total</p>
                <p className="text-5xl font-black text-white">${selectedOrder?.total?.toFixed(2)}</p>
              </div>
            </div>
          </DialogHeader>

          <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Left Column: Logistics */}
            <div className="lg:col-span-5 space-y-8">
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 border-b border-neutral-200 pb-2 mb-4 flex items-center gap-2 text-neutral-800">
                  <User className="h-3 w-3 text-neutral-450" /> Información del Cliente
                </h4>
                <div className="space-y-1">
                  <p className="text-xl font-bold uppercase tracking-tight text-neutral-800">{selectedOrder?.customerInfo?.firstName} {selectedOrder?.customerInfo?.lastName}</p>
                  <p className="text-xs font-medium text-neutral-500">{selectedOrder?.customerInfo?.email}</p>
                  <p className="text-xs font-medium text-neutral-500">{selectedOrder?.customerInfo?.phone}</p>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 border-b border-neutral-200 pb-2 mb-4 flex items-center gap-2 text-neutral-800">
                  <Truck className="h-3 w-3 text-neutral-450" /> Logística de Despacho
                </h4>
                <div className="space-y-4">
                  <div className="p-4 bg-neutral-50 border border-neutral-200 shadow-sm flex items-center justify-between">
                     <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-800">{selectedOrder?.shippingMethod?.name || 'ESTÁNDAR'}</p>
                     <MapPin className="h-4 w-4 text-neutral-400" />
                  </div>
                  {selectedOrder?.shippingAddress && (
                    <p className="text-xs font-medium text-neutral-500 uppercase leading-relaxed bg-neutral-50 p-4 border-l-2 border-neutral-350">
                      {selectedOrder.shippingAddress.address}<br />
                      {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state}
                      {selectedOrder.shippingAddress.zipCode && <><br />CP: {selectedOrder.shippingAddress.zipCode}</>}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 border-b border-neutral-200 pb-2 mb-4 flex items-center gap-2 text-neutral-800">
                  <CreditCard className="h-3 w-3 text-neutral-450" /> Estado Financiero
                </h4>
                <div className="flex flex-col gap-3">
                   <div className="flex items-center justify-between p-4 bg-neutral-50 border border-neutral-100">
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 text-neutral-400">MÉTODO</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-800">{selectedOrder?.paymentMethod?.name || 'DESCONOCIDO'}</span>
                   </div>
                   <div className="flex flex-col gap-2 p-4 bg-neutral-50 border border-neutral-100">
                       <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 text-neutral-400">ESTADO PAGO</span>
                       <Select 
                        value={selectedOrder?.paymentStatus} 
                        onValueChange={(val) => updateStatus(selectedOrder.id, selectedOrder.orderStatus, val)}
                        disabled={updating}
                       >
                         <SelectTrigger className="h-10 rounded-none border-neutral-200 bg-white font-bold uppercase text-[9px] tracking-widest text-neutral-800">
                           <SelectValue placeholder="Estado Pago" />
                         </SelectTrigger>
                         <SelectContent className="rounded-none border-neutral-200 bg-white text-white">
                           <SelectItem value="pending" className="text-[9px] font-bold uppercase">PAGO PENDIENTE</SelectItem>
                           <SelectItem value="paid" className="text-[9px] font-bold uppercase">PAGADO</SelectItem>
                           <SelectItem value="failed" className="text-[9px] font-bold uppercase">FALLIDO</SelectItem>
                           <SelectItem value="refunded" className="text-[9px] font-bold uppercase">REEMBOLSADO</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>
                     <div className="flex flex-col gap-2 p-4 bg-neutral-50 border border-neutral-100">
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 text-neutral-400">ESTADO PEDIDO</span>
                        <Select 
                         value={selectedOrder?.orderStatus} 
                         onValueChange={(val) => updateStatus(selectedOrder.id, val, selectedOrder.paymentStatus)}
                         disabled={updating}
                        >
                          <SelectTrigger className="h-10 rounded-none border-neutral-200 bg-white font-bold uppercase text-[9px] tracking-widest text-neutral-800">
                            <SelectValue placeholder="Estado Pedido" />
                          </SelectTrigger>
                          <SelectContent className="rounded-none border-neutral-200 bg-white text-white">
                            <SelectItem value="pending" className="text-[9px] font-bold uppercase">PENDIENTE</SelectItem>
                            <SelectItem value="confirmed" className="text-[9px] font-bold uppercase">CONFIRMADO</SelectItem>
                            <SelectItem value="processing" className="text-[9px] font-bold uppercase">EN PROCESO</SelectItem>
                            <SelectItem value="shipped" className="text-[9px] font-bold uppercase">ENVIADO</SelectItem>
                            <SelectItem value="delivered" className="text-[9px] font-bold uppercase">ENTREGADO</SelectItem>
                            <SelectItem value="cancelled" className="text-[9px] font-bold uppercase">CANCELADO</SelectItem>
                          </SelectContent>
                        </Select>
                     </div>

                     {selectedOrder?.paymentStatus === 'pending' && (
                       <Button 
                         onClick={() => updateStatus(selectedOrder.id, selectedOrder.orderStatus, 'paid')}
                         disabled={updating}
                         className="w-full h-12 bg-neutral-900 text-white hover:bg-neutral-800 rounded-none font-bold uppercase text-[10px] tracking-widest mt-2 transition-all border border-transparent shadow-none"
                       >
                         {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar Pago Recibido'}
                       </Button>
                     )}
                </div>
              </div>
            </div>

            {/* Right Column: Order Manifesto */}
            <div className="lg:col-span-7 flex flex-col">
               <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-450 border-b border-neutral-250 pb-2 mb-4 flex items-center justify-between text-neutral-800">
                 Manifiesto de Artículos
                 <span className="bg-neutral-100 border border-neutral-200 px-2 py-0.5 text-neutral-700 text-[9px] font-bold">{selectedOrder?.items?.length || 0} ÍTEMS</span>
               </h4>
               <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar flex-1">
                 {selectedOrder?.items?.map((item: any, idx: number) => (
                   <div key={idx} className="flex items-center gap-4 group">
                     <div className="w-16 h-16 bg-neutral-50 flex-shrink-0 border border-neutral-200 p-1">
                       {item.image && <img src={item.image} className="w-full h-full object-cover" />}
                     </div>
                     <div className="flex-1 min-w-0">
                       <p className="text-xs font-bold uppercase tracking-tight truncate text-neutral-800">{item.name}</p>
                       <div className="flex gap-3 mt-1">
                          <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest bg-neutral-100 border border-neutral-200 px-1.5 py-0.5">TALLA: {item.size}</p>
                          <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest bg-neutral-100 border border-neutral-200 px-1.5 py-0.5">COLOR: {item.color}</p>
                       </div>
                     </div>
                     <div className="text-right">
                       <p className="text-xs font-bold text-neutral-800">{item.quantity}X</p>
                       <p className="text-xs font-bold text-neutral-500">${item.price}</p>
                     </div>
                   </div>
                 ))}
               </div>
               
               <div className="mt-8 pt-6 border-t border-neutral-250 space-y-3">
                 <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                   <span>Subtotal Neto</span>
                   <span className="text-neutral-700 font-bold">${selectedOrder?.subtotal?.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                   <span>Flete y Logística</span>
                   <span className="text-neutral-700 font-bold">${selectedOrder?.shipping?.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between items-center pt-4 bg-neutral-50 border border-neutral-200 p-4 shadow-sm">
                   <span className="text-sm font-bold uppercase tracking-widest text-neutral-800">Balance Total</span>
                   <span className="text-3xl font-black text-neutral-900">${selectedOrder?.total?.toFixed(2)}</span>
                 </div>
               </div>
            </div>
          </div>

          <DialogFooter className="bg-neutral-50 p-8 flex flex-col md:flex-row gap-4 border-t border-neutral-200">
             <div className="flex-1 flex gap-2">
                <Button 
                  onClick={() => window.print()}
                  variant="outline" 
                  className="rounded-none border-neutral-200 h-14 font-bold uppercase text-[10px] tracking-widest px-8 text-neutral-600 hover:bg-neutral-100 hover:border-neutral-350 transition-all shadow-none"
                >
                  <Printer className="h-4 w-4 mr-2" /> Imprimir Documentación
                </Button>
                <Button 
                  variant="outline" 
                  className="rounded-none border-neutral-200 h-14 font-bold uppercase text-[10px] tracking-widest px-8 text-neutral-600 hover:bg-neutral-100 hover:border-neutral-350 transition-all shadow-none"
                >
                  <FileDown className="h-4 w-4 mr-2" /> PDF
                </Button>
             </div>
             <div className="flex flex-wrap gap-2">
               {selectedOrder?.orderStatus !== 'delivered' && selectedOrder?.orderStatus !== 'cancelled' && (
                 <>
                  <Button 
                    onClick={() => updateStatus(selectedOrder.id, 'confirmed', 'paid')}
                    disabled={updating}
                    className="rounded-none bg-neutral-900 text-white hover:bg-neutral-800 h-14 font-bold uppercase text-[10px] tracking-widest px-8 border-none active:translate-y-0 transition-all shadow-none"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Confirmar Pago
                  </Button>
                  <Button 
                    onClick={() => updateStatus(selectedOrder.id, 'cancelled')}
                    disabled={updating}
                    className="rounded-none bg-red-50 text-red-600 border border-transparent hover:border-red-100 hover:bg-red-100 h-14 font-bold uppercase text-[10px] tracking-widest px-8"
                    variant="outline"
                  >
                    <XCircle className="h-4 w-4 mr-2" /> Denegar Protocolo
                  </Button>
                 </>
               )}
               {selectedOrder?.orderStatus === 'confirmed' && (
                 <Button 
                    onClick={() => updateStatus(selectedOrder.id, 'processing')}
                    disabled={updating}
                    className="rounded-none bg-neutral-900 text-white hover:bg-neutral-800 h-14 font-bold uppercase text-[10px] tracking-widest px-8 border-none transition-all shadow-none"
                  >
                    <Clock4 className="h-4 w-4 mr-2" /> Iniciar Procesamiento
                  </Button>
               )}
               {selectedOrder?.orderStatus === 'processing' && (
                 <Button 
                    onClick={() => updateStatus(selectedOrder.id, 'shipped')}
                    disabled={updating}
                    className="rounded-none bg-neutral-900 text-white hover:bg-neutral-800 h-14 font-bold uppercase text-[10px] tracking-widest px-8 border-none transition-all shadow-none"
                  >
                    <Truck className="h-4 w-4 mr-2" /> Despachar Pedido
                  </Button>
               )}
               {selectedOrder?.orderStatus === 'shipped' && (
                 <Button 
                    onClick={() => updateStatus(selectedOrder.id, 'delivered')}
                    disabled={updating}
                    className="rounded-none bg-neutral-900 text-white hover:bg-neutral-800 h-14 font-bold uppercase text-[10px] tracking-widest px-8 border-none transition-all shadow-none"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Marcar Entregado
                  </Button>
               )}
             </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
