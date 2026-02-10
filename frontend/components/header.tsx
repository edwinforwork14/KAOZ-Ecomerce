"use client"

import { useState } from "react"
import { ShoppingBag, Menu, X, User, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/contexts/cart-context"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { brandConfig } from "@/lib/config"
import Image from "next/image"
import { AnimatePresence, motion } from "framer-motion"

interface HeaderProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  onSearch?: (term: string) => void
  isProductDetail?: boolean
  onBackFromProduct?: () => void
}

export default function Header({
  activeTab,
  setActiveTab,
  isProductDetail,
  onBackFromProduct,
}: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  const { setIsOpen, items } = useCart()
  const { user, logout, isAdmin } = useAuth()
  const router = useRouter()

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  const navigation = [
    { name: "HOMBRES", key: "men" },
    { name: "MUJERES", key: "women" },
    //{ name: "NIÑOS", key: "kids" },
    { name: "ACCESORIOS", key: "accessories" },
    { name: "TODOS", key: "sale", highlight: true },
  ]

  const handleLogout = () => {
    logout()
    setIsUserMenuOpen(false)
    router.push("/")
  }

  const handleNavClick = (key: string) => {
    if (isProductDetail && onBackFromProduct) onBackFromProduct()
    setActiveTab(key)
    setIsMenuOpen(false)
  }

  // Cerrar menús al cambiar de tab (evita overlays raros)
  const closeAllMenus = () => {
    setIsMenuOpen(false)
    setIsUserMenuOpen(false)
  }

  // Animaciones mobile (sutiles pero con "wow")
  const mobileMenu = {
    hidden: { opacity: 0, y: -10, filter: "blur(8px)" },
    show: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        duration: 0.28,
        ease: [0.22, 1, 0.36, 1],
        when: "beforeChildren",
        staggerChildren: 0.05,
      },
    },
    exit: {
      opacity: 0,
      y: -8,
      filter: "blur(8px)",
      transition: { duration: 0.2, ease: "easeInOut" },
    },
  }

  const mobileItem = {
    hidden: { opacity: 0, x: -6 },
    show: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
    },
    exit: { opacity: 0, x: -6, transition: { duration: 0.15 } },
  }

  return (
    <>
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-gray-900 to-black text-white text-center py-2.5 px-4 text-sm font-semibold shadow-lg">
        <span className="inline-flex items-center gap-2">{brandConfig.slogan}</span>
      </div>

      {/* Main Header */}
      <header className="bg-white border-b sticky top-0 z-50 shadow-md">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 lg:h-16">
            {/* Mobile Menu Button (MÁS GRANDE) */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden p-4 rounded-2xl hover:bg-gray-100 transition-all active:scale-95"
              onClick={() => {
                setIsMenuOpen((v) => !v)
                setIsUserMenuOpen(false)
              }}
              aria-label="Abrir menú"
            >
              <motion.div
                initial={false}
                animate={{ rotate: isMenuOpen ? 90 : 0, scale: isMenuOpen ? 0.98 : 1 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                {isMenuOpen ? <X className="h-8 w-8" /> : <Menu className="h-8 w-8" />}
              </motion.div>
            </Button>

            {/* Logo (MÁS GRANDE EN MÓVIL) */}
            <div
              className="flex-shrink-0 cursor-pointer transition-transform hover:scale-105 active:scale-95"
              onClick={() => {
                closeAllMenus()
                handleNavClick("home")
              }}
              role="button"
              aria-label="Ir al inicio"
            >
              <div className="relative h-12 w-[185px] md:h-11 md:w-[160px] lg:h-10 lg:w-[140px]">
                <Image
                  src="/logo/8yj.png"
                  alt={brandConfig.name}
                  fill
                  priority
                  className="object-contain"
                />
              </div>
            </div>

            {/* Desktop Navigation */}
            {!isProductDetail && (
              <nav className="hidden lg:flex items-center space-x-8">
                {navigation.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      closeAllMenus()
                      handleNavClick(item.key)
                    }}
                    className={`text-sm font-semibold uppercase tracking-wider transition-all relative group ${
                      activeTab === item.key
                        ? "text-black"
                        : item.highlight
                        ? "text-red-600 hover:text-red-700"
                        : "text-gray-600 hover:text-black"
                    }`}
                  >
                    {item.name}
                    {activeTab === item.key && (
                      <span className="absolute -bottom-5 left-0 right-0 h-1 bg-gradient-to-r from-black to-gray-600 rounded-full" />
                    )}
                  </button>
                ))}
              </nav>
            )}

            {/* Right Icons */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* User Menu (MÁS GRANDE) */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-4 rounded-2xl hover:bg-gray-100 transition-all hover:scale-105 active:scale-95"
                  onClick={() => {
                    setIsUserMenuOpen((v) => !v)
                    setIsMenuOpen(false)
                  }}
                  aria-label="Menú de usuario"
                >
                  <User className="h-7 w-7" />
                </Button>

                {isUserMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsUserMenuOpen(false)}
                      aria-hidden="true"
                    />
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border-2 border-gray-100 z-50 overflow-hidden">
                      {user ? (
                        <>
                          <div className="px-5 py-4 border-b bg-gradient-to-r from-gray-50 to-white">
                            <p className="text-sm font-bold text-gray-900">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-xs text-gray-600 truncate mt-1">{user.email}</p>
                          </div>

                          {isAdmin && (
                            <Link
                              href="/admin/dashboard"
                              className="block px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 font-semibold transition-colors"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              Panel Admin
                            </Link>
                          )}

                          <button
                            onClick={handleLogout}
                            className="w-full text-left px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center font-semibold transition-colors"
                          >
                            <LogOut className="h-4 w-4 mr-2" />
                            Cerrar Sesión
                          </button>
                        </>
                      ) : (
                        <>
                          <Link
                            href="/auth/login"
                            className="block px-5 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 font-semibold transition-all"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            Iniciar Sesión
                          </Link>
                          <Link
                            href="/auth/register"
                            className="block px-5 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 font-semibold transition-all"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            Registrarse
                          </Link>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Cart (MÁS GRANDE) */}
              <Button
                variant="ghost"
                size="sm"
                className="relative p-4 rounded-2xl hover:bg-gray-100 transition-all hover:scale-105 active:scale-95"
                onClick={() => {
                  closeAllMenus()
                  setIsOpen(true)
                }}
                aria-label="Carrito"
              >
                <ShoppingBag className="h-7 w-7" />
                {itemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-gradient-to-br from-black to-gray-800 text-white text-sm rounded-full h-7 w-7 flex items-center justify-center font-bold shadow-lg animate-pulse">
                    {itemCount}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation (con animación) */}
        <AnimatePresence>
          {isMenuOpen && !isProductDetail && (
            <motion.div
              key="mobileNav"
              className="lg:hidden border-t bg-gradient-to-br from-white to-gray-50 overflow-hidden"
              variants={mobileMenu}
              initial="hidden"
              animate="show"
              exit="exit"
            >
              <nav className="px-4 py-5 space-y-2">
                {navigation.map((item) => (
                  <motion.button
                    key={item.key}
                    variants={mobileItem}
                    onClick={() => {
                      closeAllMenus()
                      handleNavClick(item.key)
                    }}
                    className={`block w-full text-left px-5 py-4 text-base font-semibold uppercase tracking-wider transition-all rounded-2xl shadow-sm ${
                      activeTab === item.key
                        ? "bg-gradient-to-r from-black to-gray-800 text-white shadow-lg"
                        : item.highlight
                        ? "text-red-600 hover:bg-red-50"
                        : "text-gray-600 hover:bg-white hover:shadow-md"
                    }`}
                    whileTap={{ scale: 0.98 }}
                  >
                    {item.name}
                  </motion.button>
                ))}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  )
}
