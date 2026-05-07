"use client"

import { motion } from "framer-motion"

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center overflow-hidden">
      {/* Background Grid */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#DFFF00 1px, transparent 1px), linear-gradient(90deg, #DFFF00 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Animated Scanline */}
      <motion.div 
        initial={{ top: "-10%" }}
        animate={{ top: "110%" }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="absolute left-0 right-0 h-[2px] bg-kaosNeon/40 z-10 pointer-events-none shadow-[0_0_15px_rgba(223,255,0,0.5)]"
      />

      {/* Main Content */}
      <div className="relative z-20 flex flex-col items-center">
        {/* KAOS Glitch Text */}
        <div className="relative mb-8">
          <motion.h1 
            animate={{
              x: [0, -2, 2, -1, 0],
              opacity: [1, 0.8, 0.9, 1],
            }}
            transition={{
              duration: 0.2,
              repeat: Infinity,
              repeatDelay: 2
            }}
            className="text-7xl md:text-9xl font-black text-white tracking-tighter uppercase italic"
          >
            KAOS
          </motion.h1>
          <motion.h1 
            animate={{
              x: [0, 2, -2, 1, 0],
              opacity: [0, 0.4, 0.2, 0],
            }}
            transition={{
              duration: 0.2,
              repeat: Infinity,
              repeatDelay: 2
            }}
            className="absolute inset-0 text-7xl md:text-9xl font-black text-kaosNeon tracking-tighter uppercase italic"
            aria-hidden="true"
          >
            KAOS
          </motion.h1>
        </div>

        {/* Technical Loading Bar */}
        <div className="w-64 h-1 bg-white/10 relative overflow-hidden rounded-full mb-4">
          <motion.div 
            initial={{ left: "-100%" }}
            animate={{ left: "100%" }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-y-0 w-1/2 bg-kaosNeon shadow-[0_0_10px_#DFFF00]"
          />
        </div>

        {/* Status Indicators */}
        <div className="flex flex-col items-center gap-2">
          <motion.p 
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-[10px] font-mono font-bold text-kaosNeon tracking-[0.4em] uppercase"
          >
            Initializing_System_Core
          </motion.p>
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                className="w-1 h-1 bg-white rounded-full"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Decorative HUD corners */}
      <div className="absolute top-10 left-10 w-12 h-12 border-l-2 border-t-2 border-white/20" />
      <div className="absolute top-10 right-10 w-12 h-12 border-r-2 border-t-2 border-white/20" />
      <div className="absolute bottom-10 left-10 w-12 h-12 border-l-2 border-b-2 border-white/20" />
      <div className="absolute bottom-10 right-10 w-12 h-12 border-r-2 border-b-2 border-white/20" />
      
      {/* HUD Data Text */}
      <div className="absolute bottom-10 right-24 text-right hidden md:block">
        <p className="text-[8px] font-mono text-white/20 uppercase tracking-widest mb-1">Grid_Protocol: ACTIVE</p>
        <p className="text-[8px] font-mono text-white/20 uppercase tracking-widest">Authentication: PENDING</p>
      </div>
    </div>
  )
}
