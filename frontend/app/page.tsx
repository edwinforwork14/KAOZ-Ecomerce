// app/page.tsx (o donde tengas este Home)
"use client"

import { useState, useRef } from "react"
import Header from "@/components/header"
import Hero from "@/components/hero"
import CategorySection from "@/components/category-section"
import FeaturedProducts from "@/components/featured-products"
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
  const [searchTerm, setSearchTerm] = useState("")
  const scrollPositionRef = useRef<number>(0)
  const featuredProductsRef = useRef<any>(null)

  const handleProductClick = (product: any) => {
    // PRIMERO guardamos la posición
    scrollPositionRef.current = window.scrollY

    // SEGUNDO hacemos scroll al top INMEDIATAMENTE
    window.scrollTo(0, 0)

    // TERCERO cambiamos el estado (esto causa re-render)
    setTimeout(() => {
      setSelectedProduct(product)
    }, 0)
  }

  const handleBackFromProduct = () => {
    // Guardamos la posición que queremos restaurar
    const savedPosition = scrollPositionRef.current

    // Cambiamos el estado
    setSelectedProduct(null)

    // Restauramos el scroll DESPUÉS de que el DOM se actualice
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

  const handleCategoryClick = (category: string) => {
    window.scrollTo({ top: 0, behavior: "smooth" })
    setActiveTab(category)
    setSelectedProduct(null)
    setIsCheckout(false)
    scrollPositionRef.current = 0
  }

  const handleExploreClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
    setActiveTab("products")
    setSelectedProduct(null)
    setIsCheckout(false)
    scrollPositionRef.current = 0
  }

  const handleSearch = (term: string) => {
    window.scrollTo({ top: 0, behavior: "smooth" })
    setSearchTerm(term)
    setActiveTab("products")
    setSelectedProduct(null)
    setIsCheckout(false)
    scrollPositionRef.current = 0
  }

  // ✅ IMPORTANTE: Esta es la que recibe el Header
  // y también la que le pasamos a FeaturedProducts para "VER TODO"
  const handleTabChange = (tab: string) => {
    window.scrollTo({ top: 0, behavior: "smooth" })
    setActiveTab(tab)
    setSelectedProduct(null)
    setIsCheckout(false)
    setSearchTerm("")
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

    switch (activeTab) {
      case "home":
        return (
          <>
            <Hero onExploreClick={handleExploreClick} />
            {/* <CategorySection onCategoryClick={handleCategoryClick} /> */}
            <div ref={featuredProductsRef}>
              <FeaturedProducts
                onProductClick={handleProductClick}
                // ✅ PARA QUE "VER TODO" FUNCIONE DESDE HOME
                setActiveTab={handleTabChange}
                // ✅ Si quieres que vaya a "TODOS" (Header key = sale)
                // si prefieres que vaya a "products", cámbialo a "products"
                viewAllTab="sale"
              />
            </div>
          </>
        )

      case "products":
        return (
          <FeaturedProducts
            onProductClick={handleProductClick}
            showAll={true}
            // ✅ opcional, pero no hace daño
            setActiveTab={handleTabChange}
          />
        )

      case "men":
      case "women":
      case "kids":
      case "accessories":
      case "sale":
        return (
          <FeaturedProducts
            category={activeTab}
            onProductClick={handleProductClick}
            showAll={true}
            // ✅ opcional, pero no hace daño
            setActiveTab={handleTabChange}
          />
        )

      default:
        return (
          <>
            <Hero onExploreClick={handleExploreClick} />
            <CategorySection onCategoryClick={handleCategoryClick} />
            <FeaturedProducts
              onProductClick={handleProductClick}
              setActiveTab={handleTabChange}
              viewAllTab="sale"
            />
          </>
        )
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Header
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onSearch={handleSearch}
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
