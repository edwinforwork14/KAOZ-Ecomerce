"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Eye, Package, Truck, CheckCircle, XCircle, Clock, Search, 
  MoreVertical, Trash2, RotateCcw, RefreshCw, CreditCard,
  MapPin, Phone, Mail, User, Calendar, AlertTriangle,
  FileText, Filter, Loader2, Tag, Banknote, ArrowUpDown, FileDown
} from "lucide-react"
import { api } from "@/lib/api"
import { brandConfig } from "@/lib/config"
import { useToast } from "@/hooks/use-toast"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

const statusConfig: { [key: string]: { label: string; color: string; bgColor: string; icon: any } } = {
  pending: { label: 'Pendiente', color: 'text-yellow-700', bgColor: 'bg-yellow-100 border-yellow-200', icon: Clock },
  confirmed: { label: 'Confirmado', color: 'text-blue-700', bgColor: 'bg-blue-100 border-blue-200', icon: CheckCircle },
  processing: { label: 'Procesando', color: 'text-indigo-700', bgColor: 'bg-indigo-100 border-indigo-200', icon: RefreshCw },
  shipped: { label: 'Enviado', color: 'text-purple-700', bgColor: 'bg-purple-100 border-purple-200', icon: Truck },
  delivered: { label: 'Entregado', color: 'text-green-700', bgColor: 'bg-green-100 border-green-200', icon: CheckCircle },
  cancelled: { label: 'Cancelado', color: 'text-red-700', bgColor: 'bg-red-100 border-red-200', icon: XCircle },
}

const paymentStatusConfig: { [key: string]: { label: string; color: string } } = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700' },
  paid: { label: 'Pagado', color: 'bg-green-100 text-green-700' },
  failed: { label: 'Fallido', color: 'bg-red-100 text-red-700' },
  refunded: { label: 'Reembolsado', color: 'bg-gray-100 text-gray-700' },
}

