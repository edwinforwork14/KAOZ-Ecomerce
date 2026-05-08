"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  ShoppingCart,
  TrendingDown,
  XCircle,
  Package,
  AlertTriangle,
  Loader2,
  RefreshCw,
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  ArrowUpRight,
  Percent,
  Eye,
} from "lucide-react"
import { api } from "@/lib/api"
import { brandConfig } from "@/lib/config"

type AnyObj = any

const CRITICAL_STOCK_THRESHOLD = 5

function toNumberSafe(v: any, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function formatMoney(value: number, currencySymbol: string) {
  return `${currencySymbol}${value.toFixed(2)}`
}

export default function AnalyticsPage() {
  const [inventory, setInventory] = useState<AnyObj>(null)
  const [stats, setStats] = useState<AnyObj>(null)
  const [settings, setSettings] = useState<AnyObj>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadData = async () => {
    try {
      const [inventoryResult, statsResult, settingsResult] = await Promise.all([
        api.getInventoryReport(),
        api.getDashboardStats(),
        api.getSettings(),
      ])

      if (inventoryResult?.success) setInventory(inventoryResult.inventory)
      if (statsResult?.success) setStats(statsResult.stats)
      if (settingsResult?.success) setSettings(settingsResult.settings)
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const currencySymbol = settings?.currency?.symbol || "$"

  const products = inventory?.products || []

  const kpis = useMemo(() => {
    const totalProducts = toNumberSafe(inventory?.totalProducts, products.length)
    const totalStock = products.reduce(
      (sum: number, p: AnyObj) => sum + toNumberSafe(p.totalStock, 0),
      0
    )
    const avgStock = totalProducts > 0 ? totalStock / totalProducts : 0

    const outOfStockCount = products.filter((p: AnyObj) => toNumberSafe(p.totalStock, 0) <= 0).length
    const criticalStockProducts = products.filter(
      (p: AnyObj) => {
        const s = toNumberSafe(p.totalStock, 0)
        return s > 0 && s < CRITICAL_STOCK_THRESHOLD
      }
    )
    const criticalStockCount = criticalStockProducts.length

    const sortedByStock = [...products].sort(
      (a: AnyObj, b: AnyObj) => toNumberSafe(b.totalStock, 0) - toNumberSafe(a.totalStock, 0)
    )
    const maxStockProduct = sortedByStock[0] || null
    const minStockProduct = [...products]
      .sort((a: AnyObj, b: AnyObj) => toNumberSafe(a.totalStock, 0) - toNumberSafe(b.totalStock, 0))[0] || null

    const prices = products
      .map((p: AnyObj) => toNumberSafe(p.price, 0))
      .filter((n: number) => n > 0)

    const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0
    const maxPrice = prices.length ? Math.max(...prices) : 0
    const minPrice = prices.length ? Math.min(...prices) : 0

    const discountProducts = products.filter((p: AnyObj) => p?.priceConfig?.mode === "discount")
    const fixedProducts = products.filter((p: AnyObj) => p?.priceConfig?.mode === "fixed")

    const discountPct = totalProducts ? (discountProducts.length / totalProducts) * 100 : 0
    const fixedPct = totalProducts ? (fixedProducts.length / totalProducts) * 100 : 0

    const maxDiscountApplied = discountProducts.reduce((m: number, p: AnyObj) => {
      const pct = toNumberSafe(p?.priceConfig?.percentage, 0)
      return Math.max(m, pct)
    }, 0)

    // Producto más vendido (si backend lo trae)
    const topProduct = stats?.topProducts?.[0] || null
    const bestSellerLabel = topProduct
      ? `${topProduct.name || "Producto"}`
      : "Sin datos (aún no hay ventas)"

    // Valor total del inventario (precio actual * stock total)
    const inventoryValue = products.reduce((sum: number, p: AnyObj) => {
      const price = toNumberSafe(p.price, 0)
      const stock = toNumberSafe(p.totalStock, 0)
      return sum + price * stock
    }, 0)

    // Valor del inventario por prenda / talla (y color)
    type SizeRow = {
      key: string
      productId: string
      productName: string
      brand?: string
      color?: string
      colorHex?: string
      size: string
      units: number
      unitPrice: number
      totalValue: number
    }

    const rowsMap = new Map<string, SizeRow>()

    for (const p of products) {
      const unitPrice = toNumberSafe(p.price, 0)
      const variants = p.variants || []
      for (const v of variants) {
        const sizes = v.sizes || []
        for (const s of sizes) {
          const size = String(s.size || "-")
          const units = toNumberSafe(s.stock, 0)
          const key = `${p.id}::${v.color || ""}::${size}`

          const prev = rowsMap.get(key)
          if (prev) {
            prev.units += units
            prev.totalValue += units * unitPrice
          } else {
            rowsMap.set(key, {
              key,
              productId: p.id,
              productName: p.name,
              brand: p.brand,
              color: v.color,
              colorHex: v.colorHex,
              size,
              units,
              unitPrice,
              totalValue: units * unitPrice,
            })
          }
        }
      }
    }

    const inventoryByGarmentSize = Array.from(rowsMap.values()).sort((a, b) => b.totalValue - a.totalValue)

    return {
      totalProducts,
      totalStock,
      avgStock,
      outOfStockCount,
      criticalStockCount,
      criticalStockProducts,
      maxStockProduct,
      minStockProduct,
      avgPrice,
      maxPrice,
      minPrice,
      discountPct,
      fixedPct,
      maxDiscountApplied,
      bestSellerLabel,
      inventoryValue,
      inventoryByGarmentSize,
    }
  }, [inventory, products, stats])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Analizando Datos de Inteligencia...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8 bg-[#fafafa] min-h-screen">
      {/* Industrial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-black pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-black animate-pulse"></div>
            <span className="industrial-stat-label text-black">Inteligencia de Negocio</span>
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">
            Análisis
          </h1>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh} 
          disabled={refreshing} 
          className="rounded-none border-black h-14 px-10 font-black uppercase text-xs tracking-widest hover:bg-black hover:text-white transition-all"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Sincronizar Logs
        </Button>
      </div>

      <Tabs defaultValue="resumen" className="space-y-8">
        <TabsList className="grid w-full grid-cols-4 rounded-none border border-black p-0 bg-white h-16">
          <TabsTrigger value="resumen" className="rounded-none border-r border-black data-[state=active]:bg-black data-[state=active]:text-white font-black uppercase text-[10px] tracking-widest h-full">
            <BarChart3 className="h-4 w-4 mr-2" /> RESUMEN EJECUTIVO
          </TabsTrigger>
          <TabsTrigger value="inventario" className="rounded-none border-r border-black data-[state=active]:bg-black data-[state=active]:text-white font-black uppercase text-[10px] tracking-widest h-full">
            <Package className="h-4 w-4 mr-2" /> CONTROL DE STOCK
          </TabsTrigger>
          <TabsTrigger value="precios" className="rounded-none border-r border-black data-[state=active]:bg-black data-[state=active]:text-white font-black uppercase text-[10px] tracking-widest h-full">
            <DollarSign className="h-4 w-4 mr-2" /> ESTRATEGIA PRECIOS
          </TabsTrigger>
          <TabsTrigger value="tallas" className="rounded-none data-[state=active]:bg-black data-[state=active]:text-white font-black uppercase text-[10px] tracking-widest h-full">
            <Eye className="h-4 w-4 mr-2" /> DESGLOSE TÉCNICO
          </TabsTrigger>
        </TabsList>

        {/* TAB: RESUMEN */}
        <TabsContent value="resumen" className="m-0 space-y-12">
          {/* Main Industrial Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 border border-black divide-x divide-black bg-white">
            <div className="p-8">
              <p className="industrial-stat-label text-gray-400">Items en Catálogo</p>
              <div className="flex items-baseline gap-2">
                <span className="industrial-stat-value">{kpis.totalProducts}</span>
                <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Activos</span>
              </div>
            </div>
            <div className="p-8 bg-black text-white">
              <p className="industrial-stat-label text-gray-400">Valor de Almacén</p>
              <div className="flex items-baseline gap-2">
                <span className="industrial-stat-value text-white">{currencySymbol}{kpis.inventoryValue.toLocaleString()}</span>
              </div>
            </div>
            <div className="p-8">
              <p className="industrial-stat-label text-gray-400">Unidades Totales</p>
              <div className="flex items-baseline gap-2">
                <span className="industrial-stat-value">{kpis.totalStock.toLocaleString()}</span>
              </div>
            </div>
            <div className="p-8 border-l-4 border-l-red-600">
              <p className="industrial-stat-label text-red-600">Puntos de Falla</p>
              <div className="flex items-baseline gap-2">
                <span className="industrial-stat-value text-red-600">{kpis.outOfStockCount + kpis.criticalStockCount}</span>
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Alertas</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="industrial-card p-8 bg-white border border-black">
              <p className="industrial-stat-label mb-2">Ingresos Acumulados</p>
              <p className="text-4xl font-black uppercase tracking-tighter">
                {currencySymbol}{toNumberSafe(stats?.totalRevenue, 0).toFixed(0)}
              </p>
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Crecimiento Orgánico</span>
              </div>
            </div>

            <div className="industrial-card p-8 bg-white border border-black">
              <p className="industrial-stat-label mb-2">Volumen de Pedidos</p>
              <p className="text-4xl font-black uppercase tracking-tighter">
                {toNumberSafe(stats?.totalOrders, 0)}
              </p>
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-black" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Transacciones Confirmadas</span>
              </div>
            </div>

            <div className="industrial-card p-8 bg-black text-white border border-black">
              <p className="industrial-stat-label text-gray-400 mb-2">Base de Clientes</p>
              <p className="text-4xl font-black uppercase tracking-tighter text-white">
                {toNumberSafe(stats?.totalCustomers, 0)}
              </p>
              <div className="mt-4 pt-4 border-t border-gray-800 flex items-center gap-2 text-gray-400">
                <Users className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Perfiles Registrados</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-6 border border-black bg-white">
              <p className="industrial-stat-label mb-1">Stock Promedio</p>
              <p className="text-2xl font-black">{kpis.avgStock.toFixed(1)} <span className="text-xs text-gray-400">UDS</span></p>
            </div>
            <div className="p-6 border border-black bg-white">
              <p className="industrial-stat-label mb-1">Ticket Promedio</p>
              <p className="text-2xl font-black">{currencySymbol}{(toNumberSafe(stats?.totalRevenue, 0) / Math.max(toNumberSafe(stats?.totalOrders, 1), 1)).toFixed(0)}</p>
            </div>
            <div className="p-6 border border-black bg-white md:col-span-2">
              <p className="industrial-stat-label mb-1">Producto Estrella</p>
              <p className="text-xl font-black uppercase truncate">{kpis.bestSellerLabel}</p>
            </div>
          </div>
        </TabsContent>

        {/* TAB: INVENTARIO */}
        <TabsContent value="inventario" className="m-0 space-y-12">
          {/* Critical Alerts Bar */}
          {kpis.criticalStockCount > 0 && (
            <div className="bg-red-600 text-white p-6 border border-black flex items-center justify-between shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)]">
              <div className="flex items-center gap-4">
                <AlertTriangle className="h-8 w-8 animate-bounce" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Alerta de Suministro</p>
                  <p className="text-2xl font-black uppercase tracking-tighter">
                    {kpis.criticalStockCount} RAMAS EN ESTADO CRÍTICO
                  </p>
                </div>
              </div>
              <div className="hidden md:block text-right">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Umbral de Falla</p>
                <p className="text-xl font-black uppercase tracking-tighter">{`< ${CRITICAL_STOCK_THRESHOLD} UNIDADES`}</p>
              </div>
            </div>
          )}

          {/* Industrial Inventory Manifest */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b-2 border-black pb-4">
              <h3 className="text-2xl font-black uppercase tracking-tighter">Manifiesto de Existencias</h3>
              <span className="text-[10px] font-black uppercase tracking-widest bg-black text-white px-3 py-1">TOTAL: {products.length} SKUs</span>
            </div>

            <div className="space-y-4">
              {products.map((product: AnyObj) => (
                <div key={product.id} className="industrial-card p-6 bg-white border border-black flex flex-col md:flex-row gap-6 items-start md:items-center group transition-all hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xl font-black uppercase tracking-tighter truncate">{product.name}</span>
                      {product.totalStock <= 0 ? (
                        <span className="text-[9px] font-black uppercase tracking-widest bg-red-600 text-white px-2 py-0.5">AGOTADO</span>
                      ) : product.totalStock < CRITICAL_STOCK_THRESHOLD ? (
                        <span className="text-[9px] font-black uppercase tracking-widest bg-amber-500 text-white px-2 py-0.5">CRÍTICO</span>
                      ) : (
                        <span className="text-[9px] font-black uppercase tracking-widest bg-green-600 text-white px-2 py-0.5">OPERATIVO</span>
                      )}
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                      {product.brand} // {product.category}
                    </p>
                  </div>

                  <div className="flex items-center gap-8 w-full md:w-auto">
                    <div className="text-right">
                      <p className="industrial-stat-label">Precio Unitario</p>
                      <p className="text-xl font-black">{currencySymbol}{toNumberSafe(product.price, 0).toFixed(0)}</p>
                    </div>
                    <div className={`p-4 border border-black min-w-[100px] text-center ${
                      product.totalStock <= 0 ? "bg-red-50" : product.totalStock < CRITICAL_STOCK_THRESHOLD ? "bg-amber-50" : "bg-white"
                    }`}>
                      <p className="industrial-stat-label">Unidades</p>
                      <p className={`text-2xl font-black ${
                        product.totalStock <= 0 ? "text-red-600" : product.totalStock < CRITICAL_STOCK_THRESHOLD ? "text-amber-600" : "text-black"
                      }`}>
                        {toNumberSafe(product.totalStock, 0)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* TAB: PRECIOS */}
        <TabsContent value="precios" className="m-0 space-y-12">
          {/* Prices KPI Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 border border-black divide-x divide-black bg-white">
            <div className="p-8">
              <p className="industrial-stat-label text-gray-400">Media de Mercado</p>
              <span className="industrial-stat-value">{formatMoney(kpis.avgPrice, currencySymbol)}</span>
            </div>
            <div className="p-8">
              <p className="industrial-stat-label text-gray-400">Techo (Máx)</p>
              <span className="industrial-stat-value">{formatMoney(kpis.maxPrice, currencySymbol)}</span>
            </div>
            <div className="p-8">
              <p className="industrial-stat-label text-gray-400">Piso (Mín)</p>
              <span className="industrial-stat-value">{formatMoney(kpis.minPrice, currencySymbol)}</span>
            </div>
            <div className="p-8 bg-black text-white">
              <p className="industrial-stat-label text-gray-400">Índice Promo</p>
              <span className="industrial-stat-value text-white">{kpis.discountPct.toFixed(0)}%</span>
            </div>
          </div>

          {/* Pricing Table */}
          <div className="border border-black bg-white">
            <div className="p-6 border-b border-black bg-gray-50 flex justify-between items-center">
              <h3 className="text-sm font-black uppercase tracking-widest">Matriz de Valorización</h3>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-black"></div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Fixed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 border border-black"></div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Dynamic</span>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-black">
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Producto</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Base</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actual</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Config</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Variación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map((p: AnyObj) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-6">
                        <p className="text-xs font-black uppercase tracking-tight">{p.name}</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">{p.brand}</p>
                      </td>
                      <td className="p-6 text-right font-bold text-gray-400 text-xs">
                        {p.originalPrice ? formatMoney(toNumberSafe(p.originalPrice, 0), currencySymbol) : "—"}
                      </td>
                      <td className="p-6 text-right font-black text-sm">
                        {formatMoney(toNumberSafe(p.price, 0), currencySymbol)}
                      </td>
                      <td className="p-6 text-center">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 border ${
                          p?.priceConfig?.mode === "fixed" ? "border-black bg-black text-white" : "border-black text-black"
                        }`}>
                          {p?.priceConfig?.mode || "fixed"}
                        </span>
                      </td>
                      <td className="p-6 text-right">
                        {p?.priceConfig?.mode !== "fixed" ? (
                          <span className={`text-[10px] font-black ${
                            p?.priceConfig?.mode === "markup" ? "text-green-600" : "text-red-600"
                          }`}>
                            {p?.priceConfig?.mode === "markup" ? "+" : "-"}{toNumberSafe(p?.priceConfig?.percentage, 0)}%
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* TAB: PRENDA / TALLA */}
        <TabsContent value="tallas" className="m-0 space-y-12">
          <div className="border border-black bg-white">
            <div className="p-6 border-b border-black bg-gray-50 flex justify-between items-center">
              <h3 className="text-sm font-black uppercase tracking-widest">Desglose de Inventario Crítico</h3>
              <span className="text-[10px] font-black uppercase tracking-widest bg-black text-white px-3 py-1">TOTAL REGISTROS: {kpis.inventoryByGarmentSize.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-black">
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Prenda / Especificación</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Color</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Talla</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Existencia</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Valorización</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {kpis.inventoryByGarmentSize.map((row: any) => (
                    <tr key={row.key} className="hover:bg-gray-50 transition-colors">
                      <td className="p-6">
                        <p className="text-xs font-black uppercase tracking-tight">{row.productName}</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">{row.brand}</p>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 border border-black" 
                            style={{ backgroundColor: row.colorHex || "#ccc" }}
                          />
                          <span className="text-[10px] font-black uppercase tracking-widest">{row.color || "—"}</span>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <span className="text-xs font-black">{row.size}</span>
                      </td>
                      <td className="p-6 text-right">
                        <span className={`text-sm font-black ${row.units < 5 ? "text-red-600" : "text-black"}`}>
                          {row.units}
                        </span>
                      </td>
                      <td className="p-6 text-right font-black text-xs">
                        {currencySymbol}{row.totalValue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
