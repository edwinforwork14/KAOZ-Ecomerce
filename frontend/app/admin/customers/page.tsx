"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Search, Eye, Mail, Phone, MapPin, ShoppingCart, TrendingUp, 
  Package, Clock, Plus, Minus, Trash2, User, DollarSign, 
  ShoppingBag, Calendar, ArrowUpRight, Loader2, RefreshCw
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
        return <Plus className="h-4 w-4" />
      case 'removed':
        return <Trash2 className="h-4 w-4" />
      case 'updated':
        return <Minus className="h-4 w-4" />
      default:
        return <ShoppingCart className="h-4 w-4" />
    }
  }

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'added': return 'AGREGADO'
      case 'removed': return 'ELIMINADO'
      case 'updated': return 'ACTUALIZADO'
      default: return (action || '').toUpperCase()
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'added': return 'bg-green-100 text-green-800'
      case 'removed': return 'bg-red-100 text-red-800'
      case 'updated': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
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
  const activeCustomers = customers.filter(c => (c.orderCount || 0) > 0).length
  const totalRevenue = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0)
  const avgOrderValue = totalRevenue / Math.max(customers.reduce((sum, c) => sum + (c.orderCount || 0), 0), 1)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-1 bg-black overflow-hidden">
            <div className="w-full h-full bg-kaosNeon animate-progress-fast"></div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">Accediendo a Audiencia...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-8 bg-transparent min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-black/10 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-kaosNeon animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-black/60">Control de Audiencia • KAOZ</span>
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">
            Clientes
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={loadData}
            className="bg-black text-white rounded-none hover:bg-kaosNeon hover:text-black transition-all h-14 px-8 text-xs font-black uppercase tracking-widest"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Sincronizar
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 border border-black/10 divide-x divide-black/10 bg-white shadow-sm">
        <div className="p-6">
          <p className="text-[9px] font-black uppercase text-black/60 tracking-widest mb-1">Base Total</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black">{totalCustomers}</span>
            <span className="text-[9px] font-black text-black/60 uppercase">Perfiles</span>
          </div>
        </div>
        <div className="p-6">
          <p className="text-[9px] font-black uppercase text-black/60 tracking-widest mb-1">Actividad CRM</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black">{activeCustomers}</span>
            <span className="text-[9px] font-black text-black/60 uppercase">Activos</span>
          </div>
        </div>
        <div className="p-6 bg-black text-white">
          <p className="text-[9px] font-black uppercase text-white/60 tracking-widest mb-1">LTV Acumulado</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-kaosNeon">{currencySymbol}{totalRevenue.toFixed(0)}</span>
          </div>
        </div>
        <div className="p-6">
          <p className="text-[9px] font-black uppercase text-black/60 tracking-widest mb-1">AOV Promedio</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black">{currencySymbol}{avgOrderValue.toFixed(0)}</span>
          </div>
        </div>
      </div>

      {/* Search & Industrial Filter Layout */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 group-focus-within:text-black transition-colors" />
        <Input
          placeholder="BUSCAR POR NOMBRE, EMAIL O IDENTIFICADOR..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-12 h-14 rounded-none border-black focus:ring-0 uppercase text-xs font-bold tracking-widest bg-white"
        />
      </div>

      {/* Customers Manifest List */}
      <div className="space-y-4">
        {customers.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 p-24 text-center">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-xl font-black uppercase tracking-tighter text-gray-600">Sin Registros de Audiencia</p>
          </div>
        ) : (
          customers.map((customer) => (
            <div 
              key={customer._id} 
              className="industrial-card flex flex-col md:flex-row items-center gap-8 p-8 transition-all border border-black/10 shadow-sm hover:border-black group relative bg-white"
              onClick={() => handleViewCustomer(customer)}
            >
              {/* Visual indicator */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-black transition-all group-hover:w-2" />

              {/* Identity Segment */}
              <div className="flex items-center gap-6 flex-1 w-full">
                <div className="w-16 h-16 bg-black text-white flex items-center justify-center font-black text-xl border border-black flex-shrink-0 grayscale">
                  {customer.firstName?.charAt(0)}{customer.lastName?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-2xl font-black uppercase tracking-tighter truncate">
                    {customer.firstName} {customer.lastName}
                  </h3>
                  <div className="flex flex-col gap-1 mt-1">
                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest flex items-center gap-2">
                      <Mail className="h-3 w-3" /> {customer.email}
                    </p>
                    {customer.phone && (
                      <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest flex items-center gap-2">
                        <Phone className="h-3 w-3" /> {customer.phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Data Segment */}
              <div className="flex items-center gap-12 border-t md:border-t-0 md:border-l border-black pt-6 md:pt-0 md:pl-12 w-full md:w-auto">
                <div className="text-center md:text-left">
                  <p className="industrial-stat-label mb-1">Operaciones</p>
                  <p className="text-2xl font-black">{customer.orderCount || 0}</p>
                </div>
                <div className="text-center md:text-left">
                  <p className="industrial-stat-label mb-1">Gasto Neto</p>
                  <p className="text-2xl font-black">{currencySymbol}{(customer.totalSpent || 0).toFixed(0)}</p>
                </div>
                <div className="flex items-center">
                  <Button
                    variant="outline"
                    className="rounded-none border-black hover:bg-black hover:text-white h-12 px-8 font-black uppercase text-[10px] tracking-widest transition-all"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleViewCustomer(customer)
                    }}
                    disabled={loadingDetails}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Expediente
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Customer Expediente Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => {
        setSelectedCustomer(null)
        setCartHistory([])
      }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col rounded-none border-black p-0">
          {selectedCustomer && (
            <>
              <div className="p-8 bg-black text-white flex justify-between items-center">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-white text-black flex items-center justify-center font-black text-3xl">
                    {selectedCustomer.firstName?.charAt(0)}{selectedCustomer.lastName?.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest bg-white text-black px-2 py-0.5">MANIFIESTO DE CLIENTE</span>
                      <span className="text-[10px] font-black uppercase tracking-widest border border-white px-2 py-0.5">#{selectedCustomer._id?.slice(-8).toUpperCase() || '---'}</span>
                    </div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">{selectedCustomer.firstName} {selectedCustomer.lastName}</h2>
                  </div>
                </div>
                <div className="text-right">
                  <p className="industrial-stat-label text-gray-400">VALOR VITALICIO (LTV)</p>
                  <p className="text-3xl font-black text-white">{currencySymbol}{(selectedCustomer.totalSpent || 0).toFixed(2)}</p>
                </div>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col bg-white">
                <Tabs defaultValue="info" className="w-full flex-1 flex flex-col">
                  <TabsList className="grid w-full grid-cols-3 rounded-none border-b border-black p-0 bg-gray-50 h-16">
                    <TabsTrigger value="info" className="rounded-none border-r border-black data-[state=active]:bg-black data-[state=active]:text-white font-black uppercase text-[10px] tracking-widest h-full">
                      Información Base
                    </TabsTrigger>
                    <TabsTrigger value="orders" className="rounded-none border-r border-black data-[state=active]:bg-black data-[state=active]:text-white font-black uppercase text-[10px] tracking-widest h-full">
                      Historial Operativo ({selectedCustomer.orderCount || 0})
                    </TabsTrigger>
                    <TabsTrigger value="cart" className="rounded-none data-[state=active]:bg-black data-[state=active]:text-white font-black uppercase text-[10px] tracking-widest h-full">
                      Actividad en Carrito
                    </TabsTrigger>
                  </TabsList>

                  <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {/* Tab: Info */}
                    <TabsContent value="info" className="m-0 space-y-12">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="space-y-8">
                          <div>
                            <h4 className="industrial-heading text-lg mb-4 border-b border-black pb-2 uppercase">Ficha de Contacto</h4>
                            <div className="space-y-3">
                              <div className="flex justify-between border-b border-gray-100 pb-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email Principal</span>
                                <span className="text-xs font-black lowercase">{selectedCustomer.email}</span>
                              </div>
                              <div className="flex justify-between border-b border-gray-100 pb-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Línea Telefónica</span>
                                <span className="text-xs font-black uppercase">{selectedCustomer.phone || 'NO REGISTRADO'}</span>
                              </div>
                              <div className="flex justify-between border-b border-gray-100 pb-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fecha de Registro</span>
                                <span className="text-xs font-black uppercase">{new Date(selectedCustomer.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>

                          {selectedCustomer.address && (
                            <div>
                              <h4 className="industrial-heading text-lg mb-4 border-b border-black pb-2 uppercase">Coordenadas de Despacho</h4>
                              <div className="p-4 border border-black bg-gray-50">
                                <p className="text-xs font-black uppercase">{selectedCustomer.address.street}</p>
                                <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">
                                  {selectedCustomer.address.city}, {selectedCustomer.address.state} {selectedCustomer.address.zipCode}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div>
                          <h4 className="industrial-heading text-lg mb-4 border-b border-black pb-2 uppercase">Indicadores CRM</h4>
                          <div className="grid grid-cols-1 gap-4">
                            <div className="p-6 border border-black flex justify-between items-center bg-white hover:bg-black hover:text-white transition-all group">
                              <span className="text-[10px] font-black uppercase tracking-widest">Frecuencia de Compra</span>
                              <span className="text-2xl font-black">{selectedCustomer.orderCount || 0} PEDIDOS</span>
                            </div>
                            <div className="p-6 border border-black flex justify-between items-center bg-white hover:bg-black hover:text-white transition-all group">
                              <span className="text-[10px] font-black uppercase tracking-widest">Ticket Promedio (AOV)</span>
                              <span className="text-2xl font-black">{currencySymbol}{selectedCustomer.orderCount > 0 
                                ? ((selectedCustomer.totalSpent || 0) / selectedCustomer.orderCount).toFixed(2) 
                                : '0.00'}</span>
                            </div>
                            <div className="p-6 border border-black flex justify-between items-center bg-white hover:bg-black hover:text-white transition-all group">
                              <span className="text-[10px] font-black uppercase tracking-widest">Antigüedad de Cuenta</span>
                              <span className="text-2xl font-black">{Math.floor((new Date().getTime() - new Date(selectedCustomer.createdAt).getTime()) / (1000 * 60 * 60 * 24))} DÍAS</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Tab: Orders */}
                    <TabsContent value="orders" className="m-0 space-y-6">
                      {selectedCustomer.orders && selectedCustomer.orders.length > 0 ? (
                        <div className="space-y-4">
                          {selectedCustomer.orders.map((order: any) => (
                            <div key={order._id} className="industrial-card p-6 bg-white hover:border-black transition-all">
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                  <div className="flex items-center gap-3 mb-1">
                                    <span className="text-lg font-black uppercase tracking-tighter">#{order.orderNumber}</span>
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 border ${getOrderStatusColor(order.orderStatus)}`}>
                                      {translateOrderStatus(order.orderStatus)?.toUpperCase() || 'PENDIENTE'}
                                    </span>
                                  </div>
                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    {new Date(order.createdAt).toLocaleDateString()} — {order.items?.length} ÍTEMS
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="industrial-stat-label">Total Neto</p>
                                  <p className="text-2xl font-black text-black">{currencySymbol}{order.total?.toFixed(2)}</p>
                                </div>
                              </div>
                              <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
                                {order.items?.map((item: any, idx: number) => (
                                  <span key={idx} className="text-[9px] font-bold bg-gray-50 border border-gray-200 px-2 py-1 uppercase text-gray-500">
                                    {item.name} x{item.quantity}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-gray-200 p-24 text-center">
                          <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-xl font-black uppercase tracking-tighter text-gray-400">Sin Operaciones Registradas</p>
                        </div>
                      )}
                    </TabsContent>

                    {/* Tab: Cart History */}
                    <TabsContent value="cart" className="m-0 space-y-8">
                      {loadingHistory ? (
                        <div className="text-center py-24">
                          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-gray-400" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Recuperando Logs de Sesión...</p>
                        </div>
                      ) : cartHistory.length > 0 ? (
                        <div className="space-y-8">
                          {stats && (
                            <div className="grid grid-cols-2 md:grid-cols-4 border border-black divide-x divide-black">
                              <div className="p-6 bg-green-50/30">
                                <p className="industrial-stat-label text-green-600">Items Añadidos</p>
                                <span className="text-3xl font-black text-green-600">{stats.totalAdded}</span>
                              </div>
                              <div className="p-6 bg-red-50/30">
                                <p className="industrial-stat-label text-red-600">Items Retirados</p>
                                <span className="text-3xl font-black text-red-600">{stats.totalRemoved}</span>
                              </div>
                              <div className="p-6">
                                <p className="industrial-stat-label">Valor Flotante</p>
                                <span className="text-3xl font-black">{currencySymbol}{stats.totalValue.toFixed(0)}</span>
                              </div>
                              <div className="p-6 bg-black text-white">
                                <p className="industrial-stat-label text-gray-400">Tasa Conversión</p>
                                <span className="text-3xl font-black text-white">{stats.conversionRate}%</span>
                              </div>
                            </div>
                          )}

                          <div className="space-y-4">
                            <h4 className="industrial-heading text-sm border-b border-black pb-2 uppercase">Log de Interacciones</h4>
                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                              {cartHistory.map((item, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-4 p-4 border border-gray-100 bg-white hover:border-black transition-all group"
                                >
                                  <div className={`p-2 border ${item.action === 'added' ? 'bg-green-50 border-green-200 text-green-600' : 'bg-red-50 border-red-200 text-red-600'}`}>
                                    {getActionIcon(item.action)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-black uppercase tracking-tight truncate">{item.productName}</p>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                      {item.color} • {item.size} • x{item.quantity}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 border ${getActionColor(item.action)}`}>
                                      {getActionLabel(item.action)}
                                    </span>
                                    <p className="text-xs font-black mt-1">{currencySymbol}{(item.price * item.quantity).toFixed(2)}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-gray-200 p-24 text-center">
                          <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-xl font-black uppercase tracking-tighter text-gray-400">Sin Actividad de Navegación</p>
                        </div>
                      )}
                    </TabsContent>
                  </div>
                </Tabs>
              </div>

              <div className="p-8 border-t border-black bg-[#fafafa] flex justify-end">
                <Button 
                  onClick={() => setSelectedCustomer(null)}
                  className="rounded-none bg-black text-white font-black uppercase text-xs h-14 px-12 hover:bg-gray-800 transition-all"
                >
                  Cerrar Expediente
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}