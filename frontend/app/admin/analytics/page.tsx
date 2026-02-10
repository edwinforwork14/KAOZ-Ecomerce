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
          <p className="text-gray-500">Cargando análisis...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 space-y-8 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Análisis e Inventario
          </h1>
          <p className="text-gray-500 mt-1">Vista detallada del rendimiento y stock de {brandConfig.name}</p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* Tabs KPI */}
      <Tabs defaultValue="resumen" className="space-y-6">
        <TabsList className="bg-white shadow-sm">
          <TabsTrigger value="resumen" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Resumen KPI
          </TabsTrigger>
          <TabsTrigger value="inventario" className="gap-2">
            <Package className="h-4 w-4" />
            Inventario
          </TabsTrigger>
          <TabsTrigger value="precios" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Precios
          </TabsTrigger>
          <TabsTrigger value="tallas" className="gap-2">
            <Eye className="h-4 w-4" />
            Prenda / Talla
          </TabsTrigger>
        </TabsList>

        {/* TAB: RESUMEN */}
        <TabsContent value="resumen" className="space-y-6">
          {/* Main Stats (tu bloque original, usando kpis) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-blue-50 to-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Productos</p>
                    <p className="text-3xl font-bold text-blue-600">{kpis.totalProducts}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <ArrowUpRight className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600">Activos</span>
                    </div>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Package className="h-7 w-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-amber-50 to-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Stock Crítico</p>
                    <p className="text-3xl font-bold text-amber-600">{kpis.criticalStockCount}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <span className="text-sm text-amber-600">{`< ${CRITICAL_STOCK_THRESHOLD} unidades`}</span>
                    </div>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <TrendingDown className="h-7 w-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-red-50 to-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Sin Stock</p>
                    <p className="text-3xl font-bold text-red-600">{kpis.outOfStockCount}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-red-600">Crítico</span>
                    </div>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <XCircle className="h-7 w-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-green-50 to-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Stock Total</p>
                    <p className="text-3xl font-bold text-green-600">{kpis.totalStock.toLocaleString()}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600">Unidades disponibles</span>
                    </div>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <BarChart3 className="h-7 w-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sales Stats (tu bloque original) */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Ingresos Totales</p>
                      <p className="text-2xl font-bold" style={{ color: brandConfig.colors.primary }}>
                        {currencySymbol}
                        {toNumberSafe(stats.totalRevenue, 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
                      <ShoppingCart className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Pedidos</p>
                      <p className="text-2xl font-bold" style={{ color: brandConfig.colors.primary }}>
                        {toNumberSafe(stats.totalOrders, 0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Clientes</p>
                      <p className="text-2xl font-bold" style={{ color: brandConfig.colors.primary }}>
                        {toNumberSafe(stats.totalCustomers, 0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* KPI Cards extra (los que pediste) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Promedio de stock por producto</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-2xl font-bold" style={{ color: brandConfig.colors.primary }}>
                  {kpis.avgStock.toFixed(1)}
                </p>
                <p className="text-sm text-gray-500 mt-1">Detecta sobrestock o riesgo de quiebres</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Producto con mayor stock</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-base font-semibold text-gray-900">
                  {kpis.maxStockProduct ? kpis.maxStockProduct.name : "—"}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {kpis.maxStockProduct ? `${toNumberSafe(kpis.maxStockProduct.totalStock, 0)} unidades` : "—"}
                </p>
                <p className="text-sm text-gray-500 mt-2">Identifica capital inmovilizado</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Producto con menor stock</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-base font-semibold text-gray-900">
                  {kpis.minStockProduct ? kpis.minStockProduct.name : "—"}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {kpis.minStockProduct ? `${toNumberSafe(kpis.minStockProduct.totalStock, 0)} unidades` : "—"}
                </p>
                <p className="text-sm text-gray-500 mt-2">Detecta riesgo de agotamiento</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Valor total del inventario</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-2xl font-bold" style={{ color: brandConfig.colors.primary }}>
                  {formatMoney(kpis.inventoryValue, currencySymbol)}
                </p>
                <p className="text-sm text-gray-500 mt-1">Mide capital inmovilizado</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Producto más vendido</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-base font-semibold text-gray-900">{kpis.bestSellerLabel}</p>
                <p className="text-sm text-gray-500 mt-1">Prioriza producción y reposición</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">% productos con descuento / precio fijo</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="gap-1">
                    <Percent className="h-3 w-3" />
                    Descuento: {kpis.discountPct.toFixed(0)}%
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Package className="h-3 w-3" />
                    Precio fijo: {kpis.fixedPct.toFixed(0)}%
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <TrendingDown className="h-3 w-3" />
                    Descuento máx: {kpis.maxDiscountApplied.toFixed(0)}%
                  </Badge>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Controla estabilidad y rentabilidad de tu estrategia de precios
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB: INVENTARIO */}
        <TabsContent value="inventario" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Total de productos activos</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-2xl font-bold" style={{ color: brandConfig.colors.primary }}>
                  {kpis.totalProducts}
                </p>
                <p className="text-sm text-gray-500 mt-1">Indica el tamaño real de tu catálogo disponible</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Stock total disponible</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-2xl font-bold text-green-600">{kpis.totalStock.toLocaleString()}</p>
                <p className="text-sm text-gray-500 mt-1">Mide tu capacidad de venta inmediata</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Productos sin stock</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-2xl font-bold text-red-600">{kpis.outOfStockCount}</p>
                <p className="text-sm text-gray-500 mt-1">Evita perder ventas</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Productos en stock crítico</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-2xl font-bold text-amber-600">{kpis.criticalStockCount}</p>
                <p className="text-sm text-gray-500 mt-1">Permite reponer antes de quedarte sin inventario</p>
              </CardContent>
            </Card>
          </div>

          {/* Lista de críticos (si hay) */}
          {kpis.criticalStockProducts?.length > 0 && (
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-5 w-5" />
                  Productos en Stock Crítico
                  <Badge className="bg-amber-100 text-amber-700 ml-2">
                    {kpis.criticalStockProducts.length} productos
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {kpis.criticalStockProducts.map((product: AnyObj) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-white rounded-xl border border-amber-100 hover:shadow-md transition-all"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{product.name}</p>
                        <p className="text-sm text-gray-500">{product.brand}</p>
                        <p className="text-xs text-gray-400 mt-1">{product.category}</p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-3xl font-bold text-amber-600">{toNumberSafe(product.totalStock, 0)}</p>
                        <p className="text-xs text-gray-500">unidades</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Inventario completo (tu bloque original) */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle style={{ color: brandConfig.colors.primary }} className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Inventario Completo
                </CardTitle>
                <Badge variant="outline">{products.length || 0} productos</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {products.map((product: AnyObj) => (
                  <div key={product.id} className="border rounded-xl p-4 hover:shadow-md transition-all bg-white">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold text-gray-900">{product.name}</h4>
                          {product.priceConfig?.mode !== "fixed" && (
                            <Badge variant="outline" className="text-xs">
                              <Percent className="h-3 w-3 mr-1" />
                              {product.priceConfig?.mode === "markup" ? "+" : "-"}
                              {toNumberSafe(product.priceConfig?.percentage, 0)}%
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {product.brand} • {product.category}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xl font-bold" style={{ color: brandConfig.colors.primary }}>
                            {currencySymbol}
                            {toNumberSafe(product.price, 0).toFixed(2)}
                          </p>
                          {product.originalPrice && product.originalPrice > product.price && (
                            <p className="text-sm text-gray-400 line-through">
                              {currencySymbol}
                              {toNumberSafe(product.originalPrice, 0).toFixed(2)}
                            </p>
                          )}
                        </div>
                        <div className="text-center bg-gray-50 px-4 py-2 rounded-lg">
                          <p
                            className={`text-2xl font-bold ${
                              toNumberSafe(product.totalStock, 0) === 0
                                ? "text-red-600"
                                : toNumberSafe(product.totalStock, 0) < 10
                                  ? "text-amber-600"
                                  : "text-green-600"
                            }`}
                          >
                            {toNumberSafe(product.totalStock, 0)}
                          </p>
                          <p className="text-xs text-gray-500">Stock Total</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {product.variants?.map((variant: AnyObj, vIndex: number) => (
                        <div key={vIndex} className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center gap-2 mb-3">
                            <div
                              className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                              style={{ backgroundColor: variant.colorHex || "#ccc" }}
                            />
                            <span className="text-sm font-medium">{variant.color}</span>
                            {variant.images?.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {variant.images.length} imágenes
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                            {variant.sizes?.map((size: AnyObj, sIndex: number) => (
                              <div
                                key={sIndex}
                                className={`text-center p-2 bg-white rounded-lg border ${
                                  toNumberSafe(size.stock, 0) === 0
                                    ? "border-red-200"
                                    : toNumberSafe(size.stock, 0) < 5
                                      ? "border-amber-200"
                                      : "border-green-200"
                                }`}
                              >
                                <p className="text-xs text-gray-500 font-medium">{size.size}</p>
                                <p
                                  className={`font-bold ${
                                    toNumberSafe(size.stock, 0) === 0
                                      ? "text-red-600"
                                      : toNumberSafe(size.stock, 0) < 5
                                        ? "text-amber-600"
                                        : "text-green-600"
                                  }`}
                                >
                                  {toNumberSafe(size.stock, 0)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: PRECIOS */}
        <TabsContent value="precios" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Precio promedio del catálogo</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-2xl font-bold" style={{ color: brandConfig.colors.primary }}>
                  {formatMoney(kpis.avgPrice, currencySymbol)}
                </p>
                <p className="text-sm text-gray-500 mt-1">Marca tu posicionamiento de precios</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Precio máximo</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-2xl font-bold text-gray-900">{formatMoney(kpis.maxPrice, currencySymbol)}</p>
                <p className="text-sm text-gray-500 mt-1">Define tu techo de mercado</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Precio mínimo</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-2xl font-bold text-gray-900">{formatMoney(kpis.minPrice, currencySymbol)}</p>
                <p className="text-sm text-gray-500 mt-1">Define tu piso de mercado</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Descuento máximo aplicado</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-2xl font-bold text-amber-600">{kpis.maxDiscountApplied.toFixed(0)}%</p>
                <p className="text-sm text-gray-500 mt-1">Controla rentabilidad</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">% productos con descuento</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-2xl font-bold" style={{ color: brandConfig.colors.primary }}>
                  {kpis.discountPct.toFixed(0)}%
                </p>
                <p className="text-sm text-gray-500 mt-1">Mide agresividad comercial</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">% productos con precio fijo</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-2xl font-bold" style={{ color: brandConfig.colors.primary }}>
                  {kpis.fixedPct.toFixed(0)}%
                </p>
                <p className="text-sm text-gray-500 mt-1">Controla estabilidad de precios</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabla rápida por producto */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2" style={{ color: brandConfig.colors.primary }}>
                <DollarSign className="h-5 w-5" />
                Precios por producto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2 pr-4">Producto</th>
                      <th className="py-2 pr-4">Precio</th>
                      <th className="py-2 pr-4">Precio original</th>
                      <th className="py-2 pr-4">Modo</th>
                      <th className="py-2 pr-4">% config</th>
                      <th className="py-2 pr-4">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p: AnyObj) => (
                      <tr key={p.id} className="border-b last:border-b-0">
                        <td className="py-3 pr-4 font-medium text-gray-900">{p.name}</td>
                        <td className="py-3 pr-4">{formatMoney(toNumberSafe(p.price, 0), currencySymbol)}</td>
                        <td className="py-3 pr-4 text-gray-500">
                          {p.originalPrice ? formatMoney(toNumberSafe(p.originalPrice, 0), currencySymbol) : "—"}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant="outline" className="capitalize">
                            {p?.priceConfig?.mode || "fixed"}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">
                          {p?.priceConfig?.mode !== "fixed" ? `${toNumberSafe(p?.priceConfig?.percentage, 0)}%` : "—"}
                        </td>
                        <td className="py-3 pr-4">{toNumberSafe(p.totalStock, 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: PRENDA / TALLA */}
        <TabsContent value="tallas" className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2" style={{ color: brandConfig.colors.primary }}>
                <Eye className="h-5 w-5" />
                Valor del inventario por prenda / talla
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Mide capital por prenda / talla (ordenado por valor total)
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2 pr-4">Producto</th>
                      <th className="py-2 pr-4">Color</th>
                      <th className="py-2 pr-4">Talla</th>
                      <th className="py-2 pr-4">Unidades</th>
                      <th className="py-2 pr-4">Precio unit.</th>
                      <th className="py-2 pr-4">Valor total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpis.inventoryByGarmentSize.length === 0 ? (
                      <tr>
                        <td className="py-6 text-gray-500" colSpan={6}>
                          No hay desglose por talla disponible.
                        </td>
                      </tr>
                    ) : (
                      kpis.inventoryByGarmentSize.map((row: AnyObj) => (
                        <tr key={row.key} className="border-b last:border-b-0">
                          <td className="py-3 pr-4 font-medium text-gray-900">
                            <div className="flex flex-col">
                              <span>{row.productName}</span>
                              <span className="text-xs text-gray-500">{row.brand || ""}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-full border"
                                style={{ backgroundColor: row.colorHex || "#ccc" }}
                              />
                              <span className="text-gray-700">{row.color || "—"}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <Badge variant="outline">{row.size}</Badge>
                          </td>
                          <td className="py-3 pr-4">{toNumberSafe(row.units, 0)}</td>
                          <td className="py-3 pr-4">{formatMoney(toNumberSafe(row.unitPrice, 0), currencySymbol)}</td>
                          <td className="py-3 pr-4 font-semibold" style={{ color: brandConfig.colors.primary }}>
                            {formatMoney(toNumberSafe(row.totalValue, 0), currencySymbol)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
