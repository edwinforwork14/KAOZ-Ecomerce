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
  TrendingDown, ShoppingBasket, Activity
} from "lucide-react"
import { api } from "@/lib/api"
import { brandConfig } from "@/lib/config"
import Link from "next/link"
import { CategoryDistributionChart, PaymentMethodsChart, MiniTrendChart } from "@/components/admin/DashboardCharts"

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

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
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
          <p className="text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">Sincronizando Inteligencia...</p>
        </div>
      </div>
    )
  }

  const currencySymbol = settings?.currency?.symbol || '$'

  return (
    <div className="p-4 md:p-8 space-y-6 bg-transparent min-h-screen">
      {/* Upper Header: Real-time Status */}
      <div className="flex items-center justify-between border-b border-black/10 pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-kaosNeon opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-kaosNeon"></span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-black/60">Sistema Activo • Tiempo Real</span>
        </div>
        <div className="text-[10px] font-black uppercase tracking-widest flex items-center gap-4">
          <span className="text-black/60">Última Refresca: {new Date().toLocaleTimeString()}</span>
          <button onClick={loadData} className="hover:text-kaosNeon transition-colors flex items-center gap-1">
            <RefreshCw className="h-3 w-3" />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Quick Stats (Moved to top) */}
      <div className="flex gap-8 pb-2">
         <div>
           <p className="text-[9px] font-black uppercase text-black/60 tracking-widest">Total Productos</p>
           <p className="text-xl font-black">{stats?.totalProducts}</p>
         </div>
         <div>
           <p className="text-[9px] font-black uppercase text-black/60 tracking-widest">Total Clientes</p>
           <p className="text-xl font-black">{stats?.totalCustomers}</p>
         </div>
         <div>
           <p className="text-[9px] font-black uppercase text-black/60 tracking-widest">Pedidos Hoy</p>
           <p className="text-xl font-black text-kaosNeon bg-black px-2">{stats?.ordersLast30Days / 30 > 0 ? (stats?.ordersLast30Days / 30).toFixed(1) : 0}</p>
         </div>
      </div>

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI: Revenue */}
        <div className="bg-black text-white p-6 relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Ingresos Totales</span>
              <DollarSign className="h-4 w-4 text-kaosNeon" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-black text-kaosNeon">{currencySymbol}</span>
              <h2 className="text-4xl font-black tracking-tighter">{(stats?.totalRevenue || 0).toLocaleString()}</h2>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-[10px] font-black text-green-400">+12.5%</span>
              <div className="h-1 flex-1 bg-white/10">
                <div className="h-full bg-kaosNeon w-[70%]"></div>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp className="h-32 w-32 -mr-16 -mt-8" />
          </div>
        </div>

        {/* KPI: Conversion */}
        <div className="bg-white border border-black/10 p-6 hover:border-black transition-all group">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-black/60 group-hover:text-black">Tasa Conversión</span>
            <Activity className="h-4 w-4 text-black group-hover:text-kaosNeon" />
          </div>
          <div className="flex items-baseline gap-1">
            <h2 className="text-4xl font-black tracking-tighter">{(stats?.conversionRate || 0).toFixed(2)}</h2>
            <span className="text-sm font-black group-hover:text-kaosNeon">%</span>
          </div>
          <div className="mt-4 flex items-center gap-2">
             <span className="text-[10px] font-black uppercase tracking-widest">Global Shop</span>
             <div className="h-[1px] flex-1 bg-black/10 group-hover:bg-black/20"></div>
          </div>
        </div>

        {/* KPI: Active Carts */}
        <div className="bg-kaosNeon text-black border border-black/10 p-6 hover:scale-[1.02] transition-transform cursor-pointer shadow-[0_10px_20px_rgba(217,255,0,0.1)]">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-black/60">Carritos Activos</span>
            <ShoppingBasket className="h-4 w-4" />
          </div>
          <div className="flex items-baseline gap-1">
            <h2 className="text-4xl font-black tracking-tighter">{stats?.activeCarts || 0}</h2>
          </div>
          <div className="mt-4 flex items-center gap-1">
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} className={`h-1 flex-1 bg-black ${i <= (stats?.activeCarts || 0) / 10 ? 'opacity-100' : 'opacity-10'}`}></div>
            ))}
          </div>
        </div>

        {/* KPI: AOV */}
        <div className="bg-white border border-black/10 p-6 hover:border-black transition-colors">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-black/60">Ticket Promedio</span>
            <Target className="h-4 w-4" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-black text-black/40">{currencySymbol}</span>
            <h2 className="text-4xl font-black tracking-tighter">{(stats?.aov || 0).toFixed(0)}</h2>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <TrendingUp className="h-3 w-3 text-green-500" />
            <span className="text-[9px] font-black uppercase tracking-widest">Creciendo +2%</span>
          </div>
        </div>
      </div>

      {/* Intelligence Bento Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-12 gap-4">
        
        {/* Top Sellers (Trend Analysis) */}
        <div className="lg:col-span-8 bg-white border border-black/10 p-6 space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-black/5 pb-4">
            <h3 className="text-sm font-black uppercase tracking-widest">Ranking de Ventas (Top 10)</h3>
            <Link href="/admin/products" className="text-[9px] font-black uppercase tracking-widest underline decoration-2 decoration-kaosNeon underline-offset-4">Catálogo Completo</Link>
          </div>
          <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
            {(stats?.topProducts || []).map((p: any, idx: number) => (
              <div key={p.id} className="flex items-center gap-4 group cursor-default">
                <span className="text-xs font-black text-black/40 group-hover:text-kaosNeon transition-colors">{idx < 9 ? `0${idx + 1}` : idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black uppercase truncate">{p.name}</p>
                  <p className="text-[9px] font-bold text-black/60 uppercase tracking-widest">{p.totalQuantity} Unidades Vendidas</p>
                </div>
                <div className="hidden md:block">
                  <MiniTrendChart data={p.trend} color={idx === 0 ? "#D9FF00" : "#000"} />
                </div>
                <div className="text-right w-24">
                  <p className="text-xs font-black">{currencySymbol}{p.totalRevenue?.toLocaleString()}</p>
                </div>
                <button className="p-2 border border-transparent hover:border-black transition-all">
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Alerts (Quick Actions) */}
        <div className="lg:col-span-4 bg-red-500 text-white p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 animate-pulse" />
              <h3 className="text-sm font-black uppercase tracking-widest">Stock Crítico</h3>
            </div>
            <span className="bg-white text-red-600 px-1.5 py-0.5 text-[10px] font-black">{stats?.lowStockCount + stats?.outOfStockCount}</span>
          </div>
          <div className="space-y-4">
            {(stats?.lowStockProducts || []).map((p: any) => (
              <div key={p.id} className="p-3 bg-white/10 flex items-center justify-between border border-white/5">
                <div>
                  <p className="text-[10px] font-black uppercase truncate w-32">{p.name}</p>
                  <p className="text-[9px] font-bold text-white/60 uppercase">Solo {p.stock} unidades</p>
                </div>
                <Link href={`/admin/products?id=${p.id}`} className="bg-white text-red-600 p-2 hover:bg-kaosNeon hover:text-black transition-colors">
                  <RefreshCw className="h-3 w-3" />
                </Link>
              </div>
            ))}
            {(stats?.lowStockProducts || []).length === 0 && (
              <div className="py-8 text-center border border-dashed border-white/20">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="text-[10px] font-black uppercase opacity-60">Inventario Saludable</p>
              </div>
            )}
          </div>
          <Button variant="outline" className="w-full border-white text-white hover:bg-white hover:text-red-600 font-black uppercase tracking-widest h-12 text-[10px]">
            Reponer Todo el Inventario
          </Button>
        </div>

        {/* CRM VIP Panel */}
        <div className="lg:col-span-4 bg-white border border-black/10 p-6 space-y-6 shadow-sm">
          <div className="flex items-center gap-2 border-b border-black/5 pb-4">
             <UserCheck className="h-4 w-4 text-kaosNeon" />
             <h3 className="text-sm font-black uppercase tracking-widest">Clientes VIP (CLV)</h3>
          </div>
          <div className="space-y-4">
            {(stats?.vipCustomers || []).map((u: any) => (
              <div key={u.id} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-black text-white flex items-center justify-center text-[10px] font-black">
                  {u.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase truncate">{u.name}</p>
                  <div className="flex items-center gap-2 text-[8px] font-bold text-black/60 uppercase tracking-tighter">
                    <span>{u.orderCount} Pedidos</span>
                    <span>•</span>
                    <span>T.A {currencySymbol}{u.avgTicket.toFixed(0)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-kaosNeon bg-black px-2 py-1">{currencySymbol}{u.totalSpent.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Distributions (Category & Payment) */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
           {/* Categories */}
           <div className="bg-white border border-black/10 p-6 shadow-sm">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 flex items-center justify-between">
                Ventas por Categoría
                <BarChart3 className="h-3 w-3" />
              </h3>
              <CategoryDistributionChart data={stats?.categoryDistribution || []} />
           </div>
           
           {/* Payment Methods */}
           <div className="bg-white border border-black/10 p-6 shadow-sm">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 flex items-center justify-between">
                Métodos de Pago
                <CreditCard className="h-3 w-3" />
              </h3>
              <PaymentMethodsChart data={stats?.paymentMethods || []} />
           </div>
        </div>

      </div>

      {/* Footer Meta */}
      <div className="pt-8 border-t border-black/5 flex flex-col md:flex-row justify-end gap-4">
        <div className="flex items-center gap-4">
           <Link href="/admin/orders" className="bg-black text-white px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-kaosNeon hover:text-black transition-colors flex items-center gap-2">
             Gestionar Todos los Pedidos
             <ArrowRight className="h-3 w-3" />
           </Link>
        </div>
      </div>
    </div>
  )
}