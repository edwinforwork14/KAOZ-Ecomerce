"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'user' | 'admin';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  register: (data: any) => Promise<any>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay un usuario guardado
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);

    // Escuchar evento de expiración de token
    const handleAuthExpired = () => {
      setUser(null);
      localStorage.removeItem('sessionId');
    };

    window.addEventListener('auth-expired', handleAuthExpired);
    
    return () => {
      window.removeEventListener('auth-expired', handleAuthExpired);
    };
  }, []);

  const login = async (email: string, password: string) => {
    const result = await api.login({ email, password });
    if (result.success) {
      setUser(result.user);
      
      // Sincronizar carrito después del login
      try {
        await api.syncCart();
        window.dispatchEvent(new Event('cart-sync'));
      } catch (error) {
        console.error('Error al sincronizar carrito:', error);
      }
    }
    return result;
  };

  const register = async (data: any) => {
    const result = await api.register(data);
    if (result.success) {
      setUser(result.user);
      
      // Sincronizar carrito después del registro
      try {
        await api.syncCart();
        window.dispatchEvent(new Event('cart-sync'));
      } catch (error) {
        console.error('Error al sincronizar carrito:', error);
      }
    }
    return result;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('sessionId');
    setUser(null);
    
    window.dispatchEvent(new Event('cart-logout'));
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      isAdmin: user?.role === 'admin'
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}