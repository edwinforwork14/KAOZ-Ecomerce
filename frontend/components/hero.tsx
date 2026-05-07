"use client"

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
          className="w-full h-full object-cover" 
          src="/hero1.png"
          style={{ objectPosition: "50% 12%" }}
        />
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 z-10 hero-gradient"></div>

      {/* Hero Content */}
      <div className="relative z-20 h-full max-w-[1440px] mx-auto px-4 md:px-10 flex flex-col justify-center items-start">
        <div className="max-w-xl">
          <p 
            className="text-kaosNeon text-xl md:text-3xl mb-4 tracking-wider"
            style={{ fontFamily: "'Permanent Marker', cursive" }}
          >
            PLAYA. PÁDEL. MONTAÑA.
          </p>
          <h1 className="text-7xl md:text-9xl font-black leading-[0.8] mb-8 tracking-tighter italic">
            <span className="block mb-2">VIVE <span className="font-light not-italic text-[0.8em]">TU</span></span>
            <span className="block">KAOS</span>
          </h1>
          <p className="text-sm md:text-lg text-gray-800 mb-10 max-w-sm leading-relaxed font-medium">
            Ropa técnica, urbana y chic para moverte sin límites. Del club a la playa, de la ciudad a la montaña.
          </p>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={onExploreClick}
              className="bg-kaosNeon text-black px-10 py-4 font-black text-xs uppercase tracking-[0.2em] hover:bg-black hover:text-white transition-all rounded-full shadow-lg"
            >
              Comprar Nuevo Drop
            </button>
            <button 
              onClick={onExploreClick}
              className="bg-white/80 backdrop-blur-sm border-2 border-black text-black px-10 py-4 font-black text-xs uppercase tracking-[0.2em] hover:bg-black hover:text-white transition-all rounded-full"
            >
              Ver Colecciones
            </button>
          </div>
        </div>
      </div>

      {/* Badge Overlay */}
      <div className="absolute top-10 right-10 z-30 w-32 h-32 md:w-48 md:h-48 bg-kaosNeon rounded-full flex items-center justify-center text-center p-4 badge-rotate shadow-2xl border-4 border-white" data-purpose="feature-badge">
        <div className="text-[10px] md:text-xs font-black uppercase leading-tight text-black">
          DISEÑADO EN<br />
          <span className="text-2xl md:text-3xl block mt-1 tracking-tighter">VENEZUELA</span>
        </div>
      </div>

    </section>
  )
}