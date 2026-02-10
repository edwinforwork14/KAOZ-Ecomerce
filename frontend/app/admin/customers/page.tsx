"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Search, Eye, Mail, Phone, MapPin, ShoppingCart, TrendingUp, 
  Package, Clock, Plus, Minus, Trash2, User, DollarSign, 
  ShoppingBag, Calendar, ArrowUpRight, Loader2
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { api } from "@/lib/api"
import { brandConfig } from "@/lib/config"

const translateOrderStatus = (status: string): string => {
  const translations: { [key: string]: string } = {
    'pending': 'Pendiente',
    'confirmed': 'Confirmado',
    'processing': 'Procesando',
    'shipped': 'Enviado',
    'delivered': 'Entregado',
    'cancelled': 'Cancelado'
  }
  return translations[status] || status
}

const getOrderStatusColor = (status: string): string => {
  const colors: { [key: string]: string } = {
    'pending': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'confirmed': 'bg-blue-100 text-blue-700 border-blue-200',
    'processing': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    'shipped': 'bg-purple-100 text-purple-700 border-purple-200',
    'delivered': 'bg-green-100 text-green-700 border-green-200',
    'cancelled': 'bg-red-100 text-red-700 border-red-200'
  }
  return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200'
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [cartHistory, setCartHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [customersResult, settingsResult] = await Promise.all([
        api.getAllCustomers({ search }),
        api.getSettings()
      ])
      if (customersResult.success) setCustomers(customersResult.customers)
      if (settingsResult.success) setSettings(settingsResult.settings)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData()
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  const loadCartHistory = async (customerId: string) => {
    try {
      setLoadingHistory(true)
      const result = await api.getCustomerCartHistory(customerId)
      if (result.success) {
        setCartHistory(result.history)
      }
    } catch (error) {
      console.error('Error loading cart history:', error)
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleViewCustomer = async (customer: any) => {
    setLoadingDetails(true)
    try {
      const result = await api.getCustomerDetails(customer._id)
      if (result.success) {
        setSelectedCustomer(result.customer)
        await loadCartHistory(customer._id)
      }
    } catch (error) {
      console.error('Error loading customer details:', error)
      setSelectedCustomer(customer)
      await loadCartHistory(customer._id)
    } finally {
      setLoadingDetails(false)
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'added':
        return <Plus className="h-4 w-4 text-green-600" />
      case 'removed':
        return <Trash2 className="h-4 w-4 text-red-600" />
      case 'updated':
        return <Minus className="h-4 w-4 text-blue-600" />
      default:
        return <ShoppingCart className="h-4 w-4 text-gray-600" />
    }
  }

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'added': return 'Agregado'
      case 'removed': return 'Eliminado'
      case 'updated': return 'Actualizado'
      default: return action
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'added': return 'bg-green-100 text-green-800 border-green-200'
      case 'removed': return 'bg-red-100 text-red-800 border-red-200'
      case 'updated': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getCartStats = () => {
    if (!cartHistory.length) return null

    const addedItems = cartHistory.filter(h => h.action === 'added')
    const removedItems = cartHistory.filter(h => h.action === 'removed')
    const totalValue = addedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)

    const productCounts: { [key: string]: { count: number, name: string, price: number } } = {}
    addedItems.forEach(item => {
      if (!productCounts[item.product]) {
        productCounts[item.product] = { count: 0, name: item.productName, price: item.price }
      }
      productCounts[item.product].count += item.quantity
    })

    const topProducts = Object.values(productCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return {
      totalAdded: addedItems.reduce((sum, item) => sum + item.quantity, 0),
      totalRemoved: removedItems.reduce((sum, item) => sum + item.quantity, 0),
      totalValue,
      topProducts,
      conversionRate: selectedCustomer?.orderCount 
        ? ((selectedCustomer.orderCount / addedItems.length) * 100).toFixed(1)
        : '0'
    }
  }

  const stats = selectedCustomer ? getCartStats() : null
  const currencySymbol = settings?.currency?.symbol || '$'

  // Calculate general stats
  const totalCustomers = customers.length
  const activeCustomers = customers.filter(c => c.orderCount > 0).length
  const totalRevenue = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0)
  const avgOrderValue = totalRevenue / Math.max(customers.reduce((sum, c) => sum + (c.orderCount || 0), 0), 1)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Cargando clientes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 space-y-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          Gestión de Clientes
        </h1>
        <p className="text-gray-500 mt-1">Administra y analiza tu base de clientes de {brandConfig.name}</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <Input
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 border-2 focus:ring-2"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Clientes</p>
                <p className="text-3xl font-bold text-blue-600">{totalCustomers}</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <User className="h-7 w-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Clientes Activos</p>
                <p className="text-3xl font-bold text-green-600">{activeCustomers}</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                <ShoppingBag className="h-7 w-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Ingresos Totales</p>
                <p className="text-3xl font-bold text-purple-600">{currencySymbol}{totalRevenue.toFixed(0)}</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <DollarSign className="h-7 w-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-orange-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Valor Promedio</p>
                <p className="text-3xl font-bold text-orange-600">{currencySymbol}{avgOrderValue.toFixed(2)}</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                <TrendingUp className="h-7 w-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customers List */}
      <div className="space-y-4">
        {customers.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No se encontraron clientes</p>
              <p className="text-gray-400 text-sm mt-2">Intenta con otra búsqueda</p>
            </CardContent>
          </Card>
        ) : (
          customers.map((customer, index) => (
            <Card 
              key={customer._id} 
              className="border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer"
              onClick={() => handleViewCustomer(customer)}
            >
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div 
                      className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-xl text-white shadow-lg flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${brandConfig.colors.primary} 0%, ${brandConfig.colors.secondary} 100%)` }}
                    >
                      {customer.firstName?.charAt(0)}{customer.lastName?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {customer.firstName} {customer.lastName}
                      </h3>
                      <div className="flex flex-col gap-1 mt-1">
                        <div className="flex items-center text-sm text-gray-500">
                          <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span className="truncate">{customer.email}</span>
                        </div>
                        {customer.phone && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center bg-blue-50 px-4 py-3 rounded-xl">
                        <p className="text-2xl font-bold text-blue-600">{customer.orderCount || 0}</p>
                        <p className="text-xs text-gray-600 font-medium">Pedidos</p>
                      </div>
                      <div className="text-center bg-green-50 px-4 py-3 rounded-xl">
                        <p className="text-2xl font-bold text-green-600">
                          {currencySymbol}{(customer.totalSpent || 0).toFixed(0)}
                        </p>
                        <p className="text-xs text-gray-600 font-medium">Gastado</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      style={{ backgroundColor: brandConfig.colors.primary }}
                      className="text-white hover:opacity-90"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleViewCustomer(customer)
                      }}
                      disabled={loadingDetails}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Detalles
                    </Button>
                  </div>
                </div>

                {customer.orderCount > 0 && (
                  <div className="mt-4 pt-4 border-t flex items-center justify-between">
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                      Cliente Activo
                    </Badge>
                    <span className="text-sm text-gray-500">
                      Promedio: {currencySymbol}{customer.orderCount > 0 ? ((customer.totalSpent || 0) / customer.orderCount).toFixed(2) : '0.00'}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Customer Detail Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => {
        setSelectedCustomer(null)
        setCartHistory([])
      }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl text-white shadow-lg"
                style={{ background: `linear-gradient(135deg, ${brandConfig.colors.primary} 0%, ${brandConfig.colors.secondary} 100%)` }}
              >
                {selectedCustomer?.firstName?.charAt(0)}{selectedCustomer?.lastName?.charAt(0)}
              </div>
              <div>
                <DialogTitle style={{ color: brandConfig.colors.primary }} className="text-2xl">
                  {selectedCustomer?.firstName} {selectedCustomer?.lastName}
                </DialogTitle>
                <p className="text-sm text-gray-500 mt-1">{selectedCustomer?.email}</p>
              </div>
            </div>
          </DialogHeader>

          {loadingDetails ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
            </div>
          ) : selectedCustomer && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info" className="gap-2">
                  <User className="h-4 w-4" />
                  Información
                </TabsTrigger>
                <TabsTrigger value="orders" className="gap-2">
                  <Package className="h-4 w-4" />
                  Pedidos ({selectedCustomer.orderCount || 0})
                </TabsTrigger>
                <TabsTrigger value="cart" className="gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Historial de Carrito
                </TabsTrigger>
              </TabsList>

              {/* Tab: Info */}
              <TabsContent value="info" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-3 text-gray-700">Datos de Contacto</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span>{selectedCustomer.email}</span>
                        </div>
                        <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span>{selectedCustomer.phone || 'No registrado'}</span>
                        </div>
                        <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>Miembro desde {new Date(selectedCustomer.createdAt).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-3 text-gray-700">Estadísticas</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-2 bg-blue-50 rounded-lg">
                          <span className="text-sm text-gray-600">Total de Pedidos</span>
                          <span className="text-xl font-bold text-blue-600">
                            {selectedCustomer.orderCount || 0}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-green-50 rounded-lg">
                          <span className="text-sm text-gray-600">Total Gastado</span>
                          <span className="text-xl font-bold text-green-600">
                            {currencySymbol}{(selectedCustomer.totalSpent || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-purple-50 rounded-lg">
                          <span className="text-sm text-gray-600">Promedio por Pedido</span>
                          <span className="text-xl font-bold text-purple-600">
                            {currencySymbol}{selectedCustomer.orderCount > 0 
                              ? ((selectedCustomer.totalSpent || 0) / selectedCustomer.orderCount).toFixed(2) 
                              : '0.00'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {selectedCustomer.address && (
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-3 text-gray-700 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Dirección Registrada
                      </h4>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="font-medium">{selectedCustomer.address.street}</p>
                        <p className="text-gray-600">
                          {selectedCustomer.address.city}, {selectedCustomer.address.state} {selectedCustomer.address.zipCode}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Tab: Orders */}
              <TabsContent value="orders" className="space-y-4">
                {selectedCustomer.orders && selectedCustomer.orders.length > 0 ? (
                  <div className="space-y-3">
                    {selectedCustomer.orders.map((order: any) => (
                      <Card key={order._id} className="border-0 shadow-sm hover:shadow-md transition-all">
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <p className="font-bold text-lg" style={{ color: brandConfig.colors.primary }}>
                                {order.orderNumber}
                              </p>
                              <p className="text-sm text-gray-500">
                                {new Date(order.createdAt).toLocaleDateString('es-ES', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-2xl text-green-600">
                                {currencySymbol}{order.total?.toFixed(2)}
                              </p>
                              <Badge className={getOrderStatusColor(order.orderStatus)}>
                                {translateOrderStatus(order.orderStatus)}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="pt-3 border-t">
                            <p className="text-xs font-semibold text-gray-600 mb-2">Productos:</p>
                            <div className="flex flex-wrap gap-2">
                              {order.items?.map((item: any, idx: number) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {item.name} x{item.quantity}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg font-medium">No hay pedidos registrados</p>
                  </div>
                )}
              </TabsContent>

              {/* Tab: Cart History */}
              <TabsContent value="cart" className="space-y-6">
                {loadingHistory ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500">Cargando historial...</p>
                  </div>
                ) : cartHistory.length > 0 ? (
                  <>
                    {stats && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="border-0 bg-gradient-to-br from-green-50 to-white">
                          <CardContent className="p-4 text-center">
                            <div className="flex items-center justify-center mb-2">
                              <Plus className="h-5 w-5 text-green-600 mr-1" />
                              <p className="text-2xl font-bold text-green-600">{stats.totalAdded}</p>
                            </div>
                            <p className="text-xs text-gray-600 font-medium">Agregados</p>
                          </CardContent>
                        </Card>

                        <Card className="border-0 bg-gradient-to-br from-red-50 to-white">
                          <CardContent className="p-4 text-center">
                            <div className="flex items-center justify-center mb-2">
                              <Trash2 className="h-5 w-5 text-red-600 mr-1" />
                              <p className="text-2xl font-bold text-red-600">{stats.totalRemoved}</p>
                            </div>
                            <p className="text-xs text-gray-600 font-medium">Eliminados</p>
                          </CardContent>
                        </Card>

                        <Card className="border-0 bg-gradient-to-br from-purple-50 to-white">
                          <CardContent className="p-4 text-center">
                            <div className="flex items-center justify-center mb-2">
                              <DollarSign className="h-5 w-5 text-purple-600 mr-1" />
                              <p className="text-2xl font-bold text-purple-600">
                                {currencySymbol}{stats.totalValue.toFixed(0)}
                              </p>
                            </div>
                            <p className="text-xs text-gray-600 font-medium">Valor Total</p>
                          </CardContent>
                        </Card>

                        <Card className="border-0 bg-gradient-to-br from-blue-50 to-white">
                          <CardContent className="p-4 text-center">
                            <div className="flex items-center justify-center mb-2">
                              <TrendingUp className="h-5 w-5 text-blue-600 mr-1" />
                              <p className="text-2xl font-bold text-blue-600">{stats.conversionRate}%</p>
                            </div>
                            <p className="text-xs text-gray-600 font-medium">Conversión</p>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* Top Products */}
                    {stats && stats.topProducts.length > 0 && (
                      <Card className="border-0 shadow-sm">
                        <CardContent className="p-4">
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" style={{ color: brandConfig.colors.primary }} />
                            Productos Más Agregados
                          </h4>
                          <div className="space-y-2">
                            {stats.topProducts.map((product: any, index: number) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                              >
                                <div className="flex items-center gap-3">
                                  <div 
                                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm"
                                    style={{ backgroundColor: brandConfig.colors.primary }}
                                  >
                                    {index + 1}
                                  </div>
                                  <div>
                                    <p className="font-medium">{product.name}</p>
                                    <p className="text-sm text-gray-500">{currencySymbol}{product.price.toFixed(2)} c/u</p>
                                  </div>
                                </div>
                                <Badge variant="secondary" className="text-base font-semibold">
                                  {product.count}x
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Activity Timeline */}
                    <Card className="border-0 shadow-sm">
                      <CardContent className="p-4">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Clock className="h-5 w-5" style={{ color: brandConfig.colors.primary }} />
                          Timeline de Actividad
                        </h4>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {cartHistory.map((item, index) => (
                            <div
                              key={index}
                              className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <div className="mt-1">{getActionIcon(item.action)}</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <p className="font-medium text-sm">{item.productName}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {item.color} • {item.size} • Cantidad: {item.quantity}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                      {new Date(item.createdAt).toLocaleDateString('es-ES', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <Badge className={getActionColor(item.action)}>
                                      {getActionLabel(item.action)}
                                    </Badge>
                                    <p className="text-sm font-bold mt-1">
                                      {currencySymbol}{(item.price * item.quantity).toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg font-medium">No hay historial de carrito</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}