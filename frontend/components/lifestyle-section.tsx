import AnimatedSection from "./animated-section"

export default function LifestyleSection() {
  const items = [
    { name: "Acuarela", position: "36% 61%" },
    { name: "Quotes", position: "55% 61%" },
    { name: "Funky & Colorido", position: "74% 61%" },
    { name: "Con Flow", position: "92% 61%" },
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
              Kaos contigo
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
                      src="https://lh3.googleusercontent.com/aida/ADBb0uj46qIOice25s0wgyOd-LWnDeeM714ClVTSkgFmiKINOqICN7ryrVzJXi2KnKtRTHVlW5O0MkHLfZhKcKbseqUF-wGctwnzRG9UdCxQ1zsGgHlTpyhKmVSpUm59_pY0tI0hB3fV03rfoM8-dI7r12Kfc4fDKJAMJTbh6sRJXS-GojAuprxcm2ab8PL3d0xbnenw4N5lZONHF3_7vha7rinJjOF0N5POrpaHCf5EOiY_jvlK3dkpRJZBIAWybkiOBl045I3DXqosiGg" 
                      style={{ objectPosition: item.position }}
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
