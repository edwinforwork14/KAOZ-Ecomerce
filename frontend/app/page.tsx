"use client"

import { useState, useRef } from "react"
import Header from "@/components/header"
import Hero from "@/components/hero"
import CategorySection from "@/components/category-section"
import FeaturedProducts from "@/components/featured-products"
import BenefitsBar from "@/components/benefits-bar"
import LifestyleSection from "@/components/lifestyle-section"
import NewsletterSection from "@/components/newsletter-section"
import InstagramFeed from "@/components/instagram-feed"
import Footer from "@/components/footer"
import Cart from "@/components/cart"
import ProductDetail from "@/components/product-detail"
import Checkout from "@/components/checkout"
import { MessageCircle } from "lucide-react"
import { brandConfig } from "@/lib/config"

export default function Home() {
  const [activeTab, setActiveTab] = useState("home")
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [isCheckout, setIsCheckout] = useState(false)
  const scrollPositionRef = useRef<number>(0)

  const handleProductClick = (product: any) => {
    scrollPositionRef.current = window.scrollY
    window.scrollTo(0, 0)
    setTimeout(() => {
      setSelectedProduct(product)
    }, 0)
  }

  const handleBackFromProduct = () => {
    const savedPosition = scrollPositionRef.current
    setSelectedProduct(null)
    setTimeout(() => {
      window.scrollTo(0, savedPosition)
      scrollPositionRef.current = 0
    }, 50)
  }

  const handleCheckout = () => {
    if (scrollPositionRef.current === 0) {
      scrollPositionRef.current = window.scrollY
    }
    window.scrollTo(0, 0)
    setTimeout(() => {
      setIsCheckout(true)
      setSelectedProduct(null)
    }, 0)
  }

  const handleBackFromCheckout = () => {
    const savedPosition = scrollPositionRef.current
    setIsCheckout(false)
    setTimeout(() => {
      window.scrollTo(0, savedPosition)
      scrollPositionRef.current = 0
    }, 50)
  }

  const handleNavClick = (key: string) => {
    console.log("Navigating to:", key)
    handleTabChange(key)
  }

  const handleTabChange = (tab: string) => {
    console.log("page.tsx: Tab changing to:", tab)
    window.scrollTo(0, 0)
    setActiveTab(tab)
    setSelectedProduct(null)
    setIsCheckout(false)
    scrollPositionRef.current = 0
  }

  const handleWhatsAppClick = () => {
    const phoneNumber = brandConfig.contact.whatsapp
    const message = encodeURIComponent(
      "¡Hola! Me gustaría obtener más información sobre sus productos."
    )
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, "_blank")
  }

  const renderContent = () => {
    if (isCheckout) {
      return <Checkout />
    }

    if (selectedProduct) {
      return (
        <ProductDetail
          product={selectedProduct}
          onBack={handleBackFromProduct}
          onCheckout={handleCheckout}
        />
      )
    }

    if (activeTab === "home") {
      return (
        <div className="animate-in fade-in duration-700">
          <Hero onExploreClick={() => handleTabChange("shop")} />
          <CategorySection onCategoryClick={handleTabChange} />
          <BenefitsBar />
          <LifestyleSection />
          <InstagramFeed />
          <NewsletterSection />
        </div>
      )
    }

    return (
      <div className="max-w-full mx-auto px-4 md:px-10 py-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <FeaturedProducts
          category={activeTab === "home" || activeTab === "shop" ? undefined : activeTab}
          onProductClick={handleProductClick}
          showAll={true}
          setActiveTab={handleTabChange}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-kaosNeon selection:text-black">
      <Header
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        isProductDetail={!!selectedProduct}
        onBackFromProduct={handleBackFromProduct}
      />

      <main>{renderContent()}</main>

      <Footer />
      <Cart onCheckout={handleCheckout} />

      {/* WhatsApp Floating Button */}
      <button
        onClick={handleWhatsAppClick}
        className="fixed bottom-6 right-6 z-40 bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 group"
        aria-label="Contactar por WhatsApp"
      >
        <MessageCircle className="h-7 w-7" />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
      </button>
    </div>
  )
}
