"use client"

import { useState, useEffect, useMemo } from "react"
import { CreditCard, Truck, MessageCircle, CheckCircle2, AlertCircle, MapPin, Clock, Wallet, Banknote, Building, Store, Info } from "lucide-react"
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
    try {
      const result = await api.getPublicSettings()
      if (result.success) {
        setSettings(result.settings)
        setExchangeRate(result.exchangeRate)
        if (result.settings.shippingMethods?.length > 0) {
          setFormData(prev => ({ ...prev, shippingMethod: result.settings.shippingMethods[0].id }))
        }
        if (result.settings.paymentMethods?.length > 0) {
          setFormData(prev => ({ ...prev, paymentMethod: result.settings.paymentMethods[0].id }))
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="w-12 h-12 border-2 border-tertiary border-t-transparent animate-spin mb-4"></div>
      <span className="font-mono-data text-label-caps text-on-surface-variant uppercase tracking-widest">Initialising_Protocol...</span>
    </div>
  )

  if (items.length === 0) return (
    <div className="min-h-screen bg-background border-t border-outline-variant/30 flex items-center justify-center p-gutter">
      <div className="max-w-xl w-full border border-outline-variant/30 bg-surface-container-lowest p-12 text-center flex flex-col items-center">
        <span className="material-symbols-outlined text-6xl text-outline mb-6">shopping_cart_off</span>
        <h1 className="font-h2 text-h2 text-on-background uppercase tracking-tight mb-4">INVENTORY_EMPTY</h1>
        <p className="font-body-lg text-on-surface-variant mb-10">Add assets to your protocol before proceeding to acquisition.</p>
        <button onClick={() => window.location.href = '/'} className="bg-tertiary text-on-tertiary font-label-caps text-label-caps uppercase px-12 py-5 hover:bg-surface-container-highest hover:text-tertiary transition-all duration-300 border border-tertiary">RETURN_TO_GRID</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background border-t border-outline-variant/30">
      <div className="flex justify-between items-end p-gutter md:p-margin border-b border-outline-variant/30 bg-surface-container-lowest">
        <div className="flex items-center gap-4">
          <div className="bg-tertiary text-on-tertiary px-2 py-1 flex items-center"><span className="material-symbols-outlined text-sm">lock</span></div>
          <h1 className="font-h2 text-h2 text-on-background uppercase tracking-tight">ORDER_PROTOCOL</h1>
        </div>
        <div className="font-mono-data text-on-surface-variant hidden md:block uppercase text-xs">SECURE_ENCRYPTION: AES_256 // SESSION: {user ? user.firstName.toUpperCase() : 'GUEST'}</div>
      </div>

      <div className="w-full flex flex-col lg:flex-row min-h-screen">
        <div className="flex-1 lg:border-r border-outline-variant/30 p-gutter md:p-12 lg:p-16 space-y-16">
          <div className="max-w-4xl mx-auto space-y-12">
            <div className="border border-outline-variant/30 bg-surface-container-lowest">
              <div className="border-b border-outline-variant/30 p-6 flex items-center gap-4 bg-surface-container">
                <span className="font-mono-data text-tertiary">01_</span>
                <h3 className="font-h3 text-h3 text-on-background uppercase tracking-tight">CONTACT_PROTOCOL</h3>
              </div>
              <div className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label className="font-mono-data text-[10px] text-on-surface-variant uppercase">Given_Name *</Label>
                    <Input name="firstName" value={formData.firstName} onChange={(e) => handleNameChange(e, 'firstName')} className={`h-14 border border-outline-variant/30 bg-background font-mono-data uppercase focus:border-tertiary transition-colors ${validationErrors.firstName ? 'border-error' : ''}`} required />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-mono-data text-[10px] text-on-surface-variant uppercase">Family_Name *</Label>
                    <Input name="lastName" value={formData.lastName} onChange={(e) => handleNameChange(e, 'lastName')} className={`h-14 border border-outline-variant/30 bg-background font-mono-data uppercase focus:border-tertiary transition-colors ${validationErrors.lastName ? 'border-error' : ''}`} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-mono-data text-[10px] text-on-surface-variant uppercase">Electronic_Mail *</Label>
                  <Input name="email" type="email" value={formData.email} onChange={handleEmailChange} className={`h-14 border border-outline-variant/30 bg-background font-mono-data uppercase focus:border-tertiary transition-colors ${isEmailValid ? 'border-tertiary' : validationErrors.email ? 'border-error' : ''}`} required />
                </div>
                <div className="space-y-2">
                  <Label className="font-mono-data text-[10px] text-on-surface-variant uppercase">Communication_Link *</Label>
                  <div className="flex gap-2">
                    <div className="relative">
                      <button type="button" onClick={() => setShowCountryDropdown(!showCountryDropdown)} className="h-14 px-4 border border-outline-variant/30 bg-background font-mono-data text-sm flex items-center gap-2 hover:border-tertiary transition-colors">{countryCodes.find(c => c.code === formData.countryCode)?.flag} {formData.countryCode} <span className="material-symbols-outlined text-xs">expand_more</span></button>
                      {showCountryDropdown && (
                        <div className="absolute top-full left-0 mt-2 bg-surface-container-lowest border border-outline-variant/30 shadow-2xl z-50 w-64">
                          <div className="p-2 border-b border-outline-variant/30"><input type="text" placeholder="SEARCH_ISO_CODE..." value={countrySearch} onChange={(e) => setCountrySearch(e.target.value)} className="w-full h-10 bg-background border border-outline-variant/30 px-3 font-mono-data text-[10px] uppercase focus:border-tertiary outline-none" autoFocus /></div>
                          <div className="max-h-64 overflow-y-auto custom-scrollbar">
                            {filteredCountries.map((country) => (
                              <button key={country.code} type="button" onClick={() => { setFormData({ ...formData, countryCode: country.code }); setShowCountryDropdown(false); setCountrySearch("") }} className="w-full px-4 py-3 text-left hover:bg-surface-container font-mono-data text-[10px] uppercase flex items-center gap-3 border-b border-outline-variant/10"><span>{country.flag}</span><span className="text-tertiary">{country.code}</span><span className="opacity-50 truncate">{country.country}</span></button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <Input name="phone" type="tel" value={formData.phone} onChange={handlePhoneChange} placeholder="NETWORK_ID_0000000" className={`h-14 flex-1 border border-outline-variant/30 bg-background font-mono-data uppercase focus:border-tertiary transition-colors ${validationErrors.phone ? 'border-error' : ''}`} required />
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-outline-variant/30 bg-surface-container-lowest">
              <div className="border-b border-outline-variant/30 p-6 flex items-center gap-4 bg-surface-container">
                <span className="font-mono-data text-tertiary">02_</span>
                <h3 className="font-h3 text-h3 text-on-background uppercase tracking-tight">LOGISTICS_SELECTION</h3>
              </div>
              <div className="p-8 space-y-4">
                {settings?.shippingMethods.map((method) => {
                  const isSelected = formData.shippingMethod === method.id
                  const isFree = method.freeFrom > 0 && total >= method.freeFrom
                  return (
                    <label key={method.id} className={`flex items-start p-6 border transition-all cursor-pointer ${isSelected ? 'border-tertiary bg-surface-container' : 'border-outline-variant/30 hover:border-tertiary/50'}`}>
                      <input type="radio" name="shippingMethod" value={method.id} checked={isSelected} onChange={handleInputChange} className="mt-1 mr-4 accent-tertiary" />
                      <div className="flex-1 space-y-2">
                        <div className="flex justify-between items-baseline">
                          <span className="font-mono-data text-sm font-bold uppercase">{method.name}</span>
                          <span className="font-mono-data text-sm text-tertiary">{method.additionalCost > 0 ? (isFree ? "FREE_PROTOCOL" : `USD ${method.additionalCost.toFixed(2)}`) : "UPON_VERIFICATION"}</span>
                        </div>
                        {method.description && <p className="font-body-sm text-xs text-on-surface-variant uppercase tracking-widest opacity-70 leading-relaxed">{method.description}</p>}
                        {method.estimatedTime && <div className="flex items-center gap-2 font-mono-data text-[10px] text-on-surface-variant opacity-50 uppercase"><span className="material-symbols-outlined text-xs">schedule</span>ETA: {method.estimatedTime}</div>}
                        {method.type === 'pickup' && method.pickupData && (
                          <div className="mt-4 p-4 border border-outline-variant/20 bg-background/50 font-mono-data text-[10px] uppercase space-y-1"><div className="text-tertiary">POINT_OF_COLLECTION:</div><div>{method.pickupData.address}</div><div className="opacity-50">WINDOW: {method.pickupData.schedule}</div></div>
                        )}
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            {selectedShippingMethod?.requiresAddress && (
              <div className="border border-outline-variant/30 bg-surface-container-lowest">
                <div className="border-b border-outline-variant/30 p-6 flex items-center gap-4 bg-surface-container"><span className="material-symbols-outlined text-tertiary">location_on</span><h3 className="font-h3 text-h3 text-on-background uppercase tracking-tight">LOGISTICS_ENDPOINT</h3></div>
                <div className="p-8 space-y-8">
                  <div className="space-y-2"><Label className="font-mono-data text-[10px] text-on-surface-variant uppercase">Full_Address_String *</Label><Input name="address" value={formData.address} onChange={handleInputChange} placeholder="STREET_NAME_NUMBER_APARTMENT_ID" className="h-14 border border-outline-variant/30 bg-background font-mono-data uppercase focus:border-tertiary transition-colors" required /></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2"><Label className="font-mono-data text-[10px] text-on-surface-variant uppercase">City_Node *</Label><Input name="city" value={formData.city} onChange={handleInputChange} className="h-14 border border-outline-variant/30 bg-background font-mono-data uppercase focus:border-tertiary transition-colors" required /></div>
                    <div className="space-y-2"><Label className="font-mono-data text-[10px] text-on-surface-variant uppercase">Province_State *</Label><Input name="state" value={formData.state} onChange={handleInputChange} className="h-14 border border-outline-variant/30 bg-background font-mono-data uppercase focus:border-tertiary transition-colors" required /></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2"><Label className="font-mono-data text-[10px] text-on-surface-variant uppercase">Postal_Code *</Label><Input name="zipCode" value={formData.zipCode} onChange={handleInputChange} className="h-14 border border-outline-variant/30 bg-background font-mono-data uppercase focus:border-tertiary transition-colors" required /></div>
                    <div className="space-y-2"><Label className="font-mono-data text-[10px] text-on-surface-variant uppercase">Reference_Metadata</Label><Input name="reference" value={formData.reference} onChange={handleInputChange} placeholder="LANDMARK_NEAR_ID" className="h-14 border border-outline-variant/30 bg-background font-mono-data uppercase focus:border-tertiary transition-colors" /></div>
                  </div>
                </div>
              </div>
            )}

            <div className="border border-outline-variant/30 bg-surface-container-lowest">
              <div className="border-b border-outline-variant/30 p-6 flex items-center gap-4 bg-surface-container"><span className="font-mono-data text-tertiary">03_</span><h3 className="font-h3 text-h3 text-on-background uppercase tracking-tight">TRANSACTION_PROTOCOL</h3></div>
              <div className="p-8 space-y-4">
                {settings?.paymentMethods.map((method) => {
                  const isSelected = formData.paymentMethod === method.id
                  return (
                    <label key={method.id} className={`flex items-start p-6 border transition-all cursor-pointer ${isSelected ? 'border-tertiary bg-surface-container' : 'border-outline-variant/30 hover:border-tertiary/50'}`}>
                      <input type="radio" name="paymentMethod" value={method.id} checked={isSelected} onChange={handleInputChange} className="mt-1 mr-4 accent-tertiary" />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="font-mono-data text-sm font-bold uppercase">{method.name}</span>
                          {method.hasDiscount && <span className="bg-tertiary text-on-tertiary font-mono-data text-[9px] px-2 py-0.5 uppercase tracking-widest">PROMO: -{method.discountPercentage}%</span>}
                        </div>
                        {method.description && <p className="font-body-sm text-xs text-on-surface-variant uppercase tracking-widest opacity-70 leading-relaxed">{method.description}</p>}
                        {isSelected && method.accountData && Object.values(method.accountData).some(v => v) && (
                          <div className="mt-6 p-6 border border-tertiary/30 bg-background/50 space-y-4">
                            <div className="font-mono-data text-[10px] text-tertiary uppercase tracking-widest flex items-center gap-2"><span className="material-symbols-outlined text-xs">account_balance_wallet</span>ACQUISITION_DETAILS:</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono-data text-[10px] uppercase">
                              {method.accountData.bankName && <div>BANK: {method.accountData.bankName}</div>}
                              {method.accountData.accountNumber && <div>ID: {method.accountData.accountNumber}</div>}
                              {method.accountData.accountHolder && <div>NAME: {method.accountData.accountHolder}</div>}
                              {method.accountData.identification && <div>IDENT: {method.accountData.identification}</div>}
                              {method.accountData.phone && <div>NET: {method.accountData.phone}</div>}
                              {method.accountData.email && <div>MAIL: {method.accountData.email}</div>}
                              {method.accountData.walletAddress && <div className="col-span-full break-all">ADDR: {method.accountData.walletAddress}</div>}
                            </div>
                            {method.accountData.additionalInfo && <p className="font-mono-data text-[9px] opacity-50 uppercase pt-4 border-t border-outline-variant/10">NOTES: {method.accountData.additionalInfo}</p>}
                          </div>
                        )}
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="border border-outline-variant/30 bg-surface-container-lowest">
              <div className="border-b border-outline-variant/30 p-6 flex items-center gap-4 bg-surface-container"><span className="material-symbols-outlined text-tertiary">notes</span><h3 className="font-h3 text-h3 text-on-background uppercase tracking-tight">PROTOCOL_NOTES</h3></div>
              <div className="p-8">
                <Textarea name="notes" value={formData.notes} onChange={handleInputChange} placeholder="INPUT_SPECIAL_INSTRUCTIONS_HERE..." className="min-h-[120px] border border-outline-variant/30 bg-background font-mono-data uppercase focus:border-tertiary transition-colors resize-none" />
              </div>
            </div>
          </div>
        </div>

        <aside className="lg:w-[450px] bg-surface-container-lowest lg:border-l border-outline-variant/30 relative">
          <div className="sticky top-24 p-gutter md:p-12 space-y-12">
            <div className="flex justify-between items-center border-b border-outline-variant/30 pb-6">
              <h3 className="font-h3 text-h3 text-on-background uppercase tracking-tight">ORDER_SUMMARY</h3>
              <span className="font-mono-data text-on-surface-variant text-[10px] uppercase">ENTRIES: {items.length.toString().padStart(2, '0')}</span>
            </div>
            <div className="space-y-6 max-h-[40vh] overflow-y-auto pr-4 custom-scrollbar">
              {items.map((item) => (
                <div key={`${item.id}-${item.size}-${item.color}`} className="flex gap-6 group">
                  <div className="w-24 aspect-square bg-surface-container border border-outline-variant/30 overflow-hidden flex-shrink-0">
                    <img src={item.image ? (item.image.startsWith('http') ? item.image : `https://yenfit.shop${item.image}`) : "/placeholder.svg"} alt={item.name} className="w-full h-full object-cover mix-blend-luminosity group-hover:mix-blend-normal transition-all duration-500" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center space-y-1">
                    <h4 className="font-mono-data text-sm text-on-background uppercase truncate tracking-tight">{item.name}</h4>
                    <div className="flex flex-wrap items-center gap-3"><span className="font-mono-data text-[9px] text-on-surface-variant uppercase bg-surface-container px-2 border border-outline-variant/10">{item.color}</span><span className="font-mono-data text-[9px] text-on-surface-variant uppercase bg-surface-container px-2 border border-outline-variant/10">{item.size}</span></div>
                    <div className="flex justify-between items-center mt-2"><span className="font-mono-data text-[9px] text-on-surface-variant uppercase">QTY: {item.quantity}</span><span className="font-mono-data text-xs text-tertiary font-bold">USD {(item.price * item.quantity).toFixed(2)}</span></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-4 pt-8 border-t border-outline-variant/30">
              <div className="flex justify-between font-mono-data text-[10px] text-on-surface-variant uppercase tracking-widest"><span>Subtotal_Amount</span><span>USD {total.toFixed(2)}</span></div>
              {shippingCost > 0 && <div className="flex justify-between font-mono-data text-[10px] text-on-surface-variant uppercase tracking-widest"><span>Logistics_Surcharge</span><span>USD {shippingCost.toFixed(2)}</span></div>}
              {discount > 0 && <div className="flex justify-between font-mono-data text-[10px] text-error uppercase tracking-widest"><span>Protocol_Deduction</span><span>-USD {discount.toFixed(2)}</span></div>}
              <div className="flex flex-col gap-4 pt-8 border-t-2 border-tertiary">
                <div className="flex justify-between items-end"><div className="flex flex-col"><span className="font-mono-data text-[10px] text-on-surface-variant uppercase leading-none mb-1">FINAL_NET_TOTAL</span><span className="font-mono-data text-[8px] text-tertiary uppercase tracking-widest opacity-50 italic">PAYMENT_DUE_NOW</span></div><span className="font-display text-[42px] text-on-background leading-none tracking-tighter">{currencySymbol}{finalTotal.toFixed(2)}</span></div>
                {totalInBs && settings?.currency.showBsPrice && (
                  <div className="bg-surface-container p-4 border-l-2 border-tertiary space-y-1"><div className="flex justify-between items-center"><span className="font-mono-data text-[9px] text-on-surface-variant uppercase">BS_LOCAL_CONVERSION</span><span className="font-mono-data text-[9px] text-tertiary uppercase">RATE: {settings.currency.code === "EUR" ? exchangeRate?.eur : exchangeRate?.usd}</span></div><div className="font-mono-data text-lg text-on-background font-black flex justify-between items-center"><span className="opacity-30">BS.</span><span>{totalInBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span></div></div>
                )}
              </div>
            </div>
            <div className="space-y-6 pt-4">
              <button onClick={handleWhatsAppOrder} disabled={!isFormValid() || submitting} className="w-full bg-tertiary text-on-tertiary font-label-caps text-label-caps uppercase py-6 hover:bg-on-surface hover:text-tertiary transition-all duration-500 border border-tertiary flex items-center justify-center gap-3 group disabled:opacity-30 disabled:cursor-not-allowed">{submitting ? <div className="w-5 h-5 border-2 border-on-tertiary border-t-transparent animate-spin"></div> : <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">bolt</span>}EXECUTE_ACQUISITION</button>
              <div className="flex items-center gap-3 justify-center font-mono-data text-[9px] text-on-surface-variant uppercase opacity-40"><span className="material-symbols-outlined text-xs">verified_user</span>SECURE_ENCRYPTION_LAYER_4.2.1 // VALENCIA_NODE_AF</div>
            </div>
          </div>
        </aside>
      </div>

      {showOrderConfirmation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background border border-outline-variant/30 p-12 max-w-lg w-full text-center shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="w-24 h-24 bg-surface-container border border-tertiary/30 rounded-full flex items-center justify-center mx-auto mb-8"><span className="material-symbols-outlined text-4xl text-tertiary">task_alt</span></div>
            <h2 className="font-display text-h2 text-on-background uppercase tracking-tight mb-4">PROTOCOL_COMPLETE</h2>
            <p className="font-body-lg text-on-surface-variant mb-10 uppercase tracking-widest text-xs">ASSET_ACQUISITION_LOGGED. REDIRECTING_TO_WHATSAPP_NETWORK_FOR_FINAL_CLEARANCE.</p>
            <div className="flex flex-col gap-4">
              <button onClick={() => window.location.href = '/'} className="w-full py-5 bg-tertiary text-on-tertiary font-label-caps text-label-caps uppercase hover:bg-surface-container-highest hover:text-tertiary border border-tertiary transition-all">RETURN_TO_SYSTEM</button>
              <p className="font-mono-data text-[8px] text-on-surface-variant uppercase opacity-50">IF_NOT_REDIRECTED_AUTOMATICALLY_CHECK_BROWSER_POPUP_PERMISSIONS</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}