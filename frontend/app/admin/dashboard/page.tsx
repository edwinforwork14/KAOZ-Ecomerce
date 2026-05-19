"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  DollarSign, ShoppingCart, Users, Package, TrendingUp,
  RefreshCw, CreditCard, Truck, ArrowUpRight, Clock,
  Eye, CheckCircle, XCircle, AlertCircle, Percent, Target, Award,
  ShoppingBag, UserCheck, BarChart3, ArrowRight,
  TrendingDown, ShoppingBasket, Activity, ChevronRight,
  Zap, PackageSearch, UserPlus, FileText, MousePointer2,
  PieChart as PieChartIcon, History, Boxes
} from "lucide-react"
import { api } from "@/lib/api"
import Link from "next/link"
import { 
  CategoryDistributionChart, 
  PaymentMethodsChart, 
  MiniTrendChart,
  RevenueTrendChart
} from "@/components/admin/DashboardCharts"
import { cn } from "@/lib/utils"

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [statsResult, settingsResult] = await Promise.all([
        api.getDashboardStats(),
        api.getSettings()
      ])
      
      if (statsResult.success) setStats(statsResult.stats)
      if (settingsResult.success) setSettings(settingsResult.settings)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
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
          <p className="text-[10px] font-black uppercase tracking-[0.2em] animate-pulse text-black">Sincronizando Archivo Maestro...</p>
        </div>
      </div>
    )
  }

  const currencySymbol = settings?.currency?.symbol || '$'

  return (
    <div className="p-4 md:p-8 space-y-8 bg-transparent min-h-screen">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-kaosNeon animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-black/40">SISTEMA ACTIVO • PANEL OPERATIVO</span>
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">Centro de Control</h1>
          <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest mt-2">Última actualización: {new Date().toLocaleTimeString()}</p>
        </div>
        <div className="flex gap-2">
           <Button onClick={loadData} variant="outline" className="rounded-none border-neutral-200 hover:border-neutral-300 h-12 font-bold uppercase text-[10px] tracking-widest px-6 bg-white text-neutral-700 hover:bg-neutral-50 transition-all">
             <RefreshCw className="h-4 w-4 mr-2" /> Actualizar
           </Button>
        </div>
      </div>

      {/* URGENT ALERTS BAR */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
           <Zap className="h-3 w-3 text-neutral-400 fill-neutral-400" />
           <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Protocolos de Alerta</h3>
           <Badge className="bg-neutral-100 text-neutral-600 border border-neutral-200 rounded-none text-[8px] font-bold">ACTIVE</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           {/* Alerta: Pedidos Pendientes */}
           <div className="bg-white border border-neutral-200 p-5 flex items-center justify-between group cursor-pointer hover:border-neutral-400 hover:bg-neutral-50/30 transition-all duration-300">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-neutral-50 text-neutral-600 group-hover:bg-neutral-100 transition-colors">
                    <Clock className="h-5 w-5" />
                 </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-tight text-neutral-900">{stats?.pendingOrders || 0} PENDIENTES</p>
                    <p className="text-[9px] font-bold text-neutral-400 uppercase">REVISIÓN MANUAL REQUERIDA</p>
                  </div>
              </div>
              <Link href="/admin/orders" className="opacity-0 group-hover:opacity-100 transition-all"><ArrowRight className="h-5 w-5 text-neutral-600" /></Link>
           </div>

           {/* Alerta: Sin Stock */}
           <div className="bg-white border border-neutral-200 p-5 flex items-center justify-between group cursor-pointer hover:border-neutral-400 hover:bg-neutral-50/30 transition-all duration-300">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-red-50 text-red-600 group-hover:bg-red-100 transition-colors">
                    <XCircle className="h-5 w-5" />
                 </div>
                 <div>
                    <p className="text-sm font-black uppercase tracking-tight text-neutral-900">{stats?.outOfStockCount || 0} AGOTADOS</p>
                    <p className="text-[9px] font-bold text-neutral-400 uppercase">VENTAS PAUSADAS</p>
                 </div>
              </div>
              <Link href="/admin/products" className="opacity-0 group-hover:opacity-100 transition-all"><ArrowRight className="h-5 w-5 text-red-600" /></Link>
           </div>

           {/* Alerta: Stock Bajo */}
           <div className="bg-white border border-neutral-200 p-5 flex items-center justify-between group cursor-pointer hover:border-neutral-400 hover:bg-neutral-50/30 transition-all duration-300">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition-colors">
                    <AlertCircle className="h-5 w-5" />
                 </div>
                 <div>
                    <p className="text-sm font-black uppercase tracking-tight text-neutral-900">{stats?.lowStockCount || 0} CRÍTICOS</p>
                    <p className="text-[9px] font-bold text-neutral-400 uppercase">REPOSICIÓN INMEDIATA</p>
                 </div>
              </div>
              <Link href="/admin/products" className="opacity-0 group-hover:opacity-100 transition-all"><ArrowRight className="h-5 w-5 text-amber-500" /></Link>
           </div>
        </div>
      </div>

      {/* PRIMARY KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Revenue */}
        <div className="bg-white border border-neutral-200 p-8 relative overflow-hidden group">
           <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">Ingresos Brutos</p>
              <div className="flex items-baseline gap-1">
                 <span className="text-xl font-black text-neutral-400">{currencySymbol}</span>
                 <h2 className="text-5xl font-black tracking-tighter text-neutral-900">{(stats?.totalRevenue || 0).toLocaleString()}</h2>
              </div>
              <div className="mt-4 flex items-center gap-2">
                 <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-none text-[9px] font-black">+14.2%</Badge>
                 <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">VS MES ANTERIOR</span>
              </div>
           </div>
           <DollarSign className="absolute -bottom-4 -right-4 h-32 w-32 text-neutral-100/50 group-hover:text-neutral-100 transition-colors" />
        </div>

        {/* Orders */}
        <div className="bg-white border border-neutral-200 p-8 group hover:border-neutral-450 transition-all">
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">Pedidos Realizados</p>
                 <h2 className="text-5xl font-black tracking-tighter text-neutral-900">{stats?.totalOrders || 0}</h2>
              </div>
              <div className="p-4 bg-neutral-50 text-neutral-600 border border-neutral-100">
                 <ShoppingCart className="h-6 w-6" />
              </div>
           </div>
           <div className="mt-4 flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Últimos 30 días: {stats?.ordersLast30Days || 0}</span>
           </div>
        </div>

        {/* Customers */}
        <div className="bg-white border border-neutral-200 p-8 group hover:border-neutral-450 transition-all">
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">Base de Clientes</p>
                 <h2 className="text-5xl font-black tracking-tighter text-neutral-900">{stats?.totalCustomers || 0}</h2>
              </div>
              <div className="p-4 bg-neutral-50 text-neutral-600 border border-neutral-100">
                 <Users className="h-6 w-6" />
              </div>
           </div>
           <div className="mt-4 flex items-center gap-2">
              <UserPlus className="h-3 w-3 text-neutral-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">5 nuevos registrados hoy</span>
           </div>
        </div>

        {/* Products */}
        <div className="bg-white border border-neutral-200 p-8 group hover:border-neutral-450 transition-all">
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">Catálogo Activo</p>
                 <h2 className="text-5xl font-black tracking-tighter text-neutral-900">{stats?.totalProducts || 0}</h2>
              </div>
              <div className="p-4 bg-neutral-50 text-neutral-600 border border-neutral-100">
                 <Package className="h-6 w-6" />
              </div>
           </div>
           <div className="mt-4 flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-red-650">{stats?.outOfStockCount || 0} sin inventario</span>
           </div>
        </div>

        {/* Expenses (Gastos) */}
        <div className="bg-white border border-neutral-200 p-8 group hover:border-neutral-450 transition-all">
           <div className="flex justify-between items-start">
              <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">Gastos Operativos</p>
                  <h2 className="text-5xl font-black tracking-tighter text-neutral-900">{currencySymbol}{(stats?.totalExpenses || 0).toLocaleString()}</h2>
              </div>
              <div className="p-4 bg-neutral-50 text-neutral-600 border border-neutral-100 transition-colors">
                 <TrendingDown className="h-6 w-6" />
              </div>
           </div>
           <div className="mt-4 flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Balance Neto: {currencySymbol}{(stats?.totalRevenue - stats?.totalExpenses || 0).toLocaleString()}</span>
           </div>
        </div>
      </div>

      {/* SECONDARY METRICS BAR */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
         {[
           { label: 'Ticket Promedio', value: `${currencySymbol}${stats?.aov?.toFixed(0) || 0}`, icon: Target, color: 'text-neutral-600' },
           { label: 'Tasa Conversión', value: `${(stats?.conversionRate || 0).toFixed(2)}%`, icon: Activity, color: 'text-neutral-600' },
           { label: 'Margen Bruto', value: `${(((stats?.totalRevenue - stats?.totalExpenses) / Math.max(stats?.totalRevenue, 1)) * 100).toFixed(1)}%`, icon: Award, color: 'text-neutral-600' },
           { label: 'Retención', value: '12.5%', icon: UserCheck, color: 'text-neutral-600' },
           { label: 'Abandono Carrito', value: '64.2%', icon: ShoppingBasket, color: 'text-neutral-600' },
         ].map((m, i) => (
           <div key={i} className="bg-white border border-neutral-200 p-4 hover:bg-neutral-50/50 hover:border-neutral-300 transition-all cursor-default">
              <div className="flex items-center gap-2 mb-2">
                 <m.icon className={cn("h-3 w-3", m.color)} />
                 <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400">{m.label}</span>
              </div>
              <p className="text-lg font-black text-neutral-900">{m.value}</p>
           </div>
         ))}
      </div>

      {/* MAIN ANALYTICS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         {/* CHART: REVENUE TREND */}
         <div className="lg:col-span-8 bg-white border border-neutral-200 p-8">
            <div className="flex items-center justify-between mb-8">
               <div>
                  <h3 className="text-sm font-black uppercase tracking-widest mb-1 text-neutral-900">Análisis de Ingresos</h3>
                  <p className="text-[10px] font-bold text-neutral-450 uppercase">Evolución de los últimos 6 meses</p>
               </div>
               <Button variant="outline" size="sm" className="text-[9px] font-bold uppercase tracking-widest border border-neutral-200 hover:bg-neutral-50 text-neutral-600">Ver histórico</Button>
            </div>
            <RevenueTrendChart data={stats?.revenueHistory || []} />
         </div>

         {/* CHART: ORDER PIPELINE (Podium style) */}
         <div className="lg:col-span-4 bg-white border border-neutral-200 p-8 text-neutral-900">
            <div className="flex items-center justify-between mb-12">
               <h3 className="text-sm font-black uppercase tracking-widest text-neutral-900">Flujo de Pedidos</h3>
               <button className="text-[9px] font-bold uppercase tracking-widest bg-neutral-900 text-white px-4 py-2 hover:bg-neutral-800 transition-all">Gestionar</button>
            </div>
            
            <div className="relative h-[250px] flex items-end justify-between gap-2 px-4">
               {/* Podium Bars representing statuses */}
               <div className="flex-1 flex flex-col items-center gap-4">
                  <span className="text-xl font-black text-neutral-400">{stats?.ordersByStatus?.find((s: any) => s._id === 'pending')?.count || 0}</span>
                  <div className="w-full bg-amber-100 border border-amber-200 h-[60%] relative group">
                     <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-black text-amber-600">
                        {stats?.ordersByStatus?.find((s: any) => s._id === 'pending')?.count || 0}
                     </div>
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-neutral-500">Pendiente</span>
               </div>
               <div className="flex-1 flex flex-col items-center gap-4">
                  <span className="text-xl font-black text-neutral-400">{stats?.ordersByStatus?.find((s: any) => s._id === 'confirmed')?.count || 0}</span>
                  <div className="w-full bg-neutral-900 h-[90%] relative">
                     <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-black text-neutral-900">
                        {stats?.ordersByStatus?.find((s: any) => s._id === 'confirmed')?.count || 0}
                     </div>
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-neutral-550">Confirmado</span>
               </div>
               <div className="flex-1 flex flex-col items-center gap-4">
                  <span className="text-xl font-black text-neutral-400">{stats?.ordersByStatus?.find((s: any) => s._id === 'shipped')?.count || 0}</span>
                  <div className="w-full bg-neutral-100 border border-neutral-250 h-[30%] relative">
                     <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-black text-neutral-500">
                        {stats?.ordersByStatus?.find((s: any) => s._id === 'shipped')?.count || 0}
                     </div>
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-neutral-500">Enviado</span>
               </div>
            </div>
         </div>
      </div>

      {/* BOTTOM INTELLIGENCE SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         {/* Recent Orders Table */}
         <div className="lg:col-span-6 bg-white border border-neutral-200 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-neutral-200">
               <div className="flex items-center gap-3">
                  <History className="h-4 w-4 text-neutral-400" />
                  <h3 className="text-sm font-black uppercase tracking-widest text-neutral-900">Transacciones Recientes</h3>
               </div>
               <Link href="/admin/orders" className="text-[9px] font-bold uppercase tracking-widest text-neutral-500 hover:text-neutral-800 transition-colors">Ver Todo</Link>
            </div>
            <div className="space-y-1">
               {(stats?.recentOrders || []).slice(0, 5).map((order: any) => (
                  <div key={order.id} className="group flex items-center justify-between p-4 hover:bg-neutral-50/50 border-b border-neutral-100 last:border-0 transition-colors">
                     <div className="flex items-center gap-4">
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                        <div>
                           <p className="text-xs font-bold text-neutral-900">#{order.orderNumber}</p>
                           <p className="text-[9px] font-bold text-neutral-400 uppercase">{order.customerInfo?.firstName} {order.customerInfo?.lastName}</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-8">
                        <div className="text-right">
                           <p className="text-xs font-black text-neutral-900">{currencySymbol}{order.total?.toFixed(2)}</p>
                           <Badge className="bg-neutral-100 text-neutral-600 border border-neutral-200 rounded-none text-[7px] font-bold uppercase h-4">Pendiente</Badge>
                        </div>
                        <ChevronRight className="h-4 w-4 text-neutral-300 group-hover:text-neutral-700 transition-colors" />
                     </div>
                  </div>
               ))}
            </div>
         </div>

         {/* Inventory Health & Distribution */}
         <div className="lg:col-span-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-neutral-200 p-8 shadow-sm flex flex-col justify-between">
               <div>
                  <div className="flex items-center gap-3 mb-6">
                     <Boxes className="h-4 w-4 text-neutral-400" />
                     <h3 className="text-xs font-black uppercase tracking-widest text-neutral-900">Salud de Inventario</h3>
                  </div>
                  <div className="space-y-6">
                     <div>
                        <div className="flex justify-between text-[10px] font-black uppercase mb-2">
                           <span className="text-neutral-700">Stock Bajo</span>
                           <span className="text-amber-600 font-black">{stats?.lowStockCount || 0}</span>
                        </div>
                        <div className="h-1 bg-neutral-100">
                           <div className="h-full bg-amber-500 w-[20%]"></div>
                        </div>
                     </div>
                     <div>
                        <div className="flex justify-between text-[10px] font-black uppercase mb-2">
                           <span className="text-neutral-700">Sin Stock</span>
                           <span className="text-red-650 font-black">{stats?.outOfStockCount || 0}</span>
                        </div>
                        <div className="h-1 bg-neutral-100">
                           <div className="h-full bg-red-500 w-[5%]"></div>
                        </div>
                     </div>
                  </div>
               </div>
               <Button variant="outline" className="w-full border-neutral-200 hover:border-neutral-350 rounded-none h-12 text-[10px] font-bold uppercase tracking-widest mt-8 text-neutral-600 hover:bg-neutral-50">Analizar Inventario</Button>
            </div>

            <div className="bg-white border border-neutral-200 p-8 flex flex-col justify-between">
                 <div>
                    <div className="flex items-center gap-3 mb-8">
                       <PieChartIcon className="h-4 w-4 text-neutral-400" />
                       <h3 className="text-xs font-black uppercase tracking-widest text-neutral-900">Distribución de Categorías</h3>
                    </div>
                    <CategoryDistributionChart data={stats?.categoryDistribution || []} />
                 </div>
            </div>
         </div>
      </div>

      {/* KPI COMPARISON FOOTER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8">
         <div className="p-6 bg-white border border-neutral-200">
            <p className="text-[8px] font-black uppercase text-neutral-400 tracking-[0.2em] mb-4">Mes en Curso (Ventas)</p>
            <div className="flex items-center justify-between">
               <p className="text-2xl font-black text-neutral-900">{currencySymbol}{(stats?.totalRevenue * 0.4).toLocaleString()}</p>
               <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">40% DE META</span>
            </div>
         </div>
         <div className="p-6 bg-white border border-neutral-200">
            <p className="text-[8px] font-black uppercase text-neutral-400 tracking-[0.2em] mb-4">Nuevos Clientes (30D)</p>
            <div className="flex items-center justify-between">
               <p className="text-2xl font-black text-neutral-900">12</p>
               <div className="flex items-center gap-1 text-emerald-600">
                  <TrendingUp className="h-3 w-3" />
                  <span className="text-[10px] font-black">+4</span>
               </div>
            </div>
         </div>
         <div className="p-6 bg-white border border-neutral-200">
            <p className="text-[8px] font-black uppercase text-neutral-400 tracking-[0.2em] mb-4">Ticket Promedio (Trend)</p>
            <div className="flex items-center justify-between">
               <p className="text-2xl font-black text-neutral-900">{currencySymbol}{stats?.aov?.toFixed(0)}</p>
               <div className="flex items-center gap-1 text-neutral-500">
                  <TrendingUp className="h-3 w-3" />
                  <span className="text-[10px] font-black">Estable</span>
               </div>
            </div>
         </div>
      </div>
    </div>
  )
}