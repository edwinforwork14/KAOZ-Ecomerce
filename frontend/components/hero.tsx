"use client"

import { brandConfig } from "@/lib/config"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"

interface HeroProps {
  onExploreClick?: () => void
}

export default function Hero({ onExploreClick }: HeroProps) {
  return (
    <section className="relative h-[90vh] w-full flex items-center justify-center overflow-hidden bg-black">
      {/* Background with overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="/hero.PNG"
          alt="KAOZ Sportswear Valencia"
          className="w-full h-full object-cover opacity-70 scale-100"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
      </div>

      {/* Content */}
      <div className="container relative z-10 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-4xl mx-auto"
        >
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="inline-block px-6 py-2 mb-8 text-[10px] font-bold tracking-[0.3em] uppercase text-white border border-white/20 rounded-full bg-white/5 backdrop-blur-md"
          >
            {brandConfig.tagline}
          </motion.span>
          
          <motion.h1 
            className="text-6xl md:text-8xl lg:text-9xl font-black text-white mb-8 tracking-tighter leading-none"
          >
            KAOZ <br /> 
            <span className="text-white/40 italic">Valencia</span>
          </motion.h1>
          
          <motion.p 
            className="text-lg md:text-xl text-white/60 mb-12 max-w-xl mx-auto font-light leading-relaxed"
          >
            {brandConfig.description}
          </motion.p>
          
          <motion.div 
            className="flex flex-col sm:flex-row items-center justify-center gap-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <button 
              onClick={onExploreClick}
              className="group relative px-10 py-5 bg-white text-black font-bold rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
            >
              <span className="relative z-10 flex items-center gap-3 text-sm uppercase tracking-widest">
                Nueva Colección <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-2" />
              </span>
            </button>
            
            <button 
              onClick={onExploreClick}
              className="text-white/50 hover:text-white transition-colors text-sm uppercase tracking-widest font-medium border-b border-white/10 pb-1"
            >
              Ver Catálogo
            </button>
          </motion.div>
        </motion.div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-10 left-10 hidden lg:block">
        <div className="flex items-center gap-6 text-white/20 text-[10px] tracking-[0.5em] uppercase vertical-text">
          <span>Minimalist Performance</span>
          <div className="w-px h-24 bg-white/10" />
        </div>
      </div>
    </section>
  )
}