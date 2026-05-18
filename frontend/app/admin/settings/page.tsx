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
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Globe,
  Bell,
  MessageSquare,
  Instagram,
  Eye,
  EyeOff,
  Activity,
  Image as ImageIcon
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api, cleanImageUrl } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

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
  logo?: string
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
  expenseCategories?: string[]
  lifestyleDropImages?: Array<{ name: string; src: string }>
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

  // Zernio config state
  const [zernioConfig, setZernioConfig] = useState<any>(null)
  const [loadingZernio, setLoadingZernio] = useState(false)
  const [zernioApiKeyInput, setZernioApiKeyInput] = useState("")
  const [showZernioKey, setShowZernioKey] = useState(false)
  const [zernioLimitInput, setZernioLimitInput] = useState(7)
  const [syncingZernio, setSyncingZernio] = useState(false)

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
  const [manualRate, setManualRate] = useState({ usd: "" })

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const result = await api.getSettings()
      if (result?.success) {
        setSettings(result.settings as Settings)
      }

      try {
        const rateRes = await api.getExchangeRate?.()
        if (rateRes?.success && rateRes.rate) {
          setExchangeRate(rateRes.rate as ExchangeRate)
        }
      } catch { }
    } catch (error) {
      toast({ title: "Error", description: "Error al cargar configuraciones", variant: "destructive" })
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
        toast({ title: "GUARDADO", description: "SISTEMA ACTUALIZADO" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Error al guardar", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleTabChange = (value: string) => {
    router.push(`/admin/settings?tab=${value}`)
  }

  // === ZERNIO HANDLERS ===
  useEffect(() => {
    if (currentTab === "zernio") {
      loadZernioConfig()
    }
  }, [currentTab])

  const loadZernioConfig = async () => {
    setLoadingZernio(true)
    try {
      const res = await api.getZernioConfig()
      if (res?.success && res.config) {
        setZernioConfig(res.config)
        setZernioLimitInput(res.config.limit || 7)
      }
    } catch (error) {
      toast({
        title: "ERROR DE CONEXIÓN",
        description: "No se pudo recuperar la configuración de Zernio",
        variant: "destructive"
      })
    } finally {
      setLoadingZernio(false)
    }
  }

  const handleConnectZernio = async () => {
    if (!zernioApiKeyInput.trim()) {
      toast({
        title: "API KEY REQUERIDA",
        description: "Introduce una API Key válida para establecer el enlace",
        variant: "destructive"
      })
      return
    }

    setLoadingZernio(true)
    try {
      const res = await api.connectZernio(zernioApiKeyInput)
      if (res?.success && res.config) {
        setZernioConfig(res.config)
        setZernioApiKeyInput("")
        toast({
          title: "ENLACE COMPLETO",
          description: res.message || "Instagram conectado con éxito"
        })
      } else {
        toast({
          title: "FALLO DE CONEXIÓN",
          description: res.message || "No se pudo establecer el enlace",
          variant: "destructive"
        })
      }
    } catch (error: any) {
      toast({
        title: "ERROR CRÍTICO",
        description: error.message || "Ocurrió un error al conectar",
        variant: "destructive"
      })
    } finally {
      setLoadingZernio(false)
    }
  }

  const handleDisconnectZernio = async () => {
    if (!confirm("¿Estás seguro de que deseas desconectar la integración de Instagram? Se borrarán la API Key y los posts cacheados.")) {
      return
    }

    setLoadingZernio(true)
    try {
      const res = await api.disconnectZernio()
      if (res?.success && res.config) {
        setZernioConfig(res.config)
        toast({
          title: "DESCONECTADO",
          description: "La integración se ha desactivado correctamente"
        })
      }
    } catch (error: any) {
      toast({
        title: "ERROR",
        description: error.message || "No se pudo desconectar",
        variant: "destructive"
      })
    } finally {
      setLoadingZernio(false)
    }
  }

  const handleSyncZernio = async () => {
    setSyncingZernio(true)
    try {
      const res = await api.syncZernio()
      if (res?.success && res.config) {
        setZernioConfig(res.config)
        toast({
          title: "SINCRONIZACIÓN EXITOSA",
          description: "Publicaciones e historial actualizados"
        })
      } else {
        toast({
          title: "ERROR DE SINCRONIZACIÓN",
          description: res.message || "No se pudo forzar la sincronización",
          variant: "destructive"
        })
      }
    } catch (error: any) {
      toast({
        title: "ERROR CRÍTICO",
        description: error.message || "Falló el protocolo de sincronización",
        variant: "destructive"
      })
    } finally {
      setSyncingZernio(false)
    }
  }

  const handleUpdateZernioConfig = async () => {
    setLoadingZernio(true)
    try {
      const res = await api.updateZernioConfig(zernioLimitInput)
      if (res?.success && res.config) {
        setZernioConfig(res.config)
        toast({
          title: "CONFIGURACIÓN ACTUALIZADA",
          description: "Los cambios se guardaron y se regeneró la caché de posts"
        })
      } else {
        toast({
          title: "FALLO AL GUARDAR",
          description: res.message || "No se pudo actualizar el límite",
          variant: "destructive"
        })
      }
    } catch (error: any) {
      toast({
        title: "ERROR",
        description: error.message || "Ocurrió un error al actualizar",
        variant: "destructive"
      })
    } finally {
      setLoadingZernio(false)
    }
  }

  const updateExchangeRate = async (manualData?: { usd: number, eur?: number }) => {
    setUpdatingRate(true)
    try {
      const result = await api.updateExchangeRate(manualData)
      if (result?.success) {
        if (result.current) setExchangeRate(result.current as ExchangeRate)
        toast({ title: "TASA ACTUALIZADA", description: "PROTOCOLOS DE CAMBIO ACTUALIZADOS" })
        if (manualData) setManualRate({ usd: "" })
        await loadRateHistory()
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
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
    } catch (error) { }
  }

  const sortedPayments = useMemo(() => {
    const list = settings?.paymentMethods || []
    return [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }, [settings?.paymentMethods])

  const sortedShipping = useMemo(() => {
    const list = settings?.shippingMethods || []
    return [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }, [settings?.shippingMethods])

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
        toast({ title: "PASARELA ACTIVA", description: "MÉTODO DE PAGO CONFIGURADO" })
      }
    } catch (error) { }
  }

  const deletePaymentMethod = async (methodId: string) => {
    if (!confirm("¿DESVINCULAR MÉTODO DE PAGO?")) return
    try {
      const result = await api.deletePaymentMethod(methodId)
      if (result?.success) {
        await loadAll()
        toast({ title: "ELIMINADO", description: "CANAL REMOVIDO" })
      }
    } catch (error) { }
  }

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
        toast({ title: "RUTA GUARDADA", description: "LOGÍSTICA ACTUALIZADA" })
      }
    } catch (error) { }
  }

  const deleteShippingMethod = async (methodId: string) => {
    if (!confirm("¿ELIMINAR RUTA LOGÍSTICA?")) return
    try {
      const result = await api.deleteShippingMethod(methodId)
      if (result?.success) {
        await loadAll()
        toast({ title: "ELIMINADO", description: "RUTA REMOVIDA" })
      }
    } catch (error) { }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-1 bg-black overflow-hidden">
            <div className="w-full h-full bg-kaosNeon animate-progress-fast"></div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">Estableciendo Enlaces Críticos...</p>
        </div>
      </div>
    )
  }

  if (!settings) return null

  const currencySymbol = settings?.currency?.symbol || "$"

  return (
    <div className="p-4 md:p-8 space-y-8 bg-transparent min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-black/10 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-kaosNeon animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-black/40">Core de Operaciones • KAOS</span>
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">
            Settings
          </h1>
          <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest mt-2">Protocolos de Configuración Maestro</p>
        </div>
        <div className="flex items-center gap-6">
           <div className="flex flex-col items-end">
              <span className="text-[9px] font-black uppercase tracking-widest text-black/20">Uptime Sistema</span>
              <span className="text-sm font-black">99.9% SECURE</span>
           </div>
           <div className="w-12 h-12 bg-black flex items-center justify-center text-kaosNeon">
              <ShieldCheck className="h-6 w-6" />
           </div>
        </div>
      </div>

      {/* Industrial Tab System */}
      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-8">
        <TabsList className="flex flex-wrap md:flex-nowrap w-full rounded-none border border-black p-0 bg-white h-auto overflow-hidden">
          {[
            { id: "general", label: "SISTEMA", icon: SettingsIcon },
            { id: "payment", label: "FINANZAS", icon: CreditCard },
            { id: "shipping", label: "LOGÍSTICA", icon: Truck },
            { id: "exchange", label: "DIVISAS", icon: DollarSign },
            { id: "gastos", label: "GASTOS", icon: Banknote },
            { id: "business", label: "IDENTIDAD", icon: Building },
            { id: "zernio", label: "INSTAGRAM", icon: Instagram },
            { id: "lifestyle", label: "NUEVO DROP", icon: ImageIcon },
          ].map(tab => (
            <TabsTrigger 
              key={tab.id}
              value={tab.id} 
              className="flex-1 rounded-none border-r last:border-r-0 border-black data-[state=active]:bg-black data-[state=active]:text-white font-black uppercase text-[10px] tracking-widest h-16 transition-all"
            >
              <tab.icon className="h-4 w-4 mr-2 hidden md:block" /> {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* =========================
            TAB: GENERAL
        ========================== */}
        <TabsContent value="general" className="m-0 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
             {/* Left Column: Core Settings */}
             <div className="xl:col-span-8 space-y-8">
                <div className="bg-white border border-black p-8">
                   <div className="flex items-center gap-3 mb-8">
                      <div className="w-10 h-10 bg-black text-white flex items-center justify-center"><Zap className="h-5 w-5" /></div>
                      <div>
                        <h3 className="text-xl font-black uppercase tracking-tighter">Parámetros Globales</h3>
                        <p className="text-[9px] font-bold text-black/30 uppercase tracking-widest">Configuración Base del Entorno</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-6">
                         <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-black/40">Unidad de Cambio Primaria</Label>
                            <Select
                              value={settings.currency?.code || "USD"}
                              onValueChange={(value) => {
                                const code = value as CurrencyCode
                                const symbol = getCurrencySymbolByCode(code)
                                saveSettings({ currency: { ...(settings.currency || { symbol: "$", code: "USD", showBsPrice: true }), code, symbol } })
                              }}
                            >
                              <SelectTrigger className="h-14 rounded-none border-black/10 focus:border-black font-black uppercase text-xs tracking-widest bg-black/[0.02]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-none border-black">
                                <SelectItem value="USD" className="font-black">USD ($)</SelectItem>
                                <SelectItem value="EUR" className="font-black">EUR (€)</SelectItem>
                                <SelectItem value="VES" className="font-black">VES (Bs)</SelectItem>
                              </SelectContent>
                            </Select>
                         </div>
                         <div className="flex items-center justify-between p-5 bg-black/[0.02] border border-black/5">
                            <div className="space-y-1">
                               <Label className="text-[10px] font-black uppercase tracking-widest">Dual Pricing (BS)</Label>
                               <p className="text-[8px] font-bold text-black/30 uppercase">Mostrar conversión a moneda local</p>
                            </div>
                            <Switch 
                              checked={settings.currency?.showBsPrice || false} 
                              onCheckedChange={(v) => saveSettings({ currency: { ...(settings.currency || { symbol: "$", code: "USD", showBsPrice: true }), showBsPrice: v }})}
                              className="data-[state=checked]:bg-black"
                            />
                         </div>
                      </div>

                      <div className="space-y-6">
                         <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-black/40">Expiración Etiqueta "NUEVO"</Label>
                            <div className="flex gap-2">
                               <Input 
                                 type="number" 
                                 value={settings.newProductDuration} 
                                 onChange={(e) => setSettings({...settings, newProductDuration: parseInt(e.target.value)})}
                                 className="h-14 rounded-none border-black bg-black text-white focus:border-kaosNeon font-black text-center text-lg"
                               />
                               <Button 
                                 onClick={() => saveSettings({ newProductDuration: settings.newProductDuration })}
                                 className="h-14 rounded-none bg-black text-white px-8 font-black uppercase text-[10px]"
                               >FIJAR</Button>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>

                {/* Orders Security */}
                <div className="bg-black text-white p-8">
                   <div className="flex items-center gap-3 mb-8">
                      <div className="w-10 h-10 bg-kaosNeon text-black flex items-center justify-center"><ShieldCheck className="h-5 w-5" /></div>
                      <div>
                        <h3 className="text-xl font-black uppercase tracking-tighter text-white">Seguridad de Transacciones</h3>
                        <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Protocolos de Gestión de Órdenes</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="flex items-center justify-between p-6 border border-white/5 bg-white/5">
                         <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-white">Borrado de Pedidos</Label>
                            <p className="text-[8px] font-bold text-white/20 uppercase">Habilitar eliminación física de registros</p>
                         </div>
                         <Switch 
                           checked={settings.orders?.allowDelete || false} 
                           onCheckedChange={(v) => saveSettings({ orders: { ...(settings.orders || { prefix: "KAOS", allowDelete: false }), allowDelete: v }})}
                           className="data-[state=checked]:bg-kaosNeon"
                         />
                      </div>
                      <div className="space-y-2">
                         <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Prefijo de Manifiesto</Label>
                         <div className="flex gap-2">
                            <Input 
                              value={settings.orders?.prefix || ""} 
                              onChange={(e) => setSettings({...settings, orders: {...(settings.orders || { prefix: "KAOS", allowDelete: false }), prefix: e.target.value.toUpperCase()}})}
                              className="h-14 rounded-none border-white/10 bg-white/5 text-white focus:border-kaosNeon font-black text-center tracking-widest uppercase"
                            />
                            <Button 
                              onClick={() => saveSettings({ orders: settings.orders || { prefix: "KAOS", allowDelete: false } })}
                              className="h-14 rounded-none bg-kaosNeon text-black px-8 font-black uppercase text-[10px]"
                            >ACTUALIZAR</Button>
                         </div>
                      </div>
                   </div>
                </div>
             </div>

             {/* Right Column: Status Summary */}
             <div className="xl:col-span-4 space-y-4">
                <div className="bg-white border border-black p-6">
                   <span className="text-[9px] font-black uppercase tracking-[0.2em] text-black/20 block mb-4">SISTEMA HEALTH</span>
                   <div className="space-y-4">
                      {[
                        { label: "API DATABASE", status: "ONLINE", color: "text-kaosNeon" },
                        { label: "STORAGE ENGINE", status: "SYNCED", color: "text-kaosNeon" },
                        { label: "EMAIL GATEWAY", status: "CONNECTED", color: "text-kaosNeon" },
                        { label: "SECURITY SHIELD", status: "ACTIVE", color: "text-kaosNeon" },
                      ].map((item, i) => (
                        <div key={i} className="flex justify-between items-center border-b border-black/5 pb-2">
                           <span className="text-[10px] font-black uppercase tracking-widest text-black/40">{item.label}</span>
                           <span className={cn("text-[10px] font-black uppercase", item.color)}>{item.status}</span>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        </TabsContent>

        {/* =========================
            TAB: PAYMENT (FINANZAS)
        ========================== */}
        <TabsContent value="payment" className="m-0 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
           <div className="flex flex-col md:flex-row md:items-center justify-between border-b-2 border-black pb-6 gap-4">
              <div>
                 <h2 className="text-3xl font-black uppercase tracking-tighter">Gestión de Cobranza</h2>
                 <p className="text-[10px] font-bold text-black/30 uppercase tracking-widest">Protocolos de Recepción y Verificación de Fondos</p>
              </div>
              <Button 
                onClick={() => {
                  setEditingPayment({
                    id: "", name: "", isActive: true, requiresProof: true,
                    hasDiscount: false, discountPercentage: 0, order: settings.paymentMethods.length + 1
                  })
                  setShowPaymentForm(true)
                }}
                className="bg-black text-white rounded-none h-14 px-10 text-[11px] font-black uppercase tracking-widest hover:bg-kaosNeon hover:text-black transition-all"
              >
                <Plus className="h-4 w-4 mr-2" /> INTEGRAR CANAL
              </Button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedPayments.map((method) => {
                 const Icon = paymentIconFor(method.id)
                 return (
                    <div key={method._id ?? method.id} className="group relative bg-white border border-black/5 hover:border-black p-8 transition-all duration-300 flex flex-col justify-between h-56 shadow-sm hover:shadow-xl">
                       <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-all flex gap-2">
                          <Button variant="ghost" className="w-8 h-8 p-0 rounded-none border border-black/10 hover:bg-black hover:text-white" onClick={() => { setEditingPayment({...method}); setShowPaymentForm(true); }}><Edit2 className="h-3 w-3" /></Button>
                          <Button variant="ghost" className="w-8 h-8 p-0 rounded-none border border-black/10 hover:bg-red-600 hover:text-white" onClick={() => deletePaymentMethod(method.id)}><Trash2 className="h-3 w-3" /></Button>
                       </div>

                       <div className="flex items-center gap-4 mb-4">
                          <div className="w-14 h-14 bg-black text-white flex items-center justify-center shrink-0 border border-black"><Icon className="h-6 w-6" /></div>
                          <div className="min-w-0">
                             <h4 className="text-lg font-black uppercase tracking-tighter truncate">{method.name}</h4>
                             <span className={cn(
                               "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 border",
                               method.isActive ? "border-kaosNeon text-black bg-kaosNeon" : "border-black/10 text-black/20"
                             )}>{method.isActive ? "OPERATIVO" : "DESHABILITADO"}</span>
                          </div>
                       </div>
                       
                       <div className="space-y-2 mt-auto">
                          <p className="text-[9px] font-bold text-black/40 uppercase tracking-widest line-clamp-2">{method.description || "Canal de pago estándar"}</p>
                          <div className="flex gap-2">
                             {method.requiresProof && <span className="text-[7px] font-black border border-black/5 px-1 uppercase text-black/30">REQUIERE COMPROBANTE</span>}
                             {method.hasDiscount && <span className="text-[7px] font-black bg-black text-kaosNeon px-1 uppercase">-{method.discountPercentage}% OFF</span>}
                          </div>
                       </div>
                    </div>
                 )
              })}
           </div>
        </TabsContent>


        {/* =========================
            TAB: SHIPPING (LOGÍSTICA)
        ========================== */}
        <TabsContent value="shipping" className="m-0 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
           <div className="flex flex-col md:flex-row md:items-center justify-between border-b-2 border-black pb-6 gap-4">
              <div>
                 <h2 className="text-3xl font-black uppercase tracking-tighter">Canales de Distribución</h2>
                 <p className="text-[10px] font-bold text-black/30 uppercase tracking-widest">Configuración de Rutas, Costos y Puntos de Entrega</p>
              </div>
              <Button 
                onClick={() => {
                  setEditingShipping({
                    id: "", name: "", isActive: true, type: "delivery", additionalCost: 0,
                    freeFrom: 100, requiresAddress: true, order: settings.shippingMethods.length + 1
                  })
                  setShowShippingForm(true)
                }}
                className="bg-black text-white rounded-none h-14 px-10 text-[11px] font-black uppercase tracking-widest hover:bg-kaosNeon hover:text-black transition-all"
              >
                <Plus className="h-4 w-4 mr-2" /> REGISTRAR RUTA
              </Button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedShipping.map((method) => {
                 const Icon = shippingIconFor(method.type)
                 return (
                    <div key={method._id ?? method.id} className="group relative bg-white border border-black/5 hover:border-black p-8 transition-all duration-300 flex flex-col justify-between h-64 shadow-sm hover:shadow-xl">
                       <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-all flex gap-2">
                          <Button variant="ghost" className="w-8 h-8 p-0 rounded-none border border-black/10 hover:bg-black hover:text-white" onClick={() => { setEditingShipping({...method}); setShowShippingForm(true); }}><Edit2 className="h-3 w-3" /></Button>
                          <Button variant="ghost" className="w-8 h-8 p-0 rounded-none border border-black/10 hover:bg-red-600 hover:text-white" onClick={() => deleteShippingMethod(method.id)}><Trash2 className="h-3 w-3" /></Button>
                       </div>

                       <div className="flex items-center gap-4 mb-4">
                          <div className="w-14 h-14 bg-black text-white flex items-center justify-center shrink-0 border border-black"><Icon className="h-6 w-6" /></div>
                          <div className="min-w-0">
                             <h4 className="text-lg font-black uppercase tracking-tighter truncate">{method.name}</h4>
                             <span className={cn(
                               "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 border",
                               method.isActive ? "border-kaosNeon text-black bg-kaosNeon" : "border-black/10 text-black/20"
                             )}>{method.isActive ? "ACTIVO" : "INACTIVO"}</span>
                          </div>
                       </div>
                       
                       <div className="space-y-4">
                          <div className="flex justify-between items-end border-b border-black/5 pb-2">
                             <span className="text-[9px] font-black uppercase tracking-widest text-black/30">Costo Adicional</span>
                             <span className="text-sm font-black">{method.additionalCost > 0 ? formatMoney(currencySymbol, method.additionalCost) : "SIN COSTO"}</span>
                          </div>
                          <div className="flex justify-between items-end border-b border-black/5 pb-2">
                             <span className="text-[9px] font-black uppercase tracking-widest text-black/30">Envío Gratis Desde</span>
                             <span className="text-sm font-black">{formatMoney(currencySymbol, method.freeFrom)}</span>
                          </div>
                       </div>

                       <div className="mt-4">
                          <p className="text-[8px] font-bold text-black/40 uppercase tracking-widest">Protocolo: {method.type?.toUpperCase() || 'DELIVERY'}</p>
                       </div>
                    </div>
                 )
              })}
           </div>
        </TabsContent>

        {/* =========================
            TAB: EXCHANGE (DIVISAS)
        ========================== */}
        <TabsContent value="exchange" className="m-0 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Main Rate Control */}
              <div className="bg-white border border-black p-8 space-y-8">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-black text-white flex items-center justify-center"><RefreshCw className={cn("h-5 w-5", updatingRate && "animate-spin")} /></div>
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tighter">Terminal de Divisas</h3>
                      <p className="text-[9px] font-bold text-black/30 uppercase tracking-widest">Control de Tasa de Cambio en Tiempo Real</p>
                    </div>
                 </div>

                 <div className="p-8 bg-black text-white space-y-6">
                    <div className="flex justify-between items-center">
                       <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Tasa Actual (USD/VES)</span>
                       <span className="text-[9px] font-black uppercase px-2 py-1 bg-kaosNeon text-black">LIVE</span>
                    </div>
                    <div className="text-6xl font-black tracking-tighter">
                       {exchangeRate?.usd.toFixed(2) || "0.00"} <span className="text-xl text-kaosNeon uppercase">BS</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40">
                       <Clock className="h-3 w-3" /> Sincronizado: {exchangeRate ? new Date(exchangeRate.date).toLocaleString() : "---"}
                    </div>
                 </div>

                 <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-black/40">Sobreescribir Tasa Manualmente</Label>
                    <div className="flex gap-2">
                       <Input 
                         placeholder="EJ: 36.50"
                         value={manualRate.usd}
                         onChange={(e) => setManualRate({ usd: e.target.value })}
                         className="h-14 rounded-none border-black focus:border-black font-black text-center text-lg bg-white text-black"
                       />
                       <Button 
                         onClick={() => updateExchangeRate({ usd: parseFloat(manualRate.usd) })}
                         disabled={updatingRate || !manualRate.usd}
                         className="h-14 rounded-none bg-black text-white px-10 font-black uppercase text-[11px]"
                       >FIJAR TASA</Button>
                    </div>
                    <Button 
                      variant="outline"
                      onClick={() => updateExchangeRate()}
                      disabled={updatingRate}
                      className="w-full h-14 rounded-none border-black font-black uppercase text-[11px] tracking-widest hover:bg-black hover:text-white transition-all"
                    >
                      <RefreshCw className={cn("h-4 w-4 mr-2", updatingRate && "animate-spin")} /> AUTO-SINCRONIZAR BCV
                    </Button>
                 </div>
              </div>

              {/* History Graph / List Placeholder */}
              <div className="bg-black text-white p-8 space-y-6">
                 <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black uppercase tracking-tighter">Log de Variación</h3>
                    <Globe className="h-5 w-5 text-kaosNeon" />
                 </div>
                 
                 <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                    {rateHistory.slice(0, 10).map((h, i) => (
                       <div key={i} className="flex justify-between items-center border-b border-white/5 pb-3">
                          <div className="flex flex-col">
                             <span className="text-[10px] font-black uppercase">{new Date(h.date).toLocaleDateString()}</span>
                             <span className="text-[8px] font-bold text-white/30 uppercase">{new Date(h.date).toLocaleTimeString()}</span>
                          </div>
                          <div className="flex items-center gap-3">
                             <span className="text-lg font-black text-kaosNeon">{h.usd.toFixed(2)}</span>
                             <ArrowUpRight className="h-3 w-3 text-white/20" />
                          </div>
                       </div>
                    ))}
                    {rateHistory.length === 0 && (
                       <p className="text-[10px] font-black uppercase text-white/20 text-center py-12">No hay registros previos</p>
                    )}
                 </div>
              </div>
           </div>
        </TabsContent>


        {/* =========================
            TAB: GASTOS
        ========================== */}
        <TabsContent value="gastos" className="m-0 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
           <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
              <div className="xl:col-span-8 space-y-8">
                 <div className="bg-white border border-black p-8">
                    <div className="flex items-center gap-3 mb-8">
                       <div className="w-10 h-10 bg-black text-white flex items-center justify-center"><Banknote className="h-5 w-5" /></div>
                       <div>
                         <h3 className="text-xl font-black uppercase tracking-tighter">Categorías de Gastos</h3>
                         <p className="text-[9px] font-bold text-black/30 uppercase tracking-widest">Protocolos de Clasificación de Salidas</p>
                       </div>
                    </div>

                    <div className="space-y-6">
                       <div className="flex gap-2">
                          <Input 
                            id="new-category"
                            placeholder="NUEVA CATEGORÍA (EJ: PUBLICIDAD)"
                            className="h-14 rounded-none border-black font-black uppercase tracking-widest bg-white text-black"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const input = e.currentTarget;
                                const value = input.value.trim();
                                if (value && !settings.expenseCategories?.includes(value)) {
                                  const newCats = [...(settings.expenseCategories || []), value];
                                  saveSettings({ expenseCategories: newCats });
                                  input.value = "";
                                }
                              }
                            }}
                          />
                          <Button 
                            onClick={() => {
                              const input = document.getElementById('new-category') as HTMLInputElement;
                              const value = input.value.trim();
                              if (value && !settings.expenseCategories?.includes(value)) {
                                const newCats = [...(settings.expenseCategories || []), value];
                                saveSettings({ expenseCategories: newCats });
                                input.value = "";
                              }
                            }}
                            className="h-14 rounded-none bg-black text-white px-8 font-black uppercase text-[10px]"
                          >AGREGAR</Button>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {(settings.expenseCategories || []).map((cat, i) => (
                             <div key={i} className="flex justify-between items-center p-4 bg-black/[0.02] border border-black/5 group hover:border-black transition-all">
                                <span className="text-xs font-black uppercase tracking-widest">{cat}</span>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => {
                                    const newCats = settings.expenseCategories?.filter(c => c !== cat);
                                    saveSettings({ expenseCategories: newCats });
                                  }}
                                  className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0 text-red-500 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                             </div>
                          ))}
                       </div>
                    </div>
                 </div>
              </div>

              <div className="xl:col-span-4 space-y-4">
                 <div className="bg-black text-white p-8">
                    <h4 className="text-sm font-black uppercase tracking-widest mb-4">Información de Gastos</h4>
                    <p className="text-[10px] text-white/40 leading-relaxed uppercase font-bold">
                       Las categorías definidas aquí serán utilizadas para clasificar todos los egresos del sistema en la sección de contabilidad operativa.
                    </p>
                    <div className="mt-8 pt-8 border-t border-white/10">
                       <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black uppercase text-white/20">Total Categorías</span>
                          <span className="text-xl font-black text-kaosNeon">{settings.expenseCategories?.length || 0}</span>
                       </div>
                    </div>
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
            
            <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row items-center gap-8">
               <div className="w-32 h-32 border-2 border-black bg-gray-50 flex items-center justify-center overflow-hidden relative group">
                  {settings.business?.logo ? (
                     <img src={settings.business.logo} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                     <div className="text-center p-4">
                        <Building className="h-8 w-8 mx-auto text-black/20 mb-2" />
                        <span className="text-[8px] font-black uppercase text-black/30">SIN LOGO</span>
                     </div>
                  )}
               </div>
               <div className="flex-1 space-y-4">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest mb-1">Identidad Visual (Logo)</h4>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Se recomienda formato PNG o SVG con fondo transparente</p>
                  </div>
                  <div className="flex gap-2">
                     <Input 
                        placeholder="URL DEL LOGO (EJ: https://.../logo.png)"
                        value={settings.business?.logo || ""}
                        onChange={(e) => setSettings({ ...settings, business: { ...(settings.business || {}), logo: e.target.value } })}
                        className="h-12 rounded-none border-black text-[10px] font-bold bg-white text-black"
                     />
                  </div>
               </div>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Razón Social / Marca</label>
                  <Input
                    value={settings.business?.name || ""}
                    onChange={(e) => setSettings({ ...settings, business: { ...(settings.business || {}), name: e.target.value } })}
                    className="h-14 rounded-none border-black focus:ring-0 font-black uppercase tracking-tight text-lg bg-white text-black"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Slogan / Manifesto</label>
                  <Input
                    value={settings.business?.slogan || ""}
                    onChange={(e) => setSettings({ ...settings, business: { ...(settings.business || {}), slogan: e.target.value } })}
                    className="h-14 rounded-none border-black focus:ring-0 font-bold text-black bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Canal de Ventas (WhatsApp)</label>
                  <Input
                    value={settings.whatsapp?.number || ""}
                    onChange={(e) => setSettings({ ...settings, whatsapp: { ...(settings.whatsapp || {}), number: e.target.value } })}
                    className="h-14 rounded-none border-black focus:ring-0 font-black bg-white text-black"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email Administrativo</label>
                  <Input
                    value={settings.business?.email || ""}
                    onChange={(e) => setSettings({ ...settings, business: { ...(settings.business || {}), email: e.target.value } })}
                    className="h-14 rounded-none border-black focus:ring-0 font-black bg-white text-black"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Teléfono Contacto</label>
                  <Input
                    value={settings.business?.phone || ""}
                    onChange={(e) => setSettings({ ...settings, business: { ...(settings.business || {}), phone: e.target.value } })}
                    className="h-14 rounded-none border-black focus:ring-0 font-black bg-white text-black"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Centro de Operaciones (Dirección)</label>
                <Textarea
                  value={settings.business?.address || ""}
                  onChange={(e) => setSettings({ ...settings, business: { ...(settings.business || {}), address: e.target.value } })}
                  className="min-h-[120px] rounded-none border-black focus:ring-0 font-bold bg-white text-black"
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

        {/* =========================
            TAB: ZERNIO (INSTAGRAM)
        ========================== */}
        <TabsContent value="zernio" className="m-0 space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {loadingZernio && !zernioConfig ? (
            <div className="border border-black bg-white p-16 text-center space-y-4">
              <Loader2 className="h-10 w-10 animate-spin mx-auto text-black" />
              <span className="block text-[10px] font-black uppercase tracking-widest text-black/50">CARGANDO PROTOCOLOS DE INSTAGRAM...</span>
            </div>
          ) : (
            <>
              {/* Connection Status Banner */}
              {zernioConfig?.connected ? (
                <div className="border border-black bg-white p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,0.05)]">
                  {/* Glowing neon green accent line on top */}
                  <div className="absolute top-0 left-0 w-full h-[4px] bg-green-500"></div>
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 border-2 border-black flex items-center justify-center bg-green-50 shrink-0">
                      <Instagram className="h-8 w-8 text-black animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-[8px] font-black uppercase tracking-widest bg-green-500 text-white px-3 py-1">CONEXIÓN ONLINE</span>
                        <h3 className="text-2xl font-black uppercase tracking-tighter">@{zernioConfig.username || "kaos.vzla"}</h3>
                      </div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-2">
                        VINCULADO A: {zernioConfig.displayName || "KAOS CREATIVE ACCOUNT"} • Sincronizado: {zernioConfig.lastSyncedAt ? new Date(zernioConfig.lastSyncedAt).toLocaleString("es-VE", { timeZone: "America/Caracas" }) : "PENDIENTE"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 w-full md:w-auto">
                    <Button 
                      onClick={handleSyncZernio} 
                      disabled={syncingZernio || loadingZernio}
                      className="flex-1 md:flex-initial h-12 rounded-none border border-black bg-white text-black hover:bg-gray-50 px-6 font-black uppercase text-[10px] tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
                    >
                      {syncingZernio ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                      SINCRONIZAR
                    </Button>
                    <Button 
                      onClick={handleDisconnectZernio} 
                      disabled={loadingZernio}
                      className="flex-1 md:flex-initial h-12 rounded-none bg-red-600 text-white hover:bg-red-700 px-6 font-black uppercase text-[10px] tracking-widest shadow-[4px_4px_0px_0px_rgba(220,38,38,0.15)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
                    >
                      DESVINCULAR
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border border-black bg-white p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,0.05)]">
                  {/* Stiff red accent line on top */}
                  <div className="absolute top-0 left-0 w-full h-[4px] bg-red-500"></div>
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 border-2 border-black flex items-center justify-center bg-red-50 shrink-0">
                      <Instagram className="h-8 w-8 text-black opacity-30" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-[8px] font-black uppercase tracking-widest bg-red-500 text-white px-3 py-1">CONEXIÓN OFFLINE</span>
                        <h3 className="text-2xl font-black uppercase tracking-tighter text-gray-400">SIN INTEGRACIÓN</h3>
                      </div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-2">
                        VINCULA LA API KEY DE ZERNIO PARA SINCRONIZAR PUBLICACIONES DE INSTAGRAM EN EL HOME PAGE
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* API Key Panel when disconnected */}
              {!zernioConfig?.connected && (
                <div className="border border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.05)]">
                  <h3 className="text-lg font-black uppercase tracking-tighter mb-2">Establecer Enlace</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">INGRESA EL PROTOCOLO DE AUTENTICACIÓN DE ZERNIO</p>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Input
                        type={showZernioKey ? "text" : "password"}
                        placeholder="INTRODUCE TU API KEY DE ZERNIO (sk_...)"
                        value={zernioApiKeyInput}
                        onChange={(e) => setZernioApiKeyInput(e.target.value)}
                        className="h-14 rounded-none border-black font-mono text-xs uppercase bg-white text-black pr-12 focus:ring-0 focus:border-black"
                      />
                      <button
                        type="button"
                        onClick={() => setShowZernioKey(!showZernioKey)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
                      >
                        {showZernioKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    <Button
                      onClick={handleConnectZernio}
                      disabled={loadingZernio || !zernioApiKeyInput.trim()}
                      className="h-14 rounded-none bg-black text-white px-10 font-black uppercase text-[10px] tracking-widest hover:bg-gray-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.15)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
                    >
                      {loadingZernio ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      ESTABLECER ENLACE
                    </Button>
                  </div>
                  <div className="mt-4 p-4 bg-gray-50 border border-black/5 text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
                    Nota: La API Key de Zernio es necesaria para sincronizar tus publicaciones de forma segura. Puedes generarla en tu panel de Zernio.com.
                  </div>
                </div>
              )}

              {/* Sync Configuration & Preview Grid */}
              {zernioConfig?.connected && (
                <div className="border border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.05)]">
                  <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6 border-b border-black/10 pb-6 mb-6">
                    <div>
                      <h3 className="text-lg font-black uppercase tracking-tighter">Publicaciones Sincronizadas</h3>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                        VISTA PREVIA DE LAS PUBLICACIONES EN CACHÉ DEL SISTEMA
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">POSTS A MOSTRAR</span>
                        <Input
                          type="number"
                          min={1}
                          max={20}
                          value={zernioLimitInput}
                          onChange={(e) => setZernioLimitInput(clampNumber(parseInt(e.target.value) || 7, 1, 20))}
                          className="w-20 h-10 rounded-none border-black font-black text-center focus:ring-0 focus:border-black text-xs bg-white text-black"
                        />
                      </div>
                      <Button
                        onClick={handleUpdateZernioConfig}
                        disabled={loadingZernio}
                        className="h-10 rounded-none bg-black text-white px-6 font-black uppercase text-[10px] tracking-widest hover:bg-gray-800 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.15)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                      >
                        {loadingZernio ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : "APLICAR AFECCIÓN"}
                      </Button>
                    </div>
                  </div>

                  {zernioConfig.posts && zernioConfig.posts.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-2">
                      {zernioConfig.posts.map((post: any, idx: number) => (
                        <a 
                          key={post.id || idx} 
                          href={post.permalink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="aspect-square overflow-hidden bg-gray-100 border border-black/10 group relative block"
                        >
                          <img
                            alt={`Preview ${idx + 1}`}
                            src={post.picture}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-between p-3 text-white font-mono text-[9px]">
                            <div className="line-clamp-3 leading-tight uppercase font-bold text-white/90">
                              {post.message || "SIN DESCRIPCIÓN"}
                            </div>
                            <div className="flex justify-between font-black text-kaosNeon pt-2 border-t border-white/10">
                              <span>❤️ {post.likeCount}</span>
                              <span>💬 {post.commentCount}</span>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="border border-dashed border-black/20 p-16 text-center bg-gray-50">
                      <span className="text-[10px] font-black uppercase text-black/30">SIN PUBLICACIONES EN CACHÉ. HAZ CLICK EN SINCRONIZAR PARA CARGAR TU FEED.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Terminal Logs Viewer */}
              <div className="border border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.05)]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-black text-white flex items-center justify-center"><Activity className="h-4 w-4" /></div>
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-tighter">Terminal de Diagnóstico</h3>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                      HISTORIAL DE EVENTOS Y LOGS DE LA API DE ZERNIO
                    </p>
                  </div>
                </div>

                <div className="bg-black text-white p-6 rounded-none font-mono text-[9px] leading-relaxed max-h-[250px] overflow-y-auto custom-scrollbar border border-black shadow-inner">
                  {zernioConfig?.logs && zernioConfig.logs.length > 0 ? (
                    <div className="space-y-2">
                      {zernioConfig.logs.map((log: any, idx: number) => (
                        <div 
                          key={idx} 
                          className={cn(
                            "pb-2 border-b border-white/5 last:border-b-0 flex items-start gap-3",
                            log.type === "error" ? "text-red-400" : log.type === "warning" ? "text-yellow-400" : "text-gray-300"
                          )}
                        >
                          <span className="text-white/30 shrink-0 font-bold">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                          <span className="shrink-0 font-black uppercase tracking-widest text-[8px] bg-white/10 px-1 py-0.2 rounded-none">
                            {log.type}
                          </span>
                          <span className="font-bold uppercase tracking-wide leading-tight">{log.message}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-white/20 text-center py-8 uppercase font-bold tracking-widest">
                      NO SE ENCONTRARON EVENTOS REGISTRADOS
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* =========================
            TAB: LIFESTYLE (NUEVO DROP)
        ========================== */}
        <TabsContent value="lifestyle" className="m-0 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="bg-white border border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.05)]">
             <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-black/10 pb-6 mb-6 gap-4">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-black text-white flex items-center justify-center"><ImageIcon className="h-5 w-5" /></div>
                   <div>
                     <h3 className="text-xl font-black uppercase tracking-tighter">Lookbook / Nuevo Drop</h3>
                     <p className="text-[9px] font-bold text-black/30 uppercase tracking-widest">Control visual del home page</p>
                   </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      const defaults = [
                        { name: "Acuarela", src: "/nuevo/drop-acuarela.jpg" },
                        { name: "Quotes", src: "/nuevo/drop-quotes.jpg" },
                        { name: "Funky & Colorido", src: "/nuevo/drop-funky.jpg" },
                        { name: "Con Flow", src: "/nuevo/drop-flow.jpg" },
                      ]
                      setSettings({ ...settings, lifestyleDropImages: defaults })
                    }}
                    variant="outline"
                    className="rounded-none h-12 border-black/20 hover:border-black text-[10px] font-black uppercase tracking-widest"
                  >
                    Restaurar Predeterminados
                  </Button>
                  <Button
                    onClick={() => {
                      const newImages = [...(settings.lifestyleDropImages || []), { name: "Nuevo Look", src: "" }]
                      setSettings({ ...settings, lifestyleDropImages: newImages })
                    }}
                    className="bg-black text-white rounded-none h-12 px-6 text-[10px] font-black uppercase tracking-widest hover:bg-kaosNeon hover:text-black transition-all"
                  >
                    <Plus className="h-4 w-4 mr-2" /> Agregar Item
                  </Button>
                </div>
             </div>

             <div className="space-y-6">
                {(!settings.lifestyleDropImages || settings.lifestyleDropImages.length === 0) ? (
                   <div className="border border-dashed border-black/20 p-16 text-center bg-gray-50">
                     <span className="text-[10px] font-black uppercase text-black/30 block mb-4">No hay imágenes configuradas para la sección nuevo drop.</span>
                     <Button
                       onClick={() => {
                         const defaults = [
                           { name: "Acuarela", src: "/nuevo/drop-acuarela.jpg" },
                           { name: "Quotes", src: "/nuevo/drop-quotes.jpg" },
                           { name: "Funky & Colorido", src: "/nuevo/drop-funky.jpg" },
                           { name: "Con Flow", src: "/nuevo/drop-flow.jpg" },
                         ]
                         setSettings({ ...settings, lifestyleDropImages: defaults })
                       }}
                       className="bg-black text-white rounded-none h-10 px-6 text-[10px] font-black uppercase tracking-widest"
                     >
                       Cargar Valores por Defecto
                     </Button>
                   </div>
                ) : (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {(settings.lifestyleDropImages || []).map((img, idx) => {
                         const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            const formData = new FormData()
                            formData.append("images", file)
                            toast({ title: "Subiendo...", description: "Cargando archivo al servidor..." })
                            try {
                               const res = await api.tempUpload(formData)
                               if (res.success && res.url) {
                                  const updated = [...(settings.lifestyleDropImages || [])]
                                  updated[idx] = { ...updated[idx], src: res.url }
                                  setSettings({ ...settings, lifestyleDropImages: updated })
                                  toast({ title: "Completado", description: "Imagen subida correctamente" })
                               } else {
                                  toast({ title: "Error", description: "No se pudo subir la imagen", variant: "destructive" })
                               }
                            } catch (err) {
                               toast({ title: "Error", description: "Fallo la conexión con el servidor", variant: "destructive" })
                            }
                         }

                         const moveItem = (dir: "up" | "down") => {
                            const updated = [...(settings.lifestyleDropImages || [])]
                            const targetIdx = dir === "up" ? idx - 1 : idx + 1
                            if (targetIdx < 0 || targetIdx >= updated.length) return
                            const temp = updated[idx]
                            updated[idx] = updated[targetIdx]
                            updated[targetIdx] = temp
                            setSettings({ ...settings, lifestyleDropImages: updated })
                         }

                         return (
                            <div key={idx} className="border border-black bg-gray-50/50 p-4 space-y-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] relative flex flex-col justify-between">
                               <div className="space-y-4">
                                  <div className="aspect-[4/5] bg-white border border-black/10 overflow-hidden relative group">
                                     {img.src ? (
                                        <img src={cleanImageUrl(img.src)} alt={img.name} className="w-full h-full object-cover" />
                                     ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-black/20 text-[9px] font-black uppercase">Sin Imagen</div>
                                     )}
                                     <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                                        <label className="bg-white text-black text-[9px] font-black uppercase px-4 py-2 hover:bg-kaosNeon hover:text-black cursor-pointer tracking-wider transition-colors border border-black">
                                           Subir Archivo
                                           <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                                        </label>
                                     </div>
                                  </div>

                                  <div className="space-y-2">
                                     <Label className="text-[8px] font-black uppercase text-black/40">Título / Nombre</Label>
                                     <Input
                                        value={img.name}
                                        onChange={(e) => {
                                           const updated = [...(settings.lifestyleDropImages || [])]
                                           updated[idx] = { ...updated[idx], name: e.target.value }
                                           setSettings({ ...settings, lifestyleDropImages: updated })
                                        }}
                                        className="h-10 rounded-none border-black font-black uppercase text-[10px]"
                                        placeholder="Ej: Acuarela"
                                     />
                                  </div>

                                  <div className="space-y-2">
                                     <Label className="text-[8px] font-black uppercase text-black/40">Enlace de la Imagen (URL)</Label>
                                     <Input
                                        value={img.src}
                                        onChange={(e) => {
                                           const updated = [...(settings.lifestyleDropImages || [])]
                                           updated[idx] = { ...updated[idx], src: e.target.value }
                                           setSettings({ ...settings, lifestyleDropImages: updated })
                                        }}
                                        className="h-10 rounded-none border-black text-xs font-mono"
                                        placeholder="Ej: https://... o /uploads/..."
                                     />
                                  </div>
                               </div>

                               <div className="flex justify-between items-center gap-2 pt-4 border-t border-black/5 mt-4">
                                  <div className="flex gap-1">
                                     <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={idx === 0}
                                        onClick={() => moveItem("up")}
                                        className="h-8 w-8 p-0 rounded-none border-black/20 hover:border-black"
                                     >
                                        ↑
                                     </Button>
                                     <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={idx === (settings.lifestyleDropImages || []).length - 1}
                                        onClick={() => moveItem("down")}
                                        className="h-8 w-8 p-0 rounded-none border-black/20 hover:border-black"
                                     >
                                        ↓
                                     </Button>
                                  </div>
                                  <Button
                                     size="sm"
                                     variant="ghost"
                                     onClick={() => {
                                        const updated = (settings.lifestyleDropImages || []).filter((_, i) => i !== idx)
                                        setSettings({ ...settings, lifestyleDropImages: updated })
                                     }}
                                     className="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-none font-black text-[9px] uppercase tracking-wider"
                                  >
                                     Eliminar
                                  </Button>
                               </div>
                            </div>
                         )
                      })}
                   </div>
                )}
             </div>

             <div className="flex justify-end pt-8 border-t border-black/10 mt-8">
                <Button
                  onClick={() => saveSettings({ lifestyleDropImages: settings.lifestyleDropImages })}
                  disabled={saving}
                  className="bg-black text-white h-14 px-10 rounded-none font-black uppercase text-[11px] tracking-widest hover:bg-kaosNeon hover:text-black transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,0.15)] active:translate-x-1 active:translate-y-1 active:shadow-none"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Guardar Estructura Lookbook
                </Button>
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
                   <Input value={editingPayment.name} onChange={(e) => setEditingPayment({ ...editingPayment, name: e.target.value })} className="rounded-none border-black font-black uppercase bg-white text-black" />
                 </div>
                 <div className="space-y-1">
                   <Label className="text-[10px] font-black uppercase text-gray-400">Descripción Pública</Label>
                   <Input value={editingPayment.description || ""} onChange={(e) => setEditingPayment({ ...editingPayment, description: e.target.value })} className="rounded-none border-black font-bold text-xs bg-white text-black" />
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

               <div className="space-y-6 pt-4 border-t border-gray-100">
                  <h4 className="text-[10px] font-black uppercase text-black/50">Datos Bancarios / Billetera (Opcional)</h4>
                  <div className="grid grid-cols-2 gap-6">
                     <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-gray-400">Banco / Plataforma</Label>
                        <Input value={editingPayment.accountData?.bankName || ""} onChange={(e) => setEditingPayment({ ...editingPayment, accountData: { ...editingPayment.accountData, bankName: e.target.value } })} className="rounded-none border-black font-bold bg-white text-black" placeholder="Ej: Banesco, Binance" />
                     </div>
                     <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-gray-400">Titular</Label>
                        <Input value={editingPayment.accountData?.accountHolder || ""} onChange={(e) => setEditingPayment({ ...editingPayment, accountData: { ...editingPayment.accountData, accountHolder: e.target.value } })} className="rounded-none border-black font-bold bg-white text-black" />
                     </div>
                     <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-gray-400">Cédula / RIF</Label>
                        <Input value={editingPayment.accountData?.identification || ""} onChange={(e) => setEditingPayment({ ...editingPayment, accountData: { ...editingPayment.accountData, identification: e.target.value } })} className="rounded-none border-black font-bold bg-white text-black" />
                     </div>
                     <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-gray-400">Número de Cuenta / Teléfono</Label>
                        <Input value={editingPayment.accountData?.accountNumber || ""} onChange={(e) => setEditingPayment({ ...editingPayment, accountData: { ...editingPayment.accountData, accountNumber: e.target.value } })} className="rounded-none border-black font-bold bg-white text-black" />
                     </div>
                  </div>
               </div>

               <div className="flex gap-6 py-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <Switch checked={!!editingPayment.hasDiscount} onCheckedChange={(checked) => setEditingPayment({ ...editingPayment, hasDiscount: checked })} className="data-[state=checked]:bg-black" />
                    <Label className="text-[10px] font-black uppercase">Aplica Descuento</Label>
                  </div>
                  {editingPayment.hasDiscount && (
                    <div className="flex-1 space-y-1 max-w-[200px]">
                       <Label className="text-[10px] font-black uppercase text-gray-400">Descuento (%)</Label>
                       <Input type="number" value={editingPayment.discountPercentage || 0} onChange={(e) => setEditingPayment({ ...editingPayment, discountPercentage: parseFloat(e.target.value) })} className="rounded-none border-black font-bold bg-white text-black" />
                    </div>
                  )}
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
                   <Input value={editingShipping.name} onChange={(e) => setEditingShipping({ ...editingShipping, name: e.target.value })} className="rounded-none border-black font-black uppercase bg-white text-black" />
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
                   <Input type="number" value={editingShipping.additionalCost} onChange={(e) => setEditingShipping({ ...editingShipping, additionalCost: parseFloat(e.target.value) })} className="rounded-none border-black font-black bg-white text-black" />
                 </div>
                 <div className="space-y-1">
                   <Label className="text-[10px] font-black uppercase text-gray-400">Umbral Gratis (BS)</Label>
                   <Input type="number" value={editingShipping.freeFrom} onChange={(e) => setEditingShipping({ ...editingShipping, freeFrom: parseFloat(e.target.value) })} className="rounded-none border-black font-black bg-white text-black" />
                 </div>
               </div>
            </div>
               
               {/* Campos condicionales según el tipo de ruta */}
               {editingShipping.type === 'pickup' && (
                 <div className="space-y-6 pt-4 border-t border-gray-100">
                    <h4 className="text-[10px] font-black uppercase text-black/50">Datos del Punto de Retiro</h4>
                    <div className="space-y-4">
                       <div className="space-y-1">
                         <Label className="text-[10px] font-black uppercase text-gray-400">Dirección Exacta</Label>
                         <Textarea 
                           value={editingShipping.pickupData?.address || ""} 
                           onChange={(e) => setEditingShipping({ ...editingShipping, pickupData: { ...editingShipping.pickupData, address: e.target.value } })} 
                           className="rounded-none border-black font-bold text-xs bg-white text-black min-h-[60px]" 
                           placeholder="Ej: Av. Principal, C.C. El Recreo, Nivel 1, Local 12"
                         />
                       </div>
                       <div className="grid grid-cols-2 gap-6">
                         <div className="space-y-1">
                           <Label className="text-[10px] font-black uppercase text-gray-400">Horario</Label>
                           <Input 
                             value={editingShipping.pickupData?.schedule || ""} 
                             onChange={(e) => setEditingShipping({ ...editingShipping, pickupData: { ...editingShipping.pickupData, schedule: e.target.value } })} 
                             className="rounded-none border-black font-bold bg-white text-black" 
                             placeholder="Ej: Lun - Vie: 9am a 5pm"
                           />
                         </div>
                         <div className="space-y-1">
                           <Label className="text-[10px] font-black uppercase text-gray-400">Teléfono</Label>
                           <Input 
                             value={editingShipping.pickupData?.phone || ""} 
                             onChange={(e) => setEditingShipping({ ...editingShipping, pickupData: { ...editingShipping.pickupData, phone: e.target.value } })} 
                             className="rounded-none border-black font-bold bg-white text-black" 
                             placeholder="Ej: 0412-1234567"
                           />
                         </div>
                       </div>
                    </div>
                 </div>
               )}

               {editingShipping.type === 'delivery' && (
                 <div className="space-y-6 pt-4 border-t border-gray-100">
                    <h4 className="text-[10px] font-black uppercase text-black/50">Datos de Envío a Domicilio</h4>
                    <div className="grid grid-cols-1 gap-6">
                       <div className="space-y-1">
                         <Label className="text-[10px] font-black uppercase text-gray-400">Tiempo Estimado</Label>
                         <Input 
                           value={editingShipping.estimatedTime || ""} 
                           onChange={(e) => setEditingShipping({ ...editingShipping, estimatedTime: e.target.value })} 
                           className="rounded-none border-black font-bold bg-white text-black" 
                           placeholder="Ej: 24 a 48 horas"
                         />
                       </div>
                       <div className="space-y-1">
                         <Label className="text-[10px] font-black uppercase text-gray-400">Descripción / Políticas</Label>
                         <Textarea 
                           value={editingShipping.description || ""} 
                           onChange={(e) => setEditingShipping({ ...editingShipping, description: e.target.value })} 
                           className="rounded-none border-black font-bold text-xs bg-white text-black min-h-[60px]" 
                           placeholder="Ej: Entregas solo en zonas céntricas..."
                         />
                       </div>
                    </div>
                 </div>
               )}
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