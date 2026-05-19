"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MessageCircle, ChevronLeft, ChevronRight } from "lucide-react"
import { brandConfig } from "@/lib/config"
import { api } from "@/lib/api"
import AnimatedSection from "./animated-section"

export default function NewsletterSection() {
  const [currentImage, setCurrentImage] = useState(0)
  const [whatsappNumber, setWhatsappNumber] = useState(brandConfig.contact.whatsapp)
  
  const featuredImages = [
    "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=800"
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % featuredImages.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await api.getPublicSettings()
        if (result.success && result.settings?.whatsapp?.number) {
          const settingsNumber = result.settings.whatsapp.number.replace(/\D/g, '')
          const isPlaceholder = settingsNumber.includes('000000')
          if (settingsNumber && !isPlaceholder) {
            setWhatsappNumber(result.settings.whatsapp.number)
          }
        }
      } catch (error) {
        console.error('Error loading settings in uniforms section:', error)
      }
    }
    loadSettings()
  }, [])

  const whatsappMessage = encodeURIComponent("Hola, Kaos! Quiero confeccionar y personalizar mis uniformes con ustedes. Dame más información ℹ️")
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`

  return (
    <AnimatedSection>
      <section className="max-w-5xl mx-auto px-4 md:px-10 py-16" data-purpose="uniforms-cta">
        <div className="bg-white rounded-[40px] overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] flex flex-col md:flex-row min-h-[450px] border border-gray-100 group">
          {/* Photo Side - Carousel */}
          <div className="md:w-2/5 relative overflow-hidden bg-gray-100">
            <AnimatePresence mode="wait">
              <motion.img 
                key={currentImage}
                initial={{ opacity: 0, scale: 1.1, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95, x: -20 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                alt="KAOS Featured" 
                className="absolute inset-0 w-full h-full object-cover" 
                src={featuredImages[currentImage]} 
              />
            </AnimatePresence>
            
            <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent pointer-events-none"></div>
            
            {/* Carousel Indicators */}
            <div className="absolute bottom-6 left-6 flex gap-2 z-10">
              {featuredImages.map((_, idx) => (
                <div 
                  key={idx}
                  className={`h-1 rounded-full transition-all duration-500 ${
                    currentImage === idx ? "w-8 bg-kaosNeon" : "w-2 bg-white/50"
                  }`}
                />
              ))}
            </div>

            {/* Premium Overlay Tag */}
            <div className="absolute top-6 left-6 z-10">
              <span className="glass-dark text-[9px] font-black text-white px-4 py-2 rounded-full uppercase tracking-[0.2em] border border-white/10">
                Premium_Quality
              </span>
            </div>
          </div>
          
          {/* Content Side */}
          <div className="md:w-3/5 p-10 md:p-16 flex flex-col justify-center relative">
            {/* Subtle Noise Background */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none noise"></div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h2 className="text-5xl md:text-6xl font-black uppercase mb-6 tracking-tighter italic leading-none">
                UNIFORMES
              </h2>
              <p className="text-lg text-gray-500 mb-10 leading-relaxed font-sans font-medium max-w-md">
                Tus uniformes con estilo y calidad, personaliza tus pedidos corporativos o deportivos con <span className="text-black font-black">Kaos</span>.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <a 
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-4 bg-[#25D366] text-white font-black uppercase tracking-widest px-10 py-6 hover:bg-black transition-all duration-500 rounded-2xl text-xs shadow-[0_15px_30px_-10px_rgba(37,211,102,0.4)] hover:shadow-2xl hover:-translate-y-1 group"
                >
                  <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  WHATSAPP KAOS
                </a>
              </div>
            </motion.div>

            {/* KAOS watermark - Subtle */}
            <div className="absolute bottom-10 right-10 opacity-[0.07]">
              <img 
                alt="KAOS Watermark" 
                className="h-16 object-contain" 
                src="/kaozlogo1.jpeg" 
              />
            </div>
          </div>
        </div>
      </section>
    </AnimatedSection>
  )
}
