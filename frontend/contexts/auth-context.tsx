"use client"

import React, { createContext, useContext, useEffect, useState } from "react"

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5010").replace(/\/$/, "")
const ADMIN_TOKEN_KEY = "kaoz_admin_token"

interface AuthContextType {
  user: any
  session: any
  loading: boolean
  isAdmin: boolean
  login: (email: string, password: string) => Promise<any>
  adminLogin: (email: string, password: string) => Promise<any>
  register: (data: any) => Promise<any>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [session, setSession] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    initAuth()
  }, [])

  const initAuth = async () => {
    // 1. Prioridad: Token de admin del backend (JWT propio)
    const adminToken = typeof window !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) : null

    if (adminToken) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" }
        })
        const data = await res.json()

        if (data.success && data.user) {
          setUser(data.user)
          setSession({ access_token: adminToken })
          setIsAdmin(data.user.role === "admin")
          setLoading(false)
          return
        } else {
          // Token expirado o inválido — limpiar
          localStorage.removeItem(ADMIN_TOKEN_KEY)
        }
      } catch (e) {
        console.warn("[AUTH] Error validando token backend:", e)
        localStorage.removeItem(ADMIN_TOKEN_KEY)
      }
    }

    // 2. Fallback: Supabase (para clientes regulares)
    try {
      const { createClient } = await import("@/utils/supabase/client")
      const supabase = createClient()

      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      if (session?.user) {
        // Verificar rol en backend
        try {
          const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json"
            }
          })
          const data = await res.json()
          if (data.success) {
            setUser(data.user)
            setSession(session)
            setIsAdmin(data.user.role === "admin")
            setLoading(false)
            return
          }
        } catch (e) {
          console.warn("[AUTH] Error verificando rol en backend:", e)
        }
        setUser(session.user)
        setSession(session)
        setIsAdmin(session.user?.user_metadata?.role === "admin")
      }

      // Escuchar cambios de Supabase
      supabase.auth.onAuthStateChange((_event, newSession) => {
        if (!localStorage.getItem(ADMIN_TOKEN_KEY)) {
          setSession(newSession)
          setUser(newSession?.user ?? null)
          setIsAdmin(newSession?.user?.user_metadata?.role === "admin")
        }
      })
    } catch (e) {
      console.warn("[AUTH] Supabase no disponible:", e)
    }

    setLoading(false)
  }

  // Login de ADMIN directo al backend (no depende de Supabase)
  const adminLogin = async (email: string, password: string) => {
    const url = `${BACKEND_URL}/api/auth/login`;
    console.log(`🔌 [AUTH CONTEXT] Petición a: ${url}`);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    })
    const data = await res.json()

    if (!data.success) {
      throw new Error(data.message || "Credenciales inválidas")
    }

    if (data.user.role !== "admin") {
      throw new Error("No tienes permisos de administrador")
    }

    // Guardar JWT del backend
    localStorage.setItem(ADMIN_TOKEN_KEY, data.token)
    setUser(data.user)
    setSession({ access_token: data.token })
    setIsAdmin(true)

    return data
  }

  // Login regular (Supabase, para clientes)
  const login = async (email: string, password: string) => {
    const { createClient } = await import("@/utils/supabase/client")
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const register = async (userData: any) => {
    const { createClient } = await import("@/utils/supabase/client")
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          first_name: userData.firstName,
          last_name: userData.lastName,
          phone: userData.phone
        }
      }
    })
    if (error) throw error
    return data
  }

  const logout = async () => {
    // Limpiar token backend
    localStorage.removeItem(ADMIN_TOKEN_KEY)

    // Limpiar Supabase
    try {
      const { createClient } = await import("@/utils/supabase/client")
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch (e) {}

    setUser(null)
    setSession(null)
    setIsAdmin(false)
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, login, adminLogin, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}