"use client"

import { useState, useEffect } from "react"
import { useCart } from "@/contexts/cart-context"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"
import { brandConfig } from "@/lib/config"

interface HeaderProps {
  activeTab?: string
  setActiveTab?: (tab: string) => void
  onSearch?: (term: string) => void
  isProductDetail?: boolean
  onBackFromProduct?: () => void
}

export default function Header({ activeTab, setActiveTab }: HeaderProps) {
  const { setIsOpen, items } = useCart()
  const { user } = useAuth()
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  const handleNavClick = (key: string) => {
    if (setActiveTab) {
      setActiveTab(key)
    }
  }

  return (
    <>
      {/* TopNavBar (Web) */}
      <header className="hidden md:flex bg-surface/90 backdrop-blur-xl fixed top-0 w-full z-50 border-b border-outline-variant/30 h-16">
        <div className="flex justify-between items-center px-gutter w-full">
          <Link 
            href="/" 
            className="font-display text-h2 tracking-tighter text-tertiary uppercase flex items-center gap-2"
            onClick={(e) => { e.preventDefault(); handleNavClick('home') }}
          >
            <span className="material-symbols-outlined">network_node</span>
            {brandConfig.name}
          </Link>

          <nav className="flex items-center gap-8">
            {[
              { name: "Men", key: "men" },
              { name: "Women", key: "women" },
              { name: "Kids", key: "kids" },
              { name: "Drops", key: "sale" }
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => handleNavClick(item.key)}
                className={`font-label-caps text-label-caps transition-colors duration-300 uppercase tracking-widest ${
                  activeTab === item.key ? "text-tertiary" : "text-on-surface-variant hover:text-tertiary"
                }`}
              >
                {item.name}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-6 text-primary">
            <div className="font-mono-data text-mono-data text-on-surface-variant hidden lg:block border-r border-outline-variant/30 pr-6 uppercase">
              SYS.STS: <span className="text-tertiary">ONLINE</span>
            </div>
            <button 
              onClick={() => setIsOpen(true)}
              className="hover:text-tertiary transition-colors duration-300 scale-95 active:opacity-80 transition-all flex items-center justify-center relative"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>shopping_bag</span>
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-tertiary rounded-full"></span>
              )}
            </button>
            <button className="hover:text-tertiary transition-colors duration-300 scale-95 active:opacity-80 transition-all flex items-center justify-center">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>person</span>
            </button>
          </div>
        </div>
      </header>

      {/* BottomNavBar (Mobile) */}
      <nav className="md:hidden bg-surface-container/90 backdrop-blur-2xl fixed bottom-0 w-full z-50 bg-surface border-t border-outline-variant/50 shadow-lg h-16">
        <div className="flex justify-around items-center h-full px-4">
          <button 
            onClick={() => handleNavClick('home')}
            className={`flex flex-col items-center justify-center p-2 transition-transform active:scale-90 duration-150 ${
              activeTab === 'home' ? 'text-tertiary' : 'text-on-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: `'FILL' ${activeTab === 'home' ? 1 : 0}` }}>home</span>
            <span className="font-label-caps text-[10px] mt-1 tracking-widest uppercase">Home</span>
          </button>
          <button 
            onClick={() => handleNavClick('products')}
            className={`flex flex-col items-center justify-center p-2 transition-transform active:scale-90 duration-150 ${
              activeTab === 'products' ? 'text-tertiary' : 'text-on-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: `'FILL' ${activeTab === 'products' ? 1 : 0}` }}>grid_view</span>
            <span className="font-label-caps text-[10px] mt-1 tracking-widest uppercase">Shop</span>
          </button>
          <button 
            onClick={() => setIsOpen(true)}
            className="flex flex-col items-center justify-center text-on-surface-variant p-2 hover:text-tertiary transition-transform active:scale-90 duration-150"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>shopping_cart</span>
            <span className="font-label-caps text-[10px] mt-1 tracking-widest uppercase">Cart</span>
          </button>
          <button className="flex flex-col items-center justify-center text-on-surface-variant p-2 hover:text-tertiary transition-transform active:scale-90 duration-150">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>person</span>
            <span className="font-label-caps text-[10px] mt-1 tracking-widest uppercase">Profile</span>
          </button>
        </div>
      </nav>
    </>
  )
}

