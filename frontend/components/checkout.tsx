"use client"

import { useState, useEffect, useMemo } from "react"
import { CreditCard, Truck, CheckCircle2, MapPin, Wallet, Banknote, Building, Store, Package, ShoppingBag, ChevronDown, ArrowRight, Shield, MessageCircle, StickyNote } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useCart } from "@/contexts/cart-context"
import { useAuth } from "@/contexts/auth-context"
import { api, cleanImageUrl } from "@/lib/api"
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

const paymentIcons: Record<string, any> = {
  pago_movil: Building, zelle: Wallet, binance: Wallet,
  efectivo_divisas: Banknote, efectivo_bs: Banknote,
  transfer: Building, cash: Banknote, card: CreditCard,
}

const shippingIcons: Record<string, any> = {
  delivery: Truck, pickup: Store, standard: Truck,
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
  const { items, total, clearCart } = useCart()
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

  useEffect(() => {
    window.scrollTo(0, 0)
    loadSettings()
  }, [])

  useEffect(() => {
    if (user) {
      loadUserData()
    }
  }, [user])

  const loadSettings = async () => {
    console.log('📡 [CHECKOUT] Iniciando carga de configuraciones...');
    try {
      const result = await api.getPublicSettings()
      console.log('📊 [CHECKOUT] Resultado API:', result);
      if (result.success) {
        setSettings(result.settings)
        setExchangeRate(result.exchangeRate)
        
        console.log('🛠️ [CHECKOUT] Métodos recibidos:', {
          shipping: result.settings.shippingMethods?.length || 0,
          payment: result.settings.paymentMethods?.length || 0
        });

        if (result.settings.shippingMethods?.length > 0) {
          setFormData(prev => ({ ...prev, shippingMethod: result.settings.shippingMethods[0].id }))
        }
        if (result.settings.paymentMethods?.length > 0) {
          setFormData(prev => ({ ...prev, paymentMethod: result.settings.paymentMethods[0].id }))
        }
      } else {
        console.warn('⚠️ [CHECKOUT] API reportó éxito false:', result.message);
      }
    } catch (error) {
      console.error('❌ [CHECKOUT] Error fatal cargando settings:', error)
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
            const matchedCountry = countryCodes.find(country => userData.phone.startsWith(country.code))
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

  const filteredCountries = useMemo(() => {
    if (!countrySearch) return countryCodes
    return countryCodes.filter(country => 
      country.country.toLowerCase().includes(countrySearch.toLowerCase()) ||
      country.code.includes(countrySearch)
    )
  }, [countrySearch])

  const selectedShippingMethod = useMemo(() => {
    return settings?.shippingMethods.find(m => m.id === formData.shippingMethod)
  }, [settings, formData.shippingMethod])

  const selectedPaymentMethod = useMemo(() => {
    return settings?.paymentMethods.find(m => m.id === formData.paymentMethod)
  }, [settings, formData.paymentMethod])

  const discount = useMemo(() => {
    if (!selectedPaymentMethod?.hasDiscount) return 0
    return (total * (selectedPaymentMethod.discountPercentage || 0)) / 100
  }, [total, selectedPaymentMethod])

  const shippingCost = useMemo(() => {
    if (!selectedShippingMethod) return 0
    if (selectedShippingMethod.freeFrom > 0 && total >= selectedShippingMethod.freeFrom) return 0
    return selectedShippingMethod.additionalCost || 0
  }, [total, selectedShippingMethod])

  const finalTotal = useMemo(() => total + shippingCost - discount, [total, shippingCost, discount])

  const totalInBs = useMemo(() => {
    if (!exchangeRate || !settings) return null
    const rate = settings.currency.code === "EUR" ? exchangeRate.eur : exchangeRate.usd
    return finalTotal * rate
  }, [finalTotal, exchangeRate, settings])

  const currencySymbol = settings?.currency?.symbol || "€"

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
    setValidationErrors({ ...validationErrors, email: email.length > 0 && !validateEmail(email) ? "Email inválido" : "" })
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
    console.log(`🎯 [CHECKOUT] Cambio detectado: ${name} = ${value}`);
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleMethodSelect = (name: string, value: string) => {
    console.log(`🖱️ [CHECKOUT] Selección manual: ${name} = ${value}`);
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const generateWhatsAppMessage = (orderNumber: string) => {
    const now = new Date()
    const productList = items.map((item, index) =>
      `${index + 1}. ${item.name}\n   • Color: ${item.color}\n   • Talla: ${item.size}\n   • Cantidad: ${item.quantity}\n   • Precio: ${currencySymbol}${item.price.toFixed(2)}`
    ).join('\n\n')

    let message = `*PEDIDO ${brandConfig.name.toUpperCase()}*\n\n📋 Número de Pedido: ${orderNumber}\n📅 Fecha: ${now.toLocaleDateString()}\n\n🛍️ *PRODUCTOS:*\n──────────────────────────────\n\n${productList}\n\n──────────────────────────────\n💰 Subtotal: ${currencySymbol}${total.toFixed(2)}\n`
    if (shippingCost > 0) message += `🚚 Envío: ${currencySymbol}${shippingCost.toFixed(2)}\n`
    if (discount > 0) message += `🏷️ Descuento: -${currencySymbol}${discount.toFixed(2)}\n`
    message += `\n💰 *TOTAL: ${currencySymbol}${finalTotal.toFixed(2)}*\n`
    if (totalInBs && settings?.currency.showBsPrice) {
      message += `💵 *En Bolívares: Bs. ${totalInBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}*\n`
    }
    message += `\n👤 *CLIENTE:*\n${formData.firstName} ${formData.lastName}\n${formData.email}\n${formData.countryCode} ${formData.phone}\n\n📦 *ENTREGA:* ${selectedShippingMethod?.name}\n💳 *PAGO:* ${selectedPaymentMethod?.name}\n`
    if (formData.notes) message += `\n📝 *NOTAS:* ${formData.notes}\n`
    return message
  }

  const handleWhatsAppOrder = async () => {
    if (!isFormValid()) return
    setSubmitting(true)
    try {
      const orderData = {
        customerInfo: { firstName: formData.firstName, lastName: formData.lastName, email: formData.email, phone: `${formData.countryCode} ${formData.phone}` },
        shippingAddress: selectedShippingMethod?.requiresAddress ? { address: formData.address, city: formData.city, state: formData.state, zipCode: formData.zipCode, reference: formData.reference } : null,
        shippingMethod: formData.shippingMethod,
        paymentMethod: formData.paymentMethod,
        notes: formData.notes
      }
      const result = await api.createOrder(orderData)
      if (result.success) {
        const message = generateWhatsAppMessage(result.order.orderNumber)
        const phoneNumber = settings?.whatsapp?.number || brandConfig.contact.whatsapp
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`
        await api.updateOrderWhatsApp(result.order._id)
        setShowOrderConfirmation(true)
        window.open(whatsappUrl, "_blank")
        clearCart()
      }
    } catch (error) {
      console.error('Error creating order:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const isFormValid = () => {
    const baseValid = formData.firstName && formData.lastName && formData.email && formData.phone && validateEmail(formData.email) && !validationErrors.firstName && !validationErrors.lastName && !validationErrors.email && !validationErrors.phone && formData.shippingMethod && formData.paymentMethod
    return selectedShippingMethod?.requiresAddress ? (baseValid && formData.address && formData.city && formData.state && formData.zipCode) : baseValid
  }

  const isEmailValid = formData.email.length > 0 && validateEmail(formData.email)

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-10 h-10 border-2 border-black border-t-transparent rounded-full animate-spin mb-6"></div>
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400">Cargando checkout...</p>
    </div>
  )

  if (items.length === 0) return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full text-center">
        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-8">
          <ShoppingBag className="w-10 h-10 text-gray-300" />
        </div>
        <h1 className="text-2xl font-black uppercase tracking-tight mb-3">Carrito Vacío</h1>
        <p className="text-sm text-gray-400 font-medium mb-10">Añade productos antes de proceder al pago.</p>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => window.location.href = '/'} className="bg-black text-white px-10 py-4 rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-kaosNeon hover:text-black transition-all">Volver a la Tienda</motion.button>
      </motion.div>
    </div>
  )

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-6 md:px-12 lg:px-16 py-8 border-b border-gray-100">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-2 h-2 rounded-full bg-kaosNeon animate-pulse"></div>
              <h1 className="text-[11px] font-black uppercase tracking-[0.25em]">Finalizar Pedido</h1>
            </div>
            <p className="text-[9px] text-gray-400 uppercase tracking-widest font-medium ml-5">Checkout seguro</p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-[9px] text-gray-400 uppercase tracking-widest font-bold">
            <Shield className="w-3.5 h-3.5" />
            Pago Protegido {user ? `• ${user.firstName}` : ''}
          </div>
        </div>
      </div>

      <div className="w-full flex flex-col lg:flex-row">
        <div className="flex-1 lg:border-r border-gray-100 px-6 md:px-12 lg:px-16 py-10">
          <div className="max-w-2xl mx-auto space-y-10">
            {/* Section 1: Contact */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-gray-50 rounded-3xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <span className="w-7 h-7 rounded-full bg-black text-white text-[10px] font-black flex items-center justify-center">1</span>
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Datos de Contacto</h3>
              </div>
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Nombre *</Label>
                    <Input name="firstName" value={formData.firstName} onChange={(e) => handleNameChange(e, 'firstName')} className={`h-14 rounded-2xl border-gray-200 bg-white font-bold focus:ring-2 focus:ring-kaosNeon focus:border-transparent transition-all ${validationErrors.firstName ? 'border-red-400' : ''}`} required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Apellido *</Label>
                    <Input name="lastName" value={formData.lastName} onChange={(e) => handleNameChange(e, 'lastName')} className={`h-14 rounded-2xl border-gray-200 bg-white font-bold focus:ring-2 focus:ring-kaosNeon focus:border-transparent transition-all ${validationErrors.lastName ? 'border-red-400' : ''}`} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Correo Electrónico *</Label>
                  <Input name="email" type="email" value={formData.email} onChange={handleEmailChange} className={`h-14 rounded-2xl border-gray-200 bg-white font-bold focus:ring-2 focus:ring-kaosNeon focus:border-transparent transition-all ${isEmailValid ? 'border-green-400' : validationErrors.email ? 'border-red-400' : ''}`} required />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Teléfono *</Label>
                  <div className="flex gap-3">
                    <div className="relative">
                      <button type="button" onClick={() => setShowCountryDropdown(!showCountryDropdown)} className="h-14 px-4 rounded-2xl border border-gray-200 bg-white text-sm font-bold flex items-center gap-2 hover:border-kaosNeon transition-colors">
                        {countryCodes.find(c => c.code === formData.countryCode)?.flag} {formData.countryCode}
                        <ChevronDown className="w-3 h-3 text-gray-400" />
                      </button>
                      {showCountryDropdown && (
                        <div className="absolute top-full left-0 mt-2 bg-white border border-gray-100 shadow-2xl z-50 w-64 rounded-2xl overflow-hidden">
                          <div className="p-3 border-b border-gray-100">
                            <input type="text" placeholder="Buscar país..." value={countrySearch} onChange={(e) => setCountrySearch(e.target.value)} className="w-full h-10 bg-gray-50 rounded-full px-4 text-[10px] font-bold uppercase focus:ring-2 focus:ring-kaosNeon outline-none" autoFocus />
                          </div>
                          <div className="max-h-64 overflow-y-auto">
                            {filteredCountries.map((country) => (
                              <button key={country.code} type="button" onClick={() => { setFormData({ ...formData, countryCode: country.code }); setShowCountryDropdown(false); setCountrySearch("") }} className="w-full px-4 py-3 text-left hover:bg-gray-50 text-[11px] font-bold flex items-center gap-3 border-b border-gray-50 transition-colors">
                                <span>{country.flag}</span><span className="font-black">{country.code}</span><span className="text-gray-400 truncate">{country.country}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <Input name="phone" type="tel" value={formData.phone} onChange={handlePhoneChange} placeholder="0000000000" className={`h-14 flex-1 rounded-2xl border-gray-200 bg-white font-bold focus:ring-2 focus:ring-kaosNeon focus:border-transparent transition-all ${validationErrors.phone ? 'border-red-400' : ''}`} required />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Section 2: Shipping */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-gray-50 rounded-3xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <span className="w-7 h-7 rounded-full bg-black text-white text-[10px] font-black flex items-center justify-center">2</span>
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Método de Envío</h3>
              </div>
              <div className="space-y-3">
                {settings?.shippingMethods.map((method) => {
                  const isSelected = formData.shippingMethod === method.id
                  const isFree = method.freeFrom > 0 && total >= method.freeFrom
                  const Icon = shippingIcons[method.type] || Truck
                  return (
                    <label 
                      key={method.id} 
                      onClick={() => handleMethodSelect('shippingMethod', method.id)}
                      className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all cursor-pointer ${isSelected ? 'border-kaosNeon bg-white shadow-sm' : 'border-transparent bg-white hover:border-gray-200'}`}
                    >
                      <input type="radio" name="shippingMethod" value={method.id} checked={isSelected} readOnly className="sr-only" />
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isSelected ? 'bg-kaosNeon' : 'bg-gray-100'}`}><Icon className="w-4 h-4" /></div>
                      <div className="flex-1">
                        <div className="flex justify-between items-baseline">
                          <span className="text-[11px] font-black uppercase tracking-wider">{method.name}</span>
                          <span className={`text-[10px] font-bold ${isSelected ? 'text-black' : 'text-gray-400'}`}>{method.additionalCost > 0 ? (isFree ? "Gratis" : `${currencySymbol}${method.additionalCost.toFixed(2)}`) : "A convenir"}</span>
                        </div>
                        {method.description && <p className="text-[9px] text-gray-400 font-medium mt-1">{method.description}</p>}
                        {method.estimatedTime && <p className="text-[9px] text-gray-400 font-medium mt-0.5">Entrega: {method.estimatedTime}</p>}
                        {method.type === 'pickup' && method.pickupData && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-xl text-[9px] font-bold text-gray-500">
                            <p>📍 {method.pickupData.address}</p>
                            <p className="text-gray-400 mt-0.5">Horario: {method.pickupData.schedule}</p>
                          </div>
                        )}
                      </div>
                    </label>
                  )
                })}
              </div>
            </motion.div>

            {/* Address (conditional) */}
            {selectedShippingMethod?.requiresAddress && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gray-50 rounded-3xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <MapPin className="w-4 h-4 text-kaosNeon" />
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Dirección de Envío</h3>
                </div>
                <div className="space-y-5">
                  <div className="space-y-2"><Label className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Dirección *</Label><Input name="address" value={formData.address} onChange={handleInputChange} placeholder="Calle, número, apartamento" className="h-14 rounded-2xl border-gray-200 bg-white font-bold focus:ring-2 focus:ring-kaosNeon focus:border-transparent transition-all" required /></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2"><Label className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Ciudad *</Label><Input name="city" value={formData.city} onChange={handleInputChange} className="h-14 rounded-2xl border-gray-200 bg-white font-bold focus:ring-2 focus:ring-kaosNeon focus:border-transparent transition-all" required /></div>
                    <div className="space-y-2"><Label className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Estado *</Label><Input name="state" value={formData.state} onChange={handleInputChange} className="h-14 rounded-2xl border-gray-200 bg-white font-bold focus:ring-2 focus:ring-kaosNeon focus:border-transparent transition-all" required /></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2"><Label className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Código Postal *</Label><Input name="zipCode" value={formData.zipCode} onChange={handleInputChange} className="h-14 rounded-2xl border-gray-200 bg-white font-bold focus:ring-2 focus:ring-kaosNeon focus:border-transparent transition-all" required /></div>
                    <div className="space-y-2"><Label className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Referencia</Label><Input name="reference" value={formData.reference} onChange={handleInputChange} placeholder="Punto de referencia" className="h-14 rounded-2xl border-gray-200 bg-white font-bold focus:ring-2 focus:ring-kaosNeon focus:border-transparent transition-all" /></div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Section 3: Payment */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-gray-50 rounded-3xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <span className="w-7 h-7 rounded-full bg-black text-white text-[10px] font-black flex items-center justify-center">3</span>
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Método de Pago</h3>
              </div>
              <div className="space-y-3">
                {settings?.paymentMethods.map((method) => {
                  const isSelected = formData.paymentMethod === method.id
                  const Icon = paymentIcons[method.id] || CreditCard
                  return (
                    <label 
                      key={method.id} 
                      onClick={() => handleMethodSelect('paymentMethod', method.id)}
                      className={`block p-5 rounded-2xl border-2 transition-all cursor-pointer ${isSelected ? 'border-kaosNeon bg-white shadow-sm' : 'border-transparent bg-white hover:border-gray-200'}`}
                    >
                      <div className="flex items-center gap-4">
                        <input type="radio" name="paymentMethod" value={method.id} checked={isSelected} readOnly className="sr-only" />
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isSelected ? 'bg-kaosNeon' : 'bg-gray-100'}`}><Icon className="w-4 h-4" /></div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-black uppercase tracking-wider">{method.name}</span>
                            {method.hasDiscount && <span className="bg-kaosNeon text-black text-[8px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">-{method.discountPercentage}%</span>}
                          </div>
                          {method.description && <p className="text-[9px] text-gray-400 font-medium mt-1">{method.description}</p>}
                        </div>
                      </div>
                      {isSelected && method.accountData && Object.values(method.accountData).some(v => v) && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-xl space-y-2 text-[10px] font-bold text-gray-600">
                          <p className="text-[9px] text-kaosNeon font-black uppercase tracking-widest mb-2">Datos de pago:</p>
                          {method.accountData.bankName && <p>Banco: {method.accountData.bankName}</p>}
                          {method.accountData.accountNumber && <p>Cuenta: {method.accountData.accountNumber}</p>}
                          {method.accountData.accountHolder && <p>Titular: {method.accountData.accountHolder}</p>}
                          {method.accountData.identification && <p>Cédula: {method.accountData.identification}</p>}
                          {method.accountData.phone && <p>Teléfono: {method.accountData.phone}</p>}
                          {method.accountData.email && <p>Email: {method.accountData.email}</p>}
                          {method.accountData.walletAddress && <p className="break-all">Wallet: {method.accountData.walletAddress}</p>}
                          {method.accountData.additionalInfo && <p className="text-gray-400 pt-2 border-t border-gray-200 mt-2">{method.accountData.additionalInfo}</p>}
                        </div>
                      )}
                    </label>
                  )
                })}
              </div>
            </motion.div>

            {/* Notes */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-gray-50 rounded-3xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <StickyNote className="w-4 h-4 text-gray-400" />
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Notas del Pedido</h3>
              </div>
              <Textarea name="notes" value={formData.notes} onChange={handleInputChange} placeholder="Instrucciones especiales..." className="min-h-[120px] rounded-2xl border-gray-200 bg-white font-bold focus:ring-2 focus:ring-kaosNeon focus:border-transparent transition-all resize-none" />
            </motion.div>
          </div>
        </div>

        <aside className="lg:w-[420px] bg-gray-50 relative">
          <div className="sticky top-24 px-6 md:px-10 py-10 space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Resumen</h3>
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{items.length} productos</span>
            </div>
            <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
              {items.map((item) => (
                <div key={`${item.id}-${item.size}-${item.color}`} className="flex gap-4 group">
                  <div className="w-20 h-20 bg-white rounded-2xl overflow-hidden flex-shrink-0">
                    <img src={cleanImageUrl(item.image)} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h4 className="text-[10px] font-black uppercase tracking-wider truncate">{item.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[8px] text-gray-400 font-bold uppercase bg-white px-2 py-0.5 rounded-full">{item.color}</span>
                      <span className="text-[8px] text-gray-400 font-bold uppercase bg-white px-2 py-0.5 rounded-full">{item.size}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[9px] text-gray-400 font-bold">x{item.quantity}</span>
                      <span className="text-[11px] font-black">{currencySymbol}{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-3 pt-6 border-t border-gray-200">
              <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-gray-400"><span>Subtotal</span><span>{currencySymbol}{total.toFixed(2)}</span></div>
              {shippingCost > 0 && <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-gray-400"><span>Envío</span><span>{currencySymbol}{shippingCost.toFixed(2)}</span></div>}
              {discount > 0 && <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-green-500"><span>Descuento</span><span>-{currencySymbol}{discount.toFixed(2)}</span></div>}
              <div className="flex justify-between items-end pt-4 border-t border-gray-200">
                <div>
                  <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">Total</p>
                </div>
                <motion.span key={finalTotal} initial={{ scale: 1.1 }} animate={{ scale: 1 }} className="text-3xl font-black tracking-tight">{currencySymbol}{finalTotal.toFixed(2)}</motion.span>
              </div>
              {totalInBs && settings?.currency.showBsPrice && (
                <div className="bg-white rounded-2xl p-4 flex justify-between items-center">
                  <span className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">En Bolívares</span>
                  <span className="text-sm font-black">Bs. {totalInBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>
            <div className="space-y-4 pt-2">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleWhatsAppOrder} disabled={!isFormValid() || submitting} className="w-full h-16 rounded-full bg-black text-white font-black text-[10px] uppercase tracking-[0.25em] hover:bg-kaosNeon hover:text-black transition-all flex items-center justify-center gap-3 shadow-xl hover:shadow-kaosNeon/20 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-black disabled:hover:text-white">
                {submitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><MessageCircle className="w-4 h-4" /> Confirmar por WhatsApp <ArrowRight className="w-4 h-4" /></>}
              </motion.button>
              <div className="flex items-center gap-2 justify-center text-[8px] text-gray-300 uppercase tracking-widest font-bold">
                <Shield className="w-3 h-3" /> Conexión segura y encriptada
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Order Confirmation Modal */}
      <AnimatePresence>
        {showOrderConfirmation && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="bg-white rounded-3xl p-10 max-w-md w-full text-center shadow-2xl">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }} className="w-20 h-20 bg-kaosNeon rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-black" />
              </motion.div>
              <h2 className="text-xl font-black uppercase tracking-tight mb-2">¡Pedido Confirmado!</h2>
              <p className="text-sm text-gray-400 font-medium mb-8">Tu pedido ha sido registrado. Te redirigimos a WhatsApp para finalizar.</p>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => window.location.href = '/'} className="w-full h-14 rounded-full bg-black text-white font-black text-[10px] uppercase tracking-[0.2em] hover:bg-kaosNeon hover:text-black transition-all">Volver a la Tienda</motion.button>
              <p className="text-[8px] text-gray-300 uppercase tracking-widest font-bold mt-4">Si no se abrió WhatsApp, revisa los permisos de popups</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}