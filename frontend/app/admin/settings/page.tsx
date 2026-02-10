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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Error al cargar configuraciones</p>
        <Button onClick={loadAll} className="mt-4">
          Reintentar
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configuraciones</h1>
          <p className="text-muted-foreground">Administra la configuración de tu tienda</p>
        </div>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general" className="gap-2">
            <SettingsIcon className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="payment" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Pagos
          </TabsTrigger>
          <TabsTrigger value="shipping" className="gap-2">
            <Truck className="h-4 w-4" />
            Envíos
          </TabsTrigger>
          <TabsTrigger value="exchange" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Tasa
          </TabsTrigger>
          <TabsTrigger value="business" className="gap-2">
            <Building className="h-4 w-4" />
            Negocio
          </TabsTrigger>
        </TabsList>

        {/* =========================
            TAB: GENERAL
        ========================== */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Moneda</CardTitle>
              <CardDescription>Configura la moneda principal de la tienda</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Moneda</Label>
                  <Select
                    value={settings.currency.code}
                    onValueChange={(value) => {
                      const code = value as CurrencyCode
                      const symbol = getCurrencySymbolByCode(code)
                      saveSettings({ currency: { ...settings.currency, code, symbol } })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">Euro (€)</SelectItem>
                      <SelectItem value="USD">Dólar ($)</SelectItem>
                      <SelectItem value="VES">Bolívar (Bs)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Mostrar precio en Bs</Label>
                  <div className="flex items-center gap-2 pt-2">
                    <Switch
                      checked={!!settings.currency.showBsPrice}
                      onCheckedChange={(checked) => {
                        saveSettings({ currency: { ...settings.currency, showBsPrice: checked } })
                      }}
                    />
                    <span className="text-sm text-muted-foreground">
                      {settings.currency.showBsPrice ? "Activado" : "Desactivado"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Productos</CardTitle>
              <CardDescription>Configuración de productos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Duración de etiqueta "Nuevo" (días)</Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={settings.newProductDuration ?? 30}
                    onChange={(e) => {
                      const next = clampNumber(parseInt(e.target.value, 10) || 30, 1, 365)
                      setSettings({ ...settings, newProductDuration: next })
                    }}
                    className="w-32"
                  />
                  <Button
                    variant="outline"
                    onClick={() => saveSettings({ newProductDuration: settings.newProductDuration ?? 30 })}
                    disabled={saving}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Guardar
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Los productos marcados como "nuevo" perderán automáticamente esta etiqueta después de este tiempo.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pedidos</CardTitle>
              <CardDescription>Configuración de pedidos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Permitir eliminar pedidos</Label>
                  <p className="text-sm text-muted-foreground">
                    Habilita la opción de eliminar pedidos desde el panel de administración
                  </p>
                </div>
                <Switch
                  checked={!!settings.orders?.allowDelete}
                  onCheckedChange={(checked) => {
                    saveSettings({ orders: { ...settings.orders, allowDelete: checked } })
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label>Prefijo de pedidos</Label>
                  <Input
                    value={settings.orders?.prefix ?? ""}
                    onChange={(e) => setSettings({ ...settings, orders: { ...settings.orders, prefix: e.target.value } })}
                    placeholder="Ej: YF"
                  />
                </div>
                <div className="flex items-end">
                  <Button variant="outline" onClick={() => saveSettings({ orders: settings.orders })} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================
            TAB: PAYMENT
        ========================== */}
        <TabsContent value="payment" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Métodos de Pago</h2>
              <p className="text-sm text-muted-foreground">Configura los métodos de pago disponibles</p>
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
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Método
            </Button>
          </div>

          <div className="space-y-4">
            {sortedPayments.map((method) => {
              const Icon = paymentIconFor(method.id || method.name)
              return (
                <Card key={method._id ?? method.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                        <div className="flex items-center gap-2">
                          <Icon className="h-5 w-5" />
                          <span className="font-medium">{method.name}</span>
                        </div>

                        {method.hasDiscount && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            {method.discountPercentage}% descuento
                          </span>
                        )}

                        {!method.isActive && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Inactivo</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
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
                        <Button variant="ghost" size="sm" onClick={() => deletePaymentMethod(method.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {showPaymentForm && editingPayment && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{editingPayment.id ? "Editar" : "Agregar"} Método de Pago</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowPaymentForm(false)
                        setEditingPayment(null)
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nombre</Label>
                      <Input
                        value={editingPayment.name}
                        onChange={(e) => setEditingPayment({ ...editingPayment, name: e.target.value })}
                        placeholder="Ej: Pago Móvil / Transferencia"
                      />
                      {!editingPayment.id && (
                        <p className="text-xs text-muted-foreground">
                          *El ID se genera automáticamente en el backend a partir del nombre.*
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Descripción</Label>
                      <Input
                        value={editingPayment.description || ""}
                        onChange={(e) => setEditingPayment({ ...editingPayment, description: e.target.value })}
                        placeholder="Ej: Pago mediante transferencia bancaria o pago móvil"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!!editingPayment.isActive}
                        onCheckedChange={(checked) => setEditingPayment({ ...editingPayment, isActive: checked })}
                      />
                      <Label>Activo</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!!editingPayment.requiresProof}
                        onCheckedChange={(checked) => setEditingPayment({ ...editingPayment, requiresProof: checked })}
                      />
                      <Label>Requiere comprobante</Label>
                    </div>
                  </div>

                  <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!!editingPayment.hasDiscount}
                        onCheckedChange={(checked) =>
                          setEditingPayment({
                            ...editingPayment,
                            hasDiscount: checked,
                            discountPercentage: checked ? editingPayment.discountPercentage || 0 : 0,
                          })
                        }
                      />
                      <Label>Descuento por este método</Label>
                    </div>
                    {editingPayment.hasDiscount && (
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={editingPayment.discountPercentage ?? 0}
                          onChange={(e) =>
                            setEditingPayment({
                              ...editingPayment,
                              discountPercentage: clampNumber(parseInt(e.target.value, 10) || 0, 0, 100),
                            })
                          }
                          className="w-24"
                        />
                        <span>%</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Datos de cuenta (opcional)</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        placeholder="Banco"
                        value={editingPayment.accountData?.bankName || ""}
                        onChange={(e) =>
                          setEditingPayment({
                            ...editingPayment,
                            accountData: { ...(editingPayment.accountData || {}), bankName: e.target.value },
                          })
                        }
                      />
                      <Input
                        placeholder="Número de cuenta"
                        value={editingPayment.accountData?.accountNumber || ""}
                        onChange={(e) =>
                          setEditingPayment({
                            ...editingPayment,
                            accountData: { ...(editingPayment.accountData || {}), accountNumber: e.target.value },
                          })
                        }
                      />
                      <Input
                        placeholder="Titular"
                        value={editingPayment.accountData?.accountHolder || ""}
                        onChange={(e) =>
                          setEditingPayment({
                            ...editingPayment,
                            accountData: { ...(editingPayment.accountData || {}), accountHolder: e.target.value },
                          })
                        }
                      />
                      <Input
                        placeholder="Identificación / Cédula"
                        value={editingPayment.accountData?.identification || ""}
                        onChange={(e) =>
                          setEditingPayment({
                            ...editingPayment,
                            accountData: { ...(editingPayment.accountData || {}), identification: e.target.value },
                          })
                        }
                      />
                      <Input
                        placeholder="Teléfono"
                        value={editingPayment.accountData?.phone || ""}
                        onChange={(e) =>
                          setEditingPayment({
                            ...editingPayment,
                            accountData: { ...(editingPayment.accountData || {}), phone: e.target.value },
                          })
                        }
                      />
                      <Input
                        placeholder="Email"
                        value={editingPayment.accountData?.email || ""}
                        onChange={(e) =>
                          setEditingPayment({
                            ...editingPayment,
                            accountData: { ...(editingPayment.accountData || {}), email: e.target.value },
                          })
                        }
                      />
                      <Input
                        placeholder="Wallet"
                        value={editingPayment.accountData?.walletAddress || ""}
                        onChange={(e) =>
                          setEditingPayment({
                            ...editingPayment,
                            accountData: { ...(editingPayment.accountData || {}), walletAddress: e.target.value },
                          })
                        }
                      />
                      <Input
                        placeholder="Info adicional"
                        value={editingPayment.accountData?.additionalInfo || ""}
                        onChange={(e) =>
                          setEditingPayment({
                            ...editingPayment,
                            accountData: { ...(editingPayment.accountData || {}), additionalInfo: e.target.value },
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Mensaje para WhatsApp</Label>
                    <Textarea
                      value={editingPayment.whatsappMessage || ""}
                      onChange={(e) => setEditingPayment({ ...editingPayment, whatsappMessage: e.target.value })}
                      placeholder="Mensaje personalizado que se incluirá en el pedido por WhatsApp"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Instrucciones</Label>
                    <Textarea
                      value={editingPayment.instructions || ""}
                      onChange={(e) => setEditingPayment({ ...editingPayment, instructions: e.target.value })}
                      placeholder="Instrucciones que verá el cliente al seleccionar este método"
                      rows={2}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowPaymentForm(false)
                        setEditingPayment(null)
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={() => savePaymentMethod(editingPayment)}>
                      <Save className="h-4 w-4 mr-2" />
                      Guardar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* =========================
            TAB: SHIPPING
        ========================== */}
        <TabsContent value="shipping" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Métodos de Envío</h2>
              <p className="text-sm text-muted-foreground">Configura los métodos de envío disponibles</p>
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
                  estimatedTime: "",
                  requiresAddress: true,
                  pickupData: {},
                  whatsappMessage: "",
                  order: (settings.shippingMethods?.length ?? 0) + 1,
                })
                setShowShippingForm(true)
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Método
            </Button>
          </div>

          <div className="space-y-4">
            {sortedShipping.map((method) => {
              const Icon = shippingIconFor(method.type)
              return (
                <Card key={method._id ?? method.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                        <div className="flex items-center gap-2">
                          <Icon className="h-5 w-5" />
                          <span className="font-medium">{method.name}</span>
                        </div>

                        {method.additionalCost > 0 && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            {formatMoney(settings.currency.symbol, Number(method.additionalCost))}
                          </span>
                        )}

                        {method.freeFrom > 0 && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            Gratis desde {settings.currency.symbol}
                            {Number(method.freeFrom)}
                          </span>
                        )}

                        {!method.isActive && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Inactivo</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
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
                        <Button variant="ghost" size="sm" onClick={() => deleteShippingMethod(method.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {showShippingForm && editingShipping && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{editingShipping.id ? "Editar" : "Agregar"} Método de Envío</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowShippingForm(false)
                        setEditingShipping(null)
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nombre</Label>
                      <Input
                        value={editingShipping.name}
                        onChange={(e) => setEditingShipping({ ...editingShipping, name: e.target.value })}
                        placeholder="Ej: Delivery"
                      />
                      {!editingShipping.id && (
                        <p className="text-xs text-muted-foreground">
                          *El ID se genera automáticamente en el backend a partir del nombre.*
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select
                        value={editingShipping.type}
                        onValueChange={(value) => {
                          const v = value as ShippingMethod["type"]
                          setEditingShipping({
                            ...editingShipping,
                            type: v,
                            requiresAddress: v !== "pickup",
                          })
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {shippingTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Descripción</Label>
                      <Input
                        value={editingShipping.description || ""}
                        onChange={(e) => setEditingShipping({ ...editingShipping, description: e.target.value })}
                        placeholder="Descripción que verá el cliente"
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={!!editingShipping.isActive}
                          onCheckedChange={(checked) => setEditingShipping({ ...editingShipping, isActive: checked })}
                        />
                        <Label>Activo</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={!!editingShipping.requiresAddress}
                          onCheckedChange={(checked) =>
                            setEditingShipping({ ...editingShipping, requiresAddress: checked })
                          }
                        />
                        <Label>Requiere dirección</Label>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Costo adicional ({settings.currency.symbol})</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={editingShipping.additionalCost ?? 0}
                        onChange={(e) =>
                          setEditingShipping({
                            ...editingShipping,
                            additionalCost: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Envío gratis desde ({settings.currency.symbol})</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={editingShipping.freeFrom ?? 0}
                        onChange={(e) =>
                          setEditingShipping({
                            ...editingShipping,
                            freeFrom: parseFloat(e.target.value) || 0,
                          })
                        }
                        placeholder="0 = sin mínimo"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Tiempo estimado</Label>
                    <Input
                      value={editingShipping.estimatedTime || ""}
                      onChange={(e) => setEditingShipping({ ...editingShipping, estimatedTime: e.target.value })}
                      placeholder="Ej: 24-48 horas"
                    />
                  </div>

                  {editingShipping.type === "pickup" && (
                    <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                      <Label className="text-base font-medium">Datos de punto de retiro</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          placeholder="Dirección"
                          value={editingShipping.pickupData?.address || ""}
                          onChange={(e) =>
                            setEditingShipping({
                              ...editingShipping,
                              pickupData: { ...(editingShipping.pickupData || {}), address: e.target.value },
                            })
                          }
                        />
                        <Input
                          placeholder="Teléfono"
                          value={editingShipping.pickupData?.phone || ""}
                          onChange={(e) =>
                            setEditingShipping({
                              ...editingShipping,
                              pickupData: { ...(editingShipping.pickupData || {}), phone: e.target.value },
                            })
                          }
                        />
                      </div>

                      <Input
                        placeholder="Horario (ej: Lunes a Viernes 9am - 6pm)"
                        value={editingShipping.pickupData?.schedule || ""}
                        onChange={(e) =>
                          setEditingShipping({
                            ...editingShipping,
                            pickupData: { ...(editingShipping.pickupData || {}), schedule: e.target.value },
                          })
                        }
                      />

                      <Input
                        placeholder="URL de Google Maps"
                        value={editingShipping.pickupData?.mapUrl || ""}
                        onChange={(e) =>
                          setEditingShipping({
                            ...editingShipping,
                            pickupData: { ...(editingShipping.pickupData || {}), mapUrl: e.target.value },
                          })
                        }
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Mensaje para WhatsApp</Label>
                    <Textarea
                      value={editingShipping.whatsappMessage || ""}
                      onChange={(e) => setEditingShipping({ ...editingShipping, whatsappMessage: e.target.value })}
                      placeholder="Mensaje personalizado que se incluirá en el pedido por WhatsApp"
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowShippingForm(false)
                        setEditingShipping(null)
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={() => saveShippingMethod(editingShipping)}>
                      <Save className="h-4 w-4 mr-2" />
                      Guardar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* =========================
            TAB: EXCHANGE
        ========================== */}
        <TabsContent value="exchange" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Tasa de Cambio
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              {exchangeRate && (
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-sm text-blue-600 font-medium">Dólar (USD)</div>
                    <div className="text-3xl font-bold text-blue-700">Bs. {Number(exchangeRate.usd).toFixed(2)}</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-sm text-green-600 font-medium">Euro (EUR)</div>
                    <div className="text-3xl font-bold text-green-700">Bs. {Number(exchangeRate.eur).toFixed(2)}</div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  {exchangeRate?.date ? <>Última actualización: {new Date(exchangeRate.date).toLocaleString("es-VE")}</> : null}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={loadRateHistory}>
                    <Clock className="h-4 w-4 mr-2" />
                    Ver Historial
                  </Button>
                  <Button onClick={updateExchangeRate} disabled={updatingRate}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${updatingRate ? "animate-spin" : ""}`} />
                    Actualizar Ahora
                  </Button>
                </div>
              </div>

              {showHistory && rateHistory.length > 0 && (
                <div className="mt-4 p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">Historial de Tasas (últimos 30 días)</h3>
                    <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-white">
                        <tr className="border-b">
                          <th className="text-left py-2">Fecha</th>
                          <th className="text-right py-2">USD</th>
                          <th className="text-right py-2">EUR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rateHistory.map((rate, index) => (
                          <tr key={index} className="border-b last:border-0">
                            <td className="py-2">{rate.date}</td>
                            <td className="text-right py-2">Bs. {Number(rate.usd).toFixed(2)}</td>
                            <td className="text-right py-2">Bs. {Number(rate.eur).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Actualización automática</p>
                    <p className="text-muted-foreground">
                      La tasa se actualiza automáticamente
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================
            TAB: BUSINESS
        ========================== */}
        <TabsContent value="business" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información del Negocio</CardTitle>
              <CardDescription>Datos de contacto</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre del negocio</Label>
                  <Input
                    value={settings.business?.name || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        business: { ...(settings.business || {}), name: e.target.value },
                      })
                    }
                    placeholder="Tu Tienda"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={settings.business?.email || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        business: { ...(settings.business || {}), email: e.target.value },
                      })
                    }
                    placeholder="contacto@tutienda.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input
                    value={settings.business?.phone || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        business: { ...(settings.business || {}), phone: e.target.value },
                      })
                    }
                    placeholder="+58 412 1234567"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Slogan (opcional)</Label>
                  <Input
                    value={settings.business?.slogan || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        business: { ...(settings.business || {}), slogan: e.target.value },
                      })
                    }
                    placeholder="Lo mejor en..."
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>Dirección</Label>
                  <Input
                    value={settings.business?.address || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        business: { ...(settings.business || {}), address: e.target.value },
                      })
                    }
                    placeholder="Calle Principal, Ciudad"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => saveSettings({ business: settings.business })} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Cambios
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}