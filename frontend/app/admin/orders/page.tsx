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
  pending: { label: 'Pendiente', color: 'text-amber-700', bgColor: 'bg-amber-100 border-amber-200', icon: Clock },
  confirmed: { label: 'Confirmado', color: 'text-blue-700', bgColor: 'bg-blue-100 border-blue-200', icon: CheckCircle2 },
  processing: { label: 'Procesando', color: 'text-indigo-700', bgColor: 'bg-indigo-100 border-indigo-200', icon: RotateCcw },
  shipped: { label: 'Enviado', color: 'text-purple-700', bgColor: 'bg-purple-100 border-purple-200', icon: Truck },
  delivered: { label: 'Entregado', color: 'text-green-700', bgColor: 'bg-green-100 border-green-200', icon: CheckCircle2 },
  cancelled: { label: 'Cancelado', color: 'text-red-700', bgColor: 'bg-red-100 border-red-200', icon: XCircle },
}

const paymentStatusConfig: { [key: string]: { label: string; color: string } } = {
  pending: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  paid: { label: 'Pagado', color: 'bg-green-100 text-green-700 border-green-200' },
  failed: { label: 'Fallido', color: 'bg-red-100 text-red-700 border-red-200' },
  refunded: { label: 'Reembolsado', color: 'bg-slate-100 text-slate-700 border-slate-200' },
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

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
                         o.customerInfo?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
                         o.customerInfo?.email?.toLowerCase().includes(search.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || o.orderStatus === filterStatus
    const matchesPayment = filterPaymentStatus === 'all' || o.paymentStatus === filterPaymentStatus
    
    return matchesSearch && matchesStatus && matchesPayment
  })

  // Calculate stats based on ALL orders
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.orderStatus === 'pending').length,
    delivered: orders.filter(o => o.orderStatus === 'delivered').length,
    cancelled: orders.filter(o => o.orderStatus === 'cancelled').length,
    totalRevenue: orders.reduce((sum, o) => sum + (o.total || 0), 0)
  }

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
          <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">Gestión de Pedidos</h1>
          <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest mt-2">Control centralizado de operaciones comerciales</p>
        </div>
        <div className="flex gap-2">
           <Button onClick={loadOrders} variant="outline" className="rounded-none border-black h-12 font-black uppercase text-[10px] tracking-widest px-6 hover:bg-black hover:text-white transition-all">
             <RefreshCw className="h-4 w-4 mr-2" /> Actualizar
           </Button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
         {[
           { label: 'Total', value: stats.total, icon: Package, color: 'bg-blue-500' },
           { label: 'Pendientes', value: stats.pending, icon: Clock, color: 'bg-amber-500' },
           { label: 'Entregados', value: stats.delivered, icon: CheckCircle2, color: 'bg-green-500' },
           { label: 'Cancelados', value: stats.cancelled, icon: XCircle, color: 'bg-red-500' },
           { label: 'Ingresos', value: `$${stats.totalRevenue.toLocaleString()}`, icon: Banknote, color: 'bg-kaosNeon', textColor: 'text-black' },
         ].map((s, i) => (
           <div key={i} className="bg-white dark:bg-slate-950 border border-black/10 p-4 shadow-sm hover:border-black transition-all group">
              <div className="flex items-center gap-3">
                 <div className={cn("p-2 rounded-none text-white", s.color, s.textColor)}>
                    <s.icon className="h-4 w-4" />
                 </div>
                 <div>
                    <p className="text-2xl font-black tracking-tighter">{s.value}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-black/40">{s.label}</p>
                 </div>
              </div>
           </div>
         ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-950 border border-black/10 p-4 flex flex-col lg:flex-row gap-4 items-center">
         <div className="relative flex-1 w-full lg:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/20" />
            <Input 
              placeholder="BUSCAR POR # O CLIENTE..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-12 w-full rounded-none border-black/10 focus:border-black transition-all font-bold uppercase text-[10px] tracking-widest"
            />
         </div>

         <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-12 w-[180px] rounded-none border-black/10 font-bold uppercase text-[10px] tracking-widest">
                <Filter className="h-3 w-3 mr-2" />
                <SelectValue placeholder="Estado Pedido" />
              </SelectTrigger>
              <SelectContent className="rounded-none border-black">
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
              <SelectTrigger className="h-12 w-[180px] rounded-none border-black/10 font-bold uppercase text-[10px] tracking-widest">
                <CreditCard className="h-3 w-3 mr-2" />
                <SelectValue placeholder="Estado Pago" />
              </SelectTrigger>
              <SelectContent className="rounded-none border-black">
                <SelectItem value="all">TODOS LOS PAGOS</SelectItem>
                <SelectItem value="pending">PAGO PENDIENTE</SelectItem>
                <SelectItem value="paid">PAGADO</SelectItem>
                <SelectItem value="failed">FALLIDO</SelectItem>
                <SelectItem value="refunded">REEMBOLSADO</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={showDeleted ? "default" : "outline"}
              onClick={() => setShowDeleted(!showDeleted)}
              className="h-12 rounded-none border-black/10 font-bold uppercase text-[10px] tracking-widest gap-2"
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
                className="group bg-white dark:bg-slate-950 border border-black/10 p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center hover:border-black transition-all cursor-pointer relative overflow-hidden"
                onClick={() => { setSelectedOrder(order); setShowDetails(true); }}
              >
                {/* Visual Accent */}
                <div className={cn("absolute left-0 top-0 bottom-0 w-1", status.bgColor)}></div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full">
                   {/* Order ID & Status */}
                   <div>
                      <p className="text-2xl font-black uppercase tracking-tighter mb-2">#{order.orderNumber}</p>
                      <div className="flex flex-wrap gap-2">
                         <Badge className={cn("rounded-none border-none text-[8px] font-black uppercase tracking-widest h-5", status.bgColor, status.color)}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                         </Badge>
                         <Badge className={cn("rounded-none border text-[8px] font-black uppercase tracking-widest h-5 bg-transparent", paymentStatus.color)}>
                            {paymentStatus.label}
                         </Badge>
                      </div>
                   </div>

                   {/* Customer Info */}
                   <div className="flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-1">
                         <User className="h-3 w-3 text-black/40" />
                         <p className="text-[11px] font-black uppercase tracking-tight">{order.customerInfo?.firstName} {order.customerInfo?.lastName}</p>
                      </div>
                      <div className="flex items-center gap-2">
                         <Mail className="h-3 w-3 text-black/20" />
                         <p className="text-[9px] font-bold text-black/40 truncate">{order.customerInfo?.email}</p>
                      </div>
                   </div>

                   {/* Logistics & Date */}
                   <div className="flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-1">
                         <Calendar className="h-3 w-3 text-black/40" />
                         <p className="text-[11px] font-black uppercase tracking-tight">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                         <Truck className="h-3 w-3 text-black/20" />
                         <p className="text-[9px] font-bold text-black/40 uppercase tracking-widest truncate">{order.shippingMethod?.name || 'ENTREGA ESTÁNDAR'}</p>
                      </div>
                   </div>

                   {/* Payment & Price */}
                   <div className="flex items-center justify-between lg:justify-end gap-12">
                      <div className="text-right hidden md:block">
                         <p className="text-[9px] font-black text-black/20 uppercase tracking-widest mb-1">Pago: {order.paymentMethod?.name || 'N/A'}</p>
                         <p className="text-3xl font-black">${order.total?.toFixed(0)}</p>
                      </div>
                      <div className="flex gap-2">
                         <Button variant="outline" size="icon" className="rounded-none border-black/10 hover:border-black hover:bg-black hover:text-white transition-all h-10 w-10">
                            <ChevronRight className="h-5 w-5" />
                         </Button>
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                               <Button variant="outline" size="icon" className="rounded-none border-black/10 hover:border-black transition-all h-10 w-10">
                                  <MoreHorizontal className="h-4 w-4" />
                               </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-none border-black p-1">
                               <DropdownMenuItem className="text-[10px] font-black uppercase cursor-pointer" onClick={() => { setSelectedOrder(order); setShowDetails(true); }}>
                                  <Eye className="h-3 w-3 mr-2" /> VER DETALLES
                               </DropdownMenuItem>
                               <DropdownMenuItem className="text-[10px] font-black uppercase cursor-pointer">
                                  <Printer className="h-3 w-3 mr-2" /> IMPRIMIR TICKET
                               </DropdownMenuItem>
                               <DropdownMenuSeparator className="bg-black/5" />
                               <DropdownMenuItem 
                                 className="text-[10px] font-black uppercase cursor-pointer text-red-500"
                                 onClick={() => updateStatus(order.id, 'cancelled')}
                               >
                                  <XCircle className="h-3 w-3 mr-2" /> CANCELAR PEDIDO
                               </DropdownMenuItem>
                            </DropdownMenuContent>
                         </DropdownMenu>
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
        <DialogContent className="max-w-4xl rounded-none border-black p-0 overflow-hidden bg-white dark:bg-slate-950">
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
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-40">MÉTODO</span>
                      <span className="text-[10px] font-black uppercase tracking-widest">{selectedOrder?.paymentMethod?.name || 'DESCONOCIDO'}</span>
                   </div>
                   <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 border border-black/5">
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-40">ESTADO PAGO</span>
                      <Badge className={cn(
                        "rounded-none border-none text-[9px] font-black uppercase tracking-widest h-6 px-3",
                        selectedOrder?.paymentStatus === 'paid' ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'
                      )}>
                        {selectedOrder?.paymentStatus === 'paid' ? 'PAGADO' : 'PENDIENTE'}
                      </Badge>
                   </div>
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
                       {item.image && <img src={item.image} className="w-full h-full object-cover grayscale contrast-125 group-hover:grayscale-0 transition-all" />}
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
