"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState } from "react"

export default function LoadingScreen() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulamos un tiempo de carga para asegurar que el usuario vea la animación estética
    const timer = setTimeout(() => {
      setLoading(false)
    }, 2500)

    return () => clearTimeout(timer)
  }, [])

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ 
            y: "-100%",
            transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1], delay: 0.2 }
          }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-white"
        >
          <div className="relative flex flex-col items-center">
            {/* Background Text Effect (Editorial Style) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.03, scale: 1.2 }}
              transition={{ duration: 2, ease: "easeOut" }}
              className="absolute inset-0 flex items-center justify-center whitespace-nowrap text-[20vw] font-black uppercase tracking-tighter text-black select-none pointer-events-none"
            >
              KAOS SPORT
            </motion.div>

            {/* Main Logo Text */}
            <div className="relative overflow-hidden py-2 px-4">
              <motion.h1
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ 
                  duration: 0.8, 
                  ease: [0.33, 1, 0.68, 1],
                  delay: 0.2 
                }}
                className="text-6xl md:text-8xl font-black uppercase tracking-tighter text-black flex items-center"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                KAO
                <motion.span
                  animate={{ 
                    color: ["#000000", "#DFFF00", "#000000"],
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity,
                    ease: "easeInOut" 
                  }}
                >
                  S
                </motion.span>
              </motion.h1>
              
              {/* Animated Underline */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ 
                  duration: 1.5, 
                  ease: "easeInOut",
                  delay: 0.5 
                }}
                className="h-1 w-full bg-kaosNeon origin-left mt-1"
              />
            </div>

            {/* Tagline Reveal */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="mt-4 text-xs font-bold uppercase tracking-[0.3em] text-black/50"
            >
              Urban Athletics & Editorial Quality
            </motion.p>

            {/* Minimal Progress Indicator */}
            <div className="absolute bottom-[-100px] left-1/2 -translate-x-1/2 w-48 h-[1px] bg-black/10 overflow-hidden">
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ 
                  duration: 1.5, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                className="w-full h-full bg-kaosNeon"
              />
            </div>
          </div>

          {/* Decorative Corners (Editorial Look) */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute top-10 left-10 text-[10px] font-mono tracking-widest text-black/20"
          >
            EST. 2026 / KAOS-SYST-V2
          </motion.div>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute bottom-10 right-10 text-[10px] font-mono tracking-widest text-black/20"
          >
            VALENCIA, VENEZUELA
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
