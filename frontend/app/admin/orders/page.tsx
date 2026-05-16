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
  pending: { label: 'PENDIENTE', color: 'text-amber-700', bgColor: 'bg-amber-100 border-amber-200', icon: Clock },
  confirmed: { label: 'CONFIRMADO', color: 'text-blue-700', bgColor: 'bg-blue-100 border-blue-200', icon: CheckCircle2 },
  processing: { label: 'EN PROCESO', color: 'text-indigo-700', bgColor: 'bg-indigo-100 border-indigo-200', icon: RotateCcw },
  shipped: { label: 'ENVIADO', color: 'text-purple-700', bgColor: 'bg-purple-100 border-purple-200', icon: Truck },
  delivered: { label: 'ENTREGADO', color: 'text-green-700', bgColor: 'bg-green-100 border-green-200', icon: CheckCircle2 },
  cancelled: { label: 'CANCELADO', color: 'text-red-700', bgColor: 'bg-red-100 border-red-200', icon: XCircle },
}

const paymentStatusConfig: { [key: string]: { label: string; color: string } } = {
  pending: { label: 'PAGO PENDIENTE', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  paid: { label: 'PAGADO', color: 'bg-green-100 text-green-700 border-green-200' },
  failed: { label: 'FALLIDO', color: 'bg-red-100 text-red-700 border-red-200' },
  refunded: { label: 'REEMBOLSADO', color: 'bg-slate-100 text-slate-700 border-slate-200' },
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
            <span className="text-[10px] font-black uppercase tracking-widest text-black/40">Logística de Transacciones • KAOS</span>
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">Gestión de Pedidos</h1>
          <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest mt-2">Control centralizado de operaciones comerciales</p>
        </div>
        <div className="flex gap-2">
           <Button onClick={loadOrders} variant="outline" className="rounded-none border-black h-12 font-black uppercase text-[10px] tracking-widest px-6 bg-white text-black hover:bg-black hover:text-white transition-all">
             <RefreshCw className="h-4 w-4 mr-2" /> Actualizar
           </Button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
         {[
           { label: 'Total', value: stats.total, icon: Package, color: 'bg-black text-white' },
           { label: 'Pendientes', value: stats.pending, icon: Clock, color: 'bg-amber-500 text-white' },
           { label: 'Entregados', value: stats.delivered, icon: CheckCircle2, color: 'bg-green-600 text-white' },
           { label: 'Cancelados', value: stats.cancelled, icon: XCircle, color: 'bg-red-600 text-white' },
           { label: 'Ingresos', value: `${currencySymbol}${stats.totalRevenue.toLocaleString()}`, icon: Banknote, color: 'bg-kaosNeon text-black border-none' },
         ].map((s, i) => (
           <div key={i} className={cn("border border-black p-5 shadow-sm transition-all group", s.color)}>
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-white/10">
                    <s.icon className="h-5 w-5" />
                 </div>
                 <div>
                    <p className="text-2xl font-black tracking-tighter leading-none mb-1">{s.value}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-60">{s.label}</p>
                 </div>
              </div>
           </div>
         ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-black text-white p-6 flex flex-col lg:flex-row gap-6 items-center border-b border-kaosNeon/30">
         <div className="relative flex-1 w-full lg:w-auto group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 group-focus-within:text-kaosNeon transition-colors" />
            <Input 
              placeholder="BUSCAR POR # O CLIENTE..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-14 w-full rounded-none border-white/10 bg-white/5 focus:border-kaosNeon transition-all font-black uppercase text-[10px] tracking-widest text-white placeholder:text-white/20"
            />
         </div>

         <div className="flex flex-wrap gap-3 w-full lg:w-auto">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-14 w-[200px] rounded-none border-white/10 bg-white/5 font-black uppercase text-[10px] tracking-widest text-white">
                <Filter className="h-3 w-3 mr-2 text-kaosNeon" />
                <SelectValue placeholder="Estado Pedido" />
              </SelectTrigger>
              <SelectContent className="rounded-none border-black bg-black text-white">
                <SelectItem value="all">TODOS LOS ESTADOS</SelectItem>
                <SelectItem value="pending">PENDIENTES</SelectItem>
                <SelectItem value="confirmed">CONFIRMADOS</SelectItem>
                <SelectItem value="processing">EN PROCESO</SelectItem>
                <SelectItem value="shipped">ENVIADOS</SelectItem>
                <SelectItem value="delivered">ENTREGADOS</SelectItem>
                <SelectItem value="cancelled">CANCELADOS</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPaymentStatus} onValueChange={setFilterPaymentStatus}>
              <SelectTrigger className="h-14 w-[200px] rounded-none border-white/10 bg-white/5 font-black uppercase text-[10px] tracking-widest text-white">
                <CreditCard className="h-3 w-3 mr-2 text-kaosNeon" />
                <SelectValue placeholder="Estado Pago" />
              </SelectTrigger>
              <SelectContent className="rounded-none border-black bg-black text-white">
                <SelectItem value="all">TODOS LOS PAGOS</SelectItem>
                <SelectItem value="pending">PAGO PENDIENTE</SelectItem>
                <SelectItem value="paid">PAGADO</SelectItem>
                <SelectItem value="failed">FALLIDO</SelectItem>
                <SelectItem value="refunded">REEMBOLSADO</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={showDeleted ? "default" : "outline"}
              onClick={() => {
                setShowDeleted(!showDeleted)
                setTimeout(() => loadOrders(), 0)
              }}
              className={cn(
                "h-14 rounded-none border-white/10 font-black uppercase text-[10px] tracking-widest gap-2 px-6",
                showDeleted ? "bg-kaosNeon text-black border-none" : "bg-white/5 text-white hover:bg-white/10"
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
            const StatusIcon = status.icon

            return (
              <div 
                key={order.id} 
                className="group bg-white border border-black p-8 flex flex-col lg:flex-row justify-between items-start lg:items-center hover:bg-black transition-all duration-300 cursor-pointer relative overflow-hidden"
                onClick={() => { setSelectedOrder(order); setShowDetails(true); }}
              >
                {/* Status Bar Left */}
                <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", status.bgColor.replace('bg-opacity-10', ''))}></div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 w-full">
                   {/* Order ID & Status */}
                   <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-black/30 group-hover:text-white/20 mb-2">ID TRANSACCIÓN</p>
                      <p className="text-3xl font-black uppercase tracking-tighter mb-4 group-hover:text-kaosNeon transition-colors">#{order.orderNumber}</p>
                      <div className="flex flex-wrap gap-2">
                         <Badge className={cn("rounded-none border-none text-[8px] font-black uppercase tracking-widest h-6 px-3 group-hover:bg-white group-hover:text-black", status.bgColor, status.color)}>
                            {status.label}
                         </Badge>
                         <Badge className={cn("rounded-none border text-[8px] font-black uppercase tracking-widest h-6 px-3 bg-transparent group-hover:text-white", paymentStatus.color.replace('bg-', 'border-').replace('text-', 'border-'))}>
                            {paymentStatus.label}
                         </Badge>
                      </div>
                   </div>

                   {/* Customer Info */}
                   <div className="flex flex-col justify-center">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-black/30 group-hover:text-white/20 mb-4 flex items-center gap-2">
                         <User className="h-3 w-3" /> CLIENTE
                      </p>
                      <p className="text-lg font-black uppercase tracking-tight group-hover:text-white mb-1">{order.customerInfo?.firstName} {order.customerInfo?.lastName}</p>
                      <p className="text-[10px] font-bold text-black/40 group-hover:text-white/40 truncate tracking-widest">{order.customerInfo?.email}</p>
                   </div>

                   {/* Logistics & Date */}
                   <div className="flex flex-col justify-center">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-black/30 group-hover:text-white/20 mb-4 flex items-center gap-2">
                         <Truck className="h-3 w-3" /> LOGÍSTICA
                      </p>
                      <p className="text-lg font-black uppercase tracking-tight group-hover:text-white mb-1">{new Date(order.createdAt).toLocaleDateString()}</p>
                      <p className="text-[10px] font-bold text-black/40 group-hover:text-white/40 uppercase tracking-widest truncate">{order.shippingMethod?.name || 'ENTREGA ESTÁNDAR'}</p>
                   </div>

                   {/* Payment & Price */}
                   <div className="flex items-center justify-between lg:justify-end gap-12">
                      <div className="text-right">
                         <p className="text-[10px] font-black uppercase tracking-[0.3em] text-black/30 group-hover:text-white/20 mb-2">MONTO TOTAL</p>
                         <p className="text-4xl font-black group-hover:text-white transition-colors">${order.total?.toLocaleString()}</p>
                      </div>
                      <div className="flex gap-2">
                        {order.isDeleted ? (
                          <Button 
                            onClick={(e) => { e.stopPropagation(); handleRestoreOrder(order.id); }}
                            variant="outline" 
                            className="rounded-none border-kaosNeon text-kaosNeon hover:bg-kaosNeon hover:text-black h-14 px-4 font-black uppercase text-[9px]"
                          >
                            RESTAURAR
                          </Button>
                        ) : (
                          <>
                            {settings?.orders?.allowDelete && (
                              <Button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id); }}
                                variant="destructive" 
                                className="rounded-none bg-red-600 h-14 w-14 p-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="outline" size="icon" className="rounded-none border-black group-hover:border-white/20 group-hover:text-white hover:bg-kaosNeon hover:text-black transition-all h-14 w-14">
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
          <div className="border border-dashed border-black/10 p-20 text-center bg-black/[0.01]">
            <Package className="h-12 w-12 text-black/10 mx-auto mb-4" />
            <p className="text-black/40 text-[10px] font-black uppercase tracking-[0.2em]">No se registran transacciones bajo este criterio</p>
          </div>
        )}
      </div>

      {/* Order Details Modal (Same Industrial Style) */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-none border-black p-0 bg-white dark:bg-slate-950">
          <DialogHeader className="bg-black text-white p-8">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
              <div>
                <Badge className="bg-kaosNeon text-black border-none rounded-none text-[8px] font-black uppercase tracking-widest mb-4">Protocolo de Transacción</Badge>
                <DialogTitle className="text-6xl font-black uppercase tracking-tighter leading-none">
                  ORDEN #{selectedOrder?.orderNumber}
                </DialogTitle>
                <DialogDescription className="text-white/40 font-bold text-[10px] uppercase tracking-widest mt-2 flex items-center gap-3">
                  <span>{new Date(selectedOrder?.createdAt).toLocaleString()}</span>
                  <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                  <span>{selectedOrder?.items?.length || 0} COMPONENTES REGISTRADOS</span>
                </DialogDescription>
              </div>
              <div className="text-right">
                <p className="text-white/20 text-[10px] font-black uppercase tracking-widest mb-1">Monto Total</p>
                <p className="text-6xl font-black">${selectedOrder?.total?.toFixed(2)}</p>
              </div>
            </div>
          </DialogHeader>

          <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Left Column: Logistics */}
            <div className="lg:col-span-5 space-y-8">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-black/20 dark:text-white/20 border-b border-black/5 dark:border-white/5 pb-2 mb-4 flex items-center gap-2">
                  <User className="h-3 w-3" /> Información del Cliente
                </h4>
                <div className="space-y-1">
                  <p className="text-2xl font-black uppercase tracking-tight text-black dark:text-white">{selectedOrder?.customerInfo?.firstName} {selectedOrder?.customerInfo?.lastName}</p>
                  <p className="text-xs font-bold text-black/60 dark:text-white/60">{selectedOrder?.customerInfo?.email}</p>
                  <p className="text-xs font-bold text-black/60 dark:text-white/60">{selectedOrder?.customerInfo?.phone}</p>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-black/20 dark:text-white/20 border-b border-black/5 dark:border-white/5 pb-2 mb-4 flex items-center gap-2">
                  <Truck className="h-3 w-3" /> Logística de Despacho
                </h4>
                <div className="space-y-4">
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-black/5 flex items-center justify-between">
                     <p className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white">{selectedOrder?.shippingMethod?.name || 'ESTÁNDAR'}</p>
                     <MapPin className="h-4 w-4 text-kaosNeon" />
                  </div>
                  {selectedOrder?.shippingAddress && (
                    <p className="text-xs font-bold text-black/60 dark:text-white/60 uppercase leading-relaxed bg-black/[0.02] p-4 border-l-2 border-black">
                      {selectedOrder.shippingAddress.address}<br />
                      {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state}
                      {selectedOrder.shippingAddress.zipCode && <><br />CP: {selectedOrder.shippingAddress.zipCode}</>}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-black/20 dark:text-white/20 border-b border-black/5 dark:border-white/5 pb-2 mb-4 flex items-center gap-2">
                  <CreditCard className="h-3 w-3" /> Estado Financiero
                </h4>
                <div className="flex flex-col gap-3">
                   <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 border border-black/5">
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-40 text-black dark:text-white">MÉTODO</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white">{selectedOrder?.paymentMethod?.name || 'DESCONOCIDO'}</span>
                   </div>
                   <div className="flex flex-col gap-2 p-4 bg-slate-50 dark:bg-slate-900 border border-black/5">
                       <span className="text-[10px] font-black uppercase tracking-widest opacity-40 text-black dark:text-white">ESTADO PAGO</span>
                       <Select 
                        value={selectedOrder?.paymentStatus} 
                        onValueChange={(val) => updateStatus(selectedOrder.id, selectedOrder.orderStatus, val)}
                        disabled={updating}
                       >
                         <SelectTrigger className="h-10 rounded-none border-black/10 bg-white dark:bg-black font-black uppercase text-[9px] tracking-widest text-black dark:text-white">
                           <SelectValue placeholder="Estado Pago" />
                         </SelectTrigger>
                         <SelectContent className="rounded-none border-black bg-black text-white">
                           <SelectItem value="pending">PAGO PENDIENTE</SelectItem>
                           <SelectItem value="paid">PAGADO</SelectItem>
                           <SelectItem value="failed">FALLIDO</SelectItem>
                           <SelectItem value="refunded">REEMBOLSADO</SelectItem>
                         </SelectContent>
                       </Select>
                    </div>
                    <div className="flex flex-col gap-2 p-4 bg-slate-50 dark:bg-slate-900 border border-black/5">
                       <span className="text-[10px] font-black uppercase tracking-widest opacity-40 text-black dark:text-white">ESTADO PEDIDO</span>
                       <Select 
                        value={selectedOrder?.orderStatus} 
                        onValueChange={(val) => updateStatus(selectedOrder.id, val, selectedOrder.paymentStatus)}
                        disabled={updating}
                       >
                         <SelectTrigger className="h-10 rounded-none border-black/10 bg-white dark:bg-black font-black uppercase text-[9px] tracking-widest text-black dark:text-white">
                           <SelectValue placeholder="Estado Pedido" />
                         </SelectTrigger>
                         <SelectContent className="rounded-none border-black bg-black text-white">
                           <SelectItem value="pending">PENDIENTE</SelectItem>
                           <SelectItem value="confirmed">CONFIRMADO</SelectItem>
                           <SelectItem value="processing">EN PROCESO</SelectItem>
                           <SelectItem value="shipped">ENVIADO</SelectItem>
                           <SelectItem value="delivered">ENTREGADO</SelectItem>
                           <SelectItem value="cancelled">CANCELADO</SelectItem>
                         </SelectContent>
                       </Select>
                    </div>

                    {selectedOrder?.paymentStatus === 'pending' && (
                       <Button 
                         onClick={() => updateStatus(selectedOrder.id, selectedOrder.orderStatus, 'paid')}
                         disabled={updating}
                         className="w-full h-12 bg-kaosNeon text-black hover:bg-black hover:text-white rounded-none font-black uppercase text-[10px] tracking-widest mt-2 border-2 border-black"
                       >
                         {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar Pago Recibido'}
                       </Button>
                     )}
                </div>
              </div>
            </div>

            {/* Right Column: Order Manifesto */}
            <div className="lg:col-span-7 flex flex-col">
               <h4 className="text-[10px] font-black uppercase tracking-widest text-black/20 dark:text-white/20 border-b border-black/5 dark:border-white/5 pb-2 mb-4 flex items-center justify-between">
                 Manifiesto de Artículos
                 <span className="text-kaosNeon bg-black px-2 py-0.5">{selectedOrder?.items?.length || 0} ÍTEMS</span>
               </h4>
               <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar flex-1">
                 {selectedOrder?.items?.map((item: any, idx: number) => (
                   <div key={idx} className="flex items-center gap-4 group">
                     <div className="w-16 h-16 bg-black/[0.03] dark:bg-white/[0.03] flex-shrink-0 border border-black/5">
                       {item.image && <img src={item.image} className="w-full h-full object-cover transition-all" />}
                     </div>
                     <div className="flex-1 min-w-0">
                       <p className="text-xs font-black uppercase tracking-tight truncate text-black dark:text-white">{item.name}</p>
                       <div className="flex gap-3 mt-1">
                          <p className="text-[9px] font-bold text-black/40 dark:text-white/40 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5">TALLA: {item.size}</p>
                          <p className="text-[9px] font-bold text-black/40 dark:text-white/40 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5">COLOR: {item.color}</p>
                       </div>
                     </div>
                     <div className="text-right">
                       <p className="text-xs font-black text-black dark:text-white">{item.quantity}X</p>
                       <p className="text-xs font-black text-black dark:text-white">${item.price}</p>
                     </div>
                   </div>
                 ))}
               </div>
               
               <div className="mt-8 pt-6 border-t-2 border-black dark:border-white/20 space-y-3">
                 <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40">
                   <span>Subtotal Neto</span>
                   <span>${selectedOrder?.subtotal?.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40">
                   <span>Flete y Logística</span>
                   <span>${selectedOrder?.shipping?.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between items-center pt-4 bg-slate-50 dark:bg-slate-900 p-4">
                   <span className="text-sm font-black uppercase tracking-widest text-black dark:text-white">Balance Total</span>
                   <span className="text-3xl font-black text-black dark:text-white">${selectedOrder?.total?.toFixed(2)}</span>
                 </div>
               </div>
            </div>
          </div>

          <DialogFooter className="bg-slate-50 dark:bg-slate-900 p-8 flex flex-col md:flex-row gap-4 border-t border-black/5">
             <div className="flex-1 flex gap-2">
                <Button 
                  onClick={() => window.print()}
                  variant="outline" 
                  className="rounded-none border-black dark:border-white/20 h-14 font-black uppercase text-[10px] tracking-widest px-8 dark:text-white"
                >
                  <Printer className="h-4 w-4 mr-2" /> Imprimir Documentación
                </Button>
                <Button 
                  variant="outline" 
                  className="rounded-none border-black dark:border-white/20 h-14 font-black uppercase text-[10px] tracking-widest px-8 dark:text-white"
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
                    className="rounded-none bg-green-500 hover:bg-green-600 text-white h-14 font-black uppercase text-[10px] tracking-widest px-8 border-none shadow-[0_4px_0_rgb(21,128,61)] active:translate-y-1 active:shadow-none transition-all"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Confirmar Pago
                  </Button>
                  <Button 
                    onClick={() => updateStatus(selectedOrder.id, 'cancelled')}
                    disabled={updating}
                    className="rounded-none border-red-500 text-red-500 hover:bg-red-500 hover:text-white h-14 font-black uppercase text-[10px] tracking-widest px-8"
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
                    className="rounded-none bg-blue-600 hover:bg-blue-700 text-white h-14 font-black uppercase text-[10px] tracking-widest px-8"
                  >
                    <Clock4 className="h-4 w-4 mr-2" /> Iniciar Procesamiento
                  </Button>
               )}
               {selectedOrder?.orderStatus === 'processing' && (
                 <Button 
                    onClick={() => updateStatus(selectedOrder.id, 'shipped')}
                    disabled={updating}
                    className="rounded-none bg-indigo-600 hover:bg-indigo-700 text-white h-14 font-black uppercase text-[10px] tracking-widest px-8"
                  >
                    <Truck className="h-4 w-4 mr-2" /> Despachar Pedido
                  </Button>
               )}
               {selectedOrder?.orderStatus === 'shipped' && (
                 <Button 
                    onClick={() => updateStatus(selectedOrder.id, 'delivered')}
                    disabled={updating}
                    className="rounded-none bg-green-600 hover:bg-green-700 text-white h-14 font-black uppercase text-[10px] tracking-widest px-8"
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
