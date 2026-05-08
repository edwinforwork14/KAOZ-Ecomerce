"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  Save,
  Plus,
  Trash2,
  Edit2,
  X,
  GripVertical,
  RefreshCw,
  CreditCard,
  Truck,
  DollarSign,
  Settings as SettingsIcon,
  Building,
  Clock,
  Wallet,
  Banknote,
  Store,
  AlertCircle,
  Loader2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

// =====================
// Types aligned to BACKEND
// =====================

type CurrencyCode = "EUR" | "USD" | "VES"
type CurrencySymbol = "€" | "$" | "Bs"

interface CurrencySettings {
  symbol: CurrencySymbol
  code: CurrencyCode
  showBsPrice: boolean
}

interface CashDiscountSettings {
  isActive: boolean
  percentage: number
  applicablePaymentMethods: string[]
}

interface OrdersSettings {
  allowDelete: boolean
  prefix: string
}

interface PricingSettings {
  mode: "fixed" | "percentage"
  markupPercentage: number
  discountPercentage: number
}

interface BusinessSettings {
  name?: string
  slogan?: string
  email?: string
  phone?: string
  address?: string
}

interface PaymentMethod {
  _id?: string
  id: string
  name: string
  description?: string
  isActive: boolean
  icon?: string
  instructions?: string
  accountData?: {
    bankName?: string
    accountNumber?: string
    accountHolder?: string
    identification?: string
    phone?: string
    email?: string
    walletAddress?: string
    additionalInfo?: string
    network?: string
  }
  requiresProof: boolean
  whatsappMessage?: string
  hasDiscount: boolean
  discountPercentage: number
  order: number
}

interface ShippingMethod {
  _id?: string
  id: string
  name: string
  description?: string
  isActive: boolean
  icon?: string
  type: "delivery" | "pickup" | "standard"
  additionalCost: number
  freeFrom: number
  estimatedTime?: string
  requiresAddress: boolean
  pickupData?: {
    address?: string
    schedule?: string
    phone?: string
    mapUrl?: string
    city?: string
    state?: string
  }
  whatsappMessage?: string
  order: number
}

interface Settings {
  _id?: string
  currency: CurrencySettings
  cashDiscount: CashDiscountSettings
  newProductDuration: number
  paymentMethods: PaymentMethod[]
  shippingMethods: ShippingMethod[]
  orders: OrdersSettings
  pricing: PricingSettings
  business?: BusinessSettings
  whatsapp?: {
    number?: string
    defaultMessage?: string
  }
  theme?: "light" | "dark"
}

interface ExchangeRate {
  date: string
  usd: number
  eur: number
}

const shippingTypes = [
  { value: "delivery", label: "Delivery" },
  { value: "pickup", label: "Retiro en Tienda" },
  { value: "standard", label: "Estándar" },
] as const

function getCurrencySymbolByCode(code: CurrencyCode): CurrencySymbol {
  if (code === "EUR") return "€"
  if (code === "USD") return "$"
  return "Bs"
}

function paymentIconFor(methodIdOrName: string) {
  const key = (methodIdOrName || "").toLowerCase()
  if (key.includes("zelle")) return Wallet
  if (key.includes("binance") || key.includes("usdt") || key.includes("crypto")) return Wallet
  if (key.includes("efectivo") || key.includes("cash")) return Banknote
  if (key.includes("pago") || key.includes("transfer")) return Building
  return CreditCard
}

function shippingIconFor(type: ShippingMethod["type"]) {
  if (type === "pickup") return Store
  return Truck
}

function clampNumber(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}

function formatMoney(symbol: string, n: number) {
  const v = Number.isFinite(n) ? n : 0
  return `${symbol}${v.toFixed(2)}`
}

