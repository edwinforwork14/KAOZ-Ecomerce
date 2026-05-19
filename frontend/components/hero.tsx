"use client"

import { motion } from "framer-motion"

interface HeroProps {
  onExploreClick?: () => void
}

export default function Hero({ onExploreClick }: HeroProps) {
  return (
    <section className="relative h-[80vh] overflow-hidden" data-purpose="hero-banner">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          alt="Hero Background" 
          className="w-full h-full object-cover object-[85%_12%] md:object-[50%_12%]" 
          src="/hero1.png"
        />
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 z-10 bg-white/35 md:hero-gradient"></div>

      {/* Bottom Gradient Fade to White */}
      <div className="absolute inset-x-0 bottom-0 h-24 md:h-36 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none"></div>

      {/* Hero Content */}
      <div className="relative z-20 h-full max-w-[1440px] mx-auto px-4 md:px-10 flex flex-col justify-start pt-12 md:pt-0 md:justify-center items-center md:items-start">
        <div className="w-full text-center md:text-left max-w-md md:max-w-4xl">
          <motion.p 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="text-kaosNeon text-lg xs:text-xl md:text-3xl mb-3 md:mb-4 tracking-wider"
            style={{ fontFamily: "'Permanent Marker', cursive" }}
          >
            PLAYA. PÁDEL. MONTAÑA.
          </motion.p>
          
          <h1 className="text-8xl xs:text-9xl sm:text-[10rem] md:text-[8rem] font-black leading-[0.8] mb-6 md:mb-8 tracking-tighter italic uppercase">
            <motion.span 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="block mb-1 md:mb-2"
            >
              siente <span className="font-normal not-italic text-[0.8em] lowercase">el</span>
            </motion.span>
            <motion.span 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="block"
            >
              KAOS
            </motion.span>
          </h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-xs sm:text-sm md:text-lg text-gray-800 mb-8 md:mb-10 max-w-xs md:max-w-sm leading-relaxed font-medium mx-auto md:mx-0"
          >
            Ropa técnica, urbana y chic para moverte sin límites. Del club a la playa, de la ciudad a la montaña.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center md:justify-start w-full sm:w-auto mx-auto md:mx-0"
          >
            <button 
              onClick={onExploreClick}
              className="bg-kaosNeon text-black px-8 py-3.5 md:px-7 md:py-3 font-black text-[11px] md:text-xs uppercase tracking-[0.2em] hover:bg-black hover:text-white transition-all rounded-full shadow-lg w-full sm:w-auto text-center"
            >
              Comprar Nuevo Drop
            </button>
            <button 
              onClick={onExploreClick}
              className="bg-white/80 backdrop-blur-sm border-2 border-black text-black px-8 py-3.5 md:px-7 md:py-3 font-black text-[11px] md:text-xs uppercase tracking-[0.2em] hover:bg-black hover:text-white transition-all rounded-full w-full sm:w-auto text-center"
            >
              Ver Colecciones
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  )
}