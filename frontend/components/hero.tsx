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
          <p className="text-kaosNeon font-heavy italic text-2xl md:text-3xl mb-2 tracking-tight">
            PLAYA. PÁDEL. MONTAÑA.
          </p>
          <h1 className="text-6xl md:text-8xl font-heavy leading-none mb-6">
            VIVE <span className="block">TU KAOS</span>
          </h1>
          <p className="text-sm md:text-lg text-gray-800 mb-8 max-w-sm leading-relaxed">
            Ropa técnica, urbana y chic para moverte sin límites. Del club a la playa, de la ciudad a la montaña.
          </p>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={onExploreClick}
              className="bg-kaosNeon text-black px-8 py-3 font-bold text-sm uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
            >
              Comprar Nuevo Drop
            </button>
            <button 
              onClick={onExploreClick}
              className="border-2 border-black text-black px-8 py-3 font-bold text-sm uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
            >
              Ver Colecciones
            </button>
          </div>
        </div>
      </div>

      {/* Badge Overlay */}
      <div className="absolute top-10 right-10 z-30 w-32 h-32 md:w-40 md:h-40 bg-kaosNeon rounded-full flex items-center justify-center text-center p-4 badge-rotate shadow-xl border-4 border-white" data-purpose="feature-badge">
        <div className="text-[10px] md:text-xs font-black uppercase leading-tight">
          Diseñado en<br />
          <span className="text-lg">VENEZUELA</span>
        </div>
      </div>

    </section>
  )
}