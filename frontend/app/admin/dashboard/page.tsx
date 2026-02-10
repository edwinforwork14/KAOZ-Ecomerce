"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  DollarSign, ShoppingCart, Users, Package, TrendingUp,
  RefreshCw, CreditCard, Truck, ArrowUpRight, Clock,
  Eye, CheckCircle, XCircle, AlertCircle, Percent, Target, Award,
  ShoppingBag, UserCheck, BarChart3
} from "lucide-react"
import { api } from "@/lib/api"
import { brandConfig } from "@/lib/config"
import Link from "next/link"

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

const getStatusColor = (status: string): string => {
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

const getStatusIcon = (status: string) => {
  const icons: { [key: string]: any } = {
    'pending': Clock,
    'confirmed': CheckCircle,
    'processing': RefreshCw,
    'shipped': Truck,
    'delivered': CheckCircle,
    'cancelled': XCircle
  }
  return icons[status] || AlertCircle
}

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [settings, setSettings] = useState<any>(null)
  const [exchangeRate, setExchangeRate] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updatingRate, setUpdatingRate] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [statsResult, settingsResult] = await Promise.all([
        api.getDashboardStats(),
        api.getSettings()
      ])
      
      if (statsResult.success) {
        setStats(statsResult.stats)
      }
      
      if (settingsResult.success) {
        setSettings(settingsResult.settings)
        setExchangeRate(settingsResult.settings.exchangeRate?.current)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateExchangeRate = async () => {
    setUpdatingRate(true)
    try {
      const result = await api.updateExchangeRate()
      if (result.success) {
        loadData()
      }
    } catch (error) {
      console.error('Error updating rate:', error)
    } finally {
      setUpdatingRate(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: brandConfig.colors.primary }}></div>
          <p className="text-gray-500">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      title: "Ingresos Totales",
      value: `${settings?.currency?.symbol || '$'}${stats?.totalRevenue?.toFixed(2) || '0.00'}`,
      icon: DollarSign,
      bgColor: "from-green-500 to-emerald-600",
    },
    {
      title: "Pedidos",
      value: stats?.totalOrders || 0,
      icon: ShoppingCart,
      bgColor: "from-blue-500 to-indigo-600",
    },
    {
      title: "Clientes",
      value: stats?.totalCustomers || 0,
      icon: Users,
      bgColor: "from-purple-500 to-violet-600",
    },
    {
      title: "Productos",
      value: stats?.totalProducts || 0,
      icon: Package,
      bgColor: "from-orange-500 to-amber-600",
    }
  ]

  const kpiCards = [
    {
      title: "Ticket Promedio",
      value: `${settings?.currency?.symbol || '$'}${stats?.aov?.toFixed(2) || '0.00'}`,
      subtitle: "Valor promedio de orden",
      icon: Target,
      bgColor: "from-cyan-50 to-blue-50",
      iconColor: "text-cyan-600",
      borderColor: "border-cyan-200"
    },
    {
      title: "Tasa de Conversión",
      value: `${stats?.conversionRate || 0}%`,
      subtitle: "Visitas que compran",
      icon: Percent,
      bgColor: "from-green-50 to-emerald-50",
      iconColor: "text-green-600",
      borderColor: "border-green-200"
    },
    {
      title: "Revenue por Cliente",
      value: `${settings?.currency?.symbol || '$'}${stats?.revenuePerCustomer?.toFixed(2) || '0.00'}`,
      subtitle: "Ingreso promedio",
      icon: Award,
      bgColor: "from-purple-50 to-violet-50",
      iconColor: "text-purple-600",
      borderColor: "border-purple-200"
    },
    {
      title: "Tasa de Retención",
      value: `${stats?.retentionRate || 0}%`,
      subtitle: `${stats?.repeatCustomerCount || 0} clientes recurrentes`,
      icon: UserCheck,
      bgColor: "from-indigo-50 to-blue-50",
      iconColor: "text-indigo-600",
      borderColor: "border-indigo-200"
    },
    {
      title: "Abandono de Carrito",
      value: `${stats?.abandonmentRate || 0}%`,
      subtitle: "Carritos no convertidos",
      icon: ShoppingBag,
      bgColor: "from-amber-50 to-yellow-50",
      iconColor: "text-amber-600",
      borderColor: "border-amber-200"
    }
  ]

  return (
    <div className="p-6 md:p-8 space-y-8 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-gray-500 mt-1">Bienvenido al panel de control de {brandConfig.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1.5">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
            Sistema Activo
          </Badge>
        </div>
      </div>

      {/* Exchange Rate Card */}
      {settings?.currency?.showBsPrice && exchangeRate && (
        <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-600 to-indigo-700 text-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                  <DollarSign className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-white/80 text-sm font-medium">Tasa de Cambio del Día</p>
                  <div className="flex items-baseline gap-4 mt-1">
                    <div>
                      <span className="text-3xl font-bold">Bs. {exchangeRate.usd?.toFixed(2)}</span>
                      <span className="text-white/70 text-sm ml-2">/ USD</span>
                    </div>
                    <div className="text-white/80">
                      <span className="text-xl font-semibold">Bs. {exchangeRate.eur?.toFixed(2)}</span>
                      <span className="text-white/60 text-sm ml-2">/ EUR</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right text-white/70 text-sm">
                  <p>Última actualización</p>
                  <p className="font-medium text-white">
                    {settings.exchangeRate?.lastUpdated 
                      ? new Date(settings.exchangeRate.lastUpdated).toLocaleString('es-VE', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          day: '2-digit',
                          month: 'short'
                        })
                      : 'N/A'
                    }
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={updateExchangeRate}
                  disabled={updatingRate}
                  className="bg-white/20 hover:bg-white/30 text-white border-0"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${updatingRate ? 'animate-spin' : ''}`} />
                  Actualizar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card 
              key={index} 
              className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500 mb-1">
                      {stat.title}
                    </p>
                    <p className="text-3xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.bgColor} flex items-center justify-center shadow-lg`}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* KPIs Grid */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-gray-700" />
          <h2 className="text-xl font-bold text-gray-800">KPIs de Rendimiento</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kpiCards.map((kpi, index) => {
            const Icon = kpi.icon
            return (
              <Card 
                key={index} 
                className={`border ${kpi.borderColor} shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-br ${kpi.bgColor}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-12 h-12 rounded-xl ${kpi.bgColor} flex items-center justify-center border ${kpi.borderColor}`}>
                      <Icon className={`h-6 w-6 ${kpi.iconColor}`} />
                    </div>
                    <div className="text-right flex-1 ml-3">
                      <p className="text-xs font-medium text-gray-600 mb-1">{kpi.title}</p>
                      <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">{kpi.subtitle}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-4 text-center">
            <CreditCard className="h-6 w-6 mx-auto mb-2 text-green-600" />
            <p className="text-2xl font-bold text-green-700">
              {settings?.paymentMethods?.filter((m: any) => m.isActive).length || 0}
            </p>
            <p className="text-xs text-green-600 font-medium">Métodos de Pago</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-4 text-center">
            <Truck className="h-6 w-6 mx-auto mb-2 text-blue-600" />
            <p className="text-2xl font-bold text-blue-700">
              {settings?.shippingMethods?.filter((m: any) => m.isActive).length || 0}
            </p>
            <p className="text-xs text-blue-600 font-medium">Métodos de Envío</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-amber-50 to-yellow-50">
          <CardContent className="p-4 text-center">
            <Package className="h-6 w-6 mx-auto mb-2 text-amber-600" />
            <p className="text-2xl font-bold text-amber-700">
              {stats?.lowStockCount || 0}
            </p>
            <p className="text-xs text-amber-600 font-medium">Bajo Stock</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-red-50 to-rose-50">
          <CardContent className="p-4 text-center">
            <AlertCircle className="h-6 w-6 mx-auto mb-2 text-red-600" />
            <p className="text-2xl font-bold text-red-700">
              {stats?.pendingOrders || 0}
            </p>
            <p className="text-xs text-red-600 font-medium">Pedidos Pendientes</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Mes Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Ingresos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {settings?.currency?.symbol || '$'}{stats?.currentMonthRevenue?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div className="pt-3 border-t">
                <p className="text-sm text-gray-500">Nuevos clientes</p>
                <p className="text-xl font-bold text-gray-900">{stats?.newCustomersThisMonth || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Últimos 30 Días
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Pedidos</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.ordersLast30Days || 0}</p>
              </div>
              <div className="pt-3 border-t">
                <p className="text-sm text-gray-500">Ticket promedio</p>
                <p className="text-xl font-bold text-gray-900">
                  {settings?.currency?.symbol || '$'}{stats?.aovLast30Days?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Eye className="h-5 w-5 text-purple-600" />
              Métricas de Inventario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Stock bajo</p>
                  <p className="text-2xl font-bold text-amber-600">{stats?.lowStockCount || 0}</p>
                </div>
                <Package className="h-8 w-8 text-amber-300" />
              </div>
              <div className="pt-3 border-t flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Sin stock</p>
                  <p className="text-2xl font-bold text-red-600">{stats?.outOfStockCount || 0}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-300" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-800">
                Pedidos Recientes
              </CardTitle>
              <Link href="/admin/orders">
                <Button variant="ghost" size="sm" className="text-sm">
                  Ver todos
                  <ArrowUpRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.recentOrders?.length > 0 ? (
                stats.recentOrders.slice(0, 5).map((order: any) => {
                  const StatusIcon = getStatusIcon(order.orderStatus)
                  return (
                    <div 
                      key={order._id} 
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getStatusColor(order.orderStatus)}`}>
                          <StatusIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{order.orderNumber}</p>
                          <p className="text-sm text-gray-500">
                            {order.customerInfo?.firstName} {order.customerInfo?.lastName}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">
                          {settings?.currency?.symbol || '$'}{order.total?.toFixed(2)}
                        </p>
                        <Badge className={`text-xs ${getStatusColor(order.orderStatus)}`}>
                          {translateOrderStatus(order.orderStatus)}
                        </Badge>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No hay pedidos recientes</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-800">
                Productos Más Vendidos
              </CardTitle>
              <Link href="/admin/products">
                <Button variant="ghost" size="sm" className="text-sm">
                  Ver todos
                  <ArrowUpRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.topProducts?.length > 0 ? (
                stats.topProducts.slice(0, 5).map((product: any, index: number) => (
                  <div 
                    key={product._id} 
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md"
                        style={{ 
                          background: index === 0 
                            ? 'linear-gradient(135deg, #FFD700, #FFA500)' 
                            : index === 1 
                            ? 'linear-gradient(135deg, #C0C0C0, #A0A0A0)'
                            : index === 2
                            ? 'linear-gradient(135deg, #CD7F32, #8B4513)'
                            : brandConfig.colors.primary
                        }}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 line-clamp-1">{product.name}</p>
                        <p className="text-sm text-gray-500">{product.totalQuantity} vendidos</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        {settings?.currency?.symbol || '$'}{product.totalRevenue?.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No hay datos de ventas</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Categories */}
      {stats?.topCategories?.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-gray-800">
              Categorías Más Vendidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {stats.topCategories.map((category: any, index: number) => (
                <div 
                  key={category._id || index} 
                  className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl text-center hover:shadow-md transition-all"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <span className="text-white font-bold text-lg">{index + 1}</span>
                  </div>
                  <p className="font-semibold text-gray-900 mb-1 truncate">
                    {category.categoryName || 'Sin categoría'}
                  </p>
                  <p className="text-sm text-gray-500 mb-2">{category.totalQuantity} unidades</p>
                  <p className="text-lg font-bold text-green-600">
                    {settings?.currency?.symbol || '$'}{category.totalRevenue?.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Status Distribution */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-gray-800">
            Distribución de Estados de Pedidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {stats?.ordersByStatus?.map((item: any) => {
              const StatusIcon = getStatusIcon(item._id)
              return (
                <div 
                  key={item._id} 
                  className={`p-4 rounded-xl text-center transition-all hover:shadow-md ${getStatusColor(item._id)}`}
                >
                  <StatusIcon className="h-6 w-6 mx-auto mb-2" />
                  <p className="text-3xl font-bold mb-1">
                    {item.count}
                  </p>
                  <p className="text-sm font-medium">
                    {translateOrderStatus(item._id)}
                  </p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}