"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Lock, Mail, ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { brandConfig } from "@/lib/config"

// Componente separado que usa useSearchParams
function LoginFormContent() {
  const router = useRouter()
  const { login, adminLogin } = useAuth()
  const searchParams = useSearchParams()
  
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [emailError, setEmailError] = useState("")

  // Mostrar mensaje si el token expiró
  useEffect(() => {
    if (searchParams?.get('expired') === 'true') {
      setError("Tu sesión ha expirado. Por favor inicia sesión nuevamente.")
    }
  }, [searchParams])

  // Validar email en tiempo real
  const validateEmail = (email: string) => {
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    return emailRegex.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    console.log("🚀 [LOGIN] Iniciando handleSubmit...");
    e.preventDefault()
    setError("")
    setEmailError("")

    console.log("📧 [LOGIN] Email a validar:", formData.email);
    if (!validateEmail(formData.email)) {
      console.error("❌ [LOGIN] Email inválido detectado");
      setEmailError("Por favor ingresa un email válido")
      return
    }

    setLoading(true)
    console.log("📡 [LOGIN] Intentando adminLogin...");

    try {
      // 1. Intentar login de admin directo al backend
      try {
        console.log("🔗 [LOGIN] Llamando a adminLogin con URL de backend...");
        const result = await adminLogin(formData.email, formData.password)
        console.log("✅ [LOGIN] adminLogin exitoso:", result);
        const redirectTo = searchParams?.get('redirect') || '/admin/dashboard'
        setTimeout(() => router.push(redirectTo), 300)
        return
      } catch (adminErr: any) {
        console.warn("⚠️ [LOGIN] adminLogin falló, intentando fallback de Supabase:", adminErr.message);
        if (adminErr.message?.includes('Credenciales') || adminErr.message?.includes('inválidas')) {
          // Puede ser un usuario cliente — intentar Supabase
        } else if (adminErr.message?.includes('permisos de administrador')) {
          // Es usuario válido pero no admin — ir a tienda
          try {
            await login(formData.email, formData.password)
          } catch {}
          router.push(searchParams?.get('redirect') || '/')
          return
        }
      }

      // 2. Fallback: Login de Supabase para clientes regulares
      const result = await login(formData.email, formData.password)
      const redirectTo = searchParams?.get('redirect') || '/'
      setTimeout(() => router.push(redirectTo), 300)
      
    } catch (err: any) {
      const msg = err?.message || ""
      if (msg.includes("Invalid login credentials") || msg.includes("invalid_credentials")) {
        setError("Email o contraseña incorrectos")
      } else if (msg.includes("Email not confirmed")) {
        setError("Por favor verifica tu email antes de iniciar sesión")
      } else {
        setError("Error al iniciar sesión. Intenta nuevamente.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value
    setFormData({ ...formData, email })
    
    if (error) setError("")
    if (emailError) setEmailError("")
    
    // Validar mientras escribe (solo si ya escribió algo)
    if (email.length > 0 && !validateEmail(email)) {
      setEmailError("Email inválido")
    } else {
      setEmailError("")
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    if (error) setError("")
  }

  const isEmailValid = formData.email.length > 0 && validateEmail(formData.email)

  return (
    <div className="w-full max-w-md relative z-10">
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
          Bienvenido de vuelta
        </h1>
      </div>

      {/* Login Card */}
      <Card className="shadow-2xl border-0 backdrop-blur-sm bg-white/95 animate-slideUp rounded-3xl">
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-2xl font-bold text-center">Iniciar Sesión</CardTitle>
          <CardDescription className="text-center">
            Ingresa tus credenciales para acceder
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

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email *
              </Label>
              <div className="relative group">
                <Mail 
                  className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-all duration-300 ${
                    isEmailValid 
                      ? 'text-green-500' 
                      : emailError 
                      ? 'text-red-500' 
                      : 'text-gray-400'
                  }`}
                />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={handleEmailChange}
                  className={`pl-12 pr-12 h-14 rounded-2xl border-2 transition-all duration-300 shadow-sm hover:shadow-md ${
                    isEmailValid 
                      ? 'border-green-500 focus:ring-green-500' 
                      : emailError 
                      ? 'border-red-500 focus:ring-red-500' 
                      : ''
                  }`}
                  required
                  disabled={loading}
                />
                {isEmailValid && (
                  <CheckCircle2 className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500 animate-scaleIn" />
                )}
                {emailError && (
                  <AlertCircle className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-red-500 animate-shake" />
                )}
              </div>
              {emailError && (
                <p className="text-xs text-red-500 flex items-center gap-1 animate-slideDown">
                  {emailError}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Contraseña *
              </Label>
              <div className="relative group">
                <Lock 
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 transition-all duration-300 group-focus-within:text-gray-600 group-focus-within:scale-110" 
                />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-12 pr-12 h-14 rounded-2xl border-2 transition-all duration-300 shadow-sm hover:shadow-md"
                  required
                  disabled={loading}
                  minLength={4}
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
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="rounded-lg border-gray-300 transition-all duration-300 hover:scale-110"
                  style={{ accentColor: brandConfig.colors.primary }}
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors font-medium">
                  Recordarme
                </span>
              </label>
              <Link 
                href="/auth/forgot-password" 
                className="text-sm font-semibold hover:underline transition-all duration-300 hover:translate-x-1"
                style={{ color: brandConfig.colors.primary }}
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-14 text-white font-bold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none rounded-2xl uppercase tracking-wide"
              style={{ backgroundColor: brandConfig.colors.primary }}
              disabled={loading || !isEmailValid}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-5 w-5" />
                  Iniciar Sesión
                </>
              )}
            </Button>

            {/* Register Link */}
            <div className="text-center text-sm pt-2">
              <span className="text-gray-600">¿No tienes una cuenta? </span>
              <Link 
                href="/auth/register" 
                className="font-bold hover:underline transition-all duration-300"
                style={{ color: brandConfig.colors.primary }}
              >
                Regístrate aquí
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
  )
}

// Componente principal con Suspense
export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-0 left-0 w-96 h-96 rounded-full blur-3xl opacity-20 animate-blob"
          style={{ backgroundColor: brandConfig.colors.primary }}
        />
        <div 
          className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-20 animate-blob animation-delay-2000"
          style={{ backgroundColor: brandConfig.colors.secondary }}
        />
        <div 
          className="absolute bottom-0 left-1/2 w-96 h-96 rounded-full blur-3xl opacity-20 animate-blob animation-delay-4000"
          style={{ backgroundColor: brandConfig.colors.primary }}
        />
      </div>

      {/* Envolver el contenido que usa useSearchParams en Suspense */}
      <Suspense fallback={
        <div className="w-full max-w-md relative z-10">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        </div>
      }>
        <LoginFormContent />
      </Suspense>
    </div>
  )
}