export default function AdminSettingsPage() {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const router = useRouter()

  // Leer el tab actual de la URL
  const currentTab = searchParams.get('tab') || 'general'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [settings, setSettings] = useState<Settings | null>(null)

  // Edit modals
  const [editingPayment, setEditingPayment] = useState<PaymentMethod | null>(null)
  const [editingShipping, setEditingShipping] = useState<ShippingMethod | null>(null)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [showShippingForm, setShowShippingForm] = useState(false)

  // Exchange rate
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null)
  const [updatingRate, setUpdatingRate] = useState(false)
  const [rateHistory, setRateHistory] = useState<Array<{ date: string; usd: number; eur: number }>>([])
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const result = await api.getSettings()
      if (result?.success) {
        setSettings(result.settings as Settings)
      } else {
        throw new Error("getSettings failed")
      }

      try {
        const rateRes = await api.getExchangeRate?.()
        if (rateRes?.success && rateRes.rate) {
          setExchangeRate(rateRes.rate as ExchangeRate)
        }
      } catch {
        // ignore
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al cargar configuraciones",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async (updates: Partial<Settings>) => {
    if (!settings) return
    setSaving(true)
    try {
      const result = await api.updateSettings(updates)
      if (result?.success) {
        setSettings(result.settings as Settings)
        toast({
          title: "Guardado",
          description: "Configuraciones actualizadas correctamente",
        })
      } else {
        throw new Error("updateSettings failed")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al guardar configuraciones",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // Función para cambiar de tab
  const handleTabChange = (value: string) => {
    router.push(`/admin/settings?tab=${value}`)
  }

  // Exchange Rate
  const updateExchangeRate = async () => {
    setUpdatingRate(true)
    try {
      const result = await api.updateExchangeRate()
      if (result?.success) {
        if (result.rate) setExchangeRate(result.rate as ExchangeRate)
        toast({
          title: "Actualizado",
          description: "Tasa de cambio actualizada correctamente",
        })
      } else {
        throw new Error(result?.message || "updateExchangeRate failed")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al actualizar tasa de cambio",
        variant: "destructive",
      })
    } finally {
      setUpdatingRate(false)
    }
  }

  const loadRateHistory = async () => {
    try {
      const result = await api.getExchangeRateHistory(30)
      if (result?.success) {
        setRateHistory(result.history || [])
        setShowHistory(true)
      }
    } catch (error) {
      console.error("Error loading history:", error)
    }
  }

  // ==================
  // Hooks that must be always called (before early returns)
  // ==================
  const sortedPayments = useMemo(() => {
    const list = settings?.paymentMethods || []
    return [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }, [settings?.paymentMethods])

  const sortedShipping = useMemo(() => {
    const list = settings?.shippingMethods || []
    return [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }, [settings?.shippingMethods])

  // Payment Methods
  const savePaymentMethod = async (method: PaymentMethod) => {
    try {
      let result
      if (editingPayment && editingPayment.id) {
        result = await api.updatePaymentMethod(method.id, method)
      } else {
        result = await api.addPaymentMethod(method)
      }

      if (result?.success) {
        await loadAll()
        setEditingPayment(null)
        setShowPaymentForm(false)
        toast({
          title: "Guardado",
          description: "Método de pago guardado correctamente",
        })
      } else {
        throw new Error("savePaymentMethod failed")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al guardar método de pago",
        variant: "destructive",
      })
    }
  }

  const deletePaymentMethod = async (methodId: string) => {
    if (!confirm("¿Estás seguro de eliminar este método de pago?")) return
    try {
      const result = await api.deletePaymentMethod(methodId)
      if (result?.success) {
        await loadAll()
        toast({
          title: "Eliminado",
          description: "Método de pago eliminado correctamente",
        })
      } else {
        throw new Error("deletePaymentMethod failed")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al eliminar método de pago",
        variant: "destructive",
      })
    }
  }

  // Shipping Methods
  const saveShippingMethod = async (method: ShippingMethod) => {
    try {
      let result
      if (editingShipping && editingShipping.id) {
        result = await api.updateShippingMethod(method.id, method)
      } else {
        result = await api.addShippingMethod(method)
      }

      if (result?.success) {
        await loadAll()
        setEditingShipping(null)
        setShowShippingForm(false)
        toast({
          title: "Guardado",
          description: "Método de envío guardado correctamente",
        })
      } else {
        throw new Error("saveShippingMethod failed")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al guardar método de envío",
        variant: "destructive",
      })
    }
  }

  const deleteShippingMethod = async (methodId: string) => {
    if (!confirm("¿Estás seguro de eliminar este método de envío?")) return
    try {
      const result = await api.deleteShippingMethod(methodId)
      if (result?.success) {
        await loadAll()
        toast({
          title: "Eliminado",
          description: "Método de envío eliminado correctamente",
        })
      } else {
        throw new Error("deleteShippingMethod failed")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al eliminar método de envío",
        variant: "destructive",
      })
    }
  }

  // Render guards
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-1 bg-black overflow-hidden">
            <div className="w-full h-full bg-kaosNeon animate-progress-fast"></div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">Sincronizando Protocolos...</p>
        </div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center max-w-md p-12 border border-black">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-black uppercase tracking-tighter mb-2">Falla Crítica de Configuración</h2>
          <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest mb-6">No se pudo establecer conexión con el núcleo de datos.</p>
          <Button onClick={loadAll} className="w-full bg-black text-white rounded-none h-14 font-black uppercase text-xs tracking-widest hover:bg-kaosNeon hover:text-black transition-all">
            Reintentar Enlace
          </Button>
        </div>
      </div>
    )
  }

  const currencySymbol = settings?.currency?.symbol || "$"

  return (
    <div className="p-4 md:p-8 space-y-8 bg-transparent min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-black/10 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-kaosNeon animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-black/40">Control Maestro • KAOZ</span>
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">
            Configuración
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[9px] font-black uppercase tracking-widest text-black/20">Estado de Sincronización: 100%</span>
          <div className="w-32 h-1 bg-black/5">
            <div className="w-full h-full bg-kaosNeon"></div>
          </div>
        </div>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-8">
        <TabsList className="grid w-full grid-cols-5 rounded-none border border-black p-0 bg-white h-16">
          <TabsTrigger value="general" className="rounded-none border-r border-black data-[state=active]:bg-black data-[state=active]:text-white font-black uppercase text-[10px] tracking-widest h-full">
            <SettingsIcon className="h-4 w-4 mr-2" /> CORE / SISTEMA
          </TabsTrigger>
          <TabsTrigger value="payment" className="rounded-none border-r border-black data-[state=active]:bg-black data-[state=active]:text-white font-black uppercase text-[10px] tracking-widest h-full">
            <CreditCard className="h-4 w-4 mr-2" /> PASARELAS PAGO
          </TabsTrigger>
          <TabsTrigger value="shipping" className="rounded-none border-r border-black data-[state=active]:bg-black data-[state=active]:text-white font-black uppercase text-[10px] tracking-widest h-full">
            <Truck className="h-4 w-4 mr-2" /> LOGÍSTICA ENVÍO
          </TabsTrigger>
          <TabsTrigger value="exchange" className="rounded-none border-r border-black data-[state=active]:bg-black data-[state=active]:text-white font-black uppercase text-[10px] tracking-widest h-full">
            <DollarSign className="h-4 w-4 mr-2" /> TASA DIVISAS
          </TabsTrigger>
          <TabsTrigger value="business" className="rounded-none data-[state=active]:bg-black data-[state=active]:text-white font-black uppercase text-[10px] tracking-widest h-full">
            <Building className="h-4 w-4 mr-2" /> IDENTIDAD CORP
          </TabsTrigger>
        </TabsList>

        {/* =========================
            TAB: GENERAL
        ========================== */}
        <TabsContent value="general" className="m-0 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="industrial-card p-8 bg-white border border-black space-y-6">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tighter mb-1">Unidad Monetaria</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Protocolo de Divisa Principal</p>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Divisa Base</label>
                  <Select
                    value={settings.currency.code}
                    onValueChange={(value) => {
                      const code = value as CurrencyCode
                      const symbol = getCurrencySymbolByCode(code)
                      saveSettings({ currency: { ...settings.currency, code, symbol } })
                    }}
                  >
                    <SelectTrigger className="h-14 rounded-none border-black focus:ring-0 font-bold uppercase text-xs tracking-widest">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-none border-black">
                      <SelectItem value="EUR" className="font-bold uppercase text-[10px]">EURO (€)</SelectItem>
                      <SelectItem value="USD" className="font-bold uppercase text-[10px]">DÓLAR ($)</SelectItem>
                      <SelectItem value="VES" className="font-bold uppercase text-[10px]">BOLÍVAR (BS)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-4 border border-black bg-gray-50">
                  <label className="text-[10px] font-black uppercase tracking-widest">Conversión Dual (BS)</label>
                  <Switch
                    checked={!!settings.currency.showBsPrice}
                    onCheckedChange={(checked) => {
                      saveSettings({ currency: { ...settings.currency, showBsPrice: checked } })
                    }}
                    className="data-[state=checked]:bg-black"
                  />
                </div>

                <div className="flex items-center justify-between p-4 border border-black bg-gray-50">
                  <label className="text-[10px] font-black uppercase tracking-widest">Modo Claro (Interfaz)</label>
                  <Switch
                    checked={settings.theme === "light" || !settings.theme}
                    onCheckedChange={(checked) => {
                      saveSettings({ theme: checked ? "light" : "dark" })
                      // Placeholder logic since the dashboard is already converted to Light Mode
                      toast({
                        title: "Modo Cambiado",
                        description: `Interfaz cambiada a modo ${checked ? "claro" : "oscuro"}`,
                      })
                    }}
                    className="data-[state=checked]:bg-black"
                  />
                </div>
              </div>
            </div>

            <div className="industrial-card p-8 bg-white border border-black space-y-6">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tighter mb-1">Logística de Ítems</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Parámetros de Ciclo de Vida</p>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Ventana "NUEVO" (Días)</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={settings.newProductDuration ?? 30}
                      onChange={(e) => {
                        const next = clampNumber(parseInt(e.target.value, 10) || 30, 1, 365)
                        setSettings({ ...settings, newProductDuration: next })
                      }}
                      className="h-14 rounded-none border-black focus:ring-0 font-black text-center text-lg"
                    />
                    <Button
                      onClick={() => saveSettings({ newProductDuration: settings.newProductDuration ?? 30 })}
                      disabled={saving}
                      className="h-14 rounded-none bg-black text-white px-8 font-black uppercase text-[10px] tracking-widest"
                    >
                      <Save className="h-4 w-4 mr-2" /> FIJAR
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="industrial-card p-8 bg-black text-white border border-black space-y-6">
            <div>
              <h3 className="text-xl font-black uppercase tracking-tighter mb-1 text-white">Seguridad de Órdenes</h3>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Protocolos de Transacción</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="flex items-center justify-between p-6 border border-gray-800 bg-gray-900">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white">Eliminación Destructiva</p>
                  <p className="text-[9px] text-gray-500 uppercase mt-1">Permitir purga manual de registros</p>
                </div>
                <Switch
                  checked={!!settings.orders?.allowDelete}
                  onCheckedChange={(checked) => {
                    saveSettings({ orders: { ...settings.orders, allowDelete: checked } })
                  }}
                  className="data-[state=checked]:bg-white data-[state=unchecked]:bg-gray-700"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Prefijo de Manifiesto</label>
                <div className="flex gap-2">
                  <Input
                    value={settings.orders?.prefix ?? ""}
                    onChange={(e) => setSettings({ ...settings, orders: { ...settings.orders, prefix: e.target.value } })}
                    placeholder="EJ: KAOZ"
                    className="h-14 rounded-none border-gray-800 bg-gray-900 text-white focus:ring-0 font-black uppercase tracking-widest"
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => saveSettings({ orders: settings.orders })} 
                    disabled={saving}
                    className="h-14 rounded-none border-gray-800 text-white hover:bg-white hover:text-black font-black uppercase text-[10px] tracking-widest"
                  >
                    <Save className="h-4 w-4 mr-2" /> ACTUALIZAR
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* =========================
            TAB: PAYMENT
        ========================== */}
        <TabsContent value="payment" className="m-0 space-y-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b-2 border-black pb-6">
            <div>
              <h3 className="text-3xl font-black uppercase tracking-tighter">Terminales de Recepción</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Configuración de Pasarelas Activas</p>
            </div>
            <Button
              onClick={() => {
                setEditingPayment({
                  id: "",
                  name: "",
                  description: "",
                  isActive: true,
                  requiresProof: true,
                  whatsappMessage: "",
                  hasDiscount: false,
                  discountPercentage: 0,
                  order: (settings.paymentMethods?.length ?? 0) + 1,
                  accountData: {},
                  instructions: "",
                })
                setShowPaymentForm(true)
              }}
              className="h-14 rounded-none bg-black text-white px-10 font-black uppercase text-xs tracking-widest"
            >
              <Plus className="h-4 w-4 mr-2" /> INTEGRAR CANAL
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedPayments.map((method) => {
              const Icon = paymentIconFor(method.id || method.name)
              return (
                <div key={method._id ?? method.id} className="industrial-card p-6 bg-white border border-black flex items-center justify-between group hover:bg-gray-50 transition-all">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-black text-white flex items-center justify-center">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-black uppercase tracking-tight">{method.name}</span>
                        {!method.isActive && (
                          <span className="text-[8px] font-black uppercase tracking-widest bg-gray-200 text-gray-500 px-1">OFFLINE</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">ORDEN: {method.order}</span>
                        {method.hasDiscount && (
                          <span className="text-[9px] font-black uppercase text-green-600 tracking-widest">PROMO: -{method.discountPercentage}%</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-none h-10 w-10 border border-black hover:bg-black hover:text-white"
                      onClick={() => {
                        setEditingPayment({
                          ...method,
                          accountData: { ...(method.accountData || {}) },
                        })
                        setShowPaymentForm(true)
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="rounded-none h-10 w-10 border border-black hover:bg-red-600 hover:text-white"
                      onClick={() => deletePaymentMethod(method.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </TabsContent>

        {/* =========================
            TAB: SHIPPING
        ========================== */}
        <TabsContent value="shipping" className="m-0 space-y-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b-2 border-black pb-6">
            <div>
              <h3 className="text-3xl font-black uppercase tracking-tighter">Red de Distribución</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Gestión de Logística y Despacho</p>
            </div>
            <Button
              onClick={() => {
                setEditingShipping({
                  id: "",
                  name: "",
                  description: "",
                  isActive: true,
                  type: "delivery",
                  additionalCost: 0,
                  freeFrom: 0,
                  requiresAddress: true,
                  order: (settings.shippingMethods?.length ?? 0) + 1,
                  pickupData: {},
                })
                setShowShippingForm(true)
              }}
              className="h-14 rounded-none bg-black text-white px-10 font-black uppercase text-xs tracking-widest"
            >
              <Plus className="h-4 w-4 mr-2" /> REGISTRAR RUTA
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedShipping.map((method) => {
              const Icon = shippingIconFor(method.type)
              return (
                <div key={method._id ?? method.id} className="industrial-card p-6 bg-white border border-black flex items-center justify-between group hover:bg-gray-50 transition-all">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-black text-white flex items-center justify-center">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-black uppercase tracking-tight">{method.name}</span>
                        {!method.isActive && (
                          <span className="text-[8px] font-black uppercase tracking-widest bg-gray-200 text-gray-500 px-1">INACTIVO</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{method.type === "pickup" ? "RETIRO" : "ENVÍO"}</span>
                        <span className="text-[9px] font-black uppercase text-black tracking-widest">
                          COSTO: {method.additionalCost > 0 ? formatMoney(currencySymbol, method.additionalCost) : "GRATIS"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-none h-10 w-10 border border-black hover:bg-black hover:text-white"
                      onClick={() => {
                        setEditingShipping({
                          ...method,
                          pickupData: { ...(method.pickupData || {}) },
                        })
                        setShowShippingForm(true)
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="rounded-none h-10 w-10 border border-black hover:bg-red-600 hover:text-white"
                      onClick={() => deleteShippingMethod(method.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </TabsContent>

        {/* =========================
            TAB: EXCHANGE
        ========================== */}
        <TabsContent value="exchange" className="m-0 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h3 className="text-3xl font-black uppercase tracking-tighter border-b-2 border-black pb-4">Indicador de Cambio</h3>
              
              <div className="industrial-card p-12 bg-black text-white border border-black text-center space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Tasa de Referencia BCV</p>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-6xl font-black tracking-tighter">Bs {exchangeRate?.usd.toFixed(2) || "0.00"}</span>
                  <span className="text-xl font-bold text-gray-500 uppercase">/ USD</span>
                </div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest pt-4 border-t border-gray-800">
                  ÚLTIMA SINCRONIZACIÓN: {exchangeRate?.date ? new Date(exchangeRate.date).toLocaleString() : "N/A"}
                </p>
                
                <div className="pt-6">
                  <Button
                    onClick={updateExchangeRate}
                    disabled={updatingRate}
                    className="w-full h-14 rounded-none bg-white text-black hover:bg-gray-200 font-black uppercase text-xs tracking-widest transition-all shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
                  >
                    {updatingRate ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    FORZAR REFRESCO BCV
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between border-b-2 border-black pb-4">
                <h3 className="text-xl font-black uppercase tracking-tighter">Historial de Fluctuación</h3>
                <Button variant="link" onClick={loadRateHistory} className="text-[10px] font-black uppercase tracking-widest text-black underline p-0 h-auto">VER TODO</Button>
              </div>

              <div className="border border-black bg-white overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-black">
                    <tr>
                      <th className="p-4 text-[9px] font-black uppercase text-left tracking-widest">FECHA</th>
                      <th className="p-4 text-[9px] font-black uppercase text-right tracking-widest">TASA (BS)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(rateHistory.length > 0 ? rateHistory : (exchangeRate ? [exchangeRate] : [])).slice(0, 5).map((h, i) => (
                      <tr key={i}>
                        <td className="p-4 text-[10px] font-bold uppercase">{new Date(h.date).toLocaleDateString()}</td>
                        <td className="p-4 text-right font-black">Bs {h.usd.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* =========================
            TAB: BUSINESS
        ========================== */}
        <TabsContent value="business" className="m-0 space-y-12">
          <div className="border border-black bg-white">
            <div className="p-8 border-b-2 border-black bg-gray-50">
              <h3 className="text-3xl font-black uppercase tracking-tighter">Manifesto Corporativo</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Datos de Identidad y Contacto</p>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Razón Social / Marca</label>
                  <Input
                    value={settings.business?.name || ""}
                    onChange={(e) => setSettings({ ...settings, business: { ...settings.business, name: e.target.value } })}
                    className="h-14 rounded-none border-black focus:ring-0 font-black uppercase tracking-tight text-lg"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Slogan / Manifesto</label>
                  <Input
                    value={settings.business?.slogan || ""}
                    onChange={(e) => setSettings({ ...settings, business: { ...settings.business, slogan: e.target.value } })}
                    className="h-14 rounded-none border-black focus:ring-0 font-bold text-gray-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Canal de Ventas (WhatsApp)</label>
                  <Input
                    value={settings.whatsapp?.number || ""}
                    onChange={(e) => setSettings({ ...settings, whatsapp: { ...settings.whatsapp, number: e.target.value } })}
                    className="h-14 rounded-none border-black focus:ring-0 font-black"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email Administrativo</label>
                  <Input
                    value={settings.business?.email || ""}
                    onChange={(e) => setSettings({ ...settings, business: { ...settings.business, email: e.target.value } })}
                    className="h-14 rounded-none border-black focus:ring-0 font-black"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Teléfono Contacto</label>
                  <Input
                    value={settings.business?.phone || ""}
                    onChange={(e) => setSettings({ ...settings, business: { ...settings.business, phone: e.target.value } })}
                    className="h-14 rounded-none border-black focus:ring-0 font-black"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Centro de Operaciones (Dirección)</label>
                <Textarea
                  value={settings.business?.address || ""}
                  onChange={(e) => setSettings({ ...settings, business: { ...settings.business, address: e.target.value } })}
                  className="min-h-[120px] rounded-none border-black focus:ring-0 font-bold"
                />
              </div>

              <div className="flex justify-end pt-8 border-t border-gray-100">
                <Button
                  onClick={() => saveSettings({ business: settings.business, whatsapp: settings.whatsapp })}
                  disabled={saving}
                  className="h-16 rounded-none bg-black text-white px-16 font-black uppercase text-sm tracking-[0.2em] transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px]"
                >
                  {saving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
                  GUARDAR MANIFESTO
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* MODAL OVERLAYS (PAYMENT & SHIPPING) */}
      {showPaymentForm && editingPayment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white border-2 border-black p-0 shadow-[16px_16px_0px_0px_rgba(0,0,0,0.1)]">
            <div className="p-6 bg-black text-white flex items-center justify-between">
              <h3 className="text-xl font-black uppercase tracking-tighter">
                {editingPayment.id ? "MODIFICAR TERMINAL" : "INTEGRAR NUEVO CANAL"}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => { setShowPaymentForm(false); setEditingPayment(null); }} className="text-white hover:bg-white/10 rounded-none">
                <X className="h-6 w-6" />
              </Button>
            </div>
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
               <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-1">
                   <Label className="text-[10px] font-black uppercase text-gray-400">Denominación</Label>
                   <Input value={editingPayment.name} onChange={(e) => setEditingPayment({ ...editingPayment, name: e.target.value })} className="rounded-none border-black font-black uppercase" />
                 </div>
                 <div className="space-y-1">
                   <Label className="text-[10px] font-black uppercase text-gray-400">Descripción Pública</Label>
                   <Input value={editingPayment.description || ""} onChange={(e) => setEditingPayment({ ...editingPayment, description: e.target.value })} className="rounded-none border-black font-bold text-xs" />
                 </div>
               </div>
               <div className="flex gap-6 py-4 border-y border-gray-100">
                  <div className="flex items-center gap-2">
                    <Switch checked={!!editingPayment.isActive} onCheckedChange={(checked) => setEditingPayment({ ...editingPayment, isActive: checked })} className="data-[state=checked]:bg-black" />
                    <Label className="text-[10px] font-black uppercase">Canal Activo</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={!!editingPayment.requiresProof} onCheckedChange={(checked) => setEditingPayment({ ...editingPayment, requiresProof: checked })} className="data-[state=checked]:bg-black" />
                    <Label className="text-[10px] font-black uppercase">Exige Comprobante</Label>
                  </div>
               </div>
               <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase text-gray-400">Instrucciones de Operación</Label>
                  <Textarea value={editingPayment.instructions || ""} onChange={(e) => setEditingPayment({ ...editingPayment, instructions: e.target.value })} className="rounded-none border-black font-bold h-24" />
               </div>
            </div>
            <div className="p-6 bg-gray-50 border-t border-black flex justify-end gap-4">
               <Button variant="ghost" onClick={() => { setShowPaymentForm(false); setEditingPayment(null); }} className="rounded-none font-black uppercase text-[10px] tracking-widest">DESCARTAR</Button>
               <Button onClick={() => savePaymentMethod(editingPayment)} className="rounded-none bg-black text-white h-12 px-10 font-black uppercase text-[10px] tracking-widest hover:bg-gray-800">SINCRONIZAR TERMINAL</Button>
            </div>
          </div>
        </div>
      )}

      {showShippingForm && editingShipping && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white border-2 border-black p-0 shadow-[16px_16px_0px_0px_rgba(0,0,0,0.1)]">
            <div className="p-6 bg-black text-white flex items-center justify-between">
              <h3 className="text-xl font-black uppercase tracking-tighter">
                {editingShipping.id ? "MODIFICAR RUTA" : "REGISTRAR NUEVA RUTA"}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => { setShowShippingForm(false); setEditingShipping(null); }} className="text-white hover:bg-white/10 rounded-none">
                <X className="h-6 w-6" />
              </Button>
            </div>
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
               <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-1">
                   <Label className="text-[10px] font-black uppercase text-gray-400">Nombre de la Ruta</Label>
                   <Input value={editingShipping.name} onChange={(e) => setEditingShipping({ ...editingShipping, name: e.target.value })} className="rounded-none border-black font-black uppercase" />
                 </div>
                 <div className="space-y-1">
                   <Label className="text-[10px] font-black uppercase text-gray-400">Tipo de Distribución</Label>
                   <Select value={editingShipping.type} onValueChange={(v) => setEditingShipping({ ...editingShipping, type: v as any, requiresAddress: v !== "pickup" })}>
                     <SelectTrigger className="rounded-none border-black font-bold uppercase text-[10px] h-10">
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent className="rounded-none border-black">
                        <SelectItem value="delivery" className="font-bold uppercase text-[10px]">ENVÍO A DOMICILIO</SelectItem>
                        <SelectItem value="pickup" className="font-bold uppercase text-[10px]">RETIRO EN PUNTO</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-1">
                   <Label className="text-[10px] font-black uppercase text-gray-400">Tarifa Base (BS)</Label>
                   <Input type="number" value={editingShipping.additionalCost} onChange={(e) => setEditingShipping({ ...editingShipping, additionalCost: parseFloat(e.target.value) })} className="rounded-none border-black font-black" />
                 </div>
                 <div className="space-y-1">
                   <Label className="text-[10px] font-black uppercase text-gray-400">Umbral Gratis (BS)</Label>
                   <Input type="number" value={editingShipping.freeFrom} onChange={(e) => setEditingShipping({ ...editingShipping, freeFrom: parseFloat(e.target.value) })} className="rounded-none border-black font-black" />
                 </div>
               </div>
            </div>
            <div className="p-6 bg-gray-50 border-t border-black flex justify-end gap-4">
               <Button variant="ghost" onClick={() => { setShowShippingForm(false); setEditingShipping(null); }} className="rounded-none font-black uppercase text-[10px] tracking-widest">DESCARTAR</Button>
               <Button onClick={() => saveShippingMethod(editingShipping)} className="rounded-none bg-black text-white h-12 px-10 font-black uppercase text-[10px] tracking-widest hover:bg-gray-800">SINCRONIZAR RUTA</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}