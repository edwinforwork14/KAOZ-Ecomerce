"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Lock, Mail, User, Phone, ArrowLeft, Loader2, AlertCircle, CheckCircle2, Search } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { brandConfig } from "@/lib/config"

// Lista de códigos de país
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
  { code: "+33", country: "Francia", flag: "🇫🇷" },
  { code: "+39", country: "Italia", flag: "🇮🇹" },
  { code: "+49", country: "Alemania", flag: "🇩🇪" },
  { code: "+44", country: "Reino Unido", flag: "🇬🇧" },
  { code: "+86", country: "China", flag: "🇨🇳" },
  { code: "+81", country: "Japón", flag: "🇯🇵" },
  { code: "+82", country: "Corea del Sur", flag: "🇰🇷" },
  { code: "+91", country: "India", flag: "🇮🇳" },
]

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuth()
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    countryCode: "+58",
    phone: "",
    password: "",
    confirmPassword: ""
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)
  const [countrySearch, setCountrySearch] = useState("")
  
  // Errores de validación
  const [validationErrors, setValidationErrors] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: ""
  })

  // Filtrar códigos de país por búsqueda
  const filteredCountries = useMemo(() => {
    if (!countrySearch) return countryCodes
    return countryCodes.filter(country => 
      country.country.toLowerCase().includes(countrySearch.toLowerCase()) ||
      country.code.includes(countrySearch)
    )
  }, [countrySearch])

  // Validaciones
  const validateName = (name: string) => {
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/
    return nameRegex.test(name)
  }

  const validateEmail = (email: string) => {
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    return emailRegex.test(email)
  }

  const validatePhone = (phone: string) => {
    const phoneRegex = /^[0-9\s()-]+$/
    return phoneRegex.test(phone)
  }

  // Password strength indicator
  const getPasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 6) strength++
    if (password.length >= 10) strength++
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++
    if (/\d/.test(password)) strength++
    if (/[^A-Za-z0-9]/.test(password)) strength++
    return strength
  }

  const passwordStrength = getPasswordStrength(formData.password)
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500']
  const strengthLabels = ['Muy débil', 'Débil', 'Aceptable', 'Fuerte', 'Muy fuerte']

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validaciones finales
    if (!validateName(formData.firstName)) {
      setError("El nombre solo puede contener letras")
      return
    }

    if (!validateName(formData.lastName)) {
      setError("El apellido solo puede contener letras")
      return
    }

    if (!validateEmail(formData.email)) {
      setError("Por favor ingresa un email válido")
      return
    }

    if (formData.phone && !validatePhone(formData.phone)) {
      setError("El teléfono solo puede contener números")
      return
    }

    if (!acceptTerms) {
      setError("Debes aceptar los términos y condiciones")
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden")
      return
    }

    if (formData.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres")
      return
    }

    setLoading(true)

    try {
      const { confirmPassword, countryCode, ...registerData } = formData
      const fullPhone = formData.phone ? `${countryCode} ${formData.phone}` : ""
      
      const result = await register({
        ...registerData,
        phone: fullPhone
      })
      
      if (result.success) {
        setTimeout(() => {
          router.push('/')
        }, 500)
      } else {
        setError(result.message || "Error al registrar usuario")
      }
    } catch (err) {
      setError("Error de conexión. Por favor intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'firstName' | 'lastName') => {
    const value = e.target.value
    
    if (value === '' || validateName(value)) {
      setFormData({ ...formData, [field]: value })
      setValidationErrors({ ...validationErrors, [field]: "" })
    } else {
      setValidationErrors({ 
        ...validationErrors, 
        [field]: "Solo se permiten letras" 
      })
    }
    if (error) setError("")
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value
    setFormData({ ...formData, email })
    
    if (email.length > 0 && !validateEmail(email)) {
      setValidationErrors({ ...validationErrors, email: "Email inválido" })
    } else {
      setValidationErrors({ ...validationErrors, email: "" })
    }
    if (error) setError("")
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    
    if (value === '' || validatePhone(value)) {
      setFormData({ ...formData, phone: value })
      setValidationErrors({ ...validationErrors, phone: "" })
    } else {
      setValidationErrors({ 
        ...validationErrors, 
        phone: "Solo se permiten números" 
      })
    }
    if (error) setError("")
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const password = e.target.value
    setFormData({ ...formData, password })
    if (error) setError("")
  }

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const confirmPassword = e.target.value
    setFormData({ ...formData, confirmPassword })
    if (error) setError("")
  }

  const isEmailValid = formData.email.length > 0 && validateEmail(formData.email)
  const isPasswordMatch = formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-20 animate-blob"
          style={{ backgroundColor: brandConfig.colors.primary }}
        />
        <div 
          className="absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl opacity-20 animate-blob animation-delay-2000"
          style={{ backgroundColor: brandConfig.colors.secondary }}
        />
        <div 
          className="absolute top-1/2 left-1/2 w-96 h-96 rounded-full blur-3xl opacity-20 animate-blob animation-delay-4000"
          style={{ backgroundColor: brandConfig.colors.primary }}
        />
      </div>

      <div className="w-full max-w-2xl relative z-10">
        {/* Header with Logo */}
        <div className="text-center mb-8 animate-fadeIn">
          <div className="inline-flex items-center justify-center mb-6">
            <div className="relative w-32 h-32 transform hover:scale-110 transition-all duration-500 hover:rotate-6">
              <Image
                src="/logo/10y.png"
                alt={brandConfig.name}
                fill
                className="object-contain drop-shadow-2xl"
                priority
              />
            </div>
          </div>
          <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 bg-clip-text text-transparent">
            Únete a nosotros
          </h1>          
        </div>

        {/* Register Card */}
        <Card className="shadow-2xl border-0 backdrop-blur-sm bg-white/95 animate-slideUp rounded-3xl">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-bold text-center">Crear Cuenta</CardTitle>
            <CardDescription className="text-center">
              Completa tus datos para comenzar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error Alert */}
              {error && (
                <Alert variant="destructive" className="animate-shake rounded-2xl border-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Name Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-medium">
                    Nombre *
                  </Label>
                  <div className="relative group">
                    <User className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-all duration-300 ${
                      validationErrors.firstName ? 'text-red-500' : 'text-gray-400'
                    }`} />
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      placeholder="Juan"
                      value={formData.firstName}
                      onChange={(e) => handleNameChange(e, 'firstName')}
                      className={`pl-12 h-14 rounded-2xl border-2 transition-all duration-300 shadow-sm hover:shadow-md ${
                        validationErrors.firstName ? 'border-red-500' : ''
                      }`}
                      required
                      disabled={loading}
                    />
                  </div>
                  {validationErrors.firstName && (
                    <p className="text-xs text-red-500 animate-slideDown">{validationErrors.firstName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm font-medium">
                    Apellido *
                  </Label>
                  <div className="relative group">
                    <User className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-all duration-300 ${
                      validationErrors.lastName ? 'text-red-500' : 'text-gray-400'
                    }`} />
                    <Input
                      id="lastName"
                      name="lastName"
                      type="text"
                      placeholder="Pérez"
                      value={formData.lastName}
                      onChange={(e) => handleNameChange(e, 'lastName')}
                      className={`pl-12 h-14 rounded-2xl border-2 transition-all duration-300 shadow-sm hover:shadow-md ${
                        validationErrors.lastName ? 'border-red-500' : ''
                      }`}
                      required
                      disabled={loading}
                    />
                  </div>
                  {validationErrors.lastName && (
                    <p className="text-xs text-red-500 animate-slideDown">{validationErrors.lastName}</p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email *
                </Label>
                <div className="relative group">
                  <Mail className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-all duration-300 ${
                    isEmailValid ? 'text-green-500' : validationErrors.email ? 'text-red-500' : 'text-gray-400'
                  }`} />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={formData.email}
                    onChange={handleEmailChange}
                    className={`pl-12 pr-12 h-14 rounded-2xl border-2 transition-all duration-300 shadow-sm hover:shadow-md ${
                      isEmailValid ? 'border-green-500' : validationErrors.email ? 'border-red-500' : ''
                    }`}
                    required
                    disabled={loading}
                  />
                  {isEmailValid && (
                    <CheckCircle2 className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500 animate-scaleIn" />
                  )}
                </div>
                {validationErrors.email && (
                  <p className="text-xs text-red-500 animate-slideDown">{validationErrors.email}</p>
                )}
              </div>

              {/* Phone with Country Code */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  Teléfono
                </Label>
                <div className="flex gap-2">
                  {/* Country Code Selector */}
                  <div className="relative w-36">
                    <button
                      type="button"
                      onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                      className="w-full h-14 px-4 border-2 border-gray-200 rounded-2xl flex items-center justify-between bg-white hover:border-gray-400 transition-colors shadow-sm hover:shadow-md"
                      disabled={loading}
                    >
                      <span className="text-sm font-medium">
                        {countryCodes.find(c => c.code === formData.countryCode)?.flag} {formData.countryCode}
                      </span>
                      <Search className="h-4 w-4 text-gray-400" />
                    </button>
                    
                    {showCountryDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 rounded-2xl shadow-2xl z-50 max-h-64 overflow-hidden animate-slideDown">
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
                          {filteredCountries.length === 0 && (
                            <div className="px-3 py-4 text-center text-sm text-gray-500">
                              No se encontraron países
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Phone Number */}
                  <div className="flex-1 relative group">
                    <Phone className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-all duration-300 ${
                      validationErrors.phone ? 'text-red-500' : 'text-gray-400'
                    }`} />
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="412 123 4567"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      className={`pl-12 h-14 rounded-2xl border-2 transition-all duration-300 shadow-sm hover:shadow-md ${
                        validationErrors.phone ? 'border-red-500' : ''
                      }`}
                      disabled={loading}
                    />
                  </div>
                </div>
                {validationErrors.phone && (
                  <p className="text-xs text-red-500 animate-slideDown">{validationErrors.phone}</p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Contraseña *
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 transition-all duration-300 group-focus-within:text-gray-600 group-focus-within:scale-110" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handlePasswordChange}
                    className="pl-12 pr-12 h-14 rounded-2xl border-2 transition-all duration-300 shadow-sm hover:shadow-md"
                    required
                    disabled={loading}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-all duration-300 hover:scale-110 active:scale-95"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                
                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="space-y-2 animate-slideDown">
                    <div className="flex gap-1">
                      {[0, 1, 2, 3, 4].map((index) => (
                        <div
                          key={index}
                          className={`h-2 flex-1 rounded-full transition-all duration-500 ${
                            index < passwordStrength ? strengthColors[passwordStrength - 1] : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-600">
                      Seguridad: <span className={`font-medium ${passwordStrength >= 4 ? 'text-green-600' : passwordStrength >= 3 ? 'text-lime-600' : 'text-orange-600'}`}>
                        {strengthLabels[passwordStrength - 1] || 'Ingresa una contraseña'}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirmar Contraseña *
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 transition-all duration-300 group-focus-within:text-gray-600 group-focus-within:scale-110" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    className={`pl-12 pr-12 h-14 rounded-2xl border-2 transition-all duration-300 shadow-sm hover:shadow-md ${
                      isPasswordMatch ? 'border-green-500' : formData.confirmPassword && formData.password !== formData.confirmPassword ? 'border-red-500' : ''
                    }`}
                    required
                    disabled={loading}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-all duration-300 hover:scale-110 active:scale-95"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-xs text-red-500 flex items-center gap-1 animate-slideDown">
                    <AlertCircle className="h-3 w-3" />
                    Las contraseñas no coinciden
                  </p>
                )}
                {isPasswordMatch && (
                  <p className="text-xs text-green-500 flex items-center gap-1 animate-slideDown">
                    <CheckCircle2 className="h-3 w-3" />
                    Las contraseñas coinciden
                  </p>
                )}
              </div>

              {/* Terms & Conditions */}
              <div className="flex items-start space-x-2 pt-2">
                <input 
                  type="checkbox" 
                  id="terms"
                  className="mt-1 rounded-lg border-gray-300 transition-all duration-300 hover:scale-110"
                  style={{ accentColor: brandConfig.colors.primary }}
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  required
                />
                <label htmlFor="terms" className="text-sm text-gray-600 cursor-pointer">
                  Acepto los{" "}
                  <Link 
                    href="/terms" 
                    className="font-bold hover:underline transition-all"
                    style={{ color: brandConfig.colors.primary }}
                    target="_blank"
                  >
                    términos y condiciones
                  </Link>
                  {" "}y la{" "}
                  <Link 
                    href="/privacy" 
                    className="font-bold hover:underline transition-all"
                    style={{ color: brandConfig.colors.primary }}
                    target="_blank"
                  >
                    política de privacidad
                  </Link>
                </label>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-14 text-white font-bold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none rounded-2xl uppercase tracking-wide"
                style={{ backgroundColor: brandConfig.colors.primary }}
                disabled={loading || !acceptTerms || !isEmailValid}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creando cuenta...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Crear Cuenta
                  </>
                )}
              </Button>

              {/* Login Link */}
              <div className="text-center text-sm pt-2">
                <span className="text-gray-600">¿Ya tienes una cuenta? </span>
                <Link 
                  href="/auth/login" 
                  className="font-bold hover:underline transition-all duration-300"
                  style={{ color: brandConfig.colors.primary }}
                >
                  Inicia sesión
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Back to Store Link */}
        <div className="text-center mt-6 animate-fadeIn animation-delay-300">
          <Link 
            href="/" 
            className="inline-flex items-center text-gray-600 hover:text-gray-900 text-sm font-semibold transition-all duration-300 group bg-white px-6 py-3 rounded-full shadow-md hover:shadow-lg"
          >
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Volver a la tienda
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-gray-500 animate-fadeIn animation-delay-500">
          <p>© 2025 {brandConfig.name}. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  )
}