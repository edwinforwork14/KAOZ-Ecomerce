"use client"

import { useState, useEffect } from "react"
import { ShoppingBag, Menu, X, User, LogOut, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/contexts/cart-context"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"
import { brandConfig } from "@/lib/config"
import Image from "next/image"
import { AnimatePresence, motion } from "framer-motion"

interface HeaderProps {
  activeTab?: string
  setActiveTab?: (tab: string) => void
  onSearch?: (term: string) => void
  isProductDetail?: boolean
  onBackFromProduct?: () => void
}

export default function Header({ activeTab, setActiveTab, onSearch }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  const { setIsOpen, items } = useCart()
  const { user, logout, isAdmin } = useAuth()

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const navigation = [
    { name: "Inicio", key: "home" },
    { name: "Catálogo", key: "products" },
    { name: "Categorías", key: "categories" },
    { name: "Ofertas", key: "sale", highlight: true },
  ]

  const handleNavClick = (key: string) => {
    if (setActiveTab) {
      setActiveTab(key)
      setIsMenuOpen(false)
    }
  }

  return (
    <>
      {/* Banner */}
      <div className="bg-primary text-primary-foreground text-center py-2 px-4 text-[10px] font-bold tracking-[0.2em] uppercase">
        {brandConfig.slogan}
      </div>

      <header 
        className={`sticky top-0 z-50 transition-all duration-500 ${
          isScrolled ? "glass py-2" : "bg-white/80 backdrop-blur-md py-4"
        }`}
      >
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between">
            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X /> : <Menu />}
            </Button>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group" onClick={() => handleNavClick('home')}>
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center overflow-hidden shadow-sm">
                <Image src="/Kaoz.jpg" alt="KAOZ Logo" width={48} height={48} className="group-hover:scale-110 transition-transform object-contain" />
              </div>
              <span className="text-xl font-bold tracking-tighter uppercase">{brandConfig.name}</span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-10">
              {navigation.map((item) => (
                <button
                  key={item.key}
                  onClick={() => handleNavClick(item.key)}
                  className={`text-[11px] font-bold tracking-widest uppercase transition-all relative group ${
                    activeTab === item.key ? "text-primary" : "text-muted-foreground hover:text-primary"
                  } ${item.highlight ? "text-accent" : ""}`}
                >
                  {item.name}
                  <span className={`absolute -bottom-1 left-0 h-0.5 bg-accent transition-all duration-300 ${
                    activeTab === item.key ? "w-full" : "w-0 group-hover:w-full"
                  }`} />
                </button>
              ))}
            </nav>

            {/* Icons */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="hidden md:flex">
                <Search className="w-5 h-5" />
              </Button>
              
              <div className="relative">
                <Button variant="ghost" size="icon" onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}>
                  <User className="w-5 h-5" />
                </Button>
                {/* User Menu simplified for space */}
              </div>

              <Button 
                variant="primary" 
                size="icon" 
                className="relative rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all"
                onClick={() => setIsOpen(true)}
              >
                <ShoppingBag className="w-5 h-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center border-2 border-white">
                    {itemCount}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="lg:hidden absolute top-full left-0 w-full bg-white border-b p-6 flex flex-col gap-4 shadow-2xl"
            >
              {navigation.map((item) => (
                <button
                  key={item.key}
                  onClick={() => handleNavClick(item.key)}
                  className="text-left text-sm font-bold uppercase tracking-widest py-3 border-b border-secondary"
                >
                  {item.name}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  )
}
