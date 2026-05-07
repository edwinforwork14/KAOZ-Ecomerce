"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, User, Mail, Lock, Phone, X } from "lucide-react"
import { toast } from "sonner"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { login, register } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"login" | "register">("login")

  const [loginData, setLoginData] = useState({ email: "", password: "" })
  const [registerData, setRegisterData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { user } = await login(loginData.email, loginData.password)
      toast.success("¡Bienvenido de nuevo!")
      
      // Si es admin, redirigir al dashboard
      if (user?.user_metadata?.role === 'admin' || user?.email === 'admin@example.com') {
        router.push('/admin/dashboard')
      }
      
      onClose()
    } catch (error: any) {
      toast.error("Error al iniciar sesión", { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await register(registerData)
      toast.success("Cuenta creada", { description: "Ya puedes ingresar" })
      setActiveTab("login")
    } catch (error: any) {
      toast.error("Error al registrar", { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-none bg-transparent shadow-none">
        <div className="relative bg-white rounded-[40px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden">
          {/* Close Button */}
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 z-50 w-10 h-10 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header Area */}
          <div className="bg-kaosBlack pt-12 pb-16 px-10 relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-kaosNeon/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            <DialogHeader className="relative z-10">
              <DialogTitle className="text-4xl font-black uppercase tracking-tighter italic leading-none mb-2 text-white">
                MI CUENTA <span className="text-kaosNeon">KAOS</span>
              </DialogTitle>
              <DialogDescription className="text-gray-400 font-medium text-sm">
                Únete a la élite del rendimiento urbano.
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Form Area */}
          <div className="px-10 pb-12 -mt-8 relative z-20">
            <div className="bg-white rounded-[32px] p-2 shadow-xl mb-8">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-gray-50/50 rounded-[24px] h-14 p-1">
                  <TabsTrigger 
                    value="login" 
                    className="rounded-[20px] font-black uppercase text-[11px] tracking-widest data-[state=active]:bg-black data-[state=active]:text-white transition-all duration-300"
                  >
                    Ingresar
                  </TabsTrigger>
                  <TabsTrigger 
                    value="register" 
                    className="rounded-[20px] font-black uppercase text-[11px] tracking-widest data-[state=active]:bg-black data-[state=active]:text-white transition-all duration-300"
                  >
                    Registrarse
                  </TabsTrigger>
                </TabsList>

                <div className="mt-8">
                  <TabsContent value="login">
                    <form onSubmit={handleLogin} className="space-y-5">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-4">Email Address</Label>
                        <div className="relative">
                          <Input
                            type="email"
                            placeholder="tu@email.com"
                            className="h-14 rounded-full border-none bg-gray-100 px-6 focus-visible:ring-2 focus-visible:ring-kaosNeon transition-all font-bold placeholder:text-gray-400 placeholder:font-medium"
                            required
                            value={loginData.email}
                            onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-4">Password</Label>
                        <div className="relative">
                          <Input
                            type="password"
                            placeholder="••••••••"
                            className="h-14 rounded-full border-none bg-gray-100 px-6 focus-visible:ring-2 focus-visible:ring-kaosNeon transition-all font-bold placeholder:text-gray-400"
                            required
                            value={loginData.password}
                            onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                          />
                        </div>
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full h-16 rounded-full bg-kaosBlack text-white hover:bg-kaosNeon hover:text-black font-black uppercase tracking-[0.2em] transition-all shadow-xl hover:shadow-kaosNeon/20 mt-4 group"
                        disabled={loading}
                      >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                          <span className="flex items-center gap-2">
                            Entrar al Caos
                          </span>
                        )}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="register">
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          placeholder="Nombre"
                          className="h-14 rounded-full border-none bg-gray-100 px-6 focus-visible:ring-2 focus-visible:ring-kaosNeon transition-all font-bold"
                          required
                          value={registerData.firstName}
                          onChange={(e) => setRegisterData({ ...registerData, firstName: e.target.value })}
                        />
                        <Input
                          placeholder="Apellido"
                          className="h-14 rounded-full border-none bg-gray-100 px-6 focus-visible:ring-2 focus-visible:ring-kaosNeon transition-all font-bold"
                          required
                          value={registerData.lastName}
                          onChange={(e) => setRegisterData({ ...registerData, lastName: e.target.value })}
                        />
                      </div>
                      <Input
                        type="email"
                        placeholder="Email"
                        className="h-14 rounded-full border-none bg-gray-100 px-6 focus-visible:ring-2 focus-visible:ring-kaosNeon transition-all font-bold"
                        required
                        value={registerData.email}
                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      />
                      <Input
                        placeholder="Teléfono"
                        className="h-14 rounded-full border-none bg-gray-100 px-6 focus-visible:ring-2 focus-visible:ring-kaosNeon transition-all font-bold"
                        value={registerData.phone}
                        onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                      />
                      <Input
                        type="password"
                        placeholder="Contraseña"
                        className="h-14 rounded-full border-none bg-gray-100 px-6 focus-visible:ring-2 focus-visible:ring-kaosNeon transition-all font-bold"
                        required
                        minLength={6}
                        value={registerData.password}
                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      />
                      <Button 
                        type="submit" 
                        className="w-full h-16 rounded-full bg-kaosBlack text-white hover:bg-kaosNeon hover:text-black font-black uppercase tracking-[0.2em] transition-all shadow-xl mt-4"
                        disabled={loading}
                      >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Crear Cuenta"}
                      </Button>
                    </form>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
            <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Al continuar, aceptas nuestros términos y condiciones.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
