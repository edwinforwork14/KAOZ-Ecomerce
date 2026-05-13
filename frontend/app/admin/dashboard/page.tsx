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
           <Button onClick={loadData} variant="outline" className="rounded-none border-black h-12 font-black uppercase text-[10px] tracking-widest px-6 bg-white text-black hover:bg-black hover:text-white transition-all">
             <RefreshCw className="h-4 w-4 mr-2" /> Actualizar
           </Button>
        </div>
      </div>

      {/* URGENT ALERTS BAR */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
           <Zap className="h-3 w-3 text-kaosNeon fill-kaosNeon" />
           <h3 className="text-[10px] font-black uppercase tracking-widest text-black/60">Protocolos de Alerta</h3>
           <Badge className="bg-black text-white border-none rounded-none text-[8px]">ACTIVE</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           {/* Alerta: Pedidos Pendientes */}
           <div className="bg-white border border-black p-5 flex items-center justify-between group cursor-pointer hover:bg-black transition-all duration-300">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-black text-white group-hover:bg-kaosNeon group-hover:text-black transition-colors">
                    <Clock className="h-5 w-5" />
                 </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-tight text-black group-hover:text-white">{stats?.pendingOrders || 0} PENDIENTES</p>
                    <p className="text-[9px] font-bold text-black/30 group-hover:text-white/40 uppercase">REVISIÓN MANUAL REQUERIDA</p>
                  </div>
              </div>
              <Link href="/admin/orders" className="opacity-0 group-hover:opacity-100 transition-all"><ArrowRight className="h-5 w-5 text-kaosNeon" /></Link>
           </div>

           {/* Alerta: Sin Stock */}
           <div className="bg-white border border-black p-5 flex items-center justify-between group cursor-pointer hover:bg-black transition-all duration-300">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-black text-white group-hover:bg-red-600 transition-colors">
                    <XCircle className="h-5 w-5" />
                 </div>
                 <div>
                    <p className="text-sm font-black uppercase tracking-tight text-black group-hover:text-white">{stats?.outOfStockCount || 0} AGOTADOS</p>
                    <p className="text-[9px] font-bold text-black/30 group-hover:text-white/40 uppercase">VENTAS PAUSADAS</p>
                 </div>
              </div>
              <Link href="/admin/products" className="opacity-0 group-hover:opacity-100 transition-all"><ArrowRight className="h-5 w-5 text-red-600" /></Link>
           </div>

           {/* Alerta: Stock Bajo */}
           <div className="bg-white border border-black p-5 flex items-center justify-between group cursor-pointer hover:bg-black transition-all duration-300">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-black text-white group-hover:bg-amber-500 transition-colors">
                    <AlertCircle className="h-5 w-5" />
                 </div>
                 <div>
                    <p className="text-sm font-black uppercase tracking-tight text-black group-hover:text-white">{stats?.lowStockCount || 0} CRÍTICOS</p>
                    <p className="text-[9px] font-bold text-black/30 group-hover:text-white/40 uppercase">REPOSICIÓN INMEDIATA</p>
                 </div>
              </div>
              <Link href="/admin/products" className="opacity-0 group-hover:opacity-100 transition-all"><ArrowRight className="h-5 w-5 text-amber-500" /></Link>
           </div>
        </div>
      </div>

      {/* PRIMARY KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <div className="bg-white dark:bg-slate-950 border-2 border-black dark:border-white/20 p-8 relative overflow-hidden group">
           <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 mb-2">Ingresos Brutos</p>
              <div className="flex items-baseline gap-1">
                 <span className="text-xl font-black text-kaosNeon drop-shadow-sm">{currencySymbol}</span>
                 <h2 className="text-5xl font-black tracking-tighter text-black dark:text-white">{(stats?.totalRevenue || 0).toLocaleString()}</h2>
              </div>
              <div className="mt-4 flex items-center gap-2">
                 <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-none rounded-none text-[9px] font-black">+14.2%</Badge>
                 <span className="text-[8px] font-bold text-black/20 dark:text-white/20 uppercase tracking-widest">VS MES ANTERIOR</span>
              </div>
           </div>
           <DollarSign className="absolute -bottom-4 -right-4 h-32 w-32 text-black/[0.03] dark:text-white/[0.03] group-hover:text-kaosNeon/10 transition-colors" />
        </div>

        {/* Orders */}
        <div className="bg-white dark:bg-slate-950 border border-black/10 dark:border-white/10 p-8 group hover:border-black dark:hover:border-kaosNeon transition-all">
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 mb-2">Pedidos Realizados</p>
                 <h2 className="text-5xl font-black tracking-tighter text-black dark:text-white">{stats?.totalOrders || 0}</h2>
              </div>
              <div className="p-4 bg-kaosNeon text-black">
                 <ShoppingCart className="h-6 w-6" />
              </div>
           </div>
           <div className="mt-4 flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-black/60 dark:text-white/60">Últimos 30 días: {stats?.ordersLast30Days || 0}</span>
           </div>
        </div>

        {/* Customers */}
        <div className="bg-white dark:bg-slate-950 border border-black/10 dark:border-white/10 p-8 group hover:border-black dark:hover:border-kaosNeon transition-all">
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 mb-2">Base de Clientes</p>
                 <h2 className="text-5xl font-black tracking-tighter text-black dark:text-white">{stats?.totalCustomers || 0}</h2>
              </div>
              <div className="p-4 bg-black dark:bg-white dark:text-black text-white">
                 <Users className="h-6 w-6" />
              </div>
           </div>
           <div className="mt-4 flex items-center gap-2">
              <UserPlus className="h-3 w-3 text-kaosNeon" />
              <span className="text-[10px] font-black uppercase tracking-widest text-black/60 dark:text-white/60">5 nuevos registrados hoy</span>
           </div>
        </div>

        {/* Products */}
        <div className="bg-white dark:bg-slate-950 border border-black/10 dark:border-white/10 p-8 group hover:border-black dark:hover:border-kaosNeon transition-all">
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 mb-2">Catálogo Activo</p>
                 <h2 className="text-5xl font-black tracking-tighter text-black dark:text-white">{stats?.totalProducts || 0}</h2>
              </div>
              <div className="p-4 bg-slate-100 dark:bg-slate-800 text-black dark:text-white">
                 <Package className="h-6 w-6" />
              </div>
           </div>
           <div className="mt-4 flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-red-500">{stats?.outOfStockCount || 0} sin inventario</span>
           </div>
        </div>

        {/* Expenses (Gastos) - Added KPI */}
        <div className="bg-black text-white p-8 group hover:bg-kaosNeon hover:text-black transition-all">
           <div className="flex justify-between items-start">
              <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40 group-hover:text-black/40 mb-2">Gastos Operativos</p>
                  <h2 className="text-5xl font-black tracking-tighter">{currencySymbol}{(stats?.totalExpenses || 0).toLocaleString()}</h2>
              </div>
              <div className="p-4 bg-white/10 group-hover:bg-black/10 transition-colors">
                 <TrendingDown className="h-6 w-6" />
              </div>
           </div>
           <div className="mt-4 flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Balance Neto: {currencySymbol}{(stats?.totalRevenue - stats?.totalExpenses || 0).toLocaleString()}</span>
           </div>
        </div>
      </div>

      {/* SECONDARY METRICS BAR */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
         {[
           { label: 'Ticket Promedio', value: `${currencySymbol}${stats?.aov?.toFixed(0) || 0}`, icon: Target, color: 'text-pink-500' },
           { label: 'Tasa Conversión', value: `${(stats?.conversionRate || 0).toFixed(2)}%`, icon: Activity, color: 'text-blue-500' },
           { label: 'Margen Bruto', value: `${(((stats?.totalRevenue - stats?.totalExpenses) / Math.max(stats?.totalRevenue, 1)) * 100).toFixed(1)}%`, icon: Award, color: 'text-indigo-500' },
           { label: 'Retención', value: '12.5%', icon: UserCheck, color: 'text-emerald-500' },
           { label: 'Abandono Carrito', value: '64.2%', icon: ShoppingBasket, color: 'text-amber-500' },
         ].map((m, i) => (
           <div key={i} className="bg-white dark:bg-slate-950 border border-black/5 dark:border-white/5 p-4 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-default">
              <div className="flex items-center gap-2 mb-2">
                 <m.icon className={cn("h-3 w-3", m.color)} />
                 <span className="text-[8px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">{m.label}</span>
              </div>
              <p className="text-lg font-black text-black dark:text-white">{m.value}</p>
           </div>
         ))}
      </div>

      {/* MAIN ANALYTICS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         {/* CHART: REVENUE TREND */}
         <div className="lg:col-span-8 bg-white dark:bg-slate-950 border border-black/10 dark:border-white/10 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
               <div>
                  <h3 className="text-sm font-black uppercase tracking-widest mb-1 text-black dark:text-white">Análisis de Ingresos</h3>
                  <p className="text-[10px] font-bold text-black/40 dark:text-white/40 uppercase">Evolución de los últimos 6 meses</p>
               </div>
               <Button variant="ghost" size="sm" className="text-[9px] font-black uppercase tracking-widest border border-black/5 dark:border-white/5 dark:text-white">Ver histórico</Button>
            </div>
            <RevenueTrendChart data={stats?.revenueHistory || []} />
         </div>

         {/* CHART: ORDER PIPELINE (Podium style) */}
         <div className="lg:col-span-4 bg-black text-white p-8">
            <div className="flex items-center justify-between mb-12">
               <h3 className="text-sm font-black uppercase tracking-widest text-kaosNeon">Flujo de Pedidos</h3>
               <button className="text-[9px] font-black uppercase tracking-widest bg-white text-black px-3 py-1 hover:bg-kaosNeon hover:text-black transition-all">Gestionar</button>
            </div>
            
            <div className="relative h-[250px] flex items-end justify-between gap-2 px-4">
               {/* Podium Bars representing statuses */}
               <div className="flex-1 flex flex-col items-center gap-4">
                  <span className="text-xl font-black text-white/40">{stats?.ordersByStatus?.find((s: any) => s._id === 'pending')?.count || 0}</span>
                  <div className="w-full bg-amber-500 h-[60%] relative group">
                     <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-black text-amber-500">
                        {stats?.ordersByStatus?.find((s: any) => s._id === 'pending')?.count || 0}
                     </div>
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-white/40">Pendiente</span>
               </div>
               <div className="flex-1 flex flex-col items-center gap-4">
                  <span className="text-xl font-black text-kaosNeon">{stats?.ordersByStatus?.find((s: any) => s._id === 'confirmed')?.count || 0}</span>
                  <div className="w-full bg-blue-500 h-[90%] relative">
                     <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-black text-blue-500">
                        {stats?.ordersByStatus?.find((s: any) => s._id === 'confirmed')?.count || 0}
                     </div>
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-white/40">Confirmado</span>
               </div>
               <div className="flex-1 flex flex-col items-center gap-4">
                  <span className="text-xl font-black text-white/40">{stats?.ordersByStatus?.find((s: any) => s._id === 'shipped')?.count || 0}</span>
                  <div className="w-full bg-slate-700 h-[30%] relative">
                     <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-black text-slate-500">
                        {stats?.ordersByStatus?.find((s: any) => s._id === 'shipped')?.count || 0}
                     </div>
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-white/40">Enviado</span>
               </div>
            </div>
         </div>
      </div>

      {/* BOTTOM INTELLIGENCE SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         {/* Recent Orders Table */}
         <div className="lg:col-span-6 bg-white dark:bg-slate-950 border border-black/10 dark:border-white/10 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-black/5 dark:border-white/5">
               <div className="flex items-center gap-3">
                  <History className="h-4 w-4 text-kaosNeon" />
                  <h3 className="text-sm font-black uppercase tracking-widest text-black dark:text-white">Transacciones Recientes</h3>
               </div>
               <Link href="/admin/orders" className="text-[9px] font-black uppercase underline underline-offset-4 tracking-widest text-black dark:text-white">Ver Todo</Link>
            </div>
            <div className="space-y-1">
               {(stats?.recentOrders || []).slice(0, 5).map((order: any) => (
                  <div key={order.id} className="group flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-900 border-b border-black/5 dark:border-white/5 last:border-0 transition-colors">
                     <div className="flex items-center gap-4">
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                        <div>
                           <p className="text-xs font-black text-black dark:text-white">#{order.orderNumber}</p>
                           <p className="text-[9px] font-bold text-black/40 dark:text-white/40 uppercase">{order.customerInfo?.firstName} {order.customerInfo?.lastName}</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-8">
                        <div className="text-right">
                           <p className="text-xs font-black text-black dark:text-white">{currencySymbol}{order.total?.toFixed(2)}</p>
                           <Badge className="bg-slate-100 dark:bg-slate-800 text-black dark:text-white border-none rounded-none text-[7px] font-black uppercase h-4">Pendiente</Badge>
                        </div>
                        <ChevronRight className="h-4 w-4 text-black/10 dark:text-white/10 group-hover:text-black dark:group-hover:text-white transition-colors" />
                     </div>
                  </div>
               ))}
            </div>
         </div>

         {/* Inventory Health & Distribution */}
         <div className="lg:col-span-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-950 border border-black/10 dark:border-white/10 p-8 shadow-sm flex flex-col justify-between">
               <div>
                  <div className="flex items-center gap-3 mb-6">
                     <Boxes className="h-4 w-4 text-kaosNeon" />
                     <h3 className="text-xs font-black uppercase tracking-widest text-black dark:text-white">Salud de Inventario</h3>
                  </div>
                  <div className="space-y-6">
                     <div>
                        <div className="flex justify-between text-[10px] font-black uppercase mb-2">
                           <span className="text-black dark:text-white">Stock Bajo</span>
                           <span className="text-amber-600 font-black">{stats?.lowStockCount || 0}</span>
                        </div>
                        <div className="h-1 bg-slate-100 dark:bg-slate-800">
                           <div className="h-full bg-amber-500 w-[20%]"></div>
                        </div>
                     </div>
                     <div>
                        <div className="flex justify-between text-[10px] font-black uppercase mb-2">
                           <span className="text-black dark:text-white">Sin Stock</span>
                           <span className="text-red-600 font-black">{stats?.outOfStockCount || 0}</span>
                        </div>
                        <div className="h-1 bg-slate-100 dark:bg-slate-800">
                           <div className="h-full bg-red-500 w-[5%]"></div>
                        </div>
                     </div>
                  </div>
               </div>
               <Button variant="outline" className="w-full border-black dark:border-white/20 rounded-none h-12 text-[10px] font-black uppercase tracking-widest mt-8 dark:text-white">Analizar Inventario</Button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 border border-black/10 dark:border-white/10 p-8 flex flex-col justify-between">
                <div>
                   <div className="flex items-center gap-3 mb-8">
                      <PieChartIcon className="h-4 w-4 text-kaosNeon" />
                      <h3 className="text-xs font-black uppercase tracking-widest text-black/60 dark:text-white/60">Distribución de Categorías</h3>
                   </div>
                   <CategoryDistributionChart data={stats?.categoryDistribution || []} />
                </div>
            </div>
         </div>
      </div>

      {/* KPI COMPARISON FOOTER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8">
         <div className="p-6 bg-slate-50 dark:bg-slate-900 border border-black/5 dark:border-white/5">
            <p className="text-[8px] font-black uppercase text-black/40 dark:text-white/40 tracking-[0.2em] mb-4">Mes en Curso (Ventas)</p>
            <div className="flex items-center justify-between">
               <p className="text-2xl font-black text-black dark:text-white">{currencySymbol}{(stats?.totalRevenue * 0.4).toLocaleString()}</p>
               <span className="text-[10px] font-bold text-black/20 dark:text-white/20 uppercase tracking-widest">40% DE META</span>
            </div>
         </div>
         <div className="p-6 bg-slate-50 dark:bg-slate-900 border border-black/5 dark:border-white/5">
            <p className="text-[8px] font-black uppercase text-black/40 dark:text-white/40 tracking-[0.2em] mb-4">Nuevos Clientes (30D)</p>
            <div className="flex items-center justify-between">
               <p className="text-2xl font-black text-black dark:text-white">12</p>
               <div className="flex items-center gap-1 text-green-500">
                  <TrendingUp className="h-3 w-3" />
                  <span className="text-[10px] font-black">+4</span>
               </div>
            </div>
         </div>
         <div className="p-6 bg-slate-50 dark:bg-slate-900 border border-black/5 dark:border-white/5">
            <p className="text-[8px] font-black uppercase text-black/40 dark:text-white/40 tracking-[0.2em] mb-4">Ticket Promedio (Trend)</p>
            <div className="flex items-center justify-between">
               <p className="text-2xl font-black text-black dark:text-white">{currencySymbol}{stats?.aov?.toFixed(0)}</p>
               <div className="flex items-center gap-1 text-green-500">
                  <TrendingUp className="h-3 w-3" />
                  <span className="text-[10px] font-black">Estable</span>
               </div>
            </div>
         </div>
      </div>
    </div>
  )
}