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
        } else {
          localStorage.removeItem(ADMIN_TOKEN_KEY)
          setUser(null)
          setSession(null)
          setIsAdmin(false)
        }
      } catch (e) {
        console.warn("[AUTH] Error validando token backend:", e)
        localStorage.removeItem(ADMIN_TOKEN_KEY)
      }
    }

    setLoading(false)
  }

  // Login principal (Directo al Backend -> Database)
  const login = async (email: string, password: string) => {
    const url = `${BACKEND_URL}/api/auth/login`;
    console.log(`🔌 [AUTH] Conectando a: ${url}`);
    
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    })
    
    const data = await res.json()

    if (!data.success) {
      throw new Error(data.message || "Credenciales inválidas")
    }

    // Guardar JWT del backend
    localStorage.setItem(ADMIN_TOKEN_KEY, data.token)
    setUser(data.user)
    setSession({ access_token: data.token })
    setIsAdmin(data.user.role === "admin")

    return data
  }

  const adminLogin = login; // Alias para mantener compatibilidad

  const register = async (userData: any) => {
    const url = `${BACKEND_URL}/api/auth/register`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData)
    })
    
    const data = await res.json()
    if (!data.success) {
      throw new Error(data.message || "Error en el registro")
    }

    // Opcional: auto-login tras registro
    if (data.token) {
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token)
      setUser(data.user)
      setSession({ access_token: data.token })
      setIsAdmin(data.user.role === "admin")
    }

    return data
  }

  const logout = async () => {
    // Limpiar token backend
    localStorage.removeItem(ADMIN_TOKEN_KEY)
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
ntext
}