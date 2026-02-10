"use client"

import { useState, useEffect, useMemo } from "react"
import { ArrowLeft, CreditCard, Truck, Shield, MessageCircle, X, Plus, Minus, Lock, Search, CheckCircle2, AlertCircle, ShoppingBag, MapPin, Clock, Wallet, Banknote, Building, Store, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useCart } from "@/contexts/cart-context"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { brandConfig } from "@/lib/config"

const countryCodes = [
  { code: "+1", country: "Estados Unidos / Canadá", flag: "🇺🇸" },
  { code: "+52", country: "México", flag: "🇲🇽" },
  { code: "+53", country: "Cuba", flag: "🇨🇺" },
  { code: "+54", country: "Argentina", flag: "🇦🇷" },
  { code: "+55", country: "Brasil", flag: "🇧🇷" },
  { code: "+56", country: "Chile", flag: "🇨🇱" },
  { code: "+57", country: "Colombia", flag: "🇨🇴" },
  { code: "+58", country: "Venezuela", flag: "🇻🇪" },
  { code: "+591", country: "Bolivia", flag: "🇧🇴" },
  { code: "+593", country: "Ecuador", flag: "🇪🇨" },
  { code: "+595", country: "Paraguay", flag: "🇵🇾" },
  { code: "+598", country: "Uruguay", flag: "🇺🇾" },
  { code: "+34", country: "España", flag: "🇪🇸" },
  { code: "+351", country: "Portugal", flag: "🇵🇹" },
]

const paymentIcons: { [key: string]: any } = {
  pago_movil: Building,
  zelle: Wallet,
  binance: Wallet,
  efectivo_divisas: Banknote,
  efectivo_bs: Banknote,
  transfer: Building,
  cash: Banknote,
  card: CreditCard,
}

const shippingIcons: { [key: string]: any } = {
  delivery: Truck,
  pickup: Store,
  standard: Truck,
}

interface PublicSettings {
  currency: {
    symbol: string;
    code: string;
    showBsPrice: boolean;
  };
  cashDiscount: {
    isActive: boolean;
    percentage: number;
    applicablePaymentMethods: string[];
  };
  paymentMethods: any[];
  shippingMethods: any[];
  business: any;
  whatsapp: { number: string };
}

interface ExchangeRate {
  date: string;
  usd: number;
  eur: number;
}

