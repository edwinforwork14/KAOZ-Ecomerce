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
type CurrencySymbol = "â¬" | "$" | "Bs"

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
  { value: "standard", label: "EstÃ¡ndar" },
] as const

function getCurrencySymbolByCode(code: CurrencyCode): CurrencySymbol {
  if (code === "EUR") return "â¬"
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
        title: "ERROR DE CONEXIÃN",
        description: "No se pudo recuperar la configuraciÃ³n de Zernio",
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
        description: "Introduce una API Key vÃ¡lida para establecer el enlace",
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
          description: res.message || "Instagram conectado con Ã©xito"
        })
      } else {
        toast({
          title: "FALLO DE CONEXIÃN",
          description: res.message || "No se pudo establecer el enlace",
          variant: "destructive"
        })
      }
    } catch (error: any) {
      toast({
        title: "ERROR CRÃTICO",
        description: error.message || "OcurriÃ³ un error al conectar",
        variant: "destructive"
      })
    } finally {
      setLoadingZernio(false)
    }
  }

  const handleDisconnectZernio = async () => {
    if (!confirm("Â¿EstÃ¡s seguro de que deseas desconectar la integraciÃ³n de Instagram? Se borrarÃ¡n la API Key y los posts cacheados.")) {
      return
    }

    setLoadingZernio(true)
    try {
      const res = await api.disconnectZernio()
      if (res?.success && res.config) {
        setZernioConfig(res.config)
        toast({
          title: "DESCONECTADO",
          description: "La integraciÃ³n se ha desactivado correctamente"
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
          title: "SINCRONIZACIÃN EXITOSA",
          description: "Publicaciones e historial actualizados"
        })
      } else {
        toast({
          title: "ERROR DE SINCRONIZACIÃN",
          description: res.message || "No se pudo forzar la sincronizaciÃ³n",
          variant: "destructive"
        })
      }
    } catch (error: any) {
      toast({
        title: "ERROR CRÃTICO",
        description: error.message || "FallÃ³ el protocolo de sincronizaciÃ³n",
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
          title: "CONFIGURACIÃN ACTUALIZADA",
          description: "Los cambios se guardaron y se regenerÃ³ la cachÃ© de posts"
        })
      } else {
        toast({
          title: "FALLO AL GUARDAR",
          description: res.message || "No se pudo actualizar el lÃ­mite",
          variant: "destructive"
        })
      }
    } catch (error: any) {
      toast({
        title: "ERROR",
        description: error.message || "OcurriÃ³ un error al actualizar",
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
        toast({ title: "PASARELA ACTIVA", description: "MÃTODO DE PAGO CONFIGURADO" })
      }
    } catch (error) { }
  }

  const deletePaymentMethod = async (methodId: string) => {
    if (!confirm("Â¿DESVINCULAR MÃTODO DE PAGO?")) return
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
        toast({ title: "RUTA GUARDADA", description: "LOGÃSTICA ACTUALIZADA" })
      }
    } catch (error) { }
  }

  const deleteShippingMethod = async (methodId: string) => {
    if (!confirm("Â¿ELIMINAR RUTA LOGÃSTICA?")) return
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
          <div className="w-16 h-1 bg-neutral-100 overflow-hidden">
            <div className="w-full h-full bg-neutral-900 animate-progress-fast"></div>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse text-neutral-500">Estableciendo Enlaces CrÃ­ticos...</p>
        </div>
      </div>
    )
  }

  if (!settings) return null

  const currencySymbol = settings?.currency?.symbol || "$"

  return (
    <div className="p-4 md:p-8 space-y-8 bg-transparent min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-neutral-200 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-neutral-400 animate-pulse"></div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-450">Core de Operaciones â¢ KAOS</span>
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tighter leading-none text-neutral-900">
            ConfiguraciÃ³n
          </h1>
          <p className="text-[10px] font-bold text-neutral-450 uppercase tracking-widest mt-2">Protocolos de ConfiguraciÃ³n Maestro</p>
        </div>
        <div className="flex items-center gap-6">
           <div className="flex flex-col items-end">
              <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">Estado del Sistema</span>
              <span className="text-xs font-bold text-neutral-800">99.9% OPERATIVO</span>
           </div>
           <div className="w-12 h-12 bg-neutral-50 border border-neutral-200 text-neutral-500 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6" />
           </div>
        </div>
      </div>

      {/* Industrial Tab System */}
      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-8">
        <TabsList className="flex flex-wrap w-full rounded-none border border-neutral-200 p-1 bg-neutral-50 h-auto overflow-hidden gap-1 shadow-sm">
          {[
            { id: "general", label: "SISTEMA", icon: SettingsIcon },
            { id: "payment", label: "FINANZAS", icon: CreditCard },
            { id: "shipping", label: "LOGÃSTICA", icon: Truck },
            { id: "exchange", label: "DIVISAS", icon: DollarSign },
            { id: "gastos", label: "GASTOS", icon: Banknote },
            { id: "business", label: "IDENTIDAD", icon: Building },
            { id: "zernio", label: "INSTAGRAM", icon: Instagram },
            { id: "lifestyle", label: "NUEVO DROP", icon: ImageIcon },
          ].map(tab => (
            <TabsTrigger 
              key={tab.id}
              value={tab.id} 
              className="flex-1 rounded-none border border-transparent data-[state=active]:bg-white data-[state=active]:text-neutral-850 data-[state=active]:border-neutral-200 data-[state=active]:shadow-sm text-neutral-550 font-bold uppercase text-[9px] tracking-wider h-12 px-4 hover:bg-neutral-100/50 transition-all"
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
                <div className="bg-white border border-neutral-200 p-8 shadow-sm rounded-none">
                   <div className="flex items-center gap-3 mb-8">
                      <div className="w-10 h-10 bg-neutral-100 text-neutral-500 border border-neutral-200 flex items-center justify-center"><Zap className="h-5 w-5" /></div>
                      <div>
                        <h3 className="text-lg font-bold text-neutral-850 uppercase tracking-tight">ParÃ¡metros Globales</h3>
                        <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">ConfiguraciÃ³n Base del Entorno</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-6">
                         <div className="space-y-2">
                            <Label className="text-[9px] font-bold uppercase tracking-widest text-neutral-450">Unidad de Cambio Primaria</Label>
                            <Select
                               value={settings.currency?.code || "USD"}
                               onValueChange={(value) => {
                                 const code = value as CurrencyCode
                                 const symbol = getCurrencySymbolByCode(code)
                                 saveSettings({ currency: { ...(settings.currency || { symbol: "$", code: "USD", showBsPrice: true }), code, symbol } })
                               }}
                            >
                               <SelectTrigger className="h-14 rounded-none border-neutral-200 focus:border-neutral-400 font-bold uppercase text-xs tracking-widest bg-white text-neutral-700">
                                 <SelectValue />
                               </SelectTrigger>
                               <SelectContent className="rounded-none border-neutral-200 bg-white">
                                 <SelectItem value="USD" className="font-bold text-[10px] uppercase">USD ($)</SelectItem>
                                 <SelectItem value="EUR" className="font-bold text-[10px] uppercase">EUR (â¬)</SelectItem>
                                 <SelectItem value="VES" className="font-bold text-[10px] uppercase">VES (Bs)</SelectItem>
                               </SelectContent>
                            </Select>
                         </div>
                         <div className="flex items-center justify-between p-5 bg-neutral-50 border border-neutral-200 shadow-sm">
                            <div className="space-y-1">
                               <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-750">Dual Pricing (BS)</Label>
                               <p className="text-[8px] font-bold text-neutral-400 uppercase">Mostrar conversiÃ³n a moneda local</p>
                            </div>
                            <Switch 
                              checked={settings.currency?.showBsPrice || false} 
                              onCheckedChange={(v) => saveSettings({ currency: { ...(settings.currency || { symbol: "$", code: "USD", showBsPrice: true }), showBsPrice: v }})}
                              className="data-[state=checked]:bg-neutral-900"
                            />
                         </div>
                      </div>

                      <div className="space-y-6">
                         <div className="space-y-2">
                            <Label className="text-[9px] font-bold uppercase tracking-widest text-neutral-450">ExpiraciÃ³n Etiqueta "NUEVO" (DÃ­as)</Label>
                            <div className="flex gap-2">
                               <Input 
                                 type="number" 
                                 value={settings.newProductDuration} 
                                 onChange={(e) => setSettings({...settings, newProductDuration: parseInt(e.target.value)})}
                                 className="h-14 rounded-none border-neutral-200 bg-white text-neutral-800 focus:border-neutral-450 font-bold text-center text-lg shadow-sm"
                               />
                               <Button 
                                 onClick={() => saveSettings({ newProductDuration: settings.newProductDuration })}
                                 className="h-14 rounded-none bg-neutral-900 text-white px-8 font-bold uppercase text-[10px] tracking-wider hover:bg-neutral-800 transition-all"
                               >FIJAR</Button>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>

                {/* Orders Security */}
                <div className="bg-neutral-900 text-white p-8 rounded-none shadow-md border border-transparent">
                   <div className="flex items-center gap-3 mb-8">
                      <div className="w-10 h-10 bg-neutral-850 text-neutral-300 border border-neutral-750 flex items-center justify-center"><ShieldCheck className="h-5 w-5" /></div>
                      <div>
                        <h3 className="text-lg font-bold uppercase tracking-tight text-white">Seguridad de Transacciones</h3>
                        <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Protocolos de GestiÃ³n de Ãrdenes</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="flex items-center justify-between p-6 border border-neutral-800 bg-neutral-950/45 shadow-sm">
                         <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-white">Borrado de Pedidos</Label>
                            <p className="text-[8px] font-bold text-neutral-400 uppercase">Habilitar eliminaciÃ³n fÃ­sica de registros</p>
                         </div>
                         <Switch 
                           checked={settings.orders?.allowDelete || false} 
                           onCheckedChange={(v) => saveSettings({ orders: { ...(settings.orders || { prefix: "KAOS", allowDelete: false }), allowDelete: v }})}
                           className="data-[state=checked]:bg-neutral-50 data-[state=unchecked]:bg-neutral-800"
                         />
                      </div>
                      <div className="space-y-2">
                         <Label className="text-[9px] font-bold uppercase tracking-widest text-neutral-450">Prefijo de Manifiesto</Label>
                         <div className="flex gap-2">
                            <Input 
                              value={settings.orders?.prefix || ""} 
                              onChange={(e) => setSettings({...settings, orders: {...(settings.orders || { prefix: "KAOS", allowDelete: false }), prefix: e.target.value.toUpperCase()}})}
                              className="h-14 rounded-none border-neutral-800 bg-neutral-950/60 text-white focus:border-neutral-600 font-bold text-center tracking-widest uppercase shadow-inner"
                            />
                            <Button 
                              onClick={() => saveSettings({ orders: settings.orders || { prefix: "KAOS", allowDelete: false } })}
                              className="h-14 rounded-none bg-white text-neutral-900 hover:bg-neutral-100 px-8 font-bold uppercase text-[10px] tracking-wider transition-all"
                            >ACTUALIZAR</Button>
                         </div>
                      </div>
                   </div>
                </div>
             </div>

             {/* Right Column: Status Summary */}
             <div className="xl:col-span-4 space-y-4">
                <div className="bg-white border border-neutral-200 p-6 shadow-sm rounded-none">
                   <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-neutral-400 block mb-4">SISTEMA HEALTH</span>
                   <div className="space-y-4">
                      {[
                        { label: "API DATABASE", status: "ONLINE", color: "text-neutral-650" },
                        { label: "STORAGE ENGINE", status: "SYNCED", color: "text-neutral-650" },
                        { label: "EMAIL GATEWAY", status: "CONNECTED", color: "text-neutral-650" },
                        { label: "SECURITY SHIELD", status: "ACTIVE", color: "text-neutral-650" },
                      ].map((item, i) => (
                        <div key={i} className="flex justify-between items-center border-b border-neutral-100 pb-2">
                           <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">{item.label}</span>
                           <span className={cn("text-[10px] font-bold uppercase", item.color)}>{item.status}</span>
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
           <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-neutral-200 pb-6 gap-4">
              <div>
                 <h2 className="text-3xl font-black uppercase tracking-tighter text-neutral-900">GestiÃ³n de Cobranza</h2>
                 <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Protocolos de RecepciÃ³n y VerificaciÃ³n de Fondos</p>
              </div>
              <Button 
                onClick={() => {
                  setEditingPayment({
                    id: "", name: "", isActive: true, requiresProof: true,
                    hasDiscount: false, discountPercentage: 0, order: settings.paymentMethods.length + 1
                  })
                  setShowPaymentForm(true)
                }}
                className="bg-neutral-900 text-white rounded-none h-14 px-10 text-[11px] font-bold uppercase tracking-widest hover:bg-neutral-800 transition-all shadow-none"
              >
                <Plus className="h-4 w-4 mr-2" /> INTEGRAR CANAL
              </Button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedPayments.map((method) => {
                 const Icon = paymentIconFor(method.id)
                 return (
                    <div key={method._id ?? method.id} className="group relative bg-white border border-neutral-200 hover:border-neutral-450 hover:shadow-md p-8 transition-all duration-200 flex flex-col justify-between h-56 shadow-sm rounded-none">
                       <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-all flex gap-2">
                          <Button variant="ghost" className="w-8 h-8 p-0 rounded-none border border-neutral-200 hover:bg-neutral-100 text-neutral-850 shadow-none" onClick={() => { setEditingPayment({...method}); setShowPaymentForm(true); }}><Edit2 className="h-3 w-3" /></Button>
                          <Button variant="ghost" className="w-8 h-8 p-0 rounded-none border border-neutral-200 hover:bg-red-50 hover:text-red-650 text-red-500 shadow-none" onClick={() => deletePaymentMethod(method.id)}><Trash2 className="h-3 w-3" /></Button>
                       </div>

                       <div className="flex items-center gap-4 mb-4">
                          <div className="w-14 h-14 bg-neutral-50 text-neutral-600 flex items-center justify-center shrink-0 border border-neutral-100 shadow-sm"><Icon className="h-6 w-6" /></div>
                          <div className="min-w-0">
                             <h4 className="text-lg font-bold uppercase tracking-tight text-neutral-850 truncate">{method.name}</h4>
                             <span className={cn(
                               "text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 border rounded-none",
                               method.isActive ? "border-neutral-200 text-neutral-700 bg-neutral-50" : "border-neutral-100 text-neutral-300 bg-transparent"
                             )}>{method.isActive ? "OPERATIVO" : "DESHABILITADO"}</span>
                          </div>
                       </div>
                       
                       <div className="space-y-2 mt-auto">
                          <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest line-clamp-2">{method.description || "Canal de pago estÃ¡ndar"}</p>
                          <div className="flex gap-2">
                             {method.requiresProof && <span className="text-[7px] font-bold border border-neutral-200 px-1.5 py-0.5 uppercase text-neutral-450 bg-neutral-50">REQUIERE COMPROBANTE</span>}
                             {method.hasDiscount && <span className="text-[7px] font-bold bg-neutral-900 text-white px-1.5 py-0.5 uppercase">-{method.discountPercentage}% OFF</span>}
                          </div>
                       </div>
                    </div>
                 )
              })}
           </div>
        </TabsContent>


        {/* =========================
            TAB: SHIPPING (LOGÃSTICA)
        ========================== */}
        <TabsContent value="shipping" className="m-0 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
           <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-200 pb-6 gap-4">
              <div>
                 <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Canales de DistribuciÃ³n</h2>
                 <p className="text-xs text-zinc-500">ConfiguraciÃ³n de Rutas, Costos y Puntos de Entrega</p>
              </div>
              <Button 
                onClick={() => {
                  setEditingShipping({
                    id: "", name: "", isActive: true, type: "delivery", additionalCost: 0,
                    freeFrom: 100, requiresAddress: true, order: settings.shippingMethods.length + 1
                  })
                  setShowShippingForm(true)
                }}
                className="bg-zinc-900 text-white rounded-md h-11 px-6 text-xs font-semibold hover:bg-zinc-800 transition-all"
              >
                <Plus className="h-4 w-4 mr-2" /> REGISTRAR RUTA
              </Button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedShipping.map((method) => {
                 const Icon = shippingIconFor(method.type)
                 return (
                    <div key={method._id ?? method.id} className="group relative bg-white border border-zinc-200 rounded-xl p-6 transition-all duration-300 flex flex-col justify-between h-56 shadow-sm">
                       <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-all flex gap-2">
                          <Button variant="ghost" className="w-8 h-8 p-0 rounded-md border border-zinc-200 hover:bg-zinc-50 text-zinc-700" onClick={() => { setEditingShipping({...method}); setShowShippingForm(true); }}><Edit2 className="h-3 w-3" /></Button>
                          <Button variant="ghost" className="w-8 h-8 p-0 rounded-md border border-zinc-200 hover:bg-red-50 text-red-600" onClick={() => deleteShippingMethod(method.id)}><Trash2 className="h-3 w-3" /></Button>
                       </div>

                       <div className="flex items-center gap-4 mb-2">
                          <div className="w-12 h-12 bg-zinc-100 text-zinc-700 flex items-center justify-center shrink-0 border border-zinc-200 rounded-lg"><Icon className="h-5 w-5" /></div>
                          <div className="min-w-0">
                             <h4 className="text-base font-bold text-zinc-900 truncate">{method.name}</h4>
                             <span className={cn(
                               "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 border rounded-md mt-1 inline-block",
                               method.isActive ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-zinc-200 text-zinc-400 bg-zinc-50"
                             )}>{method.isActive ? "ACTIVO" : "INACTIVO"}</span>
                          </div>
                       </div>
                       
                       <div className="space-y-3">
                          <div className="flex justify-between items-end border-b border-zinc-100 pb-1.5">
                             <span className="text-xs text-zinc-400 font-medium">Costo Adicional</span>
                             <span className="text-sm font-semibold text-zinc-900">{method.additionalCost > 0 ? formatMoney(currencySymbol, method.additionalCost) : "SIN COSTO"}</span>
                          </div>
                          <div className="flex justify-between items-end border-b border-zinc-100 pb-1.5">
                             <span className="text-xs text-zinc-400 font-medium">EnvÃ­o Gratis Desde</span>
                             <span className="text-sm font-semibold text-zinc-900">{formatMoney(currencySymbol, method.freeFrom)}</span>
                          </div>
                       </div>

                       <div className="mt-2">
                          <p className="text-[10px] font-medium text-zinc-400">Protocolo: {method.type?.toUpperCase() || 'DELIVERY'}</p>
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
              <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-6">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-zinc-100 text-zinc-700 flex items-center justify-center rounded-lg border border-zinc-200"><RefreshCw className={cn("h-5 w-5", updatingRate && "animate-spin")} /></div>
                    <div>
                      <h3 className="text-lg font-bold text-zinc-900">Terminal de Divisas</h3>
                      <p className="text-xs text-zinc-400 font-medium">Control de Tasa de Cambio en Tiempo Real</p>
                    </div>
                 </div>

                 <div className="p-6 bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-xl space-y-4">
                    <div className="flex justify-between items-center">
                       <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Tasa Actual (USD/VES)</span>
                       <span className="text-[10px] font-semibold uppercase px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">LIVE</span>
                    </div>
                    <div className="text-5xl font-extrabold text-zinc-900 tracking-tight">
                       {exchangeRate?.usd.toFixed(2) || "0.00"} <span className="text-xl text-zinc-400 uppercase font-semibold"> BS</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium">
                       <Clock className="h-3.5 w-3.5 text-zinc-400" /> Sincronizado: {exchangeRate ? new Date(exchangeRate.date).toLocaleString() : "---"}
                    </div>
                 </div>

                 <div className="space-y-4">
                    <Label className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Sobreescribir Tasa Manualmente</Label>
                    <div className="flex gap-2">
                       <Input 
                         placeholder="EJ: 36.50"
                         value={manualRate.usd}
                         onChange={(e) => setManualRate({ usd: e.target.value })}
                         className="h-11 rounded-md border-zinc-200 focus:border-zinc-400 font-bold text-center text-lg bg-white text-black"
                       />
                       <Button 
                         onClick={() => updateExchangeRate({ usd: parseFloat(manualRate.usd) })}
                         disabled={updatingRate || !manualRate.usd}
                         className="h-11 rounded-md bg-zinc-900 text-white px-6 font-semibold text-xs hover:bg-zinc-800"
                       >FIJAR TASA</Button>
                    </div>
                    <Button 
                      variant="outline"
                      onClick={() => updateExchangeRate()}
                      disabled={updatingRate}
                      className="w-full h-11 rounded-md border-zinc-200 text-zinc-700 font-semibold text-xs tracking-normal hover:bg-zinc-50 transition-all"
                    >
                      <RefreshCw className={cn("h-4 w-4 mr-2", updatingRate && "animate-spin")} /> AUTO-SINCRONIZAR BCV
                    </Button>
                 </div>
              </div>

              {/* History Graph / List Placeholder */}
              <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-6">
                 <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-zinc-900">Log de VariaciÃ³n</h3>
                    <Globe className="h-5 w-5 text-zinc-400" />
                 </div>
                 
                 <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                    {rateHistory.slice(0, 10).map((h, i) => (
                       <div key={i} className="flex justify-between items-center border-b border-zinc-100 pb-3 last:border-b-0">
                          <div className="flex flex-col">
                             <span className="text-sm font-semibold text-zinc-800">{new Date(h.date).toLocaleDateString()}</span>
                             <span className="text-xs text-zinc-400">{new Date(h.date).toLocaleTimeString()}</span>
                          </div>
                          <div className="flex items-center gap-3">
                             <span className="text-base font-bold text-zinc-900">{h.usd.toFixed(2)}</span>
                             <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400" />
                          </div>
                       </div>
                    ))}
                    {rateHistory.length === 0 && (
                       <p className="text-xs text-zinc-400 text-center py-12">No hay registros previos</p>
                    )}
                 </div>
              </div>
           </div>
        </TabsContent>


        {/* =========================
             <TabsContent value="gastos" className="m-0 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
           <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
              <div className="xl:col-span-8 space-y-8">
                 <div className="bg-white border border-zinc-200 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-8">
                       <div className="w-10 h-10 bg-zinc-100 text-zinc-700 flex items-center justify-center rounded-lg border border-zinc-200"><Banknote className="h-5 w-5" /></div>
                       <div>
                          <h3 className="text-lg font-bold text-zinc-900">CategorÃ­as de Gastos</h3>
                          <p className="text-xs text-zinc-400 font-medium">Protocolos de ClasificaciÃ³n de Salidas</p>
                       </div>
                    </div>

                    <div className="space-y-6">
                       <div className="flex gap-2">
                          <Input 
                            id="new-category"
                            placeholder="NUEVA CATEGORÃA (EJ: PUBLICIDAD)"
                            className="h-11 rounded-md border-zinc-200 focus:border-zinc-400 font-semibold text-xs tracking-wider bg-white text-black"
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
                            className="h-11 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white px-6 font-semibold text-xs tracking-normal"
                          >AGREGAR</Button>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {(settings.expenseCategories || []).map((cat, i) => (
                             <div key={i} className="flex justify-between items-center p-3.5 bg-zinc-50 border border-zinc-200 rounded-lg group hover:border-zinc-300 transition-all">
                                <span className="text-xs font-semibold text-zinc-800 tracking-wider">{cat}</span>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => {
                                    const newCats = settings.expenseCategories?.filter(c => c !== cat);
                                    saveSettings({ expenseCategories: newCats });
                                  }}
                                  className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0 text-red-500 hover:text-red-650 hover:bg-red-50 rounded-md"
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
                 <div className="bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-xl p-6">
                    <h4 className="text-sm font-bold text-zinc-900 mb-4">InformaciÃ³n de Gastos</h4>
                    <p className="text-xs text-zinc-500 leading-relaxed font-normal">
                       Las categorÃ­as definidas aquÃ­ serÃ¡n utilizadas para clasificar todos los egresos del sistema en la secciÃ³n de contabilidad operativa.
                    </p>
                    <div className="mt-8 pt-8 border-t border-zinc-200">
                       <div className="flex justify-between items-center">
                          <span className="text-xs text-zinc-400 font-semibold">Total CategorÃ­as</span>
                          <span className="text-lg font-bold text-zinc-900">{settings.expenseCategories?.length || 0}</span>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </TabsContent>div>
              </div>
           </div>
        </TabsContent>

        {/* =========================
            TAB: BUSINESS
        ========================== */}
        <TabsContent value="business" className="m-0 space-y-12">
          <div className="border border-zinc-200 bg-white rounded-xl overflow-hidden">
            <div className="p-6 border-b border-zinc-200 bg-zinc-50/50">
              <h3 className="text-xl font-bold text-zinc-900">Manifesto Corporativo</h3>
              <p className="text-xs text-zinc-400 font-medium">Datos de Identidad y Contacto</p>
            </div>
            
            <div className="p-6 border-b border-zinc-100 flex flex-col md:flex-row items-center gap-6">
               <div className="w-24 h-24 border border-zinc-200 bg-zinc-50 rounded-lg flex items-center justify-center overflow-hidden relative group">
                  {settings.business?.logo ? (
                     <img src={settings.business.logo} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                     <div className="text-center p-4">
                        <Building className="h-8 w-8 mx-auto text-zinc-300 mb-2" />
                        <span className="text-[10px] font-semibold text-zinc-400">SIN LOGO</span>
                     </div>
                  )}
               </div>
               <div className="flex-1 space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-800 tracking-wider mb-1">Identidad Visual (Logo)</h4>
                    <p className="text-xs text-zinc-400 font-normal">Se recomienda formato PNG o SVG con fondo transparente</p>
                  </div>
                  <div className="flex gap-2">
                     <Input 
                        placeholder="URL DEL LOGO (EJ: https://.../logo.png)"
                        value={settings.business?.logo || ""}
                        onChange={(e) => setSettings({ ...settings, business: { ...(settings.business || {}), logo: e.target.value } })}
                        className="h-10 rounded-md border-zinc-200 text-xs font-semibold bg-white text-black"
                     />
                  </div>
               </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">RazÃ³n Social / Marca</label>
                  <Input
                    value={settings.business?.name || ""}
                    onChange={(e) => setSettings({ ...settings, business: { ...(settings.business || {}), name: e.target.value } })}
                    className="h-11 rounded-md border-zinc-200 focus:border-zinc-400 font-semibold uppercase text-sm bg-white text-black"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Slogan / Manifesto</label>
                  <Input
                    value={settings.business?.slogan || ""}
                    onChange={(e) => setSettings({ ...settings, business: { ...(settings.business || {}), slogan: e.target.value } })}
                    className="h-11 rounded-md border-zinc-200 focus:border-zinc-400 font-medium text-sm text-zinc-900 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Canal de Ventas (WhatsApp)</label>
                  <Input
                    value={settings.whatsapp?.number || ""}
                    onChange={(e) => setSettings({ ...settings, whatsapp: { ...(settings.whatsapp || {}), number: e.target.value } })}
                    className="h-11 rounded-md border-zinc-200 focus:border-zinc-400 font-medium text-sm bg-white text-zinc-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Email Administrativo</label>
                  <Input
                    value={settings.business?.email || ""}
                    onChange={(e) => setSettings({ ...settings, business: { ...(settings.business || {}), email: e.target.value } })}
                    className="h-11 rounded-md border-zinc-200 focus:border-zinc-400 font-medium text-sm bg-white text-zinc-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">TelÃ©fono Contacto</label>
                  <Input
                    value={settings.business?.phone || ""}
                    onChange={(e) => setSettings({ ...settings, business: { ...(settings.business || {}), phone: e.target.value } })}
                    className="h-11 rounded-md border-zinc-200 focus:border-zinc-400 font-medium text-sm bg-white text-zinc-900"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Centro de Operaciones (DirecciÃ³n)</label>
                <Textarea
                  value={settings.business?.address || ""}
                  onChange={(e) => setSettings({ ...settings, business: { ...(settings.business || {}), address: e.target.value } })}
                  className="min-h-[100px] rounded-md border-zinc-200 focus:border-zinc-400 font-medium text-sm bg-white text-zinc-900"
                />
              </div>

              <div className="flex justify-end pt-6 border-t border-zinc-100">
                <Button
                  onClick={() => saveSettings({ business: settings.business, whatsapp: settings.whatsapp })}
                  disabled={saving}
                  className="h-11 rounded-md bg-zinc-900 text-white px-8 font-semibold text-xs tracking-wider uppercase hover:bg-zinc-800 transition-all"
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
        <TabsContent value="zernio" className="m-0 space-y-6 animate-in fade-in duration-300">
          {loadingZernio && !zernioConfig ? (
            <div className="border border-gray-200 bg-white p-12 text-center space-y-3 rounded-lg">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-500" />
              <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Cargando protocolos de Instagram...</span>
            </div>
          ) : (
            <>
              {/* Connection Status Banner */}
              {zernioConfig?.connected ? (
                <div className="border border-gray-200 bg-white p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden rounded-lg shadow-sm">
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-emerald-600"></div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg border border-gray-200 flex items-center justify-center bg-gray-50 shrink-0 text-gray-500">
                      <Instagram className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-semibold tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded">CONEXIÃN ONLINE</span>
                        <h3 className="text-lg font-bold text-gray-900">@{zernioConfig.username || "kaos.vzla"}</h3>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Vinculado a: {zernioConfig.displayName || "KAOS CREATIVE ACCOUNT"} â¢ Sincronizado: {zernioConfig.lastSyncedAt ? new Date(zernioConfig.lastSyncedAt).toLocaleString("es-VE", { timeZone: "America/Caracas" }) : "PENDIENTE"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 w-full md:w-auto">
                    <Button 
                      onClick={handleSyncZernio} 
                      disabled={syncingZernio || loadingZernio}
                      className="flex-1 md:flex-initial h-10 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 px-4 font-semibold text-xs tracking-normal shadow-sm transition-all"
                    >
                      {syncingZernio ? <Loader2 className="h-4 w-4 animate-spin mr-2 text-gray-500" /> : <RefreshCw className="h-4 w-4 mr-2 text-gray-500" />}
                      Sincronizar
                    </Button>
                    <Button 
                      onClick={handleDisconnectZernio} 
                      disabled={loadingZernio}
                      className="flex-1 md:flex-initial h-10 rounded-md bg-red-50 text-red-600 hover:bg-red-100 px-4 font-semibold text-xs tracking-normal border border-red-200 shadow-sm transition-all"
                    >
                      Desvincular
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border border-gray-200 bg-white p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden rounded-lg shadow-sm">
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-gray-400"></div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg border border-gray-200 flex items-center justify-center bg-gray-50 shrink-0 text-gray-400">
                      <Instagram className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold tracking-wide bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded">CONEXIÃN OFFLINE</span>
                        <h3 className="text-lg font-bold text-gray-400">SIN INTEGRACIÃN</h3>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Vincula la API Key de Zernio para sincronizar publicaciones de Instagram en el Home Page
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* API Key Panel when disconnected */}
              {!zernioConfig?.connected && (
                <div className="border border-gray-200 bg-white p-6 rounded-lg shadow-sm space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Establecer Enlace</h3>
                    <p className="text-xs text-gray-500">Ingresa el protocolo de autenticaciÃ³n de Zernio</p>
                  </div>
                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 relative">
                      <Input
                        type={showZernioKey ? "text" : "password"}
                        placeholder="Introduce tu API Key de Zernio (sk_...)"
                        value={zernioApiKeyInput}
                        onChange={(e) => setZernioApiKeyInput(e.target.value)}
                        className="h-10 rounded-md border-gray-300 font-mono text-xs bg-white text-gray-900 pr-10 focus:ring-2 focus:ring-gray-200 focus:border-gray-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowZernioKey(!showZernioKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showZernioKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Button
                      onClick={handleConnectZernio}
                      disabled={loadingZernio || !zernioApiKeyInput.trim()}
                      className="h-10 rounded-md bg-gray-900 text-white px-6 font-semibold text-xs tracking-normal hover:bg-gray-800 transition-all shadow-sm"
                    >
                      {loadingZernio ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      Establecer Enlace
                    </Button>
                  </div>
                  <div className="p-3 bg-gray-50 border border-gray-100 rounded-md text-xs text-gray-500 leading-relaxed">
                    Nota: La API Key de Zernio es necesaria para sincronizar tus publicaciones de forma segura. Puedes generarla en tu panel de Zernio.com.
                  </div>
                </div>
              )}

              {/* Sync Configuration & Preview Grid */}
              {zernioConfig?.connected && (
                <div className="border border-gray-200 bg-white p-6 rounded-lg shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-gray-100 pb-4 mb-4">
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Publicaciones Sincronizadas</h3>
                      <p className="text-xs text-gray-500">
                        Vista previa de las publicaciones en cachÃ© del sistema
                      </p>
                    </div>
                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Posts:</span>
                        <Input
                          type="number"
                          min={1}
                          max={20}
                          value={zernioLimitInput}
                          onChange={(e) => setZernioLimitInput(clampNumber(parseInt(e.target.value) || 7, 1, 20))}
                          className="w-16 h-9 rounded-md border-gray-300 font-semibold text-center focus:ring-2 focus:ring-gray-200 focus:border-gray-400 text-xs bg-white text-gray-900"
                        />
                      </div>
                      <Button
                        onClick={handleUpdateZernioConfig}
                        disabled={loadingZernio}
                        className="h-9 rounded-md bg-gray-900 text-white px-4 font-semibold text-xs tracking-normal hover:bg-gray-800 transition-all shadow-sm"
                      >
                        {loadingZernio ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : "Aplicar"}
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
                          className="aspect-square overflow-hidden bg-gray-100 border border-gray-250 rounded-lg group relative block"
                        >
                          <img
                            alt={`Preview ${idx + 1}`}
                            src={post.picture}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gray-950/95 opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col justify-between p-3 text-white text-xs">
                            <div className="line-clamp-3 leading-tight text-gray-200 font-semibold">
                              {post.message || "SIN DESCRIPCIÃN"}
                            </div>
                            <div className="flex justify-between font-bold text-gray-300 pt-2 border-t border-gray-800">
                              <span>â¤ï¸ {post.likeCount}</span>
                              <span>ð¬ {post.commentCount}</span>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="border border-dashed border-gray-200 p-12 text-center bg-gray-50 rounded-lg">
                      <span className="text-xs text-gray-400 font-medium">Sin publicaciones en cachÃ©. Haz click en sincronizar para cargar tu feed.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Terminal Logs Viewer */}
              <div className="border border-gray-200 bg-white p-6 rounded-lg shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 text-gray-600 rounded flex items-center justify-center"><Activity className="h-4 w-4" /></div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Terminal de DiagnÃ³stico</h3>
                    <p className="text-xs text-gray-500">
                      Historial de eventos y logs de la API de Zernio
                    </p>
                  </div>
                </div>

                <div className="bg-gray-950 text-gray-300 p-4 rounded-lg font-mono text-xs leading-relaxed max-h-[250px] overflow-y-auto custom-scrollbar border border-gray-850 shadow-inner">
                  {zernioConfig?.logs && zernioConfig.logs.length > 0 ? (
                    <div className="space-y-2">
                      {zernioConfig.logs.map((log: any, idx: number) => (
                        <div 
                          key={idx} 
                          className={cn(
                            "pb-2 border-b border-gray-900 last:border-b-0 flex items-start gap-3",
                            log.type === "error" ? "text-red-400" : log.type === "warning" ? "text-yellow-400" : "text-gray-300"
                          )}
                        >
                          <span className="text-gray-600 shrink-0 font-bold">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                          <span className={cn(
                            "shrink-0 font-bold text-[9px] px-1.5 py-0.5 rounded",
                            log.type === "error" ? "bg-red-950 text-red-400" : log.type === "warning" ? "bg-yellow-950 text-yellow-400" : "bg-gray-800 text-gray-300"
                          )}>
                            {log.type.toUpperCase()}
                          </span>
                          <span className="font-medium tracking-wide leading-tight">{log.message}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-600 text-center py-8 font-medium tracking-wide">
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
        <TabsContent value="lifestyle" className="m-0 space-y-6 animate-in fade-in duration-300">
          <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm space-y-6">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-4 gap-4">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-gray-100 text-gray-600 rounded-lg flex items-center justify-center"><ImageIcon className="h-5 w-5" /></div>
                   <div>
                     <h3 className="text-lg font-bold text-gray-900">Lookbook / Nuevo Drop</h3>
                     <p className="text-xs text-gray-500">Control visual del home page</p>
                   </div>
                </div>
                <div className="flex gap-2 self-end sm:self-auto">
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
                     className="rounded-md h-9 border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-750 text-xs font-semibold"
                   >
                     Restaurar Predeterminados
                   </Button>
                   <Button
                     onClick={() => {
                       const newImages = [...(settings.lifestyleDropImages || []), { name: "Nuevo Look", src: "" }]
                       setSettings({ ...settings, lifestyleDropImages: newImages })
                     }}
                     className="bg-gray-900 text-white rounded-md h-9 px-4 text-xs font-semibold hover:bg-gray-800 transition-all shadow-sm"
                   >
                     <Plus className="h-4 w-4 mr-2" /> Agregar Item
                   </Button>
                </div>
             </div>

             <div className="space-y-6">
                {(!settings.lifestyleDropImages || settings.lifestyleDropImages.length === 0) ? (
                   <div className="border border-dashed border-gray-200 rounded-lg p-12 text-center bg-gray-50">
                     <span className="text-xs text-gray-400 font-medium block mb-4">No hay imÃ¡genes configuradas para la secciÃ³n nuevo drop.</span>
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
                       className="bg-gray-900 text-white rounded-md h-9 px-4 text-xs font-semibold hover:bg-gray-800 shadow-sm"
                     >
                       Cargar Valores por Defecto
                     </Button>
                   </div>
                ) : (
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                               toast({ title: "Error", description: "Fallo la conexiÃ³n con el servidor", variant: "destructive" })
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
                            <div key={idx} className="border border-gray-250 bg-gray-50/50 p-4 space-y-4 rounded-lg shadow-sm relative flex flex-col justify-between">
                               <div className="space-y-4">
                                  <div className="aspect-[4/5] bg-white border border-gray-200 rounded-md overflow-hidden relative group">
                                     {img.src ? (
                                        <img src={cleanImageUrl(img.src)} alt={img.name} className="w-full h-full object-cover" />
                                     ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 text-xs font-semibold uppercase">Sin Imagen</div>
                                     )}
                                     <div className="absolute inset-0 bg-gray-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                                        <label className="bg-white text-gray-800 text-xs font-semibold px-4 py-2 hover:bg-gray-55 cursor-pointer tracking-normal transition-colors border border-gray-300 rounded-md shadow-sm">
                                           Subir Archivo
                                           <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                                        </label>
                                     </div>
                                  </div>

                                  <div className="space-y-1">
                                     <Label className="text-xs font-semibold text-gray-500">TÃ­tulo / Nombre</Label>
                                     <Input
                                        value={img.name}
                                        onChange={(e) => {
                                           const updated = [...(settings.lifestyleDropImages || [])]
                                           updated[idx] = { ...updated[idx], name: e.target.value }
                                           setSettings({ ...settings, lifestyleDropImages: updated })
                                        }}
                                        className="h-9 rounded-md border-gray-300 font-semibold text-xs text-gray-900"
                                        placeholder="Ej: Acuarela"
                                     />
                                  </div>

                                  <div className="space-y-1">
                                     <Label className="text-xs font-semibold text-gray-500">Enlace de la Imagen (URL)</Label>
                                     <Input
                                        value={img.src}
                                        onChange={(e) => {
                                           const updated = [...(settings.lifestyleDropImages || [])]
                                           updated[idx] = { ...updated[idx], src: e.target.value }
                                           setSettings({ ...settings, lifestyleDropImages: updated })
                                        }}
                                        className="h-9 rounded-md border-gray-300 text-xs font-mono text-gray-900"
                                        placeholder="Ej: https://... o /uploads/..."
                                     />
                                  </div>
                               </div>

                               <div className="flex justify-between items-center gap-2 pt-3 border-t border-gray-150 mt-4">
                                  <div className="flex gap-1">
                                     <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={idx === 0}
                                        onClick={() => moveItem("up")}
                                        className="h-8 w-8 p-0 rounded-md border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                                     >
                                        â
                                     </Button>
                                     <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={idx === (settings.lifestyleDropImages || []).length - 1}
                                        onClick={() => moveItem("down")}
                                        className="h-8 w-8 p-0 rounded-md border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                                     >
                                        â
                                     </Button>
                                  </div>
                                  <Button
                                     size="sm"
                                     variant="ghost"
                                     onClick={() => {
                                        const updated = (settings.lifestyleDropImages || []).filter((_, i) => i !== idx)
                                        setSettings({ ...settings, lifestyleDropImages: updated })
                                     }}
                                     className="h-8 px-2.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md font-semibold text-xs transition-colors"
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

             <div className="flex justify-end pt-4 border-t border-gray-100 mt-6">
                <Button
                  onClick={() => saveSettings({ lifestyleDropImages: settings.lifestyleDropImages })}
                  disabled={saving}
                  className="bg-gray-900 text-white h-10 px-6 rounded-md font-semibold text-xs tracking-normal hover:bg-gray-800 transition-all shadow-sm"
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
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 bg-gray-50 border-b border-gray-150 text-gray-900 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">
                {editingPayment.id ? "Modificar Terminal" : "Integrar Nuevo Canal"}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => { setShowPaymentForm(false); setEditingPayment(null); }} className="text-gray-500 hover:bg-gray-100 rounded-md">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <Label className="text-xs font-semibold text-gray-500">DenominaciÃ³n</Label>
                   <Input value={editingPayment.name} onChange={(e) => setEditingPayment({ ...editingPayment, name: e.target.value })} className="rounded-md border-gray-300 font-semibold text-xs bg-white text-gray-900 focus-visible:ring-2 focus-visible:ring-gray-250 focus-visible:border-gray-400" />
                 </div>
                 <div className="space-y-1">
                   <Label className="text-xs font-semibold text-gray-500">DescripciÃ³n PÃºblica</Label>
                   <Input value={editingPayment.description || ""} onChange={(e) => setEditingPayment({ ...editingPayment, description: e.target.value })} className="rounded-md border-gray-300 font-medium text-xs bg-white text-gray-900 focus-visible:ring-2 focus-visible:ring-gray-250 focus-visible:border-gray-400" />
                 </div>
               </div>
               <div className="flex gap-6 py-3 border-y border-gray-100">
                  <div className="flex items-center gap-2">
                     <Switch checked={!!editingPayment.isActive} onCheckedChange={(checked) => setEditingPayment({ ...editingPayment, isActive: checked })} className="data-[state=checked]:bg-gray-900" />
                     <Label className="text-xs font-semibold text-gray-700">Canal Activo</Label>
                  </div>
                  <div className="flex items-center gap-2">
                     <Switch checked={!!editingPayment.requiresProof} onCheckedChange={(checked) => setEditingPayment({ ...editingPayment, requiresProof: checked })} className="data-[state=checked]:bg-gray-900" />
                     <Label className="text-xs font-semibold text-gray-700">Exige Comprobante</Label>
                  </div>
               </div>
               <div className="space-y-1">
                  <Label className="text-xs font-semibold text-gray-500">Instrucciones de OperaciÃ³n</Label>
                  <Textarea value={editingPayment.instructions || ""} onChange={(e) => setEditingPayment({ ...editingPayment, instructions: e.target.value })} className="rounded-md border-gray-300 font-medium text-xs h-24 focus-visible:ring-2 focus-visible:ring-gray-250 focus-visible:border-gray-400" />
               </div>

               <div className="space-y-4 pt-4 border-t border-gray-100">
                  <h4 className="text-xs font-bold text-gray-750">Datos Bancarios / Billetera (Opcional)</h4>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <Label className="text-xs font-semibold text-gray-500">Banco / Plataforma</Label>
                        <Input value={editingPayment.accountData?.bankName || ""} onChange={(e) => setEditingPayment({ ...editingPayment, accountData: { ...editingPayment.accountData, bankName: e.target.value } })} className="rounded-md border-gray-300 font-medium text-xs bg-white text-gray-900 focus-visible:ring-2 focus-visible:ring-gray-250 focus-visible:border-gray-400" placeholder="Ej: Banesco, Binance" />
                     </div>
                     <div className="space-y-1">
                        <Label className="text-xs font-semibold text-gray-500">Titular</Label>
                        <Input value={editingPayment.accountData?.accountHolder || ""} onChange={(e) => setEditingPayment({ ...editingPayment, accountData: { ...editingPayment.accountData, accountHolder: e.target.value } })} className="rounded-md border-gray-300 font-medium text-xs bg-white text-gray-900 focus-visible:ring-2 focus-visible:ring-gray-250 focus-visible:border-gray-400" />
                     </div>
                     <div className="space-y-1">
                        <Label className="text-xs font-semibold text-gray-500">CÃ©dula / RIF</Label>
                        <Input value={editingPayment.accountData?.identification || ""} onChange={(e) => setEditingPayment({ ...editingPayment, accountData: { ...editingPayment.accountData, identification: e.target.value } })} className="rounded-md border-gray-300 font-medium text-xs bg-white text-gray-900 focus-visible:ring-2 focus-visible:ring-gray-250 focus-visible:border-gray-400" />
                     </div>
                     <div className="space-y-1">
                        <Label className="text-xs font-semibold text-gray-500">NÃºmero de Cuenta / TelÃ©fono</Label>
                        <Input value={editingPayment.accountData?.accountNumber || ""} onChange={(e) => setEditingPayment({ ...editingPayment, accountData: { ...editingPayment.accountData, accountNumber: e.target.value } })} className="rounded-md border-gray-300 font-medium text-xs bg-white text-gray-900 focus-visible:ring-2 focus-visible:ring-gray-250 focus-visible:border-gray-400" />
                     </div>
                  </div>
               </div>

               <div className="flex items-center gap-6 py-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                     <Switch checked={!!editingPayment.hasDiscount} onCheckedChange={(checked) => setEditingPayment({ ...editingPayment, hasDiscount: checked })} className="data-[state=checked]:bg-gray-900" />
                     <Label className="text-xs font-semibold text-gray-700">Aplica Descuento</Label>
                  </div>
                  {editingPayment.hasDiscount && (
                    <div className="flex-1 space-y-1 max-w-[200px]">
                       <Label className="text-xs font-semibold text-gray-500">Descuento (%)</Label>
                       <Input type="number" value={editingPayment.discountPercentage || 0} onChange={(e) => setEditingPayment({ ...editingPayment, discountPercentage: parseFloat(e.target.value) })} className="rounded-md border-gray-300 font-semibold text-xs bg-white text-gray-900 focus-visible:ring-2 focus-visible:ring-gray-250 focus-visible:border-gray-400" />
                    </div>
                  )}
               </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-150 flex justify-end gap-3">
               <Button variant="outline" onClick={() => { setShowPaymentForm(false); setEditingPayment(null); }} className="rounded-md border-gray-300 text-gray-750 text-xs font-semibold">Descartar</Button>
               <Button onClick={() => savePaymentMethod(editingPayment)} className="rounded-md bg-gray-900 text-white h-10 px-5 font-semibold text-xs hover:bg-gray-800 shadow-sm">Sincronizar Terminal</Button>
            </div>
          </div>
        </div>
      )}

      {showShippingForm && editingShipping && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 bg-gray-55 border-b border-gray-150 text-gray-900 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">
                {editingShipping.id ? "Modificar Ruta" : "Registrar Nueva Ruta"}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => { setShowShippingForm(false); setEditingShipping(null); }} className="text-gray-500 hover:bg-gray-100 rounded-md">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <Label className="text-xs font-semibold text-gray-500">Nombre de la Ruta</Label>
                   <Input value={editingShipping.name} onChange={(e) => setEditingShipping({ ...editingShipping, name: e.target.value })} className="rounded-md border-gray-300 font-semibold text-xs bg-white text-gray-900 focus-visible:ring-2 focus-visible:ring-gray-250 focus-visible:border-gray-400" />
                 </div>
                 <div className="space-y-1">
                   <Label className="text-xs font-semibold text-gray-500">Tipo de DistribuciÃ³n</Label>
                   <select 
                     value={editingShipping.type} 
                     onChange={(e) => setEditingShipping({ ...editingShipping, type: e.target.value as any, requiresAddress: e.target.value !== "pickup" })}
                     className="w-full rounded-md border border-gray-300 font-semibold text-xs h-9 bg-white text-gray-950 px-3 outline-none focus:border-zinc-450 focus:ring-1 focus:ring-zinc-450"
                   >
                     <option value="delivery">ENVÍO A DOMICILIO (DELIVERY)</option>
                     <option value="pickup">RETIRO EN PUNTO (PICKUP)</option>
                     <option value="standard">ENVÍO ESTÁNDAR (STANDARD)</option>
                   </select>
                 </div>
               </div>

                <div className="flex gap-6 py-3 border-y border-gray-100">
                  <div className="flex items-center gap-2">
                     <Switch 
                       checked={!!editingShipping.isActive} 
                       onCheckedChange={(checked) => setEditingShipping({ ...editingShipping, isActive: checked })} 
                       className="data-[state=checked]:bg-gray-900" 
                     />
                     <Label className="text-xs font-semibold text-gray-700">Ruta Activa</Label>
                  </div>
                </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <Label className="text-xs font-semibold text-gray-500">Tarifa Base (BS)</Label>
                   <Input type="number" value={editingShipping.additionalCost} onChange={(e) => setEditingShipping({ ...editingShipping, additionalCost: parseFloat(e.target.value) })} className="rounded-md border-gray-300 font-semibold text-xs bg-white text-gray-900 focus-visible:ring-2 focus-visible:ring-gray-250 focus-visible:border-gray-400" />
                 </div>
                 <div className="space-y-1">
                   <Label className="text-xs font-semibold text-gray-500">Umbral Gratis (BS)</Label>
                   <Input type="number" value={editingShipping.freeFrom} onChange={(e) => setEditingShipping({ ...editingShipping, freeFrom: parseFloat(e.target.value) })} className="rounded-md border-gray-300 font-semibold text-xs bg-white text-gray-900 focus-visible:ring-2 focus-visible:ring-gray-250 focus-visible:border-gray-400" />
                 </div>
               </div>
               
               {/* Campos condicionales segÃºn el tipo de ruta */}
               {editingShipping.type === 'pickup' && (
                 <div className="space-y-4 pt-4 border-t border-gray-100 animate-in fade-in duration-200">
                    <h4 className="text-xs font-bold text-gray-750">Datos del Punto de Retiro</h4>
                    <div className="space-y-4">
                       <div className="space-y-1">
                         <Label className="text-xs font-semibold text-gray-500">DirecciÃ³n Exacta</Label>
                         <Textarea 
                           value={editingShipping.pickupData?.address || ""} 
                           onChange={(e) => setEditingShipping({ ...editingShipping, pickupData: { ...editingShipping.pickupData, address: e.target.value } })} 
                           className="rounded-md border-gray-300 font-medium text-xs bg-white text-gray-900 min-h-[60px] focus-visible:ring-2 focus-visible:ring-gray-250 focus-visible:border-gray-400" 
                           placeholder="Ej: Av. Principal, C.C. El Recreo, Nivel 1, Local 12"
                         />
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1">
                           <Label className="text-xs font-semibold text-gray-500">Horario</Label>
                           <Input 
                             value={editingShipping.pickupData?.schedule || ""} 
                             onChange={(e) => setEditingShipping({ ...editingShipping, pickupData: { ...editingShipping.pickupData, schedule: e.target.value } })} 
                             className="rounded-md border-gray-300 font-medium text-xs bg-white text-gray-900 focus-visible:ring-2 focus-visible:ring-gray-250 focus-visible:border-gray-400" 
                             placeholder="Ej: Lun - Vie: 9am a 5pm"
                           />
                         </div>
                         <div className="space-y-1">
                           <Label className="text-xs font-semibold text-gray-500">TelÃ©fono</Label>
                           <Input 
                             value={editingShipping.pickupData?.phone || ""} 
                             onChange={(e) => setEditingShipping({ ...editingShipping, pickupData: { ...editingShipping.pickupData, phone: e.target.value } })} 
                             className="rounded-md border-gray-300 font-medium text-xs bg-white text-gray-900 focus-visible:ring-2 focus-visible:ring-gray-250 focus-visible:border-gray-400" 
                             placeholder="Ej: 0412-1234567"
                           />
                         </div>
                       </div>
                    </div>
                 </div>
               )}

               {editingShipping.type === 'delivery' && (
                 <div className="space-y-4 pt-4 border-t border-gray-100 animate-in fade-in duration-200">
                    <h4 className="text-xs font-bold text-gray-750">Datos de EnvÃ­o a Domicilio</h4>
                    <div className="space-y-4">
                       <div className="space-y-1">
                         <Label className="text-xs font-semibold text-gray-500">Tiempo Estimado</Label>
                         <Input 
                           value={editingShipping.estimatedTime || ""} 
                           onChange={(e) => setEditingShipping({ ...editingShipping, estimatedTime: e.target.value })} 
                           className="rounded-md border-gray-300 font-medium text-xs bg-white text-gray-900 focus-visible:ring-2 focus-visible:ring-gray-250 focus-visible:border-gray-400" 
                           placeholder="Ej: 24 a 48 horas"
                         />
                       </div>
                       <div className="space-y-1">
                         <Label className="text-xs font-semibold text-gray-500">DescripciÃ³n / PolÃ­ticas</Label>
                         <Textarea 
                           value={editingShipping.description || ""} 
                           onChange={(e) => setEditingShipping({ ...editingShipping, description: e.target.value })} 
                           className="rounded-md border-gray-300 font-medium text-xs bg-white text-gray-900 min-h-[60px] focus-visible:ring-2 focus-visible:ring-gray-250 focus-visible:border-gray-400" 
                           placeholder="Ej: Entregas solo en zonas cÃ©ntricas..."
                         />
                       </div>
                    </div>
                 </div>
               )}
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-150 flex justify-end gap-3">
               <Button variant="outline" onClick={() => { setShowShippingForm(false); setEditingShipping(null); }} className="rounded-md border-gray-300 text-gray-750 text-xs font-semibold">Descartar</Button>
               <Button onClick={() => saveShippingMethod(editingShipping)} className="rounded-md bg-gray-900 text-white h-10 px-5 font-semibold text-xs hover:bg-gray-800 shadow-sm">Sincronizar Ruta</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}