export default function OrdersPage() {
  const { toast } = useToast()
  const [orders, setOrders] = useState<any[]>([])
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState<any>(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadData()
  }, [filterStatus, filterPaymentStatus, showDeleted])

  const loadData = async () => {
    try {
      setLoading(true)
      const [ordersResult, settingsResult] = await Promise.all([
        api.getAllOrders({ 
          status: filterStatus !== 'all' ? filterStatus : undefined,
          paymentStatus: filterPaymentStatus !== 'all' ? filterPaymentStatus : undefined,
          includeDeleted: showDeleted 
        }),
        api.getSettings()
      ])
      
      if (ordersResult.success) {
        setOrders(ordersResult.orders || [])
      } else {
        console.error('Error loading orders:', ordersResult.message)
        setOrders([])
      }
      
      if (settingsResult.success) {
        setSettings(settingsResult.settings)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: "Error",
        description: "Error al cargar los pedidos",
        variant: "destructive"
      })
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    
    setSearching(true)
    try {
      const result = await api.searchOrder(searchQuery.trim())
      if (result.success && result.order) {
        setSelectedOrder(result.order)
      } else {
        toast({
          title: "No encontrado",
          description: "No se encontró ningún pedido con ese número",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error searching order:', error)
      toast({
        title: "Error",
        description: "Error al buscar el pedido",
        variant: "destructive"
      })
    } finally {
      setSearching(false)
    }
  }

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const result = await api.updateOrderStatus(orderId, {
        orderStatus: status,
        note: `Estado actualizado a ${statusConfig[status]?.label || status}`
      })
      if (result.success) {
        toast({ title: "Actualizado", description: "Estado del pedido actualizado" })
        loadData()
        if (selectedOrder?._id === orderId) {
          setSelectedOrder(result.order)
        }
      } else {
        toast({ title: "Error", description: result.message || "Error al actualizar", variant: "destructive" })
      }
    } catch (error) {
      console.error('Error updating order:', error)
      toast({ title: "Error", description: "Error al actualizar", variant: "destructive" })
    }
  }

  const updatePaymentStatus = async (orderId: string, paymentStatus: string) => {
    try {
      const result = await api.updateOrderStatus(orderId, { paymentStatus })
      if (result.success) {
        toast({ title: "Actualizado", description: "Estado de pago actualizado" })
        loadData()
        if (selectedOrder?._id === orderId) {
          setSelectedOrder(result.order)
        }
      }
    } catch (error) {
      console.error('Error updating payment status:', error)
      toast({ title: "Error", description: "Error al actualizar", variant: "destructive" })
    }
  }

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return
    
    setDeleting(true)
    try {
      const result = await api.deleteOrder(orderToDelete._id, deleteReason, false)
      if (result.success) {
        toast({ title: "Eliminado", description: "Pedido eliminado correctamente" })
        setDeleteDialogOpen(false)
        setOrderToDelete(null)
        setDeleteReason('')
        loadData()
        if (selectedOrder?._id === orderToDelete._id) {
          setSelectedOrder(null)
        }
      }
    } catch (error) {
      console.error('Error deleting order:', error)
      toast({ title: "Error", description: "Error al eliminar", variant: "destructive" })
    } finally {
      setDeleting(false)
    }
  }

  const handleRestoreOrder = async (orderId: string) => {
    try {
      const result = await api.restoreOrder(orderId)
      if (result.success) {
        toast({ title: "Restaurado", description: "Pedido restaurado correctamente" })
        loadData()
      }
    } catch (error) {
      console.error('Error restoring order:', error)
      toast({ title: "Error", description: "Error al restaurar", variant: "destructive" })
    }
  }

  // ====== PDF GENERATION ======
  const generateDeliveryNote = (order: any) => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    let y = 20

    // Colors based on brand
    const primaryColor = brandConfig.colors.primary || '#000000'
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 0, g: 0, b: 0 }
    }
    const brandRgb = hexToRgb(primaryColor)

    // === HEADER ===
    // Brand name
    doc.setFontSize(24)
    doc.setTextColor(brandRgb.r, brandRgb.g, brandRgb.b)
    doc.setFont("helvetica", "bold")
    doc.text(brandConfig.name || "TIENDA", margin, y)

    // Document title
    doc.setFontSize(12)
    doc.setTextColor(100, 100, 100)
    doc.setFont("helvetica", "normal")
    doc.text("NOTA DE ENTREGA", pageWidth - margin, y, { align: "right" })

    y += 10

    // Order number and date
    doc.setFontSize(10)
    doc.setTextColor(60, 60, 60)
    doc.text(`Pedido: ${order.orderNumber}`, pageWidth - margin, y, { align: "right" })
    y += 5
    doc.text(`Fecha: ${new Date(order.createdAt).toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    })}`, pageWidth - margin, y, { align: "right" })

    // Line separator
    y += 10
    doc.setDrawColor(brandRgb.r, brandRgb.g, brandRgb.b)
    doc.setLineWidth(0.5)
    doc.line(margin, y, pageWidth - margin, y)
    y += 15

    // === CUSTOMER INFO ===
    doc.setFontSize(11)
    doc.setTextColor(brandRgb.r, brandRgb.g, brandRgb.b)
    doc.setFont("helvetica", "bold")
    doc.text("DATOS DEL CLIENTE", margin, y)
    y += 8

    doc.setFontSize(10)
    doc.setTextColor(40, 40, 40)
    doc.setFont("helvetica", "normal")
    
    const customerName = `${order.customerInfo?.firstName || ''} ${order.customerInfo?.lastName || ''}`.trim()
    doc.text(`Cliente: ${customerName}`, margin, y)
    y += 6
    
    if (order.customerInfo?.email) {
      doc.text(`Email: ${order.customerInfo.email}`, margin, y)
      y += 6
    }
    
    if (order.customerInfo?.phone) {
      doc.text(`Teléfono: ${order.customerInfo.phone}`, margin, y)
      y += 6
    }

    // === SHIPPING INFO ===
    y += 8
    doc.setFontSize(11)
    doc.setTextColor(brandRgb.r, brandRgb.g, brandRgb.b)
    doc.setFont("helvetica", "bold")
    
    if (order.shippingMethod?.type === 'pickup') {
      doc.text("RETIRO EN TIENDA", margin, y)
      y += 8
      doc.setFontSize(10)
      doc.setTextColor(40, 40, 40)
      doc.setFont("helvetica", "normal")
      doc.text(`Método: ${order.shippingMethod?.name || 'Retiro'}`, margin, y)
    } else {
      doc.text("DIRECCIÓN DE ENVÍO", margin, y)
      y += 8
      doc.setFontSize(10)
      doc.setTextColor(40, 40, 40)
      doc.setFont("helvetica", "normal")
      
      if (order.shippingAddress) {
        doc.text(`Dirección: ${order.shippingAddress.address || ''}`, margin, y)
        y += 6
        doc.text(`${order.shippingAddress.city || ''}, ${order.shippingAddress.state || ''}`, margin, y)
        if (order.shippingAddress.zipCode) {
          y += 6
          doc.text(`Código Postal: ${order.shippingAddress.zipCode}`, margin, y)
        }
        if (order.shippingAddress.reference) {
          y += 6
          doc.text(`Referencia: ${order.shippingAddress.reference}`, margin, y)
        }
      }
    }

    y += 15

    // === PRODUCTS TABLE ===
    doc.setFontSize(11)
    doc.setTextColor(brandRgb.r, brandRgb.g, brandRgb.b)
    doc.setFont("helvetica", "bold")
    doc.text("PRODUCTOS", margin, y)
    y += 5

    const tableData = order.items?.map((item: any) => [
      item.name || 'Producto',
      item.color || '-',
      item.size || '-',
      item.quantity?.toString() || '1',
      `${currencySymbol}${item.price?.toFixed(2) || '0.00'}`,
      `${currencySymbol}${item.subtotal?.toFixed(2) || '0.00'}`
    ]) || []

    autoTable(doc, {
      startY: y,
      head: [['Producto', 'Color', 'Talla', 'Cant.', 'Precio', 'Subtotal']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [brandRgb.r, brandRgb.g, brandRgb.b],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [40, 40, 40]
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 25 },
        2: { cellWidth: 20 },
        3: { cellWidth: 15, halign: 'center' },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 30, halign: 'right' }
      },
      margin: { left: margin, right: margin }
    })

    // Get final Y position after table
    y = (doc as any).lastAutoTable.finalY + 15

    // === TOTALS ===
    const totalsX = pageWidth - margin - 70

    doc.setFontSize(10)
    doc.setTextColor(60, 60, 60)
    doc.setFont("helvetica", "normal")

    // Subtotal
    doc.text("Subtotal:", totalsX, y)
    doc.text(`${currencySymbol}${order.subtotal?.toFixed(2) || '0.00'}`, pageWidth - margin, y, { align: "right" })
    y += 6

    // Shipping
    doc.text("Envío:", totalsX, y)
    const shippingText = order.shipping > 0 ? `${currencySymbol}${order.shipping.toFixed(2)}` : 'A Consultar'
    doc.text(shippingText, pageWidth - margin, y, { align: "right" })
    y += 6

    // Discount if any
    if (order.discount?.amount > 0) {
      doc.setTextColor(34, 139, 34)
      doc.text(`Descuento (${order.discount.description || 'Promo'}):`, totalsX - 20, y)
      doc.text(`-${currencySymbol}${order.discount.amount.toFixed(2)}`, pageWidth - margin, y, { align: "right" })
      y += 6
    }

    // Total line
    y += 2
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.3)
    doc.line(totalsX - 10, y, pageWidth - margin, y)
    y += 8

    // Total
    doc.setFontSize(12)
    doc.setTextColor(brandRgb.r, brandRgb.g, brandRgb.b)
    doc.setFont("helvetica", "bold")
    doc.text("TOTAL:", totalsX, y)
    doc.text(`${currencySymbol}${order.total?.toFixed(2) || '0.00'}`, pageWidth - margin, y, { align: "right" })

    // Total in Bs if applicable
    if (showBsPrice && order.totalInBs) {
      y += 7
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.setFont("helvetica", "normal")
      doc.text(`Total en Bs: Bs. ${order.totalInBs.toFixed(2)}`, pageWidth - margin, y, { align: "right" })
    }

    // === PAYMENT & SHIPPING METHOD ===
    y += 20
    doc.setFontSize(9)
    doc.setTextColor(80, 80, 80)
    doc.setFont("helvetica", "normal")
    doc.text(`Método de pago: ${order.paymentMethod?.name || 'N/A'}`, margin, y)
    y += 5
    doc.text(`Método de envío: ${order.shippingMethod?.name || 'N/A'}`, margin, y)

    // === NOTES ===
    if (order.notes) {
      y += 15
      doc.setFontSize(10)
      doc.setTextColor(brandRgb.r, brandRgb.g, brandRgb.b)
      doc.setFont("helvetica", "bold")
      doc.text("NOTAS DEL CLIENTE:", margin, y)
      y += 6
      doc.setFontSize(9)
      doc.setTextColor(60, 60, 60)
      doc.setFont("helvetica", "italic")
      
      // Split long notes into multiple lines
      const splitNotes = doc.splitTextToSize(order.notes, pageWidth - (margin * 2))
      doc.text(splitNotes, margin, y)
    }

    // === FOOTER ===
    const footerY = doc.internal.pageSize.getHeight() - 25
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.3)
    doc.line(margin, footerY, pageWidth - margin, footerY)
    
    doc.setFontSize(8)
    doc.setTextColor(120, 120, 120)
    doc.setFont("helvetica", "normal")
    doc.text(`Generado el ${new Date().toLocaleString('es-ES')}`, margin, footerY + 8)
    doc.text(`${brandConfig.name} - Gracias por tu compra`, pageWidth - margin, footerY + 8, { align: "right" })

    // Save PDF
    doc.save(`Nota-Entrega-${order.orderNumber}.pdf`)

    toast({
      title: "PDF Generado",
      description: `Nota de entrega ${order.orderNumber} descargada`,
    })
  }

  // Get currency symbol from settings
  const currencySymbol = settings?.currency?.symbol || '$'
  const currencyCode = settings?.currency?.code || 'USD'
  const showBsPrice = settings?.currency?.showBsPrice === true

  // Get exchange rate used for an order
  const getOrderExchangeRate = (order: any) => {
    if (!order?.currency?.exchangeRate) return null
    const rate = currencyCode === 'EUR' 
      ? order.currency.exchangeRate.eur 
      : order.currency.exchangeRate.usd
    return rate
  }

  // Calculate stats
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.orderStatus === 'pending').length,
    delivered: orders.filter(o => o.orderStatus === 'delivered').length,
    cancelled: orders.filter(o => o.orderStatus === 'cancelled').length,
    totalRevenue: orders
      .filter(o => o.orderStatus !== 'cancelled' && !o.isDeleted)
      .reduce((sum, o) => sum + (o.total || 0), 0),
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Cargando pedidos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 space-y-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Pedidos
          </h1>
          <p className="text-gray-500 mt-1">Gestiona todos los pedidos de {brandConfig.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-xl">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
                <p className="text-xs text-blue-600">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-yellow-50 to-yellow-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500 rounded-xl">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
                <p className="text-xs text-yellow-600">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-xl">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">{stats.delivered}</p>
                <p className="text-xs text-green-600">Entregados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500 rounded-xl">
                <XCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-700">{stats.cancelled}</p>
                <p className="text-xs text-red-600">Cancelados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500 rounded-xl">
                <Banknote className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-700">{currencySymbol}{stats.totalRevenue.toFixed(2)}</p>
                <p className="text-xs text-purple-600">Ingresos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search by Order Number */}
            <div className="flex gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Buscar por número de pedido..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
              <Button 
                onClick={handleSearch} 
                disabled={searching}
                style={{ backgroundColor: brandConfig.colors.primary }}
                className="text-white"
              >
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {/* Status Filter */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Estado del pedido" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="confirmed">Confirmados</SelectItem>
                <SelectItem value="processing">Procesando</SelectItem>
                <SelectItem value="shipped">Enviados</SelectItem>
                <SelectItem value="delivered">Entregados</SelectItem>
                <SelectItem value="cancelled">Cancelados</SelectItem>
              </SelectContent>
            </Select>

            {/* Payment Status Filter */}
            <Select value={filterPaymentStatus} onValueChange={setFilterPaymentStatus}>
              <SelectTrigger className="w-48">
                <CreditCard className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Estado de pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los pagos</SelectItem>
                <SelectItem value="pending">Pago pendiente</SelectItem>
                <SelectItem value="paid">Pagado</SelectItem>
                <SelectItem value="failed">Fallido</SelectItem>
                <SelectItem value="refunded">Reembolsado</SelectItem>
              </SelectContent>
            </Select>

            {/* Show Deleted Toggle */}
            <Button
              variant={showDeleted ? "default" : "outline"}
              onClick={() => setShowDeleted(!showDeleted)}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {showDeleted ? 'Mostrando eliminados' : 'Ver eliminados'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <div className="space-y-4">
        {orders.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No hay pedidos</p>
              <p className="text-gray-400 text-sm mt-1">
                {filterStatus !== 'all' || filterPaymentStatus !== 'all' 
                  ? 'Intenta cambiar los filtros' 
                  : 'Los pedidos aparecerán aquí cuando los clientes compren'}
              </p>
            </CardContent>
          </Card>
        ) : (
          orders.map((order) => {
            const status = statusConfig[order.orderStatus] || statusConfig.pending
            const StatusIcon = status.icon
            const isDeleted = order.isDeleted

            return (
              <Card 
                key={order._id} 
                className={`
                  border-0 shadow-lg hover:shadow-xl transition-all duration-300
                  ${isDeleted ? 'opacity-60 bg-red-50' : ''}
                `}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Order Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center flex-wrap gap-3">
                        <h3 className="text-xl font-bold" style={{ color: brandConfig.colors.primary }}>
                          {order.orderNumber}
                        </h3>
                        <Badge className={`${status.bgColor} ${status.color} border`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                        {order.paymentStatus && (
                          <Badge className={paymentStatusConfig[order.paymentStatus]?.color || ''}>
                            {paymentStatusConfig[order.paymentStatus]?.label || order.paymentStatus}
                          </Badge>
                        )}
                        {isDeleted && (
                          <Badge variant="destructive">
                            <Trash2 className="h-3 w-3 mr-1" />
                            Eliminado
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-start gap-2">
                          <User className="h-4 w-4 text-gray-400 mt-0.5" />
                          <div>
                            <p className="font-medium text-gray-900">
                              {order.customerInfo?.firstName} {order.customerInfo?.lastName}
                            </p>
                            <p className="text-gray-500">{order.customerInfo?.email}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
                          <div>
                            <p className="font-medium text-gray-900">
                              {new Date(order.createdAt).toLocaleDateString('es-ES')}
                            </p>
                            <p className="text-gray-500">
                              {new Date(order.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <CreditCard className="h-4 w-4 text-gray-400 mt-0.5" />
                          <div>
                            <p className="font-medium text-gray-900">
                              {order.paymentMethod?.name || 'N/A'}
                            </p>
                            <p className="text-gray-500">Método de pago</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <Truck className="h-4 w-4 text-gray-400 mt-0.5" />
                          <div>
                            <p className="font-medium text-gray-900">
                              {order.shippingMethod?.name || 'N/A'}
                            </p>
                            <p className="text-gray-500">Método de envío</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Price & Actions */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-3xl font-bold" style={{ color: brandConfig.colors.primary }}>
                          {currencySymbol}{order.total?.toFixed(2)}
                        </p>
                        {showBsPrice && order.totalInBs && (
                          <p className="text-sm text-gray-500">
                            Bs. {order.totalInBs.toFixed(2)}
                          </p>
                        )}
                        {order.discount?.amount > 0 && (
                          <p className="text-sm text-green-600 flex items-center justify-end gap-1">
                            <Tag className="h-3 w-3" />
                            -{currencySymbol}{order.discount.amount.toFixed(2)}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {!isDeleted && (
                          <Select
                            value={order.orderStatus}
                            onValueChange={(value) => updateOrderStatus(order._id, value)}
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pendiente</SelectItem>
                              <SelectItem value="confirmed">Confirmado</SelectItem>
                              <SelectItem value="processing">Procesando</SelectItem>
                              <SelectItem value="shipped">Enviado</SelectItem>
                              <SelectItem value="delivered">Entregado</SelectItem>
                              <SelectItem value="cancelled">Cancelado</SelectItem>
                            </SelectContent>
                          </Select>
                        )}

                        {/* PDF Button in row */}
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => generateDeliveryNote(order)}
                          title="Descargar Nota de Entrega"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <FileDown className="h-4 w-4" />
                        </Button>

                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedOrder(order)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver detalles
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => generateDeliveryNote(order)}>
                              <FileDown className="h-4 w-4 mr-2" />
                              Descargar Nota de Entrega
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {isDeleted ? (
                              <DropdownMenuItem 
                                onClick={() => handleRestoreOrder(order._id)}
                                className="text-green-600"
                              >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Restaurar
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem 
                                onClick={() => {
                                  setOrderToDelete(order)
                                  setDeleteDialogOpen(true)
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>

                  {/* Products Preview */}
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Productos ({order.items?.length || 0}):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {order.items?.slice(0, 5).map((item: any, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {item.name} x{item.quantity}
                        </Badge>
                      ))}
                      {order.items?.length > 5 && (
                        <Badge variant="outline">+{order.items.length - 5} más</Badge>
                      )}
                    </div>
                  </div>

                  {/* Deletion info */}
                  {isDeleted && order.deletionReason && (
                    <div className="mt-3 p-3 bg-red-100 rounded-lg text-sm">
                      <p className="text-red-700">
                        <strong>Razón de eliminación:</strong> {order.deletionReason}
                      </p>
                      <p className="text-red-600 text-xs mt-1">
                        Eliminado el {new Date(order.deletedAt).toLocaleString('es-ES')}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-3" style={{ color: brandConfig.colors.primary }}>
                <FileText className="h-6 w-6" />
                Pedido {selectedOrder?.orderNumber}
              </span>
              {/* PDF Button in dialog header */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedOrder && generateDeliveryNote(selectedOrder)}
                className="gap-2 text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <FileDown className="h-4 w-4" />
                Nota de Entrega
              </Button>
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Status Bar */}
              <div className="flex flex-wrap items-center gap-3">
                <Badge className={`${statusConfig[selectedOrder.orderStatus]?.bgColor} ${statusConfig[selectedOrder.orderStatus]?.color} text-sm px-3 py-1`}>
                  {statusConfig[selectedOrder.orderStatus]?.label}
                </Badge>
                <Badge className={`${paymentStatusConfig[selectedOrder.paymentStatus]?.color} text-sm px-3 py-1`}>
                  Pago: {paymentStatusConfig[selectedOrder.paymentStatus]?.label}
                </Badge>
                
                {/* Quick status change */}
                <div className="flex items-center gap-2 ml-auto">
                  <Select
                    value={selectedOrder.paymentStatus}
                    onValueChange={(value) => updatePaymentStatus(selectedOrder._id, value)}
                  >
                    <SelectTrigger className="w-40 h-8 text-xs">
                      <SelectValue placeholder="Cambiar pago" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pago Pendiente</SelectItem>
                      <SelectItem value="paid">Pagado</SelectItem>
                      <SelectItem value="failed">Fallido</SelectItem>
                      <SelectItem value="refunded">Reembolsado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Customer & Shipping Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Información del Cliente
                    </h4>
                    <div className="space-y-2 text-sm">
                      <p><strong>Nombre:</strong> {selectedOrder.customerInfo?.firstName} {selectedOrder.customerInfo?.lastName}</p>
                      <p className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        {selectedOrder.customerInfo?.email}
                      </p>
                      <p className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        {selectedOrder.customerInfo?.phone}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {selectedOrder.shippingMethod?.type === 'pickup' ? 'Punto de Retiro' : 'Dirección de Envío'}
                    </h4>
                    {selectedOrder.shippingMethod?.type === 'pickup' ? (
                      <div className="space-y-2 text-sm">
                        <p><strong>Método:</strong> {selectedOrder.shippingMethod?.name}</p>
                        <Badge variant="outline" className="text-xs">Retiro en tienda</Badge>
                      </div>
                    ) : selectedOrder.shippingAddress ? (
                      <div className="space-y-2 text-sm">
                        <p>{selectedOrder.shippingAddress.address}</p>
                        <p>{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state}</p>
                        {selectedOrder.shippingAddress.zipCode && (
                          <p>CP: {selectedOrder.shippingAddress.zipCode}</p>
                        )}
                        {selectedOrder.shippingAddress.reference && (
                          <p className="text-gray-500">Ref: {selectedOrder.shippingAddress.reference}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No se requiere dirección</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Payment & Shipping Methods */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Método de Pago
                    </h4>
                    <div className="space-y-2 text-sm">
                      <p className="font-medium">{selectedOrder.paymentMethod?.name}</p>
                      {selectedOrder.paymentMethod?.requiresProof && (
                        <Badge variant="outline" className="text-xs">Requiere comprobante</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Método de Envío
                    </h4>
                    <div className="space-y-2 text-sm">
                      <p className="font-medium">{selectedOrder.shippingMethod?.name}</p>
                      <p className="text-gray-500">
                        Costo: {selectedOrder.shippingMethod?.cost > 0 
                          ? `${currencySymbol}${selectedOrder.shippingMethod.cost.toFixed(2)}`
                          : 'A Consultar'
                        }
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Items */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-4">Productos del Pedido</h4>
                  <div className="space-y-3">
                    {selectedOrder.items?.map((item: any, index: number) => (
                      <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        {item.image && (
                          <img
                            src={`https://yenfit.shop${item.image}`}
                            alt={item.name}
                            className="w-16 h-16 object-cover rounded-lg"
                            onError={(e) => {
                              e.currentTarget.src = "/placeholder.svg"
                            }}
                          />
                        )}
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-600">
                            {item.color} • {item.size} • Cantidad: {item.quantity}
                          </p>
                          {item.originalPrice && item.originalPrice > item.price && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              Descuento aplicado
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold" style={{ color: brandConfig.colors.primary }}>
                            {currencySymbol}{item.subtotal?.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {item.originalPrice && item.originalPrice > item.price ? (
                              <>
                                <span className="line-through">{currencySymbol}{item.originalPrice.toFixed(2)}</span>
                                {' → '}
                                {currencySymbol}{item.price.toFixed(2)} c/u
                              </>
                            ) : (
                              <>{currencySymbol}{item.price?.toFixed(2)} c/u</>
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Summary */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-4">Resumen</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal:</span>
                      <span>{currencySymbol}{selectedOrder.subtotal?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Envío:</span>
                      <span>
                        {selectedOrder.shipping > 0 
                          ? `${currencySymbol}${selectedOrder.shipping.toFixed(2)}`
                          : 'A Consultar'
                        }
                      </span>
                    </div>
                    {selectedOrder.discount?.amount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          Descuento ({selectedOrder.discount.description}):
                        </span>
                        <span>-{currencySymbol}{selectedOrder.discount.amount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                      <span>Total:</span>
                      <span style={{ color: brandConfig.colors.primary }}>
                        {currencySymbol}{selectedOrder.total?.toFixed(2)}
                      </span>
                    </div>
                    
                    {/* Bs Total with exchange rate */}
                    {showBsPrice && selectedOrder.totalInBs && (
                      <div className="flex justify-between text-gray-500 pt-2 border-t">
                        <span className="flex items-center gap-1">
                          <ArrowUpDown className="h-3 w-3" />
                          Total en Bs
                          {getOrderExchangeRate(selectedOrder) && (
                            <span className="text-xs">
                              (Tasa: Bs. {getOrderExchangeRate(selectedOrder)?.toFixed(2)}/{currencyCode})
                            </span>
                          )}
                        </span>
                        <span className="font-semibold">Bs. {selectedOrder.totalInBs.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              {selectedOrder.notes && (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">Notas del Cliente</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      {selectedOrder.notes}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Admin Notes */}
              {selectedOrder.adminNotes && (
                <Card className="border-0 shadow-sm bg-yellow-50">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2 text-yellow-800">Notas del Admin</h4>
                    <p className="text-sm text-yellow-700 bg-yellow-100 p-3 rounded-lg">
                      {selectedOrder.adminNotes}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Status History */}
              {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 && (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-4">Historial de Estados</h4>
                    <div className="space-y-3">
                      {selectedOrder.statusHistory.map((history: any, index: number) => (
                        <div key={index} className="flex items-start gap-3 text-sm">
                          <div className={`w-2 h-2 rounded-full mt-1.5 ${
                            statusConfig[history.status]?.color.replace('text-', 'bg-') || 'bg-gray-400'
                          }`} />
                          <div className="flex-1">
                            <p className="font-medium">
                              {statusConfig[history.status]?.label || history.status}
                            </p>
                            {history.note && (
                              <p className="text-gray-500 text-xs">{history.note}</p>
                            )}
                            <p className="text-gray-400 text-xs">
                              {new Date(history.date).toLocaleString('es-ES')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Download PDF Button at bottom */}
              <div className="flex justify-center pt-4">
                <Button
                  onClick={() => generateDeliveryNote(selectedOrder)}
                  className="gap-2"
                  style={{ backgroundColor: brandConfig.colors.primary }}
                >
                  <FileDown className="h-5 w-5" />
                  Descargar Nota de Entrega (PDF)
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Eliminar Pedido
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-gray-600">
              ¿Estás seguro de que deseas eliminar el pedido <strong>{orderToDelete?.orderNumber}</strong>?
            </p>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Razón de eliminación (opcional):</label>
              <Textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Ej: Pedido duplicado, solicitud del cliente..."
                rows={3}
              />
            </div>

            <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
              ⚠️ Este pedido se marcará como eliminado pero podrá ser restaurado posteriormente.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteOrder}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}