export default function Checkout() {
  const { items, total, clearCart, updateQuantity, removeItem } = useCart()
  const { user } = useAuth()
  const [settings, setSettings] = useState<PublicSettings | null>(null)
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    countryCode: "+58",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    reference: "",
    shippingMethod: "",
    paymentMethod: "",
    notes: ""
  })
  
  const [showOrderConfirmation, setShowOrderConfirmation] = useState(false)
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)
  const [countrySearch, setCountrySearch] = useState("")
  
  const [validationErrors, setValidationErrors] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: ""
  })

  // ============================================================
  // SCROLL AUTOMÁTICO AL INICIO cuando se carga la página
  // ============================================================
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // Cargar configuraciones públicas
  useEffect(() => {
    loadSettings()
  }, [])

  // Cargar datos del usuario
  useEffect(() => {
    if (user) {
      loadUserData()
    }
  }, [user])

  const loadSettings = async () => {
    try {
      const result = await api.getPublicSettings()
      if (result.success) {
        setSettings(result.settings)
        setExchangeRate(result.exchangeRate)
        
        // Establecer método de envío por defecto
        if (result.settings.shippingMethods?.length > 0) {
          setFormData(prev => ({
            ...prev,
            shippingMethod: result.settings.shippingMethods[0].id
          }))
        }
        
        // Establecer método de pago por defecto
        if (result.settings.paymentMethods?.length > 0) {
          setFormData(prev => ({
            ...prev,
            paymentMethod: result.settings.paymentMethods[0].id
          }))
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserData = async () => {
    if (user) {
      try {
        const profileResult = await api.getMe()
        if (profileResult.success && profileResult.user) {
          const userData = profileResult.user
          
          let countryCode = "+58"
          let phoneNumber = ""
          
          if (userData.phone) {
            const matchedCountry = countryCodes.find(country => 
              userData.phone.startsWith(country.code)
            )
            
            if (matchedCountry) {
              countryCode = matchedCountry.code
              phoneNumber = userData.phone.substring(matchedCountry.code.length).trim()
            } else {
              phoneNumber = userData.phone
            }
          }
          
          setFormData(prev => ({
            ...prev,
            firstName: userData.firstName || user.firstName || "",
            lastName: userData.lastName || user.lastName || "",
            email: userData.email || user.email || "",
            countryCode: countryCode,
            phone: phoneNumber,
            address: userData.address || "",
            city: userData.city || "",
            state: userData.state || "",
            zipCode: userData.zipCode || "",
          }))
        }
      } catch (error) {
        console.error('Error loading user profile:', error)
      }
    }
  }

  // Filtrar códigos de país
  const filteredCountries = useMemo(() => {
    if (!countrySearch) return countryCodes
    return countryCodes.filter(country => 
      country.country.toLowerCase().includes(countrySearch.toLowerCase()) ||
      country.code.includes(countrySearch)
    )
  }, [countrySearch])

  // Obtener método de envío seleccionado
  const selectedShippingMethod = useMemo(() => {
    return settings?.shippingMethods.find(m => m.id === formData.shippingMethod)
  }, [settings, formData.shippingMethod])

  // Obtener método de pago seleccionado
  const selectedPaymentMethod = useMemo(() => {
    return settings?.paymentMethods.find(m => m.id === formData.paymentMethod)
  }, [settings, formData.paymentMethod])

  // Calcular descuento
  const discount = useMemo(() => {
    if (!selectedPaymentMethod?.hasDiscount) return 0
    return (total * (selectedPaymentMethod.discountPercentage || 0)) / 100
  }, [total, selectedPaymentMethod])

  // Calcular costo de envío
  const shippingCost = useMemo(() => {
    if (!selectedShippingMethod) return 0
    if (selectedShippingMethod.freeFrom > 0 && total >= selectedShippingMethod.freeFrom) {
      return 0
    }
    return selectedShippingMethod.additionalCost || 0
  }, [total, selectedShippingMethod])

  // Calcular total final
  const finalTotal = useMemo(() => {
    return total + shippingCost - discount
  }, [total, shippingCost, discount])

  // Calcular precio en bolívares
  const totalInBs = useMemo(() => {
    if (!exchangeRate || !settings) return null
    const rate = settings.currency.code === "EUR" ? exchangeRate.eur : exchangeRate.usd
    return finalTotal * rate
  }, [finalTotal, exchangeRate, settings])

  // Símbolo de moneda
  const currencySymbol = settings?.currency?.symbol || "€"

  // Validaciones
  const validateName = (name: string) => /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(name)
  const validateEmail = (email: string) => /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)
  const validatePhone = (phone: string) => /^[0-9\s()-]+$/.test(phone)

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'firstName' | 'lastName') => {
    const value = e.target.value
    if (value === '' || validateName(value)) {
      setFormData({ ...formData, [field]: value })
      setValidationErrors({ ...validationErrors, [field]: "" })
    } else {
      setValidationErrors({ ...validationErrors, [field]: "Solo se permiten letras" })
    }
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value
    setFormData({ ...formData, email })
    if (email.length > 0 && !validateEmail(email)) {
      setValidationErrors({ ...validationErrors, email: "Email inválido" })
    } else {
      setValidationErrors({ ...validationErrors, email: "" })
    }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value === '' || validatePhone(value)) {
      setFormData({ ...formData, phone: value })
      setValidationErrors({ ...validationErrors, phone: "" })
    } else {
      setValidationErrors({ ...validationErrors, phone: "Solo se permiten números" })
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const generateWhatsAppMessage = (orderNumber: string) => {
    const now = new Date()
    const date = now.toLocaleDateString('es-ES')
    const time = now.toLocaleTimeString('es-ES', { hour12: false })

    const productList = items.map((item, index) =>
      `${index + 1}. ${item.name}\n` +
      `   • Color: ${item.color}\n` +
      `   • Talla: ${item.size}\n` +
      `   • Cantidad: ${item.quantity}\n` +
      `   • Precio: ${currencySymbol}${item.price.toFixed(2)}\n` +
      `   • Subtotal: ${currencySymbol}${(item.price * item.quantity).toFixed(2)}`
    ).join('\n\n')

    let message = `*PEDIDO ${brandConfig.name.toUpperCase()}*\n\n` +
      `📋 Número de Pedido: ${orderNumber}\n` +
      `📅 Fecha: ${date}\n` +
      `🕐 Hora: ${time}\n\n` +
      `🛍️ *PRODUCTOS:*\n` +
      `──────────────────────────────\n\n` +
      `${productList}\n\n` +
      `──────────────────────────────\n` +
      `💰 Subtotal: ${currencySymbol}${total.toFixed(2)}\n`

    if (shippingCost > 0) {
      message += `🚚 Envío: ${currencySymbol}${shippingCost.toFixed(2)}\n`
    }

    if (discount > 0) {
      message += `🏷️ Descuento (${selectedPaymentMethod?.name}): -${currencySymbol}${discount.toFixed(2)}\n`
    }

    message += `\n💰 *TOTAL: ${currencySymbol}${finalTotal.toFixed(2)}*\n`

    if (totalInBs && settings?.currency.showBsPrice) {
      message += `💵 *En Bolívares: Bs. ${totalInBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}*\n`
      message += `📊 Tasa del día: ${settings.currency.code === "EUR" ? exchangeRate?.eur : exchangeRate?.usd} Bs/${settings.currency.code}\n`
    }

    message += `\n👤 *DATOS DEL CLIENTE:*\n` +
      `Nombre: ${formData.firstName} ${formData.lastName}\n` +
      `Email: ${formData.email}\n` +
      `Teléfono: ${formData.countryCode} ${formData.phone}\n\n`

    // Información de envío
    message += `📦 *MÉTODO DE ENTREGA:* ${selectedShippingMethod?.name}\n`
    
    if (selectedShippingMethod?.requiresAddress) {
      message += `📍 *DIRECCIÓN DE ENTREGA:*\n` +
        `${formData.address}\n` +
        `${formData.city}, ${formData.state} ${formData.zipCode}\n`
      if (formData.reference) {
        message += `Referencia: ${formData.reference}\n`
      }
    } else if (selectedShippingMethod?.type === 'pickup' && selectedShippingMethod?.pickupData) {
      message += `🏪 *RETIRO EN:*\n` +
        `${selectedShippingMethod.pickupData.address}\n` +
        `Horario: ${selectedShippingMethod.pickupData.schedule}\n`
    }

    message += `\n💳 *MÉTODO DE PAGO:* ${selectedPaymentMethod?.name}\n`

    // Mensaje personalizado del método de pago
    if (selectedPaymentMethod?.whatsappMessage) {
      message += `\n${selectedPaymentMethod.whatsappMessage}\n`
    }

    // Información de cuenta si aplica
    if (selectedPaymentMethod?.accountData) {
      const acc = selectedPaymentMethod.accountData
      message += `\n📋 *DATOS DE PAGO:*\n`
      if (acc.bankName) message += `Banco: ${acc.bankName}\n`
      if (acc.accountNumber) message += `Cuenta: ${acc.accountNumber}\n`
      if (acc.accountHolder) message += `Titular: ${acc.accountHolder}\n`
      if (acc.identification) message += `CI/RIF: ${acc.identification}\n`
      if (acc.phone) message += `Teléfono: ${acc.phone}\n`
      if (acc.email) message += `Email: ${acc.email}\n`
      if (acc.walletAddress) message += `Wallet: ${acc.walletAddress}\n`
      if (acc.additionalInfo) message += `${acc.additionalInfo}\n`
    }

    if (formData.notes) {
      message += `\n📝 *NOTAS:* ${formData.notes}\n`
    }

    message += `\n🙌 ¡Gracias por tu compra!\n` +
      `📱 Instagram: ${brandConfig.social.instagram}`

    return message
  }

  const handleWhatsAppOrder = async () => {
    if (!isFormValid()) return

    setSubmitting(true)

    // ============================================================
    // SOLUCIÓN SAFARI: Abrir ventana INMEDIATAMENTE antes de async
    // Safari solo permite window.open() en respuesta directa a click
    // ============================================================
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    let whatsappWindow: Window | null = null
    
    if (!isSafari) {
      // En navegadores normales, abrimos una ventana en blanco que actualizaremos después
      whatsappWindow = window.open('', '_blank')
    }

    try {
      const orderData = {
        customerInfo: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: `${formData.countryCode} ${formData.phone}`
        },
        shippingAddress: selectedShippingMethod?.requiresAddress ? {
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          reference: formData.reference,
        } : null,
        shippingMethod: formData.shippingMethod,
        paymentMethod: formData.paymentMethod,
        notes: formData.notes
      }

      const result = await api.createOrder(orderData)

      if (result.success) {
        const orderNumber = result.order.orderNumber
        const message = generateWhatsAppMessage(orderNumber)
        const phoneNumber = settings?.whatsapp?.number || brandConfig.contact.whatsapp
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`

        await api.updateOrderWhatsApp(result.order._id)

        // ============================================================
        // SOLUCIÓN SCROLL: Subir al inicio de la página suavemente
        // ============================================================
        window.scrollTo({ top: 0, behavior: 'smooth' })

        setShowOrderConfirmation(true)
        clearCart()

        // ============================================================
        // SOLUCIÓN SAFARI: Diferentes estrategias según el navegador
        // ============================================================
        if (isSafari) {
          // En Safari, usamos location.href para navegar directamente
          // Esperamos un momento para que el modal se muestre
          setTimeout(() => {
            window.location.href = whatsappUrl
          }, 500)
        } else {
          // En otros navegadores, actualizamos la ventana que abrimos
          if (whatsappWindow && !whatsappWindow.closed) {
            whatsappWindow.location.href = whatsappUrl
          } else {
            // Fallback si la ventana fue bloqueada
            window.open(whatsappUrl, '_blank')
          }
        }
      }
    } catch (error) {
      console.error('Error creating order:', error)
      // Cerrar ventana si hubo error
      if (whatsappWindow && !whatsappWindow.closed) {
        whatsappWindow.close()
      }
    } finally {
      setSubmitting(false)
    }
  }

  const isFormValid = () => {
    const baseValid = formData.firstName && formData.lastName && formData.email &&
      formData.phone && validateEmail(formData.email) &&
      !validationErrors.firstName && !validationErrors.lastName &&
      !validationErrors.email && !validationErrors.phone &&
      formData.shippingMethod && formData.paymentMethod

    if (selectedShippingMethod?.requiresAddress) {
      return baseValid && formData.address && formData.city && formData.state && formData.zipCode
    }

    return baseValid
  }

  const isEmailValid = formData.email.length > 0 && validateEmail(formData.email)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-16 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-black"></div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl shadow-2xl p-12 text-center">
            <div className="w-28 h-28 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <ShoppingBag className="h-14 w-14 text-gray-500" />
            </div>
            <h1 className="text-3xl font-black uppercase mb-4 text-gray-900">Tu carrito está vacío</h1>
            <p className="text-gray-600 mb-8">Agrega productos antes de proceder al checkout</p>
            <Button
              onClick={() => window.location.href = '/'}
              className="bg-gradient-to-r from-black to-gray-800 text-white hover:from-gray-800 hover:to-black rounded-2xl px-12 py-6 text-base font-bold uppercase shadow-2xl hover:shadow-3xl transition-all hover:scale-105"
            >
              Continuar Comprando
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => window.history.back()}
            className="flex items-center text-gray-600 hover:text-black mb-4 transition-colors group bg-white px-4 py-2 rounded-full shadow-md hover:shadow-lg"
          >
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Volver</span>
          </button>
          <h1 className="text-3xl md:text-4xl font-black uppercase mb-2 text-gray-900">
            Finalizar Compra
          </h1>
          <p className="text-gray-600">
            {user ? `¡Hola ${user.firstName}! Completa tu información para confirmar el pedido` : 'Completa tu información para confirmar el pedido'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Information */}
            <Card className="rounded-3xl border-0 shadow-xl bg-white hover:shadow-2xl transition-shadow">
              <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white rounded-t-3xl">
                <CardTitle className="flex items-center text-lg font-bold text-gray-900">
                  <div className="w-10 h-10 bg-gradient-to-br from-black to-gray-800 rounded-2xl flex items-center justify-center mr-3 shadow-lg">
                    <span className="text-white text-sm font-bold">1</span>
                  </div>
                  Información de Contacto
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 mb-2 block">Nombre *</Label>
                    <Input
                      name="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleNameChange(e, 'firstName')}
                      className={`rounded-2xl border-2 h-12 transition-all ${
                        validationErrors.firstName ? 'border-red-500' : 'border-gray-200 focus:border-black'
                      }`}
                      required
                    />
                    {validationErrors.firstName && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.firstName}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 mb-2 block">Apellido *</Label>
                    <Input
                      name="lastName"
                      value={formData.lastName}
                      onChange={(e) => handleNameChange(e, 'lastName')}
                      className={`rounded-2xl border-2 h-12 transition-all ${
                        validationErrors.lastName ? 'border-red-500' : 'border-gray-200 focus:border-black'
                      }`}
                      required
                    />
                    {validationErrors.lastName && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.lastName}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-2 block">Email *</Label>
                  <div className="relative">
                    <Input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleEmailChange}
                      className={`rounded-2xl border-2 h-12 pr-10 transition-all ${
                        isEmailValid 
                          ? 'border-green-500' 
                          : validationErrors.email 
                          ? 'border-red-500' 
                          : 'border-gray-200 focus:border-black'
                      }`}
                      required
                    />
                    {isEmailValid && (
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                    )}
                  </div>
                  {validationErrors.email && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.email}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-2 block">Teléfono *</Label>
                  <div className="flex gap-2">
                    <div className="relative w-36">
                      <button
                        type="button"
                        onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                        className="w-full h-12 px-3 border-2 border-gray-200 rounded-2xl flex items-center justify-between bg-white hover:border-gray-400 transition-colors shadow-sm hover:shadow-md"
                      >
                        <span className="text-sm font-medium">
                          {countryCodes.find(c => c.code === formData.countryCode)?.flag} {formData.countryCode}
                        </span>
                        <Search className="h-4 w-4 text-gray-400" />
                      </button>
                      
                      {showCountryDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 rounded-2xl shadow-2xl z-50 max-h-64 overflow-hidden">
                          <div className="p-2 border-b sticky top-0 bg-white">
                            <Input
                              type="text"
                              placeholder="Buscar país..."
                              value={countrySearch}
                              onChange={(e) => setCountrySearch(e.target.value)}
                              className="h-10 text-sm rounded-xl"
                              autoFocus
                            />
                          </div>
                          <div className="overflow-y-auto max-h-52">
                            {filteredCountries.map((country) => (
                              <button
                                key={country.code}
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, countryCode: country.code })
                                  setShowCountryDropdown(false)
                                  setCountrySearch("")
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-gray-100 transition-colors flex items-center gap-2 text-sm rounded-xl mx-1"
                              >
                                <span>{country.flag}</span>
                                <span className="font-medium">{country.code}</span>
                                <span className="text-gray-600 truncate">{country.country}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <Input
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handlePhoneChange}
                        placeholder="412 123 4567"
                        className={`rounded-2xl border-2 h-12 transition-all ${
                          validationErrors.phone ? 'border-red-500' : 'border-gray-200 focus:border-black'
                        }`}
                        required
                      />
                    </div>
                  </div>
                  {validationErrors.phone && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.phone}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Shipping Method */}
            <Card className="rounded-3xl border-0 shadow-xl bg-white hover:shadow-2xl transition-shadow">
              <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white rounded-t-3xl">
                <CardTitle className="flex items-center text-lg font-bold text-gray-900">
                  <div className="w-10 h-10 bg-gradient-to-br from-black to-gray-800 rounded-2xl flex items-center justify-center mr-3 shadow-lg">
                    <span className="text-white text-sm font-bold">2</span>
                  </div>
                  Método de Entrega
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {settings?.shippingMethods.map((method) => {
                    const IconComponent = shippingIcons[method.type] || Truck
                    const isSelected = formData.shippingMethod === method.id
                    const isFree = method.freeFrom > 0 && total >= method.freeFrom
                    
                    return (
                      <label
                        key={method.id}
                        className={`flex items-start p-4 border-2 rounded-2xl cursor-pointer transition-all shadow-sm hover:shadow-md ${
                          isSelected ? 'border-black bg-gray-50 shadow-lg' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="shippingMethod"
                          value={method.id}
                          checked={isSelected}
                          onChange={handleInputChange}
                          className="mt-1 mr-3"
                          style={{ accentColor: 'black' }}
                        />
                        <IconComponent className="h-5 w-5 mr-3 mt-0.5 text-gray-600" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">{method.name}</span>
                            {method.additionalCost > 0 ? (
                              isFree ? (
                                <span className="text-green-600 font-semibold">¡Gratis!</span>
                              ) : (
                                <span className="font-semibold">{currencySymbol}{method.additionalCost.toFixed(2)}</span>
                              )
                            ) : (
                              <span className="text-green-600 font-semibold">A Consultar</span>
                            )}
                          </div>
                          {method.description && (
                            <p className="text-sm text-gray-500 mt-1">{method.description}</p>
                          )}
                          {method.estimatedTime && (
                            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {method.estimatedTime}
                            </p>
                          )}
                          {method.freeFrom > 0 && !isFree && (
                            <p className="text-xs text-blue-600 mt-1">
                              Envío gratis en compras desde {currencySymbol}{method.freeFrom.toFixed(2)}
                            </p>
                          )}
                          {method.type === 'pickup' && method.pickupData && (
                            <div className="mt-2 p-2 bg-blue-50 rounded-lg text-xs text-blue-700">
                              <p className="font-medium">{method.pickupData.address}</p>
                              <p>{method.pickupData.schedule}</p>
                            </div>
                          )}
                        </div>
                      </label>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Shipping Address - Solo si es requerido */}
            {selectedShippingMethod?.requiresAddress && (
              <Card className="rounded-3xl border-0 shadow-xl bg-white hover:shadow-2xl transition-shadow">
                <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white rounded-t-3xl">
                  <CardTitle className="flex items-center text-lg font-bold text-gray-900">
                    <div className="w-10 h-10 bg-gradient-to-br from-black to-gray-800 rounded-2xl flex items-center justify-center mr-3 shadow-lg">
                      <MapPin className="h-5 w-5 text-white" />
                    </div>
                    Dirección de Envío
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 mb-2 block">Dirección *</Label>
                    <Input
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="rounded-2xl border-2 border-gray-200 h-12 focus:border-black transition-all"
                      placeholder="Calle, número, apartamento"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold text-gray-700 mb-2 block">Ciudad *</Label>
                      <Input
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className="rounded-2xl border-2 border-gray-200 h-12 focus:border-black transition-all"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-gray-700 mb-2 block">Estado *</Label>
                      <Input
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        className="rounded-2xl border-2 border-gray-200 h-12 focus:border-black transition-all"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold text-gray-700 mb-2 block">Código Postal *</Label>
                      <Input
                        name="zipCode"
                        value={formData.zipCode}
                        onChange={handleInputChange}
                        className="rounded-2xl border-2 border-gray-200 h-12 focus:border-black transition-all"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-gray-700 mb-2 block">Punto de Referencia</Label>
                      <Input
                        name="reference"
                        value={formData.reference}
                        onChange={handleInputChange}
                        className="rounded-2xl border-2 border-gray-200 h-12 focus:border-black transition-all"
                        placeholder="Cerca de..."
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Method */}
            <Card className="rounded-3xl border-0 shadow-xl bg-white hover:shadow-2xl transition-shadow">
              <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white rounded-t-3xl">
                <CardTitle className="flex items-center text-lg font-bold text-gray-900">
                  <div className="w-10 h-10 bg-gradient-to-br from-black to-gray-800 rounded-2xl flex items-center justify-center mr-3 shadow-lg">
                    <span className="text-white text-sm font-bold">3</span>
                  </div>
                  Método de Pago
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {settings?.paymentMethods.map((method) => {
                    const IconComponent = paymentIcons[method.id] || CreditCard
                    const isSelected = formData.paymentMethod === method.id
                    
                    return (
                      <label
                        key={method.id}
                        className={`flex items-start p-4 border-2 rounded-2xl cursor-pointer transition-all shadow-sm hover:shadow-md ${
                          isSelected ? 'border-black bg-gray-50 shadow-lg' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method.id}
                          checked={isSelected}
                          onChange={handleInputChange}
                          className="mt-1 mr-3"
                          style={{ accentColor: 'black' }}
                        />
                        <IconComponent className="h-5 w-5 mr-3 mt-0.5 text-gray-600" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{method.name}</span>
                            {method.hasDiscount && (
                              <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                                -{method.discountPercentage}%
                              </span>
                            )}
                          </div>
                          {method.description && (
                            <p className="text-sm text-gray-500 mt-1">{method.description}</p>
                          )}
                          {method.requiresProof && (
                            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                              <Info className="h-3 w-3" />
                              Se requiere comprobante de pago
                            </p>
                          )}
                          {isSelected && method.accountData && Object.keys(method.accountData).some(k => method.accountData[k]) && (
                            <div className="mt-3 p-3 bg-blue-50 rounded-xl text-sm">
                              <p className="font-semibold text-blue-900 mb-2">Datos de pago:</p>
                              <div className="space-y-1 text-blue-800">
                                {method.accountData.bankName && <p>Banco: {method.accountData.bankName}</p>}
                                {method.accountData.accountNumber && <p>Cuenta: {method.accountData.accountNumber}</p>}
                                {method.accountData.accountHolder && <p>Titular: {method.accountData.accountHolder}</p>}
                                {method.accountData.identification && <p>CI/RIF: {method.accountData.identification}</p>}
                                {method.accountData.phone && <p>Teléfono: {method.accountData.phone}</p>}
                                {method.accountData.email && <p>Email: {method.accountData.email}</p>}
                                {method.accountData.walletAddress && <p>Wallet: {method.accountData.walletAddress}</p>}
                                {method.accountData.additionalInfo && <p className="mt-2 text-xs">{method.accountData.additionalInfo}</p>}
                              </div>
                            </div>
                          )}
                        </div>
                      </label>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card className="rounded-3xl border-0 shadow-xl bg-white hover:shadow-2xl transition-shadow">
              <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white rounded-t-3xl">
                <CardTitle className="text-lg font-bold text-gray-900">
                  Notas Adicionales (Opcional)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <Textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Instrucciones especiales para la entrega..."
                  className="rounded-2xl border-2 border-gray-200 min-h-[100px] focus:border-black transition-all"
                />
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card className="rounded-3xl border-0 shadow-2xl bg-white sticky top-8">
              <CardHeader className="border-b bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-t-3xl">
                <CardTitle className="text-lg font-bold">
                  Resumen del Pedido
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {/* Items */}
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {items.map((item) => (
                    <div key={`${item.id}-${item.size}-${item.color}`} className="flex gap-3 pb-4 border-b border-gray-100">
                      <div className="w-20 h-20 bg-gray-100 flex-shrink-0 rounded-2xl overflow-hidden shadow-md">
                        <img
                          src={item.image ? `https://yenfit.shop${item.image}` : "/placeholder.svg"}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm uppercase truncate mb-1">
                          {item.name}
                        </h4>
                        <p className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg inline-block">{item.color} • {item.size}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-600 font-medium">Cant: {item.quantity}</span>
                          <span className="font-bold text-sm">{currencySymbol}{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-semibold">{currencySymbol}{total.toFixed(2)}</span>
                  </div>
                  
                  {shippingCost > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Envío</span>
                      <span className="font-semibold">{currencySymbol}{shippingCost.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Descuento ({selectedPaymentMethod?.name})</span>
                      <span className="font-semibold">-{currencySymbol}{discount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-baseline pt-3 border-t-2 border-gray-900">
                    <span className="text-lg font-black uppercase">Total</span>
                    <span className="text-3xl font-black">{currencySymbol}{finalTotal.toFixed(2)}</span>
                  </div>

                  {/* Precio en Bolívares */}
                  {totalInBs && settings?.currency.showBsPrice && (
                    <div className="bg-blue-50 rounded-2xl p-3 text-center">
                      <p className="text-sm text-blue-700">
                        <span className="font-semibold">En Bolívares:</span> Bs. {totalInBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-blue-500 mt-1">
                        Tasa: {settings.currency.code === "EUR" ? exchangeRate?.eur : exchangeRate?.usd} Bs/{settings.currency.code}
                      </p>
                    </div>
                  )}
                </div>

                {/* Checkout Button */}
                <Button
                  className="w-full bg-gradient-to-r from-gray-900 to-black text-white hover:from-black hover:to-gray-900 rounded-2xl h-16 text-base font-bold uppercase tracking-wider disabled:opacity-50 shadow-2xl hover:shadow-3xl transition-all hover:scale-105 disabled:hover:scale-100"
                  onClick={handleWhatsAppOrder}
                  disabled={!isFormValid() || submitting}
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Procesando...
                    </>
                  ) : (
                    <>
                      <MessageCircle className="h-5 w-5 mr-2" />
                      Confirmar Pedido
                    </>
                  )}
                </Button>

                {/* Security Info */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-4 shadow-lg">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-blue-900 mb-1">
                        Compra 100% Segura
                      </p>
                      <p className="text-xs text-blue-700">
                        Tu pedido será confirmado vía WhatsApp antes de procesar el pago
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Order Confirmation Modal */}
      {showOrderConfirmation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl animate-scaleIn">
            <div className="p-8">
              <div className="text-center mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl">
                  <CheckCircle2 className="h-12 w-12 text-white" />
                </div>
                <h3 className="text-2xl font-black uppercase mb-2 text-gray-900">¡Pedido Enviado!</h3>
                <p className="text-gray-600">Tu pedido ha sido enviado por WhatsApp. Nos pondremos en contacto contigo pronto.</p>
              </div>

              <Button
                onClick={() => {
                  setShowOrderConfirmation(false)
                  window.location.href = '/'
                }}
                className="w-full bg-gradient-to-r from-black to-gray-800 text-white hover:from-gray-800 hover:to-black rounded-2xl h-14 font-bold uppercase shadow-2xl hover:shadow-3xl transition-all hover:scale-105"
              >
                Volver a la Tienda
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// "use client"

// import { useState, useEffect, useMemo } from "react"
// import { ArrowLeft, CreditCard, Truck, Shield, MessageCircle, X, Plus, Minus, Lock, Search, CheckCircle2, AlertCircle, ShoppingBag, MapPin, Clock, Wallet, Banknote, Building, Store, Info } from "lucide-react"
// import { Button } from "@/components/ui/button"
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { Textarea } from "@/components/ui/textarea"
// import { useCart } from "@/contexts/cart-context"
// import { useAuth } from "@/contexts/auth-context"
// import { api } from "@/lib/api"
// import { brandConfig } from "@/lib/config"

// const countryCodes = [
//   { code: "+1", country: "Estados Unidos / Canadá", flag: "🇺🇸" },
//   { code: "+52", country: "México", flag: "🇲🇽" },
//   { code: "+53", country: "Cuba", flag: "🇨🇺" },
//   { code: "+54", country: "Argentina", flag: "🇦🇷" },
//   { code: "+55", country: "Brasil", flag: "🇧🇷" },
//   { code: "+56", country: "Chile", flag: "🇨🇱" },
//   { code: "+57", country: "Colombia", flag: "🇨🇴" },
//   { code: "+58", country: "Venezuela", flag: "🇻🇪" },
//   { code: "+591", country: "Bolivia", flag: "🇧🇴" },
//   { code: "+593", country: "Ecuador", flag: "🇪🇨" },
//   { code: "+595", country: "Paraguay", flag: "🇵🇾" },
//   { code: "+598", country: "Uruguay", flag: "🇺🇾" },
//   { code: "+34", country: "España", flag: "🇪🇸" },
//   { code: "+351", country: "Portugal", flag: "🇵🇹" },
// ]

// const paymentIcons: { [key: string]: any } = {
//   pago_movil: Building,
//   zelle: Wallet,
//   binance: Wallet,
//   efectivo_divisas: Banknote,
//   efectivo_bs: Banknote,
//   transfer: Building,
//   cash: Banknote,
//   card: CreditCard,
// }

// const shippingIcons: { [key: string]: any } = {
//   delivery: Truck,
//   pickup: Store,
//   standard: Truck,
// }

// interface PublicSettings {
//   currency: {
//     symbol: string;
//     code: string;
//     showBsPrice: boolean;
//   };
//   cashDiscount: {
//     isActive: boolean;
//     percentage: number;
//     applicablePaymentMethods: string[];
//   };
//   paymentMethods: any[];
//   shippingMethods: any[];
//   business: any;
//   whatsapp: { number: string };
// }

// interface ExchangeRate {
//   date: string;
//   usd: number;
//   eur: number;
// }

// export default function Checkout() {
//   const { items, total, clearCart, updateQuantity, removeItem } = useCart()
//   const { user } = useAuth()
//   const [settings, setSettings] = useState<PublicSettings | null>(null)
//   const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null)
//   const [loading, setLoading] = useState(true)
//   const [submitting, setSubmitting] = useState(false)
  
//   const [formData, setFormData] = useState({
//     firstName: "",
//     lastName: "",
//     email: "",
//     countryCode: "+58",
//     phone: "",
//     address: "",
//     city: "",
//     state: "",
//     zipCode: "",
//     reference: "",
//     shippingMethod: "",
//     paymentMethod: "",
//     notes: ""
//   })
  
//   const [showOrderConfirmation, setShowOrderConfirmation] = useState(false)
//   const [showCountryDropdown, setShowCountryDropdown] = useState(false)
//   const [countrySearch, setCountrySearch] = useState("")
  
//   const [validationErrors, setValidationErrors] = useState({
//     firstName: "",
//     lastName: "",
//     email: "",
//     phone: ""
//   })

//   // Cargar configuraciones públicas
//   useEffect(() => {
//     loadSettings()
//   }, [])

//   // Cargar datos del usuario
//   useEffect(() => {
//     if (user) {
//       loadUserData()
//     }
//   }, [user])

//   const loadSettings = async () => {
//     try {
//       const result = await api.getPublicSettings()
//       if (result.success) {
//         setSettings(result.settings)
//         setExchangeRate(result.exchangeRate)
        
//         // Establecer método de envío por defecto
//         if (result.settings.shippingMethods?.length > 0) {
//           setFormData(prev => ({
//             ...prev,
//             shippingMethod: result.settings.shippingMethods[0].id
//           }))
//         }
        
//         // Establecer método de pago por defecto
//         if (result.settings.paymentMethods?.length > 0) {
//           setFormData(prev => ({
//             ...prev,
//             paymentMethod: result.settings.paymentMethods[0].id
//           }))
//         }
//       }
//     } catch (error) {
//       console.error('Error loading settings:', error)
//     } finally {
//       setLoading(false)
//     }
//   }

//   const loadUserData = async () => {
//     if (user) {
//       try {
//         const profileResult = await api.getMe()
//         if (profileResult.success && profileResult.user) {
//           const userData = profileResult.user
          
//           let countryCode = "+58"
//           let phoneNumber = ""
          
//           if (userData.phone) {
//             const matchedCountry = countryCodes.find(country => 
//               userData.phone.startsWith(country.code)
//             )
            
//             if (matchedCountry) {
//               countryCode = matchedCountry.code
//               phoneNumber = userData.phone.substring(matchedCountry.code.length).trim()
//             } else {
//               phoneNumber = userData.phone
//             }
//           }
          
//           setFormData(prev => ({
//             ...prev,
//             firstName: userData.firstName || user.firstName || "",
//             lastName: userData.lastName || user.lastName || "",
//             email: userData.email || user.email || "",
//             countryCode: countryCode,
//             phone: phoneNumber,
//             address: userData.address || "",
//             city: userData.city || "",
//             state: userData.state || "",
//             zipCode: userData.zipCode || "",
//           }))
//         }
//       } catch (error) {
//         console.error('Error loading user profile:', error)
//       }
//     }
//   }

//   // Filtrar códigos de país
//   const filteredCountries = useMemo(() => {
//     if (!countrySearch) return countryCodes
//     return countryCodes.filter(country => 
//       country.country.toLowerCase().includes(countrySearch.toLowerCase()) ||
//       country.code.includes(countrySearch)
//     )
//   }, [countrySearch])

//   // Obtener método de envío seleccionado
//   const selectedShippingMethod = useMemo(() => {
//     return settings?.shippingMethods.find(m => m.id === formData.shippingMethod)
//   }, [settings, formData.shippingMethod])

//   // Obtener método de pago seleccionado
//   const selectedPaymentMethod = useMemo(() => {
//     return settings?.paymentMethods.find(m => m.id === formData.paymentMethod)
//   }, [settings, formData.paymentMethod])

//   // Calcular descuento
//   const discount = useMemo(() => {
//     if (!selectedPaymentMethod?.hasDiscount) return 0
//     return (total * (selectedPaymentMethod.discountPercentage || 0)) / 100
//   }, [total, selectedPaymentMethod])

//   // Calcular costo de envío
//   const shippingCost = useMemo(() => {
//     if (!selectedShippingMethod) return 0
//     if (selectedShippingMethod.freeFrom > 0 && total >= selectedShippingMethod.freeFrom) {
//       return 0
//     }
//     return selectedShippingMethod.additionalCost || 0
//   }, [total, selectedShippingMethod])

//   // Calcular total final
//   const finalTotal = useMemo(() => {
//     return total + shippingCost - discount
//   }, [total, shippingCost, discount])

//   // Calcular precio en bolívares
//   const totalInBs = useMemo(() => {
//     if (!exchangeRate || !settings) return null
//     const rate = settings.currency.code === "EUR" ? exchangeRate.eur : exchangeRate.usd
//     return finalTotal * rate
//   }, [finalTotal, exchangeRate, settings])

//   // Símbolo de moneda
//   const currencySymbol = settings?.currency?.symbol || "€"

//   // Validaciones
//   const validateName = (name: string) => /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(name)
//   const validateEmail = (email: string) => /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)
//   const validatePhone = (phone: string) => /^[0-9\s()-]+$/.test(phone)

//   const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'firstName' | 'lastName') => {
//     const value = e.target.value
//     if (value === '' || validateName(value)) {
//       setFormData({ ...formData, [field]: value })
//       setValidationErrors({ ...validationErrors, [field]: "" })
//     } else {
//       setValidationErrors({ ...validationErrors, [field]: "Solo se permiten letras" })
//     }
//   }

//   const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const email = e.target.value
//     setFormData({ ...formData, email })
//     if (email.length > 0 && !validateEmail(email)) {
//       setValidationErrors({ ...validationErrors, email: "Email inválido" })
//     } else {
//       setValidationErrors({ ...validationErrors, email: "" })
//     }
//   }

//   const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const value = e.target.value
//     if (value === '' || validatePhone(value)) {
//       setFormData({ ...formData, phone: value })
//       setValidationErrors({ ...validationErrors, phone: "" })
//     } else {
//       setValidationErrors({ ...validationErrors, phone: "Solo se permiten números" })
//     }
//   }

//   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
//     const { name, value } = e.target
//     setFormData(prev => ({ ...prev, [name]: value }))
//   }

//   const generateWhatsAppMessage = (orderNumber: string) => {
//     const now = new Date()
//     const date = now.toLocaleDateString('es-ES')
//     const time = now.toLocaleTimeString('es-ES', { hour12: false })

//     const productList = items.map((item, index) =>
//       `${index + 1}. ${item.name}\n` +
//       `   • Color: ${item.color}\n` +
//       `   • Talla: ${item.size}\n` +
//       `   • Cantidad: ${item.quantity}\n` +
//       `   • Precio: ${currencySymbol}${item.price.toFixed(2)}\n` +
//       `   • Subtotal: ${currencySymbol}${(item.price * item.quantity).toFixed(2)}`
//     ).join('\n\n')

//     let message = `*PEDIDO ${brandConfig.name.toUpperCase()}*\n\n` +
//       `📋 Número de Pedido: ${orderNumber}\n` +
//       `📅 Fecha: ${date}\n` +
//       `🕐 Hora: ${time}\n\n` +
//       `🛍️ *PRODUCTOS:*\n` +
//       `──────────────────────────────\n\n` +
//       `${productList}\n\n` +
//       `──────────────────────────────\n` +
//       `💰 Subtotal: ${currencySymbol}${total.toFixed(2)}\n`

//     if (shippingCost > 0) {
//       message += `🚚 Envío: ${currencySymbol}${shippingCost.toFixed(2)}\n`
//     }

//     if (discount > 0) {
//       message += `🏷️ Descuento (${selectedPaymentMethod?.name}): -${currencySymbol}${discount.toFixed(2)}\n`
//     }

//     message += `\n💰 *TOTAL: ${currencySymbol}${finalTotal.toFixed(2)}*\n`

//     if (totalInBs && settings?.currency.showBsPrice) {
//       message += `💵 *En Bolívares: Bs. ${totalInBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}*\n`
//       message += `📊 Tasa del día: ${settings.currency.code === "EUR" ? exchangeRate?.eur : exchangeRate?.usd} Bs/${settings.currency.code}\n`
//     }

//     message += `\n👤 *DATOS DEL CLIENTE:*\n` +
//       `Nombre: ${formData.firstName} ${formData.lastName}\n` +
//       `Email: ${formData.email}\n` +
//       `Teléfono: ${formData.countryCode} ${formData.phone}\n\n`

//     // Información de envío
//     message += `📦 *MÉTODO DE ENTREGA:* ${selectedShippingMethod?.name}\n`
    
//     if (selectedShippingMethod?.requiresAddress) {
//       message += `📍 *DIRECCIÓN DE ENTREGA:*\n` +
//         `${formData.address}\n` +
//         `${formData.city}, ${formData.state} ${formData.zipCode}\n`
//       if (formData.reference) {
//         message += `Referencia: ${formData.reference}\n`
//       }
//     } else if (selectedShippingMethod?.type === 'pickup' && selectedShippingMethod?.pickupData) {
//       message += `🏪 *RETIRO EN:*\n` +
//         `${selectedShippingMethod.pickupData.address}\n` +
//         `Horario: ${selectedShippingMethod.pickupData.schedule}\n`
//     }

//     message += `\n💳 *MÉTODO DE PAGO:* ${selectedPaymentMethod?.name}\n`

//     // Mensaje personalizado del método de pago
//     if (selectedPaymentMethod?.whatsappMessage) {
//       message += `\n${selectedPaymentMethod.whatsappMessage}\n`
//     }

//     // Información de cuenta si aplica
//     if (selectedPaymentMethod?.accountData) {
//       const acc = selectedPaymentMethod.accountData
//       message += `\n📋 *DATOS DE PAGO:*\n`
//       if (acc.bankName) message += `Banco: ${acc.bankName}\n`
//       if (acc.accountNumber) message += `Cuenta: ${acc.accountNumber}\n`
//       if (acc.accountHolder) message += `Titular: ${acc.accountHolder}\n`
//       if (acc.identification) message += `CI/RIF: ${acc.identification}\n`
//       if (acc.phone) message += `Teléfono: ${acc.phone}\n`
//       if (acc.email) message += `Email: ${acc.email}\n`
//       if (acc.walletAddress) message += `Wallet: ${acc.walletAddress}\n`
//       if (acc.additionalInfo) message += `${acc.additionalInfo}\n`
//     }

//     if (formData.notes) {
//       message += `\n📝 *NOTAS:* ${formData.notes}\n`
//     }

//     message += `\n🙌 ¡Gracias por tu compra!\n` +
//       `📱 Instagram: ${brandConfig.social.instagram}`

//     return message
//   }

//   const handleWhatsAppOrder = async () => {
//     if (!isFormValid()) return

//     setSubmitting(true)

//     try {
//       const orderData = {
//         customerInfo: {
//           firstName: formData.firstName,
//           lastName: formData.lastName,
//           email: formData.email,
//           phone: `${formData.countryCode} ${formData.phone}`
//         },
//         shippingAddress: selectedShippingMethod?.requiresAddress ? {
//           address: formData.address,
//           city: formData.city,
//           state: formData.state,
//           zipCode: formData.zipCode,
//           reference: formData.reference,
//         } : null,
//         shippingMethod: formData.shippingMethod,
//         paymentMethod: formData.paymentMethod,
//         notes: formData.notes
//       }

//       const result = await api.createOrder(orderData)

//       if (result.success) {
//         const orderNumber = result.order.orderNumber
//         const message = generateWhatsAppMessage(orderNumber)
//         const phoneNumber = settings?.whatsapp?.number || brandConfig.contact.whatsapp
//         const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`

//         await api.updateOrderWhatsApp(result.order._id)

//         setShowOrderConfirmation(true)
//         window.open(whatsappUrl, "_blank")
//         clearCart()
//       }
//     } catch (error) {
//       console.error('Error creating order:', error)
//     } finally {
//       setSubmitting(false)
//     }
//   }

//   const isFormValid = () => {
//     const baseValid = formData.firstName && formData.lastName && formData.email &&
//       formData.phone && validateEmail(formData.email) &&
//       !validationErrors.firstName && !validationErrors.lastName &&
//       !validationErrors.email && !validationErrors.phone &&
//       formData.shippingMethod && formData.paymentMethod

//     if (selectedShippingMethod?.requiresAddress) {
//       return baseValid && formData.address && formData.city && formData.state && formData.zipCode
//     }

//     return baseValid
//   }

//   const isEmailValid = formData.email.length > 0 && validateEmail(formData.email)

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-16 flex items-center justify-center">
//         <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-black"></div>
//       </div>
//     )
//   }

//   if (items.length === 0) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-16">
//         <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="bg-white rounded-3xl shadow-2xl p-12 text-center">
//             <div className="w-28 h-28 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
//               <ShoppingBag className="h-14 w-14 text-gray-500" />
//             </div>
//             <h1 className="text-3xl font-black uppercase mb-4 text-gray-900">Tu carrito está vacío</h1>
//             <p className="text-gray-600 mb-8">Agrega productos antes de proceder al checkout</p>
//             <Button
//               onClick={() => window.location.href = '/'}
//               className="bg-gradient-to-r from-black to-gray-800 text-white hover:from-gray-800 hover:to-black rounded-2xl px-12 py-6 text-base font-bold uppercase shadow-2xl hover:shadow-3xl transition-all hover:scale-105"
//             >
//               Continuar Comprando
//             </Button>
//           </div>
//         </div>
//       </div>
//     )
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
//       <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
//         {/* Header */}
//         <div className="mb-8">
//           <button
//             onClick={() => window.history.back()}
//             className="flex items-center text-gray-600 hover:text-black mb-4 transition-colors group bg-white px-4 py-2 rounded-full shadow-md hover:shadow-lg"
//           >
//             <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
//             <span className="font-medium">Volver</span>
//           </button>
//           <h1 className="text-3xl md:text-4xl font-black uppercase mb-2 text-gray-900">
//             Finalizar Compra
//           </h1>
//           <p className="text-gray-600">
//             {user ? `¡Hola ${user.firstName}! Completa tu información para confirmar el pedido` : 'Completa tu información para confirmar el pedido'}
//           </p>
//         </div>

//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
//           {/* Forms */}
//           <div className="lg:col-span-2 space-y-6">
//             {/* Contact Information */}
//             <Card className="rounded-3xl border-0 shadow-xl bg-white hover:shadow-2xl transition-shadow">
//               <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white rounded-t-3xl">
//                 <CardTitle className="flex items-center text-lg font-bold text-gray-900">
//                   <div className="w-10 h-10 bg-gradient-to-br from-black to-gray-800 rounded-2xl flex items-center justify-center mr-3 shadow-lg">
//                     <span className="text-white text-sm font-bold">1</span>
//                   </div>
//                   Información de Contacto
//                 </CardTitle>
//               </CardHeader>
//               <CardContent className="pt-6 space-y-4">
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   <div>
//                     <Label className="text-sm font-semibold text-gray-700 mb-2 block">Nombre *</Label>
//                     <Input
//                       name="firstName"
//                       value={formData.firstName}
//                       onChange={(e) => handleNameChange(e, 'firstName')}
//                       className={`rounded-2xl border-2 h-12 transition-all ${
//                         validationErrors.firstName ? 'border-red-500' : 'border-gray-200 focus:border-black'
//                       }`}
//                       required
//                     />
//                     {validationErrors.firstName && (
//                       <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
//                         <AlertCircle className="h-3 w-3" />
//                         {validationErrors.firstName}
//                       </p>
//                     )}
//                   </div>
//                   <div>
//                     <Label className="text-sm font-semibold text-gray-700 mb-2 block">Apellido *</Label>
//                     <Input
//                       name="lastName"
//                       value={formData.lastName}
//                       onChange={(e) => handleNameChange(e, 'lastName')}
//                       className={`rounded-2xl border-2 h-12 transition-all ${
//                         validationErrors.lastName ? 'border-red-500' : 'border-gray-200 focus:border-black'
//                       }`}
//                       required
//                     />
//                     {validationErrors.lastName && (
//                       <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
//                         <AlertCircle className="h-3 w-3" />
//                         {validationErrors.lastName}
//                       </p>
//                     )}
//                   </div>
//                 </div>
//                 <div>
//                   <Label className="text-sm font-semibold text-gray-700 mb-2 block">Email *</Label>
//                   <div className="relative">
//                     <Input
//                       name="email"
//                       type="email"
//                       value={formData.email}
//                       onChange={handleEmailChange}
//                       className={`rounded-2xl border-2 h-12 pr-10 transition-all ${
//                         isEmailValid 
//                           ? 'border-green-500' 
//                           : validationErrors.email 
//                           ? 'border-red-500' 
//                           : 'border-gray-200 focus:border-black'
//                       }`}
//                       required
//                     />
//                     {isEmailValid && (
//                       <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
//                     )}
//                   </div>
//                   {validationErrors.email && (
//                     <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
//                       <AlertCircle className="h-3 w-3" />
//                       {validationErrors.email}
//                     </p>
//                   )}
//                 </div>
//                 <div>
//                   <Label className="text-sm font-semibold text-gray-700 mb-2 block">Teléfono *</Label>
//                   <div className="flex gap-2">
//                     <div className="relative w-36">
//                       <button
//                         type="button"
//                         onClick={() => setShowCountryDropdown(!showCountryDropdown)}
//                         className="w-full h-12 px-3 border-2 border-gray-200 rounded-2xl flex items-center justify-between bg-white hover:border-gray-400 transition-colors shadow-sm hover:shadow-md"
//                       >
//                         <span className="text-sm font-medium">
//                           {countryCodes.find(c => c.code === formData.countryCode)?.flag} {formData.countryCode}
//                         </span>
//                         <Search className="h-4 w-4 text-gray-400" />
//                       </button>
                      
//                       {showCountryDropdown && (
//                         <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 rounded-2xl shadow-2xl z-50 max-h-64 overflow-hidden">
//                           <div className="p-2 border-b sticky top-0 bg-white">
//                             <Input
//                               type="text"
//                               placeholder="Buscar país..."
//                               value={countrySearch}
//                               onChange={(e) => setCountrySearch(e.target.value)}
//                               className="h-10 text-sm rounded-xl"
//                               autoFocus
//                             />
//                           </div>
//                           <div className="overflow-y-auto max-h-52">
//                             {filteredCountries.map((country) => (
//                               <button
//                                 key={country.code}
//                                 type="button"
//                                 onClick={() => {
//                                   setFormData({ ...formData, countryCode: country.code })
//                                   setShowCountryDropdown(false)
//                                   setCountrySearch("")
//                                 }}
//                                 className="w-full px-3 py-2 text-left hover:bg-gray-100 transition-colors flex items-center gap-2 text-sm rounded-xl mx-1"
//                               >
//                                 <span>{country.flag}</span>
//                                 <span className="font-medium">{country.code}</span>
//                                 <span className="text-gray-600 truncate">{country.country}</span>
//                               </button>
//                             ))}
//                           </div>
//                         </div>
//                       )}
//                     </div>

//                     <div className="flex-1">
//                       <Input
//                         name="phone"
//                         type="tel"
//                         value={formData.phone}
//                         onChange={handlePhoneChange}
//                         placeholder="412 123 4567"
//                         className={`rounded-2xl border-2 h-12 transition-all ${
//                           validationErrors.phone ? 'border-red-500' : 'border-gray-200 focus:border-black'
//                         }`}
//                         required
//                       />
//                     </div>
//                   </div>
//                   {validationErrors.phone && (
//                     <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
//                       <AlertCircle className="h-3 w-3" />
//                       {validationErrors.phone}
//                     </p>
//                   )}
//                 </div>
//               </CardContent>
//             </Card>

//             {/* Shipping Method */}
//             <Card className="rounded-3xl border-0 shadow-xl bg-white hover:shadow-2xl transition-shadow">
//               <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white rounded-t-3xl">
//                 <CardTitle className="flex items-center text-lg font-bold text-gray-900">
//                   <div className="w-10 h-10 bg-gradient-to-br from-black to-gray-800 rounded-2xl flex items-center justify-center mr-3 shadow-lg">
//                     <span className="text-white text-sm font-bold">2</span>
//                   </div>
//                   Método de Entrega
//                 </CardTitle>
//               </CardHeader>
//               <CardContent className="pt-6">
//                 <div className="space-y-3">
//                   {settings?.shippingMethods.map((method) => {
//                     const IconComponent = shippingIcons[method.type] || Truck
//                     const isSelected = formData.shippingMethod === method.id
//                     const isFree = method.freeFrom > 0 && total >= method.freeFrom
                    
//                     return (
//                       <label
//                         key={method.id}
//                         className={`flex items-start p-4 border-2 rounded-2xl cursor-pointer transition-all shadow-sm hover:shadow-md ${
//                           isSelected ? 'border-black bg-gray-50 shadow-lg' : 'border-gray-200 hover:border-gray-300'
//                         }`}
//                       >
//                         <input
//                           type="radio"
//                           name="shippingMethod"
//                           value={method.id}
//                           checked={isSelected}
//                           onChange={handleInputChange}
//                           className="mt-1 mr-3"
//                           style={{ accentColor: 'black' }}
//                         />
//                         <IconComponent className="h-5 w-5 mr-3 mt-0.5 text-gray-600" />
//                         <div className="flex-1">
//                           <div className="flex items-center justify-between">
//                             <span className="font-semibold">{method.name}</span>
//                             {method.additionalCost > 0 ? (
//                               isFree ? (
//                                 <span className="text-green-600 font-semibold">¡Gratis!</span>
//                               ) : (
//                                 <span className="font-semibold">{currencySymbol}{method.additionalCost.toFixed(2)}</span>
//                               )
//                             ) : (
//                               <span className="text-green-600 font-semibold">A Consultar</span>
//                             )}
//                           </div>
//                           {method.description && (
//                             <p className="text-sm text-gray-500 mt-1">{method.description}</p>
//                           )}
//                           {method.estimatedTime && (
//                             <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
//                               <Clock className="h-3 w-3" />
//                               {method.estimatedTime}
//                             </p>
//                           )}
//                           {method.freeFrom > 0 && !isFree && (
//                             <p className="text-xs text-blue-600 mt-1">
//                               Envío gratis en compras desde {currencySymbol}{method.freeFrom.toFixed(2)}
//                             </p>
//                           )}
//                           {method.type === 'pickup' && method.pickupData && (
//                             <div className="mt-2 p-2 bg-blue-50 rounded-lg text-xs text-blue-700">
//                               <p className="font-medium">{method.pickupData.address}</p>
//                               <p>{method.pickupData.schedule}</p>
//                             </div>
//                           )}
//                         </div>
//                       </label>
//                     )
//                   })}
//                 </div>
//               </CardContent>
//             </Card>

//             {/* Shipping Address - Solo si es requerido */}
//             {selectedShippingMethod?.requiresAddress && (
//               <Card className="rounded-3xl border-0 shadow-xl bg-white hover:shadow-2xl transition-shadow">
//                 <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white rounded-t-3xl">
//                   <CardTitle className="flex items-center text-lg font-bold text-gray-900">
//                     <div className="w-10 h-10 bg-gradient-to-br from-black to-gray-800 rounded-2xl flex items-center justify-center mr-3 shadow-lg">
//                       <MapPin className="h-5 w-5 text-white" />
//                     </div>
//                     Dirección de Envío
//                   </CardTitle>
//                 </CardHeader>
//                 <CardContent className="pt-6 space-y-4">
//                   <div>
//                     <Label className="text-sm font-semibold text-gray-700 mb-2 block">Dirección *</Label>
//                     <Input
//                       name="address"
//                       value={formData.address}
//                       onChange={handleInputChange}
//                       className="rounded-2xl border-2 border-gray-200 h-12 focus:border-black transition-all"
//                       placeholder="Calle, número, apartamento"
//                       required
//                     />
//                   </div>
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                     <div>
//                       <Label className="text-sm font-semibold text-gray-700 mb-2 block">Ciudad *</Label>
//                       <Input
//                         name="city"
//                         value={formData.city}
//                         onChange={handleInputChange}
//                         className="rounded-2xl border-2 border-gray-200 h-12 focus:border-black transition-all"
//                         required
//                       />
//                     </div>
//                     <div>
//                       <Label className="text-sm font-semibold text-gray-700 mb-2 block">Estado *</Label>
//                       <Input
//                         name="state"
//                         value={formData.state}
//                         onChange={handleInputChange}
//                         className="rounded-2xl border-2 border-gray-200 h-12 focus:border-black transition-all"
//                         required
//                       />
//                     </div>
//                   </div>
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                     <div>
//                       <Label className="text-sm font-semibold text-gray-700 mb-2 block">Código Postal *</Label>
//                       <Input
//                         name="zipCode"
//                         value={formData.zipCode}
//                         onChange={handleInputChange}
//                         className="rounded-2xl border-2 border-gray-200 h-12 focus:border-black transition-all"
//                         required
//                       />
//                     </div>
//                     <div>
//                       <Label className="text-sm font-semibold text-gray-700 mb-2 block">Punto de Referencia</Label>
//                       <Input
//                         name="reference"
//                         value={formData.reference}
//                         onChange={handleInputChange}
//                         className="rounded-2xl border-2 border-gray-200 h-12 focus:border-black transition-all"
//                         placeholder="Cerca de..."
//                       />
//                     </div>
//                   </div>
//                 </CardContent>
//               </Card>
//             )}

//             {/* Payment Method */}
//             <Card className="rounded-3xl border-0 shadow-xl bg-white hover:shadow-2xl transition-shadow">
//               <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white rounded-t-3xl">
//                 <CardTitle className="flex items-center text-lg font-bold text-gray-900">
//                   <div className="w-10 h-10 bg-gradient-to-br from-black to-gray-800 rounded-2xl flex items-center justify-center mr-3 shadow-lg">
//                     <span className="text-white text-sm font-bold">3</span>
//                   </div>
//                   Método de Pago
//                 </CardTitle>
//               </CardHeader>
//               <CardContent className="pt-6">
//                 <div className="space-y-3">
//                   {settings?.paymentMethods.map((method) => {
//                     const IconComponent = paymentIcons[method.id] || CreditCard
//                     const isSelected = formData.paymentMethod === method.id
                    
//                     return (
//                       <label
//                         key={method.id}
//                         className={`flex items-start p-4 border-2 rounded-2xl cursor-pointer transition-all shadow-sm hover:shadow-md ${
//                           isSelected ? 'border-black bg-gray-50 shadow-lg' : 'border-gray-200 hover:border-gray-300'
//                         }`}
//                       >
//                         <input
//                           type="radio"
//                           name="paymentMethod"
//                           value={method.id}
//                           checked={isSelected}
//                           onChange={handleInputChange}
//                           className="mt-1 mr-3"
//                           style={{ accentColor: 'black' }}
//                         />
//                         <IconComponent className="h-5 w-5 mr-3 mt-0.5 text-gray-600" />
//                         <div className="flex-1">
//                           <div className="flex items-center gap-2">
//                             <span className="font-semibold">{method.name}</span>
//                             {method.hasDiscount && (
//                               <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-semibold">
//                                 -{method.discountPercentage}%
//                               </span>
//                             )}
//                           </div>
//                           {method.description && (
//                             <p className="text-sm text-gray-500 mt-1">{method.description}</p>
//                           )}
//                           {method.requiresProof && (
//                             <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
//                               <Info className="h-3 w-3" />
//                               Se requiere comprobante de pago
//                             </p>
//                           )}
//                           {isSelected && method.accountData && Object.keys(method.accountData).some(k => method.accountData[k]) && (
//                             <div className="mt-3 p-3 bg-blue-50 rounded-xl text-sm">
//                               <p className="font-semibold text-blue-900 mb-2">Datos de pago:</p>
//                               <div className="space-y-1 text-blue-800">
//                                 {method.accountData.bankName && <p>Banco: {method.accountData.bankName}</p>}
//                                 {method.accountData.accountNumber && <p>Cuenta: {method.accountData.accountNumber}</p>}
//                                 {method.accountData.accountHolder && <p>Titular: {method.accountData.accountHolder}</p>}
//                                 {method.accountData.identification && <p>CI/RIF: {method.accountData.identification}</p>}
//                                 {method.accountData.phone && <p>Teléfono: {method.accountData.phone}</p>}
//                                 {method.accountData.email && <p>Email: {method.accountData.email}</p>}
//                                 {method.accountData.walletAddress && <p>Wallet: {method.accountData.walletAddress}</p>}
//                                 {method.accountData.additionalInfo && <p className="mt-2 text-xs">{method.accountData.additionalInfo}</p>}
//                               </div>
//                             </div>
//                           )}
//                         </div>
//                       </label>
//                     )
//                   })}
//                 </div>
//               </CardContent>
//             </Card>

//             {/* Notes */}
//             <Card className="rounded-3xl border-0 shadow-xl bg-white hover:shadow-2xl transition-shadow">
//               <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white rounded-t-3xl">
//                 <CardTitle className="text-lg font-bold text-gray-900">
//                   Notas Adicionales (Opcional)
//                 </CardTitle>
//               </CardHeader>
//               <CardContent className="pt-6">
//                 <Textarea
//                   name="notes"
//                   value={formData.notes}
//                   onChange={handleInputChange}
//                   placeholder="Instrucciones especiales para la entrega..."
//                   className="rounded-2xl border-2 border-gray-200 min-h-[100px] focus:border-black transition-all"
//                 />
//               </CardContent>
//             </Card>
//           </div>

//           {/* Order Summary */}
//           <div>
//             <Card className="rounded-3xl border-0 shadow-2xl bg-white sticky top-8">
//               <CardHeader className="border-b bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-t-3xl">
//                 <CardTitle className="text-lg font-bold">
//                   Resumen del Pedido
//                 </CardTitle>
//               </CardHeader>
//               <CardContent className="pt-6 space-y-4">
//                 {/* Items */}
//                 <div className="space-y-4 max-h-96 overflow-y-auto">
//                   {items.map((item) => (
//                     <div key={`${item.id}-${item.size}-${item.color}`} className="flex gap-3 pb-4 border-b border-gray-100">
//                       <div className="w-20 h-20 bg-gray-100 flex-shrink-0 rounded-2xl overflow-hidden shadow-md">
//                         <img
//                           src={item.image ? `https://yenfit.shop${item.image}` : "/placeholder.svg"}
//                           alt={item.name}
//                           className="w-full h-full object-cover"
//                         />
//                       </div>
//                       <div className="flex-1 min-w-0">
//                         <h4 className="font-semibold text-sm uppercase truncate mb-1">
//                           {item.name}
//                         </h4>
//                         <p className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg inline-block">{item.color} • {item.size}</p>
//                         <div className="flex items-center justify-between mt-2">
//                           <span className="text-xs text-gray-600 font-medium">Cant: {item.quantity}</span>
//                           <span className="font-bold text-sm">{currencySymbol}{(item.price * item.quantity).toFixed(2)}</span>
//                         </div>
//                       </div>
//                     </div>
//                   ))}
//                 </div>

//                 {/* Totals */}
//                 <div className="space-y-3 pt-4 border-t">
//                   <div className="flex justify-between text-sm">
//                     <span className="text-gray-600">Subtotal</span>
//                     <span className="font-semibold">{currencySymbol}{total.toFixed(2)}</span>
//                   </div>
                  
//                   {shippingCost > 0 && (
//                     <div className="flex justify-between text-sm">
//                       <span className="text-gray-600">Envío</span>
//                       <span className="font-semibold">{currencySymbol}{shippingCost.toFixed(2)}</span>
//                     </div>
//                   )}
                  
//                   {discount > 0 && (
//                     <div className="flex justify-between text-sm text-green-600">
//                       <span>Descuento ({selectedPaymentMethod?.name})</span>
//                       <span className="font-semibold">-{currencySymbol}{discount.toFixed(2)}</span>
//                     </div>
//                   )}

//                   <div className="flex justify-between items-baseline pt-3 border-t-2 border-gray-900">
//                     <span className="text-lg font-black uppercase">Total</span>
//                     <span className="text-3xl font-black">{currencySymbol}{finalTotal.toFixed(2)}</span>
//                   </div>

//                   {/* Precio en Bolívares */}
//                   {totalInBs && settings?.currency.showBsPrice && (
//                     <div className="bg-blue-50 rounded-2xl p-3 text-center">
//                       <p className="text-sm text-blue-700">
//                         <span className="font-semibold">En Bolívares:</span> Bs. {totalInBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
//                       </p>
//                       <p className="text-xs text-blue-500 mt-1">
//                         Tasa: {settings.currency.code === "EUR" ? exchangeRate?.eur : exchangeRate?.usd} Bs/{settings.currency.code}
//                       </p>
//                     </div>
//                   )}
//                 </div>

//                 {/* Checkout Button */}
//                 <Button
//                   className="w-full bg-gradient-to-r from-gray-900 to-black text-white hover:from-black hover:to-gray-900 rounded-2xl h-16 text-base font-bold uppercase tracking-wider disabled:opacity-50 shadow-2xl hover:shadow-3xl transition-all hover:scale-105 disabled:hover:scale-100"
//                   onClick={handleWhatsAppOrder}
//                   disabled={!isFormValid() || submitting}
//                 >
//                   {submitting ? (
//                     <>
//                       <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
//                       Procesando...
//                     </>
//                   ) : (
//                     <>
//                       <MessageCircle className="h-5 w-5 mr-2" />
//                       Confirmar Pedido
//                     </>
//                   )}
//                 </Button>

//                 {/* Security Info */}
//                 <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-4 shadow-lg">
//                   <div className="flex items-start gap-3">
//                     <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
//                     <div>
//                       <p className="text-sm font-semibold text-blue-900 mb-1">
//                         Compra 100% Segura
//                       </p>
//                       <p className="text-xs text-blue-700">
//                         Tu pedido será confirmado vía WhatsApp antes de procesar el pago
//                       </p>
//                     </div>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//           </div>
//         </div>
//       </div>

//       {/* Order Confirmation Modal */}
//       {showOrderConfirmation && (
//         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl animate-scaleIn">
//             <div className="p-8">
//               <div className="text-center mb-6">
//                 <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl">
//                   <CheckCircle2 className="h-12 w-12 text-white" />
//                 </div>
//                 <h3 className="text-2xl font-black uppercase mb-2 text-gray-900">¡Pedido Enviado!</h3>
//                 <p className="text-gray-600">Tu pedido ha sido enviado por WhatsApp. Nos pondremos en contacto contigo pronto.</p>
//               </div>

//               <Button
//                 onClick={() => {
//                   setShowOrderConfirmation(false)
//                   window.location.href = '/'
//                 }}
//                 className="w-full bg-gradient-to-r from-black to-gray-800 text-white hover:from-gray-800 hover:to-black rounded-2xl h-14 font-bold uppercase shadow-2xl hover:shadow-3xl transition-all hover:scale-105"
//               >
//                 Volver a la Tienda
//               </Button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   )
// }

// "use client" 

// import { useState, useEffect, useMemo } from "react"
// import { ArrowLeft, CreditCard, Truck, Shield, MessageCircle, X, Plus, Minus, Lock, Search, CheckCircle2, AlertCircle, ShoppingBag } from "lucide-react"
// import { Button } from "@/components/ui/button"
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { Textarea } from "@/components/ui/textarea"
// import { useCart } from "@/contexts/cart-context"
// import { useAuth } from "@/contexts/auth-context"
// import { api } from "@/lib/api"
// import { brandConfig } from "@/lib/config"

// // Lista de códigos de país
// const countryCodes = [
//   { code: "+1", country: "Estados Unidos / Canadá", flag: "🇺🇸" },
//   { code: "+52", country: "México", flag: "🇲🇽" },
//   { code: "+53", country: "Cuba", flag: "🇨🇺" },
//   { code: "+54", country: "Argentina", flag: "🇦🇷" },
//   { code: "+55", country: "Brasil", flag: "🇧🇷" },
//   { code: "+56", country: "Chile", flag: "🇨🇱" },
//   { code: "+57", country: "Colombia", flag: "🇨🇴" },
//   { code: "+58", country: "Venezuela", flag: "🇻🇪" },
//   { code: "+591", country: "Bolivia", flag: "🇧🇴" },
//   { code: "+593", country: "Ecuador", flag: "🇪🇨" },
//   { code: "+595", country: "Paraguay", flag: "🇵🇾" },
//   { code: "+598", country: "Uruguay", flag: "🇺🇾" },
//   { code: "+34", country: "España", flag: "🇪🇸" },
//   { code: "+351", country: "Portugal", flag: "🇵🇹" },
// ]

// export default function Checkout() {
//   const { items, total, clearCart, updateQuantity, removeItem } = useCart()
//   const { user } = useAuth()
//   const [formData, setFormData] = useState({
//     firstName: "",
//     lastName: "",
//     email: "",
//     countryCode: "+58",
//     phone: "",
//     address: "",
//     city: "",
//     state: "",
//     zipCode: "",
//     paymentMethod: "transfer",
//     notes: ""
//   })
//   const [showOrderConfirmation, setShowOrderConfirmation] = useState(false)
//   const [orderDetails, setOrderDetails] = useState('')
//   const [loading, setLoading] = useState(false)
//   const [showCountryDropdown, setShowCountryDropdown] = useState(false)
//   const [countrySearch, setCountrySearch] = useState("")
  
//   // Errores de validación
//   const [validationErrors, setValidationErrors] = useState({
//     firstName: "",
//     lastName: "",
//     email: "",
//     phone: ""
//   })

//   // Cargar datos del usuario logueado
//   useEffect(() => {
//     const loadUserData = async () => {
//       if (user) {
//         try {
//           const profileResult = await api.getMe()
          
//           if (profileResult.success && profileResult.user) {
//             const userData = profileResult.user
            
//             let countryCode = "+58"
//             let phoneNumber = ""
            
//             if (userData.phone) {
//               const matchedCountry = countryCodes.find(country => 
//                 userData.phone.startsWith(country.code)
//               )
              
//               if (matchedCountry) {
//                 countryCode = matchedCountry.code
//                 phoneNumber = userData.phone.substring(matchedCountry.code.length).trim()
//               } else {
//                 phoneNumber = userData.phone
//               }
//             }
            
//             setFormData({
//               firstName: userData.firstName || user.firstName || "",
//               lastName: userData.lastName || user.lastName || "",
//               email: userData.email || user.email || "",
//               countryCode: countryCode,
//               phone: phoneNumber,
//               address: userData.address || "",
//               city: userData.city || "",
//               state: userData.state || "",
//               zipCode: userData.zipCode || "",
//               paymentMethod: "transfer",
//               notes: ""
//             })
//           } else {
//             setFormData(prev => ({
//               ...prev,
//               firstName: user.firstName || "",
//               lastName: user.lastName || "",
//               email: user.email || "",
//             }))
//           }
//         } catch (error) {
//           console.error('Error loading user profile:', error)
//           setFormData(prev => ({
//             ...prev,
//             firstName: user.firstName || "",
//             lastName: user.lastName || "",
//             email: user.email || "",
//           }))
//         }
//       }
//     }
    
//     loadUserData()
//   }, [user])

//   // Filtrar códigos de país
//   const filteredCountries = useMemo(() => {
//     if (!countrySearch) return countryCodes
//     return countryCodes.filter(country => 
//       country.country.toLowerCase().includes(countrySearch.toLowerCase()) ||
//       country.code.includes(countrySearch)
//     )
//   }, [countrySearch])

//   // Validaciones
//   const validateName = (name: string) => {
//     const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/
//     return nameRegex.test(name)
//   }

//   const validateEmail = (email: string) => {
//     const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
//     return emailRegex.test(email)
//   }

//   const validatePhone = (phone: string) => {
//     const phoneRegex = /^[0-9\s()-]+$/
//     return phoneRegex.test(phone)
//   }

//   const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'firstName' | 'lastName') => {
//     const value = e.target.value
    
//     if (value === '' || validateName(value)) {
//       setFormData({ ...formData, [field]: value })
//       setValidationErrors({ ...validationErrors, [field]: "" })
//     } else {
//       setValidationErrors({ 
//         ...validationErrors, 
//         [field]: "Solo se permiten letras" 
//       })
//     }
//   }

//   const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const email = e.target.value
//     setFormData({ ...formData, email })
    
//     if (email.length > 0 && !validateEmail(email)) {
//       setValidationErrors({ ...validationErrors, email: "Email inválido" })
//     } else {
//       setValidationErrors({ ...validationErrors, email: "" })
//     }
//   }

//   const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const value = e.target.value
    
//     if (value === '' || validatePhone(value)) {
//       setFormData({ ...formData, phone: value })
//       setValidationErrors({ ...validationErrors, phone: "" })
//     } else {
//       setValidationErrors({ 
//         ...validationErrors, 
//         phone: "Solo se permiten números" 
//       })
//     }
//   }

//   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
//     const { name, value } = e.target
//     setFormData(prev => ({ ...prev, [name]: value }))
//   }

//   const generateOrderNumber = () => {
//     const timestamp = Date.now().toString().slice(-6)
//     return `${brandConfig.name.toUpperCase()}-${timestamp}`
//   }

//   const getCurrentDateTime = () => {
//     const now = new Date()
//     const date = now.toLocaleDateString('es-ES')
//     const time = now.toLocaleTimeString('es-ES', { hour12: false })
//     return { date, time }
//   }

//   const generateWhatsAppMessage = (orderNumber: string) => {
//     const { date, time } = getCurrentDateTime()

//     const productList = items.map((item, index) =>
//       `${index + 1}. ${item.name}\n` +
//       `   • Color: ${item.color}\n` +
//       `   • Talla: ${item.size}\n` +
//       `   • Cantidad: ${item.quantity}\n` +
//       `   • Precio unitario: $${item.price.toFixed(2)}\n` +
//       `   • Subtotal: $${(item.price * item.quantity).toFixed(2)}`
//     ).join('\n\n')

//     return `*PEDIDO ${brandConfig.name.toUpperCase()}*\n\n` +
//       `📋 Número de Pedido: ${orderNumber}\n` +
//       `📅 Fecha: ${date}\n` +
//       `🕐 Hora: ${time}\n\n` +
//       `🛍️ *PRODUCTOS:*\n` +
//       `──────────────────────────────\n\n` +
//       `${productList}\n\n` +
//       `──────────────────────────────\n` +
//       `💰 *TOTAL: $${total.toFixed(2)}*\n\n` +
//       `👤 *DATOS DEL CLIENTE:*\n` +
//       `Nombre: ${formData.firstName} ${formData.lastName}\n` +
//       `Email: ${formData.email}\n` +
//       `Teléfono: ${formData.countryCode} ${formData.phone}\n\n` +
//       `📍 *DIRECCIÓN DE ENTREGA:*\n` +
//       `${formData.address}\n` +
//       `${formData.city}, ${formData.state} ${formData.zipCode}\n\n` +
//       `💳 *MÉTODO DE PAGO:* ${formData.paymentMethod === 'transfer' ? 'Transferencia' : formData.paymentMethod === 'cash' ? 'Efectivo' : 'Tarjeta'}\n\n` +
//       `${formData.notes ? `📝 *NOTAS:* ${formData.notes}\n\n` : ''}` +
//       `🙌 ¡Gracias por tu compra!\n` +
//       `📱 Instagram: ${brandConfig.social.instagram}`
//   }

//   const handleWhatsAppOrder = async () => {
//     if (!isFormValid()) return

//     setLoading(true)

//     try {
//       const orderData = {
//         customerInfo: {
//           firstName: formData.firstName,
//           lastName: formData.lastName,
//           email: formData.email,
//           phone: `${formData.countryCode} ${formData.phone}`
//         },
//         shippingAddress: {
//           address: formData.address,
//           city: formData.city,
//           state: formData.state,
//           zipCode: formData.zipCode
//         },
//         paymentMethod: formData.paymentMethod,
//         notes: formData.notes
//       }

//       const result = await api.createOrder(orderData)

//       if (result.success) {
//         const orderNumber = result.order.orderNumber
//         const message = generateWhatsAppMessage(orderNumber)
//         const phoneNumber = brandConfig.contact.whatsapp
//         const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`

//         await api.updateOrderWhatsApp(result.order._id)

//         setOrderDetails(message)
//         setShowOrderConfirmation(true)

//         window.open(whatsappUrl, "_blank")
//         clearCart()
//       }
//     } catch (error) {
//       console.error('Error creating order:', error)
//     } finally {
//       setLoading(false)
//     }
//   }

//   const isFormValid = () => {
//     return formData.firstName && formData.lastName && formData.email &&
//       formData.phone && formData.address && formData.city &&
//       formData.state && formData.zipCode && validateEmail(formData.email) &&
//       !validationErrors.firstName && !validationErrors.lastName &&
//       !validationErrors.email && !validationErrors.phone
//   }

//   const isEmailValid = formData.email.length > 0 && validateEmail(formData.email)

//   if (items.length === 0) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-16">
//         <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="bg-white rounded-3xl shadow-2xl p-12 text-center">
//             <div className="w-28 h-28 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
//               <ShoppingBag className="h-14 w-14 text-gray-500" />
//             </div>
//             <h1 className="text-3xl font-black uppercase mb-4 text-gray-900">Tu carrito está vacío</h1>
//             <p className="text-gray-600 mb-8">Agrega productos antes de proceder al checkout</p>
//             <Button
//               onClick={() => window.location.href = '/'}
//               className="bg-gradient-to-r from-black to-gray-800 text-white hover:from-gray-800 hover:to-black rounded-2xl px-12 py-6 text-base font-bold uppercase shadow-2xl hover:shadow-3xl transition-all hover:scale-105"
//             >
//               Continuar Comprando
//             </Button>
//           </div>
//         </div>
//       </div>
//     )
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
//       <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
//         {/* Header */}
//         <div className="mb-8">
//           <button
//             onClick={() => window.history.back()}
//             className="flex items-center text-gray-600 hover:text-black mb-4 transition-colors group bg-white px-4 py-2 rounded-full shadow-md hover:shadow-lg"
//           >
//             <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
//             <span className="font-medium">Volver</span>
//           </button>
//           <h1 className="text-3xl md:text-4xl font-black uppercase mb-2 text-gray-900">
//             Finalizar Compra
//           </h1>
//           <p className="text-gray-600">
//             {user ? `¡Hola ${user.firstName}! Completa tu información para confirmar el pedido` : 'Completa tu información para confirmar el pedido'}
//           </p>
//         </div>

//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
//           {/* Forms */}
//           <div className="lg:col-span-2 space-y-6">
//             {/* Contact Information */}
//             <Card className="rounded-3xl border-0 shadow-xl bg-white hover:shadow-2xl transition-shadow">
//               <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white rounded-t-3xl">
//                 <CardTitle className="flex items-center text-lg font-bold text-gray-900">
//                   <div className="w-10 h-10 bg-gradient-to-br from-black to-gray-800 rounded-2xl flex items-center justify-center mr-3 shadow-lg">
//                     <span className="text-white text-sm font-bold">1</span>
//                   </div>
//                   Información de Contacto
//                 </CardTitle>
//               </CardHeader>
//               <CardContent className="pt-6 space-y-4">
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   <div>
//                     <Label className="text-sm font-semibold text-gray-700 mb-2 block">Nombre *</Label>
//                     <Input
//                       name="firstName"
//                       value={formData.firstName}
//                       onChange={(e) => handleNameChange(e, 'firstName')}
//                       className={`rounded-2xl border-2 h-12 transition-all ${
//                         validationErrors.firstName ? 'border-red-500' : 'border-gray-200 focus:border-black'
//                       }`}
//                       required
//                     />
//                     {validationErrors.firstName && (
//                       <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
//                         <AlertCircle className="h-3 w-3" />
//                         {validationErrors.firstName}
//                       </p>
//                     )}
//                   </div>
//                   <div>
//                     <Label className="text-sm font-semibold text-gray-700 mb-2 block">Apellido *</Label>
//                     <Input
//                       name="lastName"
//                       value={formData.lastName}
//                       onChange={(e) => handleNameChange(e, 'lastName')}
//                       className={`rounded-2xl border-2 h-12 transition-all ${
//                         validationErrors.lastName ? 'border-red-500' : 'border-gray-200 focus:border-black'
//                       }`}
//                       required
//                     />
//                     {validationErrors.lastName && (
//                       <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
//                         <AlertCircle className="h-3 w-3" />
//                         {validationErrors.lastName}
//                       </p>
//                     )}
//                   </div>
//                 </div>
//                 <div>
//                   <Label className="text-sm font-semibold text-gray-700 mb-2 block">Email *</Label>
//                   <div className="relative">
//                     <Input
//                       name="email"
//                       type="email"
//                       value={formData.email}
//                       onChange={handleEmailChange}
//                       className={`rounded-2xl border-2 h-12 pr-10 transition-all ${
//                         isEmailValid 
//                           ? 'border-green-500' 
//                           : validationErrors.email 
//                           ? 'border-red-500' 
//                           : 'border-gray-200 focus:border-black'
//                       }`}
//                       required
//                     />
//                     {isEmailValid && (
//                       <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
//                     )}
//                   </div>
//                   {validationErrors.email && (
//                     <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
//                       <AlertCircle className="h-3 w-3" />
//                       {validationErrors.email}
//                     </p>
//                   )}
//                 </div>
//                 <div>
//                   <Label className="text-sm font-semibold text-gray-700 mb-2 block">Teléfono *</Label>
//                   <div className="flex gap-2">
//                     {/* Country Code Selector */}
//                     <div className="relative w-36">
//                       <button
//                         type="button"
//                         onClick={() => setShowCountryDropdown(!showCountryDropdown)}
//                         className="w-full h-12 px-3 border-2 border-gray-200 rounded-2xl flex items-center justify-between bg-white hover:border-gray-400 transition-colors shadow-sm hover:shadow-md"
//                       >
//                         <span className="text-sm font-medium">
//                           {countryCodes.find(c => c.code === formData.countryCode)?.flag} {formData.countryCode}
//                         </span>
//                         <Search className="h-4 w-4 text-gray-400" />
//                       </button>
                      
//                       {showCountryDropdown && (
//                         <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 rounded-2xl shadow-2xl z-50 max-h-64 overflow-hidden">
//                           <div className="p-2 border-b sticky top-0 bg-white">
//                             <Input
//                               type="text"
//                               placeholder="Buscar país..."
//                               value={countrySearch}
//                               onChange={(e) => setCountrySearch(e.target.value)}
//                               className="h-10 text-sm rounded-xl"
//                               autoFocus
//                             />
//                           </div>
//                           <div className="overflow-y-auto max-h-52">
//                             {filteredCountries.map((country) => (
//                               <button
//                                 key={country.code}
//                                 type="button"
//                                 onClick={() => {
//                                   setFormData({ ...formData, countryCode: country.code })
//                                   setShowCountryDropdown(false)
//                                   setCountrySearch("")
//                                 }}
//                                 className="w-full px-3 py-2 text-left hover:bg-gray-100 transition-colors flex items-center gap-2 text-sm rounded-xl mx-1"
//                               >
//                                 <span>{country.flag}</span>
//                                 <span className="font-medium">{country.code}</span>
//                                 <span className="text-gray-600 truncate">{country.country}</span>
//                               </button>
//                             ))}
//                           </div>
//                         </div>
//                       )}
//                     </div>

//                     {/* Phone Number */}
//                     <div className="flex-1">
//                       <Input
//                         name="phone"
//                         type="tel"
//                         value={formData.phone}
//                         onChange={handlePhoneChange}
//                         placeholder="412 123 4567"
//                         className={`rounded-2xl border-2 h-12 transition-all ${
//                           validationErrors.phone ? 'border-red-500' : 'border-gray-200 focus:border-black'
//                         }`}
//                         required
//                       />
//                     </div>
//                   </div>
//                   {validationErrors.phone && (
//                     <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
//                       <AlertCircle className="h-3 w-3" />
//                       {validationErrors.phone}
//                     </p>
//                   )}
//                 </div>
//               </CardContent>
//             </Card>

//             {/* Shipping Address */}
//             <Card className="rounded-3xl border-0 shadow-xl bg-white hover:shadow-2xl transition-shadow">
//               <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white rounded-t-3xl">
//                 <CardTitle className="flex items-center text-lg font-bold text-gray-900">
//                   <div className="w-10 h-10 bg-gradient-to-br from-black to-gray-800 rounded-2xl flex items-center justify-center mr-3 shadow-lg">
//                     <span className="text-white text-sm font-bold">2</span>
//                   </div>
//                   Dirección de Envío
//                 </CardTitle>
//               </CardHeader>
//               <CardContent className="pt-6 space-y-4">
//                 <div>
//                   <Label className="text-sm font-semibold text-gray-700 mb-2 block">Dirección *</Label>
//                   <Input
//                     name="address"
//                     value={formData.address}
//                     onChange={handleInputChange}
//                     className="rounded-2xl border-2 border-gray-200 h-12 focus:border-black transition-all"
//                     placeholder="Calle, número, apartamento"
//                     required
//                   />
//                 </div>
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   <div>
//                     <Label className="text-sm font-semibold text-gray-700 mb-2 block">Ciudad *</Label>
//                     <Input
//                       name="city"
//                       value={formData.city}
//                       onChange={handleInputChange}
//                       className="rounded-2xl border-2 border-gray-200 h-12 focus:border-black transition-all"
//                       required
//                     />
//                   </div>
//                   <div>
//                     <Label className="text-sm font-semibold text-gray-700 mb-2 block">Estado *</Label>
//                     <Input
//                       name="state"
//                       value={formData.state}
//                       onChange={handleInputChange}
//                       className="rounded-2xl border-2 border-gray-200 h-12 focus:border-black transition-all"
//                       required
//                     />
//                   </div>
//                 </div>
//                 <div>
//                   <Label className="text-sm font-semibold text-gray-700 mb-2 block">Código Postal *</Label>
//                   <Input
//                     name="zipCode"
//                     value={formData.zipCode}
//                     onChange={handleInputChange}
//                     className="rounded-2xl border-2 border-gray-200 h-12 focus:border-black transition-all"
//                     required
//                   />
//                 </div>
//               </CardContent>
//             </Card>

//             {/* Payment Method */}
//             <Card className="rounded-3xl border-0 shadow-xl bg-white hover:shadow-2xl transition-shadow">
//               <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white rounded-t-3xl">
//                 <CardTitle className="flex items-center text-lg font-bold text-gray-900">
//                   <div className="w-10 h-10 bg-gradient-to-br from-black to-gray-800 rounded-2xl flex items-center justify-center mr-3 shadow-lg">
//                     <span className="text-white text-sm font-bold">3</span>
//                   </div>
//                   Método de Pago
//                 </CardTitle>
//               </CardHeader>
//               <CardContent className="pt-6">
//                 <div className="space-y-3">
//                   <label className={`flex items-center p-4 border-2 rounded-2xl cursor-pointer transition-all shadow-sm hover:shadow-md ${
//                     formData.paymentMethod === "transfer" ? 'border-black bg-gray-50 shadow-lg' : 'border-gray-200 hover:border-gray-300'
//                   }`}>
//                     <input
//                       type="radio"
//                       name="paymentMethod"
//                       value="transfer"
//                       checked={formData.paymentMethod === "transfer"}
//                       onChange={handleInputChange}
//                       className="mr-3"
//                       style={{ accentColor: 'black' }}
//                     />
//                     <CreditCard className="h-5 w-5 mr-2" />
//                     <span className="font-semibold">Transferencia Bancaria</span>
//                   </label>
//                   <label className={`flex items-center p-4 border-2 rounded-2xl cursor-pointer transition-all shadow-sm hover:shadow-md ${
//                     formData.paymentMethod === "cash" ? 'border-black bg-gray-50 shadow-lg' : 'border-gray-200 hover:border-gray-300'
//                   }`}>
//                     <input
//                       type="radio"
//                       name="paymentMethod"
//                       value="cash"
//                       checked={formData.paymentMethod === "cash"}
//                       onChange={handleInputChange}
//                       className="mr-3"
//                       style={{ accentColor: 'black' }}
//                     />
//                     <span className="text-2xl mr-2">💵</span>
//                     <span className="font-semibold">Efectivo (Contra entrega)</span>
//                   </label>
//                 </div>
//               </CardContent>
//             </Card>

//             {/* Notes */}
//             <Card className="rounded-3xl border-0 shadow-xl bg-white hover:shadow-2xl transition-shadow">
//               <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white rounded-t-3xl">
//                 <CardTitle className="text-lg font-bold text-gray-900">
//                   Notas Adicionales (Opcional)
//                 </CardTitle>
//               </CardHeader>
//               <CardContent className="pt-6">
//                 <Textarea
//                   name="notes"
//                   value={formData.notes}
//                   onChange={handleInputChange}
//                   placeholder="Instrucciones especiales para la entrega..."
//                   className="rounded-2xl border-2 border-gray-200 min-h-[100px] focus:border-black transition-all"
//                 />
//               </CardContent>
//             </Card>
//           </div>

//           {/* Order Summary */}
//           <div>
//             <Card className="rounded-3xl border-0 shadow-2xl bg-white sticky top-8">
//               <CardHeader className="border-b bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-t-3xl">
//                 <CardTitle className="text-lg font-bold">
//                   Resumen del Pedido
//                 </CardTitle>
//               </CardHeader>
//               <CardContent className="pt-6 space-y-4">
//                 {/* Items */}
//                 <div className="space-y-4 max-h-96 overflow-y-auto">
//                   {items.map((item) => (
//                     <div key={`${item.id}-${item.size}-${item.color}`} className="flex gap-3 pb-4 border-b border-gray-100">
//                       <div className="w-20 h-20 bg-gray-100 flex-shrink-0 rounded-2xl overflow-hidden shadow-md">
//                         <img
//                           src={item.image ? `https://yenfit.shop${item.image}` : "/placeholder.svg"}
//                           alt={item.name}
//                           className="w-full h-full object-cover"
//                         />
//                       </div>
//                       <div className="flex-1 min-w-0">
//                         <h4 className="font-semibold text-sm uppercase truncate mb-1">
//                           {item.name}
//                         </h4>
//                         <p className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg inline-block">{item.color} • {item.size}</p>
//                         <div className="flex items-center justify-between mt-2">
//                           <span className="text-xs text-gray-600 font-medium">Cant: {item.quantity}</span>
//                           <span className="font-bold text-sm">${(item.price * item.quantity).toFixed(2)}</span>
//                         </div>
//                       </div>
//                     </div>
//                   ))}
//                 </div>

//                 {/* Total */}
//                 <div className="space-y-3 pt-4 border-t-2 border-gray-900">
//                   <div className="flex justify-between items-baseline">
//                     <span className="text-lg font-black uppercase">Total</span>
//                     <span className="text-3xl font-black">${total.toFixed(2)}</span>
//                   </div>
//                 </div>

//                 {/* Checkout Button */}
//                 <Button
//                   className="w-full bg-gradient-to-r from-gray-900 to-black text-white hover:from-black hover:to-gray-900 rounded-2xl h-16 text-base font-bold uppercase tracking-wider disabled:opacity-50 shadow-2xl hover:shadow-3xl transition-all hover:scale-105 disabled:hover:scale-100"
//                   onClick={handleWhatsAppOrder}
//                   disabled={!isFormValid() || loading}
//                 >
//                   {loading ? (
//                     <>
//                       <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
//                       Procesando...
//                     </>
//                   ) : (
//                     <>
//                       <MessageCircle className="h-5 w-5 mr-2" />
//                       Confirmar Pedido
//                     </>
//                   )}
//                 </Button>

//                 {/* Security Info */}
//                 <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-4 shadow-lg">
//                   <div className="flex items-start gap-3">
//                     <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
//                     <div>
//                       <p className="text-sm font-semibold text-blue-900 mb-1">
//                         Compra 100% Segura
//                       </p>
//                       <p className="text-xs text-blue-700">
//                         Tu pedido será confirmado vía WhatsApp antes de procesar el pago
//                       </p>
//                     </div>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//           </div>
//         </div>
//       </div>

//       {/* Order Confirmation Modal */}
//       {showOrderConfirmation && (
//         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl animate-scaleIn">
//             <div className="p-8">
//               <div className="text-center mb-6">
//                 <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl">
//                   <CheckCircle2 className="h-12 w-12 text-white" />
//                 </div>
//                 <h3 className="text-2xl font-black uppercase mb-2 text-gray-900">¡Pedido Enviado!</h3>
//                 <p className="text-gray-600">Tu pedido ha sido enviado por WhatsApp. Nos pondremos en contacto contigo pronto.</p>
//               </div>

//               <Button
//                 onClick={() => {
//                   setShowOrderConfirmation(false)
//                   window.location.href = '/'
//                 }}
//                 className="w-full bg-gradient-to-r from-black to-gray-800 text-white hover:from-gray-800 hover:to-black rounded-2xl h-14 font-bold uppercase shadow-2xl hover:shadow-3xl transition-all hover:scale-105"
//               >
//                 Volver a la Tienda
//               </Button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   )
// }