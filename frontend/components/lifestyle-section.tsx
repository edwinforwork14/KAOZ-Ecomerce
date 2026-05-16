import AnimatedSection from "./animated-section"

export default function LifestyleSection() {
  const items = [
    { name: "Acuarela", src: "/nuevo/drop-acuarela.jpg" },
    { name: "Quotes", src: "/nuevo/drop-quotes.jpg" },
    { name: "Funky & Colorido", src: "/nuevo/drop-funky.jpg" },
    { name: "Con Flow", src: "/nuevo/drop-flow.jpg" },
  ]

  return (
    <AnimatedSection>
      <section className="max-w-[1440px] mx-auto px-4 md:px-10 py-20" data-purpose="brand-lifestyle-section">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Side Content */}
          <div className="lg:col-span-4">
            <h2 className="text-5xl font-black leading-tight mb-4 tracking-tighter uppercase italic">Nuevo drop disponible</h2>
            <p 
              className="text-kaosNeon text-3xl mb-6 tracking-wide"
              style={{ fontFamily: "'Permanent Marker', cursive" }}
            >
              KAOS contigo
            </p>
            <p className="text-base text-gray-600 mb-8 leading-relaxed font-sans font-medium">
              Explora nuestros estampados, tecnologías en telas dry-fit y con protección UV.
            </p>
            <button className="bg-black text-white px-10 py-4 rounded-full text-xs font-black uppercase tracking-widest hover:bg-kaosNeon hover:text-black transition-all shadow-lg">
              Ver mas
            </button>
          </div>
          
          {/* Right Side Gallery */}
          <div className="lg:col-span-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {items.map((item, idx) => (
                <div key={idx} className="space-y-3">
                  <div className="rounded-2xl overflow-hidden aspect-[4/6] shadow-md hover:shadow-xl transition-all duration-500">
                    <img 
                      alt={item.name} 
                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-700" 
                      src={item.src} 
                    />
                  </div>
                  <p className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </AnimatedSection>
  )
}
