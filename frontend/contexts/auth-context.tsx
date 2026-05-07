"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"

interface AuthContextType {
  user: any
  session: any
  loading: boolean
  isAdmin: boolean
  login: (email: string, password: string) => Promise<any>
  register: (data: any) => Promise<any>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [session, setSession] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Obtener sesión actual
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.warn('Session error, signing out:', error.message)
        supabase.auth.signOut()
        setSession(null)
        setUser(null)
        setIsAdmin(false)
        setLoading(false)
        return
      }
      setSession(session)
      const currentUser = session?.user ?? null
      setUser(currentUser)
      setIsAdmin(currentUser?.user_metadata?.role === 'admin' || currentUser?.email === 'admin@example.com')
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })

    // 2. Escuchar cambios de estado
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      const currentUser = session?.user ?? null
      setUser(currentUser)
      setIsAdmin(currentUser?.user_metadata?.role === 'admin' || currentUser?.email === 'admin@example.com')
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const register = async (userData: any) => {
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
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, login, register, logout }}